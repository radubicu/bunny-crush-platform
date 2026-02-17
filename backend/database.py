from sqlalchemy import create_engine, Column, String, Integer, JSON, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
import uuid

Base = declarative_base()

# --- Modele Tabele ---
class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    username = Column(String, unique=True, index=True)
    credits = Column(Integer, default=10)
    total_spent = Column(Float, default=0.0)
    is_premium = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, default=datetime.utcnow)
    
    characters = relationship("Character", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    image_generations = relationship("ImageGeneration", back_populates="user", cascade="all, delete-orphan")

class Character(Base):
    __tablename__ = "characters"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'))
    name = Column(String, nullable=False)
    age = Column(Integer, default=24)
    appearance = Column(JSON)
    personality = Column(JSON)
    seed = Column(Integer)
    total_images_generated = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    user = relationship("User", back_populates="characters")
    conversations = relationship("Conversation", back_populates="character", cascade="all, delete-orphan")

class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    character_id = Column(String, ForeignKey('characters.id', ondelete='CASCADE'))
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'))
    messages = Column(JSON)
    total_messages = Column(Integer, default=0)
    credits_spent = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    character = relationship("Character", back_populates="conversations")

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'))
    type = Column(String)
    amount = Column(Integer)
    cost_usd = Column(Float, default=0.0)
    description = Column(String)
    stripe_payment_id = Column(String, nullable=True)
    status = Column(String, default='completed')
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    user = relationship("User", back_populates="transactions")

class ImageGeneration(Base):
    __tablename__ = "image_generations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id', ondelete='CASCADE'))
    character_id = Column(String, ForeignKey('characters.id', ondelete='SET NULL'), nullable=True)
    prompt = Column(String)
    nsfw_level = Column(Integer)
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

# --- Conexiunea la Baza de Date ---

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Fix pentru URL-uri de Postgres vechi (Railway/Heroku)
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configurare Engine
if "sqlite" in DATABASE_URL:
    # Setări specifice SQLite (Local)
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    # Setări specifice PostgreSQL (Production/Railway)
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Helpers pentru Credite
def add_credits(user_id: str, amount: int, description: str = "Purchase") -> bool:
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        if user:
            user.credits += amount
            transaction = Transaction(
                user_id=user_id,
                type='purchase' if amount > 0 else 'usage',
                amount=amount,
                description=description
            )
            db.add(transaction)
            db.commit()
            return True
        return False
    except Exception as e:
        print(f"Error adding credits: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def deduct_credits(user_id: str, amount: int, description: str = "Image generation") -> bool:
    return add_credits(user_id, -amount, description)

def check_credits(user_id: str, required: int) -> bool:
    db = SessionLocal()
    try:
        user = db.query(User).filter_by(id=user_id).first()
        return user and user.credits >= required
    finally:
        db.close()

def init_db():
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Error creating database tables: {e}")

def init_credit_packages():
    """Initialize credit packages"""
    db = SessionLocal()
    
    packages = [
        {"id": "starter", "name": "Starter", "credits": 50, "price_usd": 4.99, "bonus_credits": 0},
        {"id": "popular", "name": "Popular", "credits": 150, "price_usd": 9.99, "bonus_credits": 25},
        {"id": "best_value", "name": "Best Value", "credits": 500, "price_usd": 24.99, "bonus_credits": 150},
        {"id": "premium", "name": "Premium", "credits": 1000, "price_usd": 39.99, "bonus_credits": 400}
    ]
    
    try:
        for pkg_data in packages:
            existing = db.query(CreditPackage).filter_by(id=pkg_data["id"]).first()
            if not existing:
                pkg = CreditPackage(**pkg_data)
                db.add(pkg)
        db.commit()
        print("✅ Credit packages initialized")
    except:
        db.rollback()
    finally:
        db.close()