from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
import random

import models
import database
import utils
import llm
import image_gen

# ── Initializare DB ───────────────────────────────────────────────────────────
models.Base.metadata.create_all(bind=database.engine)
_init_packages_done = False


def seed_credit_packages(db: Session):
    """Creeaza pachetele de credite daca nu exista."""
    packages = [
        {"id": "starter",    "name": "Starter",    "credits": 50,   "price_usd": 4.99,  "bonus_credits": 0},
        {"id": "popular",    "name": "Popular",    "credits": 150,  "price_usd": 9.99,  "bonus_credits": 25},
        {"id": "best_value", "name": "Best Value", "credits": 500,  "price_usd": 24.99, "bonus_credits": 150},
        {"id": "premium",    "name": "Premium",    "credits": 1000, "price_usd": 39.99, "bonus_credits": 400},
    ]
    for pkg_data in packages:
        if not db.query(models.CreditPackage).filter_by(id=pkg_data["id"]).first():
            db.add(models.CreditPackage(**pkg_data))
    db.commit()


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="BunnyCrush API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    db = database.SessionLocal()
    try:
        seed_credit_packages(db)
    finally:
        db.close()


# ── Schemas ───────────────────────────────────────────────────────────────────
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
    description: str      # Personalitate
    visual_prompt: str    # Aspect fizic


class ChatRequest(BaseModel):
    character_id: str
    message: str
    request_image: bool = False
    nsfw_level: int = 0   # 0=Safe, 1=Suggestive, 2=Explicit


class ChatResponse(BaseModel):
    response: str
    image_url: Optional[str] = None
    credits: int
    level: int
    credits_spent: int


class ImageRequest(BaseModel):
    character_id: str
    scenario: str
    nsfw_level: int = 0  # 0, 1, sau 2


class AddCreditsManual(BaseModel):
    user_id: str
    amount: int
    description: str = "Manual top-up"


# ── AUTH ──────────────────────────────────────────────────────────────────────
@app.post("/register", summary="Inregistrare cont nou")
def register(user: UserRegister, db: Session = Depends(database.get_db)):
    # Verificam email duplicat
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email-ul este deja folosit.")

    # Verificam username duplicat (daca e dat)
    if user.username and db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Username-ul este deja folosit.")

    if len(user.password) < 6:
        raise HTTPException(status_code=400, detail="Parola trebuie sa aiba minim 6 caractere.")

    new_user = models.User(
        email=user.email,
        username=user.username,
        hashed_password=utils.get_password_hash(user.password),
        credits=50,  # bonus la signup
    )
    db.add(new_user)
    db.flush()  # obtinem ID-ul inainte de commit

    # Logam tranzactia de bonus signup
    utils.add_credits(
        user=new_user,
        amount=50,
        description="Bonus de bun venit 🎉",
        db=db,
        transaction_type="bonus_signup",
    )

    db.commit()
    db.refresh(new_user)

    token = utils.create_access_token({"sub": new_user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": new_user.id,
        "credits": new_user.credits,
        "level": new_user.level,
    }


@app.post("/login", summary="Autentificare")
def login(user: UserLogin, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if not db_user or not utils.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Email sau parola incorecta.")

    # Update last_login
    db_user.last_login = datetime.utcnow()
    db.commit()

    token = utils.create_access_token({"sub": db_user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user_id": db_user.id,
        "credits": db_user.credits,
        "level": db_user.level,
    }


@app.get("/me", summary="Datele contului curent")
def get_me(user: models.User = Depends(utils.get_current_user)):
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


# ── CHARACTERS ────────────────────────────────────────────────────────────────
@app.post("/characters", summary="Creeaza personaj nou")
def create_character(
    char: CharacterCreate,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    # Generam seed fix pt consistenta vizuala
    seed = random.randint(1, 999999)

    # Generam avatar initial (safe, portret)
    avatar = image_gen.generate_avatar_url(char.visual_prompt, seed=seed)

    new_char = models.Character(
        user_id=user.id,
        name=char.name,
        age=char.age,
        description=char.description,
        visual_prompt=char.visual_prompt,
        avatar_url=avatar,
        seed=seed,
    )
    db.add(new_char)
    db.commit()
    db.refresh(new_char)

    return {
        "id": new_char.id,
        "name": new_char.name,
        "age": new_char.age,
        "avatar_url": new_char.avatar_url,
        "created_at": new_char.created_at,
    }


@app.get("/characters", summary="Lista personajelor mele")
def get_characters(
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    chars = db.query(models.Character).filter(models.Character.user_id == user.id).all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "age": c.age,
            "avatar_url": c.avatar_url,
            "description": c.description,
            "total_images_generated": c.total_images_generated,
            "created_at": c.created_at,
        }
        for c in chars
    ]


@app.get("/characters/{character_id}", summary="Detalii personaj")
def get_character(
    character_id: str,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    char = db.query(models.Character).filter(
        models.Character.id == character_id,
        models.Character.user_id == user.id,
    ).first()

    if not char:
        raise HTTPException(404, "Personajul nu a fost gasit.")

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


@app.delete("/characters/{character_id}", summary="Sterge personaj")
def delete_character(
    character_id: str,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    char = db.query(models.Character).filter(
        models.Character.id == character_id,
        models.Character.user_id == user.id,
    ).first()

    if not char:
        raise HTTPException(404, "Personajul nu a fost gasit.")

    db.delete(char)
    db.commit()
    return {"message": "Personaj sters."}


# ── CHAT ──────────────────────────────────────────────────────────────────────
@app.post("/chat", response_model=ChatResponse, summary="Trimite mesaj / cere poza")
def chat(
    req: ChatRequest,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    # Verificam ca personajul apartine userului
    char = db.query(models.Character).filter(
        models.Character.id == req.character_id,
        models.Character.user_id == user.id,
    ).first()
    if not char:
        raise HTTPException(404, "Personajul nu a fost gasit.")

    # Validam nsfw_level
    nsfw_level = max(0, min(2, req.nsfw_level))

    ai_response_text = ""
    ai_image_url = None
    cost = 0

    # ── Salvam mesajul userului ───────────────────────────────
    user_msg = models.Message(
        character_id=char.id,
        sender="user",
        content=req.message,
        credits_cost=0,
    )
    db.add(user_msg)

    # ── Logica principala ─────────────────────────────────────
    if req.request_image:
        # Calculam costul in functie de nsfw_level
        cost = utils.CREDIT_COSTS[f"image_{nsfw_level}"]

        # Verificam si deducem creditele (arunca 402 daca insuficiente)
        utils.deduct_credits(
            user=user,
            amount=cost,
            description=f"Poza {['safe', 'sugestiva', 'explicita'][nsfw_level]} cu {char.name}",
            db=db,
            character_id=char.id,
        )

        # Generam poza
        ai_image_url = image_gen.generate_image_url(
            visual_prompt=char.visual_prompt,
            scenario=req.message,
            nsfw_level=nsfw_level,
            seed=char.seed,  # seed consistent pt personaj
        )

        # Incrementam contorul de poze
        char.total_images_generated += 1

        # Logam in image_generations
        img_gen = models.ImageGeneration(
            user_id=user.id,
            character_id=char.id,
            prompt=req.message,
            nsfw_level=nsfw_level,
            credits_cost=cost,
            image_url=ai_image_url,
        )
        db.add(img_gen)

        ai_response_text = "Here's a photo just for you, baby 📸 Do you like it? 💋"

    else:
        # ── Chat text ─────────────────────────────────────────
        cost = utils.CREDIT_COSTS["text_message"]

        utils.deduct_credits(
            user=user,
            amount=cost,
            description=f"Mesaj text cu {char.name}",
            db=db,
        )

        # Luam istoricul pt context AI
        history = (
            db.query(models.Message)
            .filter(models.Message.character_id == char.id)
            .order_by(models.Message.timestamp.asc())
            .all()
        )

        ai_response_text = llm.generate_response(history, char)

    # ── Salvam raspunsul AI ───────────────────────────────────
    ai_msg = models.Message(
        character_id=char.id,
        sender="ai",
        content=ai_response_text,
        is_image=(ai_image_url is not None),
        image_url=ai_image_url,
        credits_cost=cost,
    )
    db.add(ai_msg)
    db.commit()
    db.refresh(user)

    return {
        "response": ai_response_text,
        "image_url": ai_image_url,
        "credits": user.credits,
        "level": user.level,
        "credits_spent": cost,
    }


# ── HISTORY ───────────────────────────────────────────────────────────────────
@app.get("/history/{character_id}", summary="Istoric conversatie")
def get_chat_history(
    character_id: str,
    limit: int = 50,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    # Verificam ca personajul apartine userului
    char = db.query(models.Character).filter(
        models.Character.id == character_id,
        models.Character.user_id == user.id,
    ).first()
    if not char:
        raise HTTPException(404, "Personajul nu a fost gasit.")

    messages = (
        db.query(models.Message)
        .filter(models.Message.character_id == character_id)
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


# ── CREDITS & TRANSACTIONS ────────────────────────────────────────────────────
@app.get("/credits/packages", summary="Pachete de credite disponibile")
def get_credit_packages(db: Session = Depends(database.get_db)):
    packages = db.query(models.CreditPackage).filter(models.CreditPackage.is_active == True).all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "credits": p.credits,
            "bonus_credits": p.bonus_credits,
            "total_credits": p.credits + p.bonus_credits,
            "price_usd": p.price_usd,
        }
        for p in packages
    ]


@app.get("/credits/transactions", summary="Istoricul tranzactiilor")
def get_transactions(
    limit: int = 20,
    db: Session = Depends(database.get_db),
    user: models.User = Depends(utils.get_current_user),
):
    transactions = (
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
        for t in transactions
    ]


@app.get("/gallery", summary="Galeria pozelor generate")
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
            "nsfw_level": img.nsfw_level,
            "credits_cost": img.credits_cost,
            "liked": img.liked,
            "created_at": img.created_at,
        }
        for img in images
    ]


@app.patch("/gallery/{image_id}/like", summary="Like / unlike poza")
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


# ── HEALTH CHECK ──────────────────────────────────────────────────────────────
@app.get("/health", summary="Health check Railway")
def health_check():
    return {"status": "ok", "version": "2.0.0"}
