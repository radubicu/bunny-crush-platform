import urllib.parse
import random
import os


# Pollinations modele disponibile
# flux       -> cel mai bun realism, SFW
# flux-realism -> realism sporit
# turbo      -> rapid
# Nota: Pollinations nu are restricții NSFW pe modelul flux daca promptul e corect construit

def generate_image_url(
    visual_prompt: str,
    scenario: str,
    nsfw_level: int = 0,
    seed: int = None,
    width: int = 896,
    height: int = 1152,
) -> str:
    """
    Genereaza un URL Pollinations AI.

    nsfw_level:
        0 = Safe (portrait, fully clothed)
        1 = Suggestive (lingerie, implied nudity)
        2 = Explicit (full NSFW)

    Returneaza URL-ul direct al imaginii (fara cost, fara API key).
    """

    if seed is None:
        seed = random.randint(1, 999999)

    # Base: cum arata personajul (consistent)
    base = f"RAW photo, {visual_prompt}"

    # Modificatori de calitate comuni
    quality = (
        "8k uhd, photorealistic, dslr, soft studio lighting, "
        "sharp focus, high detail skin texture, natural imperfections, "
        "fujifilm xt3, f/1.8 aperture"
    )

    # Modificatori negativi comuni (nu mergem cu negative_prompt in URL pt Pollinations,
    # dar includem "no [...]" direct in prompt)
    no_bad = (
        "no watermark, no text, no logo, no cartoon, "
        "no illustration, no painting, no drawing, no anime"
    )

    if nsfw_level == 0:
        # Safe - portret/lifestyle
        style = (
            f"{scenario}, "
            "elegant, tasteful, fully clothed or modest outfit, "
            "seductive gaze, confident posture, "
            "looking at viewer"
        )

    elif nsfw_level == 1:
        # Suggestive - lenjerie, implied nudity
        style = (
            f"{scenario}, "
            "wearing lingerie or bikini, implied nudity, "
            "seductive pose, sensual lighting, "
            "boudoir photography style, tastefully revealing, "
            "looking at viewer, bedroom or studio background"
        )

    else:
        # Explicit NSFW - nivel 2
        style = (
            f"{scenario}, "
            "nude, explicit, nsfw, adult content, "
            "full body shot, seductive pose, "
            "professional boudoir photography, "
            "natural body, realistic proportions"
        )

    full_prompt = f"{base}, {style}, {quality}, {no_bad}"
    encoded_prompt = urllib.parse.quote(full_prompt)

    # Parametri Pollinations
    params = {
        "width": width,
        "height": height,
        "seed": seed,
        "nologo": "true",
        "enhance": "true",   # Pollinations enhance imbunatateste calitatea
        "model": "flux",
    }

    if nsfw_level >= 1:
        # Dezactiveaza safe filter pe Pollinations
        params["safe"] = "false"

    query_string = urllib.parse.urlencode(params)
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?{query_string}"

    return url


def generate_avatar_url(visual_prompt: str, seed: int = None) -> str:
    """Genereaza avatarul initial al unui personaj - portret safe."""
    if seed is None:
        seed = random.randint(1, 999999)

    return generate_image_url(
        visual_prompt=visual_prompt,
        scenario="portrait shot, smiling, looking at camera, headshot",
        nsfw_level=0,
        seed=seed,
        width=512,
        height=512,
    )
