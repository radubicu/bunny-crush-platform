from fastapi import FastAPI, Depends, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import stripe
import os
import random

import models
import database
import utils
import llm
import image_gen

# ── Initializare ──────────────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=database.engine)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

app = FastAPI(title="BunnyCrush API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Seed pachete credite la pornire ───────────────────────────────────────────
@app.on_event("startup")
def startup():
    db = database.SessionLocal()
    try:
        packages = [
            {"id": "starter",    "name": "Starter",  "credits": 100,  "bonus_credits": 0,    "price_eur": 9.99},
            {"id": "basic",      "name": "Basic",    "credits": 250,  "bonus_credits": 10,   "price_eur": 19.99},
            {"id": "popular",    "name": "Popular",  "credits": 600,  "bonus_credits": 60,   "price_eur": 39.99},
            {"id": "pro",        "name": "Pro",      "credits": 1500, "bonus_credits": 300,  "price_eur": 89.99},
            {"id": "vip",        "name": "VIP",      "credits": 4000, "bonus_credits": 1200, "price_eur": 199.99},
        ]
        for p in packages:
            if not db.query(models.CreditPackage).filter_by(id=p["id"]).first():
                db.add(models.CreditPackage(**p))
        db.commit()
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════
# SCHEMAS
# ═══════════════════════════════════════════════════════════

class UserRegister(BaseModel):
    email: str
    password: str
    username: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class CharacterCreate(BaseModel):
    name: str
    age: Optional[int] = 24
    description: str       # personalitate
    visual_prompt: str     # aspect fizic

class ChatRequest(BaseModel):
    character_id: str
    message: str

class ImageRequest(BaseModel):
    character_id: str
    scenario: str
    nsfw: bool = False

class StripeCheckoutRequest(BaseModel):
    package_id: str
    success_url: str
    cancel_url: str

class LikeRequest(BaseModel):
    image_id: str


# ═══════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════

@app.post("/auth/register", summary="Inregistrare cont nou")
def register(body: UserRegister, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(400, "Email-ul este deja inregistrat.")

    if body.username:
        if db.query(models.User).filter(models.User.username == body.username).first():
            raise HTTPException(400, "Username-ul este deja folosit.")

    if len(body.password) < 6:
        raise HTTPException(400, "Parola trebuie sa aiba minim 6 caractere.")

    user = models.User(
        email=body.email,
        username=body.username,
        hashed_password=utils.get_password_hash(body.password),
        credits=50,
        level=1,
    )
    db.add(user)
    db.flush()

    # Bonus signup
    utils.add_credits(user, 50, "Bonus de bun venit 🎉", db, transaction_type="bonus_signup")

    db.commit()
    db.refresh(user)

    token = utils.create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_response(user),
    }


@app.post("/auth/login", summary="Autentificare")
def login(body: UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not utils.verify_password(body.password, user.hashed_password):
        raise HTTPException(401, "Email sau parola incorecta.")

    user.last_login = datetime.utcnow()
    db.commit()

    token = utils.create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _user_response(user),
    }


@app.get("/auth/me", summary="Date cont curent")
def get_me(user: models.User = Depends(utils.get_current_user)):
    return _user_response(user)


def _user_response(user: models.User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "credits": user.credits,
        "level": user.level,
        "total_spent": user.total_spent,
        "is_premium": user.is_premium,
        "created_at": user.created_at,
    }


# ═══════════════════════════════════════════════════════════
# CHARACTERS
# ═══════════════════════════════════════════════════════════

@app.post("/characters", summary="Creeaza personaj")
def create_character(
    body: CharacterCreate,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    seed = random.randint(1, 999999)

    # Generam avatarul initial prin Replicate
    try:
        avatar_url = image_gen.generate_avatar(body.visual_prompt, seed=seed)
    except Exception as e:
        print(f"[AVATAR GEN ERROR] {e}")
        avatar_url = None  # nu blocam crearea daca genul esueza

    char = models.Character(
        user_id=user.id,
        name=body.name,
        age=body.age,
        description=body.description,
        visual_prompt=body.visual_prompt,
        avatar_url=avatar_url,
        seed=seed,
    )
    db.add(char)
    db.commit()
    db.refresh(char)

    return _char_response(char)


@app.get("/characters", summary="Lista personajelor mele")
def list_characters(
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    chars = db.query(models.Character).filter(models.Character.user_id == user.id).all()
    return [_char_response(c) for c in chars]


@app.get("/characters/{char_id}", summary="Detalii personaj")
def get_character(
    char_id: str,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    char = _get_char_or_404(char_id, user.id, db)
    return _char_response(char)


@app.delete("/characters/{char_id}", summary="Sterge personaj")
def delete_character(
    char_id: str,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    char = _get_char_or_404(char_id, user.id, db)
    db.delete(char)
    db.commit()
    return {"message": "Personaj sters."}


def _get_char_or_404(char_id: str, user_id: str, db: Session) -> models.Character:
    char = db.query(models.Character).filter(
        models.Character.id == char_id,
        models.Character.user_id == user_id,
    ).first()
    if not char:
        raise HTTPException(404, "Personajul nu a fost gasit.")
    return char


def _char_response(char: models.Character) -> dict:
    return {
        "id": char.id,
        "name": char.name,
        "age": char.age,
        "description": char.description,
        "visual_prompt": char.visual_prompt,
        "avatar_url": char.avatar_url,
        "total_images_generated": char.total_images_generated,
        "created_at": char.created_at,
    }


# ═══════════════════════════════════════════════════════════
# CHAT  (1 credit / mesaj)
# ═══════════════════════════════════════════════════════════

@app.post("/chat", summary="Trimite mesaj text")
def chat(
    body: ChatRequest,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    char = _get_char_or_404(body.character_id, user.id, db)

    # Deducem creditul INAINTE sa generam raspunsul
    utils.deduct_credits(user, utils.COST_TEXT_MESSAGE, f"Chat cu {char.name}", db)

    # Salvam mesajul userului
    db.add(models.Message(
        character_id=char.id,
        sender="user",
        content=body.message,
        credits_cost=0,
    ))
    db.flush()

    # Luam istoricul pentru context AI
    history = (
        db.query(models.Message)
        .filter(models.Message.character_id == char.id)
        .order_by(models.Message.timestamp.asc())
        .all()
    )

    # Generam raspunsul
    ai_text = llm.generate_response(history, char)

    # Salvam raspunsul AI
    db.add(models.Message(
        character_id=char.id,
        sender="ai",
        content=ai_text,
        credits_cost=utils.COST_TEXT_MESSAGE,
    ))

    db.commit()
    db.refresh(user)

    return {
        "response": ai_text,
        "credits": user.credits,
        "level": user.level,
    }


# ═══════════════════════════════════════════════════════════
# IMAGE GENERATION  (7 credite SFW / 15 credite NSFW)
# ═══════════════════════════════════════════════════════════

@app.post("/images/generate", summary="Genereaza poza")
def generate_image(
    body: ImageRequest,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    char = _get_char_or_404(body.character_id, user.id, db)

    cost = utils.COST_IMAGE_NSFW if body.nsfw else utils.COST_IMAGE_NORMAL
    label = "NSFW" if body.nsfw else "normala"

    # Deducem creditele
    utils.deduct_credits(user, cost, f"Poza {label} cu {char.name}", db)

    # Generam prin Replicate
    try:
        image_url = image_gen.generate_image(
            visual_prompt=char.visual_prompt,
            scenario=body.scenario,
            nsfw=body.nsfw,
            seed=char.seed,
        )
    except RuntimeError as e:
        # Daca Replicate esueaza, refundam creditele
        utils.add_credits(user, cost, "Refund - eroare la generare imagine", db, transaction_type="refund")
        db.commit()
        raise HTTPException(500, f"Generarea imaginii a esuat: {str(e)}")

    # Salvam in galerie
    img_record = models.ImageGeneration(
        user_id=user.id,
        character_id=char.id,
        prompt=body.scenario,
        nsfw=body.nsfw,
        credits_cost=cost,
        image_url=image_url,
    )
    db.add(img_record)

    # Salvam ca mesaj in conversatie
    db.add(models.Message(
        character_id=char.id,
        sender="ai",
        content=f"[photo: {body.scenario}]",
        is_image=True,
        image_url=image_url,
        credits_cost=cost,
    ))

    char.total_images_generated += 1
    db.commit()
    db.refresh(user)

    return {
        "image_url": image_url,
        "image_id": img_record.id,
        "credits": user.credits,
        "level": user.level,
        "credits_spent": cost,
    }


# ═══════════════════════════════════════════════════════════
# HISTORY
# ═══════════════════════════════════════════════════════════

@app.get("/chat/history/{char_id}", summary="Istoricul conversatiei")
def get_history(
    char_id: str,
    limit: int = 50,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    char = _get_char_or_404(char_id, user.id, db)

    messages = (
        db.query(models.Message)
        .filter(models.Message.character_id == char.id)
        .order_by(models.Message.timestamp.asc())
        .limit(limit)
        .all()
    )

    return [
        {
            "id": m.id,
            "sender": m.sender,
            "content": m.content,
            "is_image": m.is_image,
            "image_url": m.image_url,
            "credits_cost": m.credits_cost,
            "timestamp": m.timestamp,
        }
        for m in messages
    ]


# ═══════════════════════════════════════════════════════════
# GALERIE
# ═══════════════════════════════════════════════════════════

@app.get("/images/gallery", summary="Galeria imaginilor generate")
def get_gallery(
    limit: int = 20,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    images = (
        db.query(models.ImageGeneration)
        .filter(models.ImageGeneration.user_id == user.id)
        .order_by(models.ImageGeneration.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": img.id,
            "character_id": img.character_id,
            "image_url": img.image_url,
            "nsfw": img.nsfw,
            "credits_cost": img.credits_cost,
            "liked": img.liked,
            "created_at": img.created_at,
        }
        for img in images
    ]


@app.patch("/images/{image_id}/like", summary="Like / unlike imagine")
def toggle_like(
    image_id: str,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    img = db.query(models.ImageGeneration).filter(
        models.ImageGeneration.id == image_id,
        models.ImageGeneration.user_id == user.id,
    ).first()
    if not img:
        raise HTTPException(404, "Imaginea nu a fost gasita.")
    img.liked = not img.liked
    db.commit()
    return {"liked": img.liked}


# ═══════════════════════════════════════════════════════════
# CREDITE & STRIPE
# ═══════════════════════════════════════════════════════════

@app.get("/credits/packages", summary="Pachete disponibile")
def get_packages(db: Session = Depends(database.get_db)):
    pkgs = db.query(models.CreditPackage).filter(models.CreditPackage.is_active == True).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "credits": p.credits,
            "bonus_credits": p.bonus_credits,
            "total_credits": p.credits + p.bonus_credits,
            "price_eur": p.price_eur,
            "stripe_price_id": p.stripe_price_id,
        }
        for p in pkgs
    ]


@app.post("/credits/checkout", summary="Creeaza sesiune Stripe Checkout")
def create_checkout(
    body: StripeCheckoutRequest,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    pkg = db.query(models.CreditPackage).filter(
        models.CreditPackage.id == body.package_id,
        models.CreditPackage.is_active == True,
    ).first()
    if not pkg:
        raise HTTPException(404, "Pachetul nu a fost gasit.")

    if not stripe.api_key:
        raise HTTPException(500, "Stripe nu este configurat. Adauga STRIPE_SECRET_KEY in .env")

    try:
        # Daca pachetul are stripe_price_id setat, folosim Price din Stripe Dashboard
        # Altfel cream un price dinamic
        if pkg.stripe_price_id:
            line_items = [{"price": pkg.stripe_price_id, "quantity": 1}]
        else:
            # Price dinamic - nu necesita configurare in Stripe Dashboard
            line_items = [{
                "price_data": {
                    "currency": "eur",
                    "unit_amount": int(pkg.price_eur * 100),  # in eurocenti
                    "product_data": {
                        "name": f"BunnyCrush - {pkg.name}",
                        "description": f"{pkg.credits + pkg.bonus_credits} credite ({pkg.credits} + {pkg.bonus_credits} bonus)",
                    },
                },
                "quantity": 1,
            }]

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=body.success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=body.cancel_url,
            client_reference_id=user.id,   # legam sesiunea de userul nostru
            metadata={
                "user_id": user.id,
                "package_id": pkg.id,
                "credits": str(pkg.credits + pkg.bonus_credits),
            },
        )
        return {"checkout_url": session.url, "session_id": session.id}

    except stripe.error.StripeError as e:
        raise HTTPException(400, f"Eroare Stripe: {str(e)}")


@app.post("/credits/webhook", summary="Stripe webhook - procesare plati")
async def stripe_webhook(request: Request):
    """
    Stripe trimite un POST aici dupa fiecare plata.
    Trebuie configurat in Stripe Dashboard -> Webhooks -> Add endpoint
    URL: https://your-railway-app.railway.app/credits/webhook
    Event: checkout.session.completed
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    # Verificam semnatura Stripe (securitate)
    try:
        if STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
        else:
            # In development fara webhook secret
            import json
            event = json.loads(payload)
    except Exception as e:
        raise HTTPException(400, f"Webhook error: {str(e)}")

    # Procesam doar platile completate
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        user_id = session.get("metadata", {}).get("user_id")
        credits_str = session.get("metadata", {}).get("credits")
        package_id = session.get("metadata", {}).get("package_id")
        stripe_payment_id = session.get("payment_intent")

        if user_id and credits_str:
            db = database.SessionLocal()
            try:
                user = db.query(models.User).filter(models.User.id == user_id).first()
                if user:
                    credits = int(credits_str)
                    utils.add_credits(
                        user=user,
                        amount=credits,
                        description=f"Achizitie pachet {package_id} ({credits} credite)",
                        db=db,
                        transaction_type="purchase",
                        stripe_payment_id=stripe_payment_id,
                    )
                    db.commit()
                    print(f"✅ Adaugate {credits} credite pentru user {user_id}")
            except Exception as e:
                print(f"❌ Webhook processing error: {e}")
                db.rollback()
            finally:
                db.close()

    return {"status": "ok"}


@app.get("/credits/transactions", summary="Istoricul tranzactiilor")
def get_transactions(
    limit: int = 20,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    txs = (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == user.id)
        .order_by(models.Transaction.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "type": t.type,
            "amount": t.amount,
            "description": t.description,
            "status": t.status,
            "created_at": t.created_at,
        }
        for t in txs
    ]


# ═══════════════════════════════════════════════════════════
# HEALTH CHECK
# ═══════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}