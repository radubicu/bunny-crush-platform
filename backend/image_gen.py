import replicate
import os
import random

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

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

    try:
        # Use flux-dev for both SFW and NSFW - reliable and high quality
        output = replicate.run(
            "black-forest-labs/flux-dev",
            input={
                "prompt": prompt,
                "width": 768,
                "height": 1024,
                "num_inference_steps": 28,
                "guidance": 3.5,
                "seed": seed,
                "output_format": "webp",
                "output_quality": 90,
            },
        )

        if isinstance(output, list):
            return str(output[0])
        return str(output)

    except Exception as e:
        raise RuntimeError(f"Replicate image generation failed: {e}")


def generate_avatar(visual_prompt: str, seed: int = None) -> str:
    if seed is None:
        seed = random.randint(1, 2**32 - 1)
    return generate_image(
        visual_prompt=visual_prompt,
        scenario="close-up portrait, smiling, looking at camera, headshot",
        nsfw=False,
        seed=seed,
    )