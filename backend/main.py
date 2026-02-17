from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import os
from dotenv import load_dotenv
import uuid
from passlib.context import CryptContext
import jwt
from datetime import datetime, timedelta
import re

# Import module locale
from llm_handler import generate_nsfw_response
from image_generator import generate_image_from_chat
from database import (
    User, Character, Transaction, ImageGeneration, CreditPackage,
    SessionLocal, add_credits, deduct_credits, check_credits, init_db, get_db
)
from sqlalchemy.orm import Session

load_dotenv()

app = FastAPI(title="AI Girlfriend Platform")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Permite tot pentru testare rapida
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "generated_images")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/images", StaticFiles(directory=UPLOAD_DIR), name="images")

# Auth Config
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fallback_secret_key_for_dev_only")
ALGORITHM = "HS256"

# --- Pydantic Models ---
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str
    character_id: Optional[str] = None
    conversation_history: Optional[List[Message]] = []

class CreateCharacterRequest(BaseModel):
    name: str
    age: int = 24
    appearance: dict
    personality: dict

# --- Auth Functions ---
def create_access_token(user_id: str):
    expire = datetime.utcnow() + timedelta(days=30)
    payload = {"user_id": user_id, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        
        db = SessionLocal()
        user = db.query(User).filter_by(id=user_id).first()
        db.close()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# --- Routes ---
@app.on_event("startup")
def on_startup():
    init_db()
    from database import init_credit_packages
    init_credit_packages()

@app.get("/")
def read_root():
    return {"status": "online", "service": "AI Girlfriend Backend"}

@app.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter_by(email=req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = User(
        email=req.email,
        username=req.username or req.email.split("@")[0],
        password_hash=pwd_context.hash(req.password),
        credits=10
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    token = create_access_token(new_user.id)
    return {"token": token, "user_id": new_user.id, "credits": new_user.credits}

@app.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter_by(email=req.email).first()
    if not user or not pwd_context.verify(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token(user.id)
    return {"token": token, "user_id": user.id, "credits": user.credits}

@app.get("/user/me")
def get_me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "credits": user.credits
    }

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "checks": {
            "database": True,
            "openrouter": bool(os.getenv("OPENROUTER_API_KEY")),
            "storage": os.path.exists(UPLOAD_DIR)
        }
    }
@app.post("/chat/generate-image")
def generate_image_confirmed(
    req: dict,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate image after user confirmation"""
    
    char_id = req.get('character_id')
    ai_message = req.get('ai_message')
    
    char = db.query(Character).filter_by(id=char_id, user_id=user.id).first()
    if not char:
        raise HTTPException(status_code=404, detail="Character not found")
    
    # Generate image
    result = generate_image_from_chat(
        char.name,
        char.appearance,
        ai_message,
        user.credits,
        seed=char.seed
    )
    
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    
    # Build URL
    image_filename = os.path.basename(result['image_path'])
    if os.getenv("ENVIRONMENT") == "development":
        image_url = f"http://localhost:8000/images/{image_filename}"
    else:
        image_url = f"{os.getenv('BASE_URL')}/images/{image_filename}"
    
    credits_used = result['credits_used']
    nsfw_level = result['nsfw_level']
    
    # Deduct credits
    user.credits -= credits_used
    user.total_spent += credits_used * 0.1  # $0.10 per credit
    db.commit()
    
    # Log
    gen_log = ImageGeneration(
        user_id=user.id,
        character_id=char.id,
        prompt=ai_message[:200],
        nsfw_level=nsfw_level,
        credits_cost=credits_used,
        image_url=image_url
    )
    db.add(gen_log)
    
    char.total_images_generated += 1
    db.commit()
    
    return {
        "success": True,
        "image_url": image_url,
        "credits_remaining": user.credits,
        "credits_used": credits_used,
        "nsfw_level": nsfw_level
    }

@app.post("/chat")
def chat_endpoint(req: ChatRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Enhanced chat with NSFW tiers and confirmation"""
    
    # 1. Load character
    if req.character_id:
        char = db.query(Character).filter_by(id=req.character_id, user_id=user.id).first()
        if not char:
            raise HTTPException(status_code=404, detail="Character not found")
    else:
        char = db.query(Character).filter_by(user_id=user.id).first()
        if not char:
            raise HTTPException(status_code=400, detail="Please create a character first!")
    
    # 2. Determine NSFW tier based on total_spent
    if user.total_spent >= 100:
        max_nsfw_level = 4  # Full access
    elif user.total_spent >= 50:
        max_nsfw_level = 3  # Nude allowed
    elif user.total_spent >= 25:
        max_nsfw_level = 2  # Lingerie
    elif user.total_spent >= 10:
        max_nsfw_level = 1  # Flirty
    else:
        max_nsfw_level = 0  # SFW only
    
    print(f"💎 User spent: ${user.total_spent} → Max NSFW: {max_nsfw_level}")
    
    # 3. Build appearance/personality
    appearance_str = f"{char.appearance.get('hair', 'hair')}, {char.appearance.get('eyes', 'eyes')} eyes, {char.appearance.get('body', 'body')} body"
    
    boldness = char.personality.get('boldness', 5)
    kinkiness = char.personality.get('kinkiness', 5)
    
    personality_str = ""
    if boldness > 7:
        personality_str = "very bold, confident, dominant"
    elif boldness > 4:
        personality_str = "confident, flirty"
    else:
        personality_str = "shy, sweet"
    
    if kinkiness > 7:
        personality_str += ", very kinky, explicit"
    elif kinkiness > 4:
        personality_str += ", playful, teasing"
    else:
        personality_str += ", romantic, vanilla"
    
    # 4. LLM Response
    history_dicts = [{"role": m.role, "content": m.content} for m in req.conversation_history]
    
    ai_text = generate_nsfw_response(
        req.message,
        char.name,
        char.age,
        appearance_str,
        personality_str,
        history_dicts
    )
    
    # 5. Detect if image is needed
    image_data = None
    
    if "*" in ai_text:
        from image_generator import parse_action_from_message
        
        action_data = parse_action_from_message(ai_text)
        proposed_nsfw_level = action_data['nsfw_level']
        
        # Check if user has access to this NSFW level
        if proposed_nsfw_level > max_nsfw_level:
            print(f"🚫 User tried NSFW level {proposed_nsfw_level}, max allowed: {max_nsfw_level}")
            
            return {
                "response": ai_text,
                "image_url": None,
                "credits_remaining": user.credits,
                "credits_used": 0,
                "requires_confirmation": False,
                "blocked": True,
                "blocked_message": f"🔒 Unlock Level {proposed_nsfw_level} content by spending ${[0, 10, 25, 50, 100][proposed_nsfw_level]}+ total!",
                "character_name": char.name
            }
        
        # Calculate cost
        cost_map = {0: 0, 1: 2, 2: 5, 3: 10, 4: 20}
        credits_needed = cost_map[proposed_nsfw_level]
        
        # Return for confirmation (frontend will ask)
        return {
            "response": ai_text,
            "image_url": None,
            "credits_remaining": user.credits,
            "credits_used": 0,
            "requires_confirmation": True,
            "confirmation_data": {
                "nsfw_level": proposed_nsfw_level,
                "credits_cost": credits_needed,
                "message": f"Generate this image? ({credits_needed} credits)"
            },
            "character_name": char.name
        }
    
    # No image needed
    return {
        "response": ai_text,
        "image_url": None,
        "credits_remaining": user.credits,
        "credits_used": 0,
        "requires_confirmation": False,
        "character_name": char.name
    }

@app.post("/characters")
def create_character(req: CreateCharacterRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_char = Character(
        user_id=user.id,
        name=req.name,
        age=req.age,
        appearance=req.appearance,
        personality=req.personality
    )
    db.add(new_char)
    db.commit()
    db.refresh(new_char)
    return {"success": True, "character_id": new_char.id}

@app.get("/characters")
def list_characters(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    chars = db.query(Character).filter_by(user_id=user.id).all()
    return {"characters": chars}