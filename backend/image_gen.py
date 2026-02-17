import urllib.parse
import random

def generate_image_url(visual_prompt: str, scenario: str):
    """
    Genereaza un URL direct catre Pollinations folosind modelul FLUX (Realism).
    Nu costa bani, nu necesita API Key, nu necesita GPU.
    """
    
    # 1. Construim un prompt "Enhanced" pentru realism maxim
    # Combinam cum arata ea (visual_prompt) cu ce face acum (scenario)
    base_prompt = f"RAW photo, {visual_prompt}, {scenario}"
    
    modifiers = (
        "8k uhd, dslr, soft lighting, high quality, fujifilm xt3, "
        "realistic skin texture, natural features, imperfect skin, "
        "looking at viewer, seductive gaze"
    )
    
    full_prompt = f"{base_prompt}, {modifiers}"
    
    # 2. Codificam pentru URL
    encoded_prompt = urllib.parse.quote(full_prompt)
    seed = random.randint(1, 999999)
    
    # 3. Generam Link-ul Magic
    # model=flux -> Cel mai bun model open-source actual pentru realism
    # nologo=true -> Scoate watermark-ul
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&seed={seed}&nologo=true&model=flux"
    
    return url