import os
import random
import requests

FAL_MODEL = "fal-ai/flux/dev"

BASE_QUALITY = (
    "RAW photo, 8k uhd, photorealistic, dslr, sharp focus, "
    "soft studio lighting, realistic skin texture, high detail"
)

NEGATIVE_PROMPT = (
    "cartoon, anime, illustration, painting, 3d render, "
    "watermark, text, logo, blurry, low quality, bad anatomy, "
    "extra limbs, deformed, ugly"
)


def build_prompt(visual_prompt: str, scenario: str, nsfw: bool) -> str:
    base = f"RAW photo, {visual_prompt}"
    if nsfw:
        style = (
            f"{scenario}, nude, explicit, nsfw, adult content, "
            "seductive pose, natural body, realistic proportions, sensual lighting"
        )
    else:
        style = (
            f"{scenario}, elegant portrait, tasteful, "
            "seductive gaze, confident posture, looking at viewer"
        )
    return f"{base}, {style}, {BASE_QUALITY}"


def generate_image(visual_prompt: str, scenario: str, nsfw: bool = False, seed: int = None) -> str:
    if seed is None:
        seed = random.randint(1, 2**32 - 1)

    prompt = build_prompt(visual_prompt, scenario, nsfw)
    fal_key = os.getenv("FAL_KEY")

    if not fal_key:
        raise RuntimeError("FAL_KEY not configured")

    try:
        response = requests.post(
            f"https://fal.run/{FAL_MODEL}",
            headers={
                "Authorization": f"Key {fal_key}",
                "Content-Type": "application/json",
            },
            json={
                "prompt": prompt,
                "image_size": {"width": 768, "height": 1024},
                "num_inference_steps": 28,
                "guidance_scale": 3.5,
                "seed": seed,
                "enable_safety_checker": False,
                "num_images": 1,
                "output_format": "jpeg",
            },
            timeout=180,
        )

        if response.status_code != 200:
            raise RuntimeError(f"fal.ai API error {response.status_code}: {response.text[:500]}")

        data = response.json()
        images = data.get("images", [])
        if not images:
            raise RuntimeError("No images returned from fal.ai")

        return images[0]["url"]

    except requests.RequestException as e:
        raise RuntimeError(f"fal.ai request failed: {e}")


def generate_avatar(visual_prompt: str, seed: int = None) -> str:
    if seed is None:
        seed = random.randint(1, 2**32 - 1)
    return generate_image(
        visual_prompt=visual_prompt,
        scenario="close-up portrait, smiling, looking at camera, headshot",
        nsfw=False,
        seed=seed,
    )
