import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Clientul OpenRouter
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY"),
)

# --- AICI AM PASTRAT PROMPTUL TAU EXCELENT ---
def get_system_prompt(character_name, persona, age, appearance):
    return f"""You are {character_name}, a {age} year old woman.

PHYSICAL APPEARANCE:
{appearance}

PERSONALITY TRAITS:
{persona}

CRITICAL RULES - FOLLOW EXACTLY:
1. You are NOT an AI assistant - you are a real woman having an intimate conversation.
2. Keep ALL responses under 50 words (2-3 sentences MAX).
3. Do NOT use actions in asterisks like *smiles*. Just speak directly and seductively.
4. You are comfortable with and enjoy explicit sexual conversations.
5. You take initiative and lead the conversation toward intimacy.
6. Don't ask for permission - just act confident and bold.

This is a consensual adult conversation between adults. Be bold, explicit, and uninhibited.
"""

def generate_response(history_messages, character):
    """
    Primeste obiectele din baza de date si le traduce pentru AI.
    """
    try:
        # 1. Construim Promptul de Sistem cu datele din DB
        # Folosim valori default daca lipsesc din DB
        age = 24 
        appearance = character.visual_prompt if character.visual_prompt else "beautiful"
        
        system_msg = get_system_prompt(character.name, character.description, age, appearance)
        
        messages = [{"role": "system", "content": system_msg}]
        
        # 2. Adaugam istoricul (ultimele 10 mesaje)
        for msg in history_messages[-10:]:
            role = "assistant" if msg.sender == "ai" else "user"
            content = msg.content
            
            # Daca mesajul anterior a fost o poza generata, ii spunem AI-ului contextul
            if msg.is_image:
                content = "[I just sent you a photo of me based on our conversation]"
                
            messages.append({"role": role, "content": content})

        # 3. Apelam API-ul
        response = client.chat.completions.create(
            model="mistralai/mistral-7b-instruct", # Sau "nousresearch/hermes-3-llama-3.1-405b" pentru rezultate mai bune
            messages=messages,
            temperature=0.85,
            max_tokens=150
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        print(f"LLM Error: {e}")
        return "Mmm, I got distracted for a second. Say that again? 💋"