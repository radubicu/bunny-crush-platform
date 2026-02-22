from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import os

import database
import models

# ── Configurare JWT ───────────────────────────────────────────────────────────
_DEFAULT_SECRET = "SCHIMBA_IN_PRODUCTIE_foloseste_openssl_rand_hex_32"
SECRET_KEY = os.getenv("JWT_SECRET_KEY", _DEFAULT_SECRET)
if SECRET_KEY == _DEFAULT_SECRET and os.getenv("ENVIRONMENT") != "development":
    raise RuntimeError("JWT_SECRET_KEY must be set in production! Generate one with: openssl rand -hex 32")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ── Costuri credite ───────────────────────────────────────────────────────────
# nsfw_level: 0 = Safe, 1 = Suggestive, 2 = Explicit
CREDIT_COSTS = {
    "text_message": 1,    # 1 credit / mesaj text
    "image_0": 7,         # 7 credite / poza safe (am actualizat cu pretul dorit de tine)
    "image_1": 10,        # 10 credite / poza sugestiva
    "image_2": 15,        # 15 credite / poza explicita (NSFW full)
}

COST_TEXT_MESSAGE = 1
COST_IMAGE_NORMAL = 7
COST_IMAGE_NSFW = 15

# ── Parole ────────────────────────────────────────────────────────────────────
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT ───────────────────────────────────────────────────────────────────────
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalid sau expirat",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user


# ── Credit helpers ────────────────────────────────────────────────────────────
def recalculate_level(user: models.User) -> int:
    """
    Nivel calculat din total_spent:
    Level 1:   0 - 49 credite cheltuite
    Level 2:  50 - 149
    Level 3: 150 - 299
    Level 4: 300 - 499
    Level 5: 500+
    """
    thresholds = [0, 50, 150, 300, 500]
    level = 1
    for i, threshold in enumerate(thresholds):
        if user.total_spent >= threshold:
            level = i + 1
    return min(level, 5)


def deduct_credits(
    user: models.User,
    amount: int,
    description: str,
    db: Session,
    character_id: str = None,
) -> None:
    """
    Scade creditele, actualizeaza total_spent + level, logheaza tranzactia.
    Arunca HTTPException 402 daca nu sunt suficiente credite.
    """
    if user.credits < amount:
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. You need {amount}, and you have {user.credits}."
        )

    user.credits -= amount
    user.total_spent += amount
    user.level = recalculate_level(user)

    transaction = models.Transaction(
        user_id=user.id,
        type="usage",
        amount=-amount,
        description=description,
        status="completed"
    )
    db.add(transaction)


def add_credits(
    user: models.User,
    amount: int,
    description: str,
    db: Session,
    transaction_type: str = "purchase",
    stripe_payment_id: str = None,
) -> None:
    """Adauga credite si logheaza tranzactia."""
    user.credits += amount

    transaction = models.Transaction(
        user_id=user.id,
        type=transaction_type,
        amount=amount,
        description=description,
        stripe_payment_id=stripe_payment_id,
        status="completed"
    )
    db.add(transaction)
