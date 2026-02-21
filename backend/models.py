from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)

    credits = Column(Integer, default=10)       # 10 credite gratuite la inregistrare
    total_spent = Column(Integer, default=0)    # total credite cheltuite (pt nivel)
    level = Column(Integer, default=1)          # 1-5, calculat automat

    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)

    characters = relationship("Character", back_populates="creator", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    image_generations = relationship("ImageGeneration", back_populates="user", cascade="all, delete-orphan")


class Character(Base):
    __tablename__ = "characters"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))

    name = Column(String, nullable=False)
    age = Column(Integer, default=24)
    description = Column(Text)       # Personalitate / persona
    visual_prompt = Column(Text)     # Aspect fizic (pentru image gen)
    avatar_url = Column(String, nullable=True)
    seed = Column(Integer, default=None)  # Seed fix pentru consistenta vizuala

    total_images_generated = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    creator = relationship("User", back_populates="characters")
    messages = relationship("Message", back_populates="character", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=gen_uuid)
    character_id = Column(String, ForeignKey("characters.id", ondelete="CASCADE"))

    sender = Column(String)            # "user" sau "ai"
    content = Column(Text)
    is_image = Column(Boolean, default=False)
    image_url = Column(String, nullable=True)
    credits_cost = Column(Integer, default=0)

    timestamp = Column(DateTime, default=datetime.utcnow)

    character = relationship("Character", back_populates="messages")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))

    type = Column(String)              # "purchase", "usage", "bonus_signup"
    amount = Column(Integer)           # pozitiv = adaugat, negativ = dedus
    description = Column(String)
    stripe_payment_id = Column(String, nullable=True)
    status = Column(String, default="completed")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="transactions")


class ImageGeneration(Base):
    __tablename__ = "image_generations"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"))
    character_id = Column(String, ForeignKey("characters.id", ondelete="SET NULL"), nullable=True)

    prompt = Column(Text)
    nsfw_level = Column(Integer, default=0)   # 0=Safe, 1=Suggestive, 2=Explicit
    credits_cost = Column(Integer)
    image_url = Column(String)
    liked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    user = relationship("User", back_populates="image_generations")


class CreditPackage(Base):
    __tablename__ = "credit_packages"

    id = Column(String, primary_key=True)
    name = Column(String)
    credits = Column(Integer)
    price_usd = Column(Float)
    bonus_credits = Column(Integer, default=0)
    stripe_price_id = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
