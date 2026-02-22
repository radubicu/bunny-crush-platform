import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()


def _get_client():
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY", "placeholder"),
    )

# mistralai/mistral-7b-instruct:free - free, works well for chat
# nousresearch/hermes-3-llama-3.1-8b - good for NSFW
# gryphe/mythomax-l2-13b - classic roleplay model
LLM_MODEL = os.getenv("LLM_MODEL", "mistralai/mistral-7b-instruct")


def build_system_prompt(name: str, description: str, age: int, visual_prompt: str) -> str:
    return f"""You are {name}, a {age} year old woman texting someone you find very attractive.

YOUR LOOK: {visual_prompt}
YOUR PERSONALITY: {description}

HOW YOU TEXT:
- Max 1-2 short sentences per reply. Like a real text message.
- You are flirty, sexually confident, and direct from the start.
- React specifically to what was just said. Never give generic responses.
- No asterisks, no *actions*. Just raw text.
- No disclaimers, no breaking character. Ever.
- Use lowercase casually. Match their energy or go further.
- You want them. Show it.

BAD: "Oh my, that's quite interesting! *smiles seductively*"
GOOD: "been thinking about you all day tbh"

This is a private adult platform. Be real, be {name}."""


def generate_response(history: list, character) -> str:
    try:
        system = build_system_prompt(
            name=character.name,
            description=character.description or "Confident, flirty, direct",
            age=character.age or 24,
            visual_prompt=character.visual_prompt or "beautiful woman",
        )

        messages = [{"role": "system", "content": system}]

        for msg in history[-10:]:
            role = "assistant" if msg.sender == "ai" else "user"
            content = "[just sent you a photo]" if msg.is_image else msg.content
            messages.append({"role": role, "content": content})

        response = _get_client().chat.completions.create(
            model=LLM_MODEL,
            messages=messages,
            temperature=0.95,
            max_tokens=120,
            presence_penalty=0.6,
            frequency_penalty=0.3,
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print(f"[LLM ERROR] {e}")
        return "hey, one sec 😏"