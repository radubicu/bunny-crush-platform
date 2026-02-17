from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List

# Import fisierele noastre
import models, database, utils, llm, image_gen

# Initializare DB
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SCHEMAS ---
class UserRegister(BaseModel):
    email: str
    password: str

class CharacterCreate(BaseModel):
    name: str
    description: str    # Personalitate
    visual_prompt: str  # Fizic

class ChatRequest(BaseModel):
    character_id: int
    message: str
    request_image: bool = False # Checkbox-ul din frontend "Send Image"

class ChatResponse(BaseModel):
    response: str
    image_url: Optional[str] = None
    credits: int
    level: int

# --- AUTH ROUTES ---
@app.post("/register")
def register(user: UserRegister, db: Session = Depends(database.get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email exists")
    
    hashed_pw = utils.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    
    token = utils.create_access_token({"sub": new_user.email})
    return {"access_token": token, "token_type": "bearer", "user_id": new_user.id}

@app.post("/login")
def login(user: UserRegister, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not utils.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    
    token = utils.create_access_token({"sub": db_user.email})
    return {"access_token": token, "token_type": "bearer", "user_id": db_user.id}

@app.get("/me")
def get_me(user: models.User = Depends(utils.get_current_user)):
    return {
        "email": user.email,
        "credits": user.credits,
        "level": user.level,
        "total_spent": user.total_spent
    }

# --- CHARACTER ROUTES ---
@app.post("/create-character")
def create_character(char: CharacterCreate, db: Session = Depends(database.get_db), user: models.User = Depends(utils.get_current_user)):
    # Generam un avatar initial
    avatar = image_gen.generate_image_url(char.visual_prompt, "portrait, smiling, looking at camera")
    
    new_char = models.Character(
        user_id=user.id,
        name=char.name,
        description=char.description,
        visual_prompt=char.visual_prompt,
        avatar_url=avatar
    )
    db.add(new_char)
    db.commit()
    return {"message": "Character created", "character": new_char}

@app.get("/my-characters")
def get_characters(db: Session = Depends(database.get_db), user: models.User = Depends(utils.get_current_user)):
    return user.characters

# --- CHAT & GAMEPLAY ROUTE (Cea mai importanta) ---
@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(database.get_db), user: models.User = Depends(utils.get_current_user)):
    
    # 1. Verificam caracterul
    char = db.query(models.Character).filter(models.Character.id == req.character_id).first()
    if not char: raise HTTPException(404, "Character not found")

    # 2. Salvam mesajul userului
    user_msg = models.Message(character_id=char.id, sender="user", content=req.message)
    db.add(user_msg)
    
    ai_response_text = ""
    ai_image_url = None
    cost = 0

    # 3. Logica: Userul vrea POZA sau TEXT?
    if req.request_image:
        # --- Modul POZA ---
        cost = 10
        if user.credits < cost:
            raise HTTPException(400, "Insuficiente credite! (Ai nevoie de 10)")
        
        # Generam poza
        ai_image_url = image_gen.generate_image_url(char.visual_prompt, req.message)
        ai_response_text = "Here is the photo, baby. Do you like it?"
        
    else:
        # --- Modul TEXT (Chat) ---
        # Luam istoricul pt context
        history = db.query(models.Message).filter(models.Message.character_id == char.id).all()
        ai_response_text = llm.generate_response(history, char.name, char.description)

    # 4. Tranzactie Financiara & Level Up
    if cost > 0:
        user.credits -= cost
        user.total_spent += cost
        
        # Calcul Level: Level 1 start. +1 Level la fiecare 50 credite cheltuite. Max 5.
        calculated_level = 1 + (user.total_spent // 50)
        user.level = min(calculated_level, 5) # Nu trece de 5

    # 5. Salvam raspunsul AI
    ai_msg = models.Message(
        character_id=char.id,
        sender="ai",
        content=ai_response_text,
        is_image=(ai_image_url is not None),
        image_url=ai_image_url
    )
    db.add(ai_msg)
    db.commit()

    return {
        "response": ai_response_text,
        "image_url": ai_image_url,
        "credits": user.credits,
        "level": user.level
    }

@app.get("/history/{character_id}")
def get_chat_history(character_id: int, db: Session = Depends(database.get_db), user: models.User = Depends(utils.get_current_user)):
    return db.query(models.Message).filter(models.Message.character_id == character_id).all()