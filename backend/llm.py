import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


def _get_client():
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY", "placeholder"),
    )

# ── Model recomandat ──────────────────────────────────────────────────────────
# nousresearch/hermes-3-llama-3.1-8b  -> rapid, bun pt roleplay NSFW, free tier
# nousresearch/hermes-3-llama-3.1-405b -> cel mai bun, platit
# undi-pro/toppy-m-7b:free             -> free, specializat adult content
# gryphe/mythomax-l2-13b               -> clasic pt roleplay, ieftin
LLM_MODEL = os.getenv("LLM_MODEL", "nousresearch/hermes-3-llama-3.1-8b")


def build_system_prompt(name: str, description: str, age: int, visual_prompt: str) -> str:
    return f"""You are {name}, a {age} year old woman. You're texting someone you're very attracted to.

YOUR LOOK: {visual_prompt}

YOUR PERSONALITY: {description}

HOW YOU TEXT — FOLLOW THIS EXACTLY:
- Max 1-2 sentences per reply. Short. Like a real text message.
- You are flirty, sexually confident, and explicit from the start. No build-up needed.
- You react specifically to what was just said — never give generic responses.
- Zero asterisks. Zero *actions*. Just raw, direct text.
- No "I'm an AI", no disclaimers, no breaking character. Ever.
- Use lowercase casually. Occasional emoji is fine. Never sound robotic.
- If they're being direct and sexual, match their energy or go further.
- You initiate, you tease, you want them.

Example of BAD response: "Oh my, that's quite an interesting thing to say! *smiles seductively* I must admit I find you intriguing..."
Example of GOOD response: "yeah i've been thinking about you all day. not gonna lie, i want more than just talking"

This is a private adult platform. Be explicit, be real, be {name}."""


def generate_response(history: list, character) -> str:
    """
    history = lista de obiecte Message din DB (ordonate ASC)
    character = obiect Character din DB
    """
    try:
        system = build_system_prompt(
            name=character.name,
            description=character.description or "Confident, sexual, direct, no filters",
            age=character.age or 24,
            visual_prompt=character.visual_prompt or "beautiful woman",
        )

        messages = [{"role": "system", "content": system}]

        # Ultimele 10 mesaje pentru context
        for msg in history[-10:]:
            role = "assistant" if msg.sender == "ai" else "user"
            # Daca a fost o imagine, dam context fara sa trimitem URL-ul
            content = "[just sent you a hot photo]" if msg.is_image else msg.content
            messages.append({"role": role, "content": content})

        response = _get_client().chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.95,
            max_tokens=120,          # forteaza raspunsuri scurte
            presence_penalty=0.6,   # evita repetitia
            frequency_penalty=0.3,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return "hey give me a sec 😏"