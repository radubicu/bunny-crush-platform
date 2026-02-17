"""
Image Generator - Z-Image + Replicate Support
Generates NSFW images based on chat actions
"""

import os
from datetime import datetime
from dotenv import load_dotenv
import re
import requests

load_dotenv()

# Configuration
USE_REPLICATE = os.getenv("USE_REPLICATE", "true").lower() == "true"

def parse_action_from_message(message):
    """Extract actions from message (*blushes*, *strips*, etc.)"""
    actions = re.findall(r'\*([^*]+)\*', message.lower())
    
    if not actions:
        return {"action": "talking", "nsfw_level": 0}
    
    action_text = ' '.join(actions)
    
    # NSFW Level classification
    nsfw_mapping = {
        0: ['smiles', 'winks', 'laughs', 'giggles', 'blushes', 'waves', 'sits'],
        1: ['bites lip', 'leans close', 'touches hair', 'looks at you', 'poses'],
        2: ['unbuttons', 'strips slowly', 'takes off shirt', 'shows bra', 'in lingerie'],
        3: ['topless', 'naked', 'shows breasts', 'takes off bra', 'nude'],
        4: ['spreads legs', 'touches herself', 'masturbates', 'fully naked spread']
    }
    
    nsfw_level = 0
    for level, keywords in nsfw_mapping.items():
        if any(keyword in action_text for keyword in keywords):
            nsfw_level = max(nsfw_level, level)
    
    return {
        "action": action_text,
        "nsfw_level": nsfw_level
    }

def build_prompt(character_appearance, action_data):
    """Build NSFW prompt for realism"""
    age = character_appearance.get('age', 24)
    hair = character_appearance.get('hair', 'long blonde')
    eyes = character_appearance.get('eyes', 'blue')
    body = character_appearance.get('body', 'athletic')
    
    action = action_data['action']
    nsfw_level = action_data['nsfw_level']
    
    base_prompt = f"""
    RAW unedited photo of beautiful {age} year old woman,
    {hair} hair, {eyes} eyes, {body} body type,
    natural skin texture with visible pores,
    realistic photography, candid shot,
    """
    
    # Action-specific
    if 'smile' in action or 'laugh' in action:
        base_prompt += "genuine happy smile, natural expression, "
    elif 'blush' in action:
        base_prompt += "blushing cheeks, shy expression, "
    elif 'bite' in action and 'lip' in action:
        base_prompt += "biting lower lip, seductive gaze, "
    
    # NSFW Level specific
    if nsfw_level == 0:
        base_prompt += "wearing casual clothes, sitting at home, natural lighting, "
    elif nsfw_level == 1:
        base_prompt += "wearing fitted top, leaning forward slightly, bedroom setting, "
    elif nsfw_level == 2:
        base_prompt += f"{action}, wearing elegant lingerie, bedroom interior, soft lighting, "
    elif nsfw_level == 3:
        base_prompt += f"{action}, topless, artistic nude photography, natural lighting, "
    elif nsfw_level == 4:
        base_prompt += f"{action}, fully nude, intimate photography, soft bedroom lighting, "
    
    base_prompt += """
    shot on iPhone camera, natural grain,
    unfiltered, authentic, realistic imperfections,
    amateur photography, spontaneous moment
    """
    
    negative_prompt = """
    professional studio, perfect lighting, airbrushed, filtered,
    CGI, 3D render, illustration, cartoon, anime,
    professional model, magazine quality, photoshopped,
    fake, artificial, too perfect, flawless skin
    """
    
    return base_prompt.strip(), negative_prompt.strip()

def generate_with_replicate(prompt, negative_prompt, character_name):
    """Generate image using Replicate API (FAST & RELIABLE)"""
    import replicate
    
    try:
        output = replicate.run(
            "black-forest-labs/flux-schnell",
            input={
                "prompt": prompt,
                "aspect_ratio": "9:16",
                "num_outputs": 1,
                "output_format": "jpg",
                "output_quality": 80
            }
        )
        
        image_url = output[0]
        
        # Download and save
        os.makedirs("generated_images", exist_ok=True)
        filename = f"generated_images/{character_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
        
        response = requests.get(image_url)
        with open(filename, 'wb') as f:
            f.write(response.content)
        
        print(f"✅ Image generated with Replicate: {filename}")
        return filename
        
    except Exception as e:
        print(f"❌ Replicate error: {e}")
        return None

def generate_with_zimage(prompt, negative_prompt, character_name, seed=42):
    """Generate image using Z-Image Turbo (LOCAL GPU REQUIRED)"""
    try:
        from diffusers import DiffusionPipeline
        import torch
        
        device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Load model
        pipe = DiffusionPipeline.from_pretrained(
            "Tongyi-MAI/Z-Image-Turbo",
            torch_dtype=torch.float16 if device == "cuda" else torch.float32,
            cache_dir=os.getenv("HUGGINGFACE_CACHE", "./models_cache")
        )
        pipe = pipe.to(device)
        
        # Generate
        image = pipe(
            prompt=prompt,
            negative_prompt=negative_prompt,
            num_inference_steps=4,
            guidance_scale=0.0,
            height=768,
            width=512,
            generator=torch.Generator(device).manual_seed(seed)
        ).images[0]
        
        # Save
        os.makedirs("generated_images", exist_ok=True)
        filename = f"generated_images/{character_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        image.save(filename)
        
        print(f"✅ Image generated with Z-Image: {filename}")
        return filename
        
    except Exception as e:
        print(f"❌ Z-Image error: {e}")
        return None

def generate_image_from_chat(
    character_name,
    character_appearance,
    chat_message,
    user_credits=0,
    seed=None
):
    """
    Main function - generate image from chat message
    
    Returns:
        dict: {
            "success": bool,
            "image_path": str,
            "credits_used": int,
            "nsfw_level": int,
            "message": str
        }
    """
    
    # 1. Parse action
    action_data = parse_action_from_message(chat_message)
    
    # 2. Calculate cost
    cost_map = {0: 0, 1: 2, 2: 5, 3: 10, 4: 20}
    credits_needed = cost_map[action_data['nsfw_level']]
    
    # 3. Check credits
    if user_credits < credits_needed:
        return {
            "success": False,
            "image_path": None,
            "credits_used": 0,
            "nsfw_level": action_data['nsfw_level'],
            "message": f"❌ Not enough credits! Need {credits_needed}, you have {user_credits}"
        }
    
    # 4. Build prompts
    positive_prompt, negative_prompt = build_prompt(
        character_appearance,
        action_data
    )
    
    print(f"\n🎨 Generating image:")
    print(f"   Action: {action_data['action']}")
    print(f"   NSFW Level: {action_data['nsfw_level']}")
    print(f"   Cost: {credits_needed} credits")
    print(f"   Method: {'Replicate' if USE_REPLICATE else 'Z-Image'}")
    
    # 5. Generate image
    try:
        if USE_REPLICATE:
            image_path = generate_with_replicate(
                positive_prompt,
                negative_prompt,
                character_name
            )
        else:
            image_path = generate_with_zimage(
                positive_prompt,
                negative_prompt,
                character_name,
                seed or 42
            )
        
        if image_path:
            return {
                "success": True,
                "image_path": image_path,
                "credits_used": credits_needed,
                "nsfw_level": action_data['nsfw_level'],
                "message": f"✨ Generated! Used {credits_needed} credits"
            }
        else:
            return {
                "success": False,
                "image_path": None,
                "credits_used": 0,
                "nsfw_level": action_data['nsfw_level'],
                "message": "❌ Image generation failed"
            }
        
    except Exception as e:
        print(f"❌ Error generating image: {e}")
        return {
            "success": False,
            "image_path": None,
            "credits_used": 0,
            "nsfw_level": action_data['nsfw_level'],
            "message": f"Error: {str(e)}"
        }

# Test function
if __name__ == "__main__":
    print("🧪 Testing Image Generator...")
    
    test_cases = [
        "*smiles at you*",
        "*bites lip seductively*",
        "*takes off shirt slowly*",
        "*topless pose for you*"
    ]
    
    character = {
        "hair": "long blonde",
        "eyes": "blue",
        "body": "athletic",
        "age": 24
    }
    
    for test_msg in test_cases:
        print(f"\n{'='*50}")
        print(f"Testing: {test_msg}")
        
        result = generate_image_from_chat(
            character_name="Emma",
            character_appearance=character,
            chat_message=test_msg,
            user_credits=100,
            seed=42
        )
        
        print(f"Result: {result}")