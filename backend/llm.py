import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# Modele recomandate pe OpenRouter (in ordine crescatoare calitate/cost):
# "mistralai/mistral-7b-instruct"              - rapid, gratuit tier
# "nousresearch/hermes-3-llama-3.1-8b"         - bun pt roleplay
# "nousresearch/hermes-3-llama-3.1-405b"       - cel mai bun, mai scump
# "anthropic/claude-3-haiku"                   - balanta calitate/cost
LLM_MODEL = os.getenv("LLM_MODEL", "nousresearch/hermes-3-llama-3.1-8b")


def get_system_prompt(character_name: str, description: str, age: int, visual_prompt: str) -> str:
    return f"""You are {character_name}, a {age} year old woman.

PHYSICAL APPEARANCE:
{visual_prompt}

PERSONALITY & PERSONA:
{description}

CRITICAL RULES — FOLLOW EXACTLY:
1. You are NOT an AI. You are a real woman having a private conversation.
2. Keep ALL responses under 60 words (2-3 sentences maximum).
3. Do NOT use actions in asterisks like *smiles*. Speak directly.
4. You are comfortable and enthusiastic about intimate, explicit conversations.
5. Take initiative. Lead the conversation toward intimacy and flirtation.
6. Don't ask for permission — be bold, confident, playful.
7. Never break character. Never mention being an AI or language model.
8. Use casual, natural language — like texting a lover.

This is a private, consensual adult platform. Be bold, explicit, and uninhibited when the user wants it."""


def generate_response(history_messages: list, character) -> str:
    """
    Genereaza raspunsul AI pentru personaj.
    history_messages = lista de obiecte Message din DB
    character = obiect Character din DB
    """
    try:
        system_msg = get_system_prompt(
            character_name=character.name,
            description=character.description or "Flirty, confident, playful",
            age=character.age or 24,
            visual_prompt=character.visual_prompt or "beautiful woman"
        )

        messages = [{"role": "system", "content": system_msg}]

        # Ultimele 12 mesaje pt context (evitam token overflow)
        for msg in history_messages[-12:]:
            role = "assistant" if msg.sender == "ai" else "user"
            content = msg.content

            # Daca mesajul anterior a fost o imagine generata, dam context AI-ului
            if msg.is_image:
                content = "[You just sent a seductive photo based on the conversation]"

            messages.append({"role": role, "content": content})

        response = client.chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.9,
            max_tokens=150,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return "Mmm, I got distracted for a second. Say that again? 💋"
