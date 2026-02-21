import replicate
import os
import random

# ── Model Replicate ───────────────────────────────────────────────────────────
# lucataco/nsfw-image-gen - model realist NSFW cu suport complet
# Este un wrapper peste SDXL antrenat specific pentru continut adult realist
# Alternativa: stability-ai/stable-diffusion-3 pentru SFW de inalta calitate

REPLICATE_API_TOKEN = os.getenv("REPLICATE_API_TOKEN")

# Calitate fixata pentru rezultate consistente
BASE_QUALITY = (
    "RAW photo, 8k uhd, photorealistic, dslr, sharp focus, "
    "soft studio lighting, fujifilm xt3, realistic skin texture, "
    "natural skin imperfections, high detail, f/1.8 aperture"
)

NEGATIVE_PROMPT = (
    "cartoon, anime, illustration, painting, drawing, 3d render, "
    "cgi, watermark, text, logo, blurry, low quality, bad anatomy, "
    "extra limbs, deformed, ugly, unnatural proportions"
)


def build_prompt(visual_prompt: str, scenario: str, nsfw: bool) -> str:
    """Construieste promptul final pentru Replicate."""
    base = f"RAW photo, {visual_prompt}"

    if nsfw:
        style = (
            f"{scenario}, "
            "nude, explicit, nsfw, adult content, "
            "seductive pose, boudoir photography, "
            "natural body, realistic proportions, "
            "bedroom setting, sensual lighting"
        )
    else:
        style = (
            f"{scenario}, "
            "elegant portrait, tasteful, "
            "seductive gaze, confident posture, "
            "looking at viewer, fashion photography"
        )

    return f"{base}, {style}, {BASE_QUALITY}"


def generate_image(
    visual_prompt: str,
    scenario: str,
    nsfw: bool = False,
    seed: int = None,
) -> str:
    """
    Genereaza o imagine prin Replicate si returneaza URL-ul.
    Arunca RuntimeError daca generarea esueaza.
    """
    if seed is None:
        seed = random.randint(1, 2**32 - 1)

    prompt = build_prompt(visual_prompt, scenario, nsfw)

    try:
        if nsfw:
            # Model specializat NSFW - realist, fara cenzura
            output = replicate.run(
                "lucataco/nsfw-image-gen:e4db0efedd5f35bd4d87c5f7c5a1d6d9b04e1db3e28fad5f9ece7af12ebf7d58",
                input={
                    "prompt": prompt,
                    "negative_prompt": NEGATIVE_PROMPT,
                    "width": 896,
                    "height": 1152,
                    "num_inference_steps": 35,
                    "guidance_scale": 7.5,
                    "seed": seed,
                },
            )
        else:
            # SDXL standard - calitate excelenta pentru SFW
            output = replicate.run(
                "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
                input={
                    "prompt": prompt,
                    "negative_prompt": NEGATIVE_PROMPT,
                    "width": 896,
                    "height": 1152,
                    "num_inference_steps": 30,
                    "guidance_scale": 7,
                    "refine": "expert_ensemble_refiner",
                    "high_noise_frac": 0.8,
                    "seed": seed,
                },
            )

        # Replicate returneaza lista de URL-uri sau un FileOutput
        if isinstance(output, list):
            return str(output[0])
        return str(output)

    except Exception as e:
        raise RuntimeError(f"Replicate image generation failed: {e}")


def generate_avatar(visual_prompt: str, seed: int = None) -> str:
    """Genereaza avatarul initial al unui personaj (portret SFW)."""
    if seed is None:
        seed = random.randint(1, 2**32 - 1)
    return generate_image(
        visual_prompt=visual_prompt,
        scenario="close-up portrait, smiling, looking at camera, headshot, upper body",
        nsfw=False,
        seed=seed,
    )