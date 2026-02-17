from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    # Economie
    credits = Column(Integer, default=50)       # Balanta curenta
    total_spent = Column(Integer, default=0)    # Total cheltuit (pentru nivel)
    level = Column(Integer, default=1)          # 1-5 (Calculat automat)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    characters = relationship("Character", back_populates="creator")

class Character(Base):
    __tablename__ = "characters"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    
    name = Column(String)
    description = Column(Text)          # Persona (ex: "Flirty, 24 years old...")
    visual_prompt = Column(Text)        # Aspect (ex: "blonde, blue eyes, fit body")
    avatar_url = Column(String)
    
    creator = relationship("User", back_populates="characters")
    messages = relationship("Message", back_populates="character")

class Message(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    character_id = Column(Integer, ForeignKey("characters.id"))
    
    sender = Column(String)  # "user" sau "ai"
    content = Column(Text)   # Textul mesajului
    
    is_image = Column(Boolean, default=False)
    image_url = Column(String, nullable=True)
    
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    character = relationship("Character", back_populates="messages")