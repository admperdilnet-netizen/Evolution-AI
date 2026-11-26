#!/usr/bin/env python3
"""Experimental Wan 2.1 T2V worker for a temporary free-GPU notebook runtime.

This worker is isolated from the production generator. It creates silent
scene MP4s and concatenates them into one H.264 MP4.
"""
from __future__ import annotations

import argparse
import gc
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

MODEL_ID = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
DEFAULT_NEGATIVE = (
    "low quality, blurry, flicker, frozen motion, distorted anatomy, "
    "extra limbs, duplicate subjects, text, subtitles, logo, watermark"
)


def run(command: list[str]) -> str:
    result = subprocess.run(command, check=True, capture_output=True, text=True)
    return result.stdout.strip()


def require_gpu(torch: Any, minimum_gb: float) -> dict[str, Any]:
    if not torch.cuda.is_available():
        raise RuntimeError(
            "No hay GPU CUDA activa. En Colab selecciona Entorno de ejecución > "
            "Cambiar tipo de entorno de ejecución > GPU."
        )
    props = torch.cuda.get_device_properties(0)
    vram = props.total_memory / (1024 ** 3)
    info = {
        "name": props.name,
        "vram_gb": round(vram, 2),
        "compute_capability": f"{props.major}.{props.minor}",
        "dtype": "float16",
    }
    if vram < minimum_gb:
        raise RuntimeError(
            f"La GPU tiene {vram:.1f} GB; esta prueba requiere al menos "
            f"{minimum_gb:.0f} GB como margen inicial. No se inició la generación."
        )
    return info


def probe_video(path: Path) -> dict[str, Any]:
    raw = run([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration,size,format_name:stream=codec_name,width,height,avg_frame_rate",
        "-of", "json", str(path),
    ])
    data = json.loads(raw)
    streams = data.get("streams", [])
    video = next((item for item in streams if item.get("codec_name")), {})
    fmt = data.get("format", {})
    return {
        "path": str(path),
        "bytes": int(fmt.get("size", path.stat().st_size)),
        "duration_seconds": round(float(fmt.get("duration", 0)), 3),
        "format": fmt.get("format_name"),
        "video_codec": video.get("codec_name"),
        "width": video.get("width"),
        "height": video.get("height"),
        "frame_rate": video.get("avg_frame_rate"),
    }


def load_pipeline(torch: Any) -> Any:
    from diffusers import AutoencoderKLWan, UniPCMultistepScheduler, WanPipeline

    print(f"Cargando modelo abierto: {MODEL_ID}", flush=True)
    # VAE FP32 is retained for stable decoding; transformer uses FP16 for GPUs
    # such as NVIDIA T4/P100 that do not support native BF16.
    vae = AutoencoderKLWan.from_pretrained(
        MODEL_ID, subfolder="vae", torch_dtype=torch.float32
    )
    pipe = WanPipeline.from_pretrained(
        MODEL_ID, vae=vae, torch_dtype=torch.float16
    )
    pipe.scheduler = UniPCMultistepScheduler.from_config(
        pipe.scheduler.config, flow_shift=3.0
    )
    pipe.enable_model_cpu_offload()
    if hasattr(pipe.vae, "enable_slicing"):
        pipe.vae.enable_slicing()
    if hasattr(pipe.vae, "enable_tiling"):
        pipe.vae.enable_tiling()
    return pipe


def generate_and_merge(config_path: Path, output_path: Path) -> dict[str, Any]:
    try:
        import torch
        from diffusers.utils import export_to_video
    except ImportError as exc:
        raise RuntimeError(
            "Faltan dependencias. Ejecuta pip install -r engine/worker/requirements.txt"
        ) from exc

    config = json.loads(config_path.read_text(encoding="utf-8"))
    scenes = config.get("scenes")
    if not isinstance(scenes, list) or not scenes or len(scenes) > 4:
        raise ValueError("'scenes' debe contener entre 1 y 4 descripciones.")
    if any(not isinstance(prompt, str) or len(prompt.strip()) < 8 for prompt in scenes):
        raise ValueError("Cada descripción debe tener al menos 8 caracteres.")

    width = int(config.get("width", 832))
    height = int(config.get("height", 480))
    frames = int(config.get("num_frames", 33))
    fps = int(config.get("fps", 16))
    steps = int(config.get("steps", 20))
    guidance = float(config.get("guidance_scale", 5.0))
    seed = int(config.get("seed", 20261126))
    minimum_vram = float(config.get("min_vram_gb", 12))
    negative = str(config.get("negative_prompt", DEFAULT_NEGATIVE))

    if width % 16 or height % 16 or width * height > 832 * 480:
        raise ValueError("Usa dimensiones múltiplos de 16 y no mayores que 832×480.")
    if frames < 9 or (frames - 1) % 4 != 0:
        raise ValueError("num_frames debe ser 4n+1, por ejemplo 17 o 33.")
    if not 1 <= steps <= 30:
        raise ValueError("steps debe estar entre 1 y 30 para esta prueba.")
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("Instala FFmpeg con: apt-get install -y ffmpeg")

    gpu = require_gpu(torch, minimum_vram)
    started = time.time()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    work_dir = output_path.parent / (output_path.stem + "_scenes")
    work_dir.mkdir(parents=True, exist_ok=True)
    pipe = load_pipeline(torch)
    scene_results: list[dict[str, Any]] = []

    try:
        for index, prompt in enumerate(scenes, start=1):
            scene_path = work_dir / f"scene_{index:02d}.mp4"
            print(f"Generando escena {index}/{len(scenes)} ({frames} fotogramas)…", flush=True)
            generator = torch.Generator(device="cuda").manual_seed(seed + index - 1)
            result = pipe(
                prompt=prompt,
                negative_prompt=negative,
                height=height,
                width=width,
                num_frames=frames,
                num_inference_steps=steps,
                guidance_scale=guidance,
                generator=generator,
            )
            export_to_video(result.frames[0], str(scene_path), fps=fps)
            info = probe_video(scene_path)
            if info["bytes"] < 10000 or not info["video_codec"]:
                raise RuntimeError(f"La escena {index} no produjo un video válido.")
            scene_results.append(info)
            del result, generator
            gc.collect()
            torch.cuda.empty_cache()
            print(f"Escena guardada: {scene_path}", flush=True)
    finally:
        del pipe
        gc.collect()
        torch.cuda.empty_cache()

    concat_file = work_dir / "concat.txt"
    concat_file.write_text(
        "".join(f"file '{item['path']}'\n" for item in scene_results),
        encoding="utf-8",
    )
    print("Uniendo las escenas con FFmpeg…", flush=True)
    run([
        "ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file),
        "-c:v", "libx264", "-preset", "ultrafast", "-crf", "22",
        "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", str(output_path),
    ])

    final_video = probe_video(output_path)
    if final_video["bytes"] < 10000 or final_video["video_codec"] != "h264":
        raise RuntimeError("El MP4 final no pasó la comprobación H.264.")
    report = {
        "status": "completed",
        "engine": "Evolution AI Engine prototype",
        "model": MODEL_ID,
        "model_license": "Apache-2.0",
        "gpu": gpu,
        "scene_count": len(scene_results),
        "scene_files": scene_results,
        "final_video": final_video,
        "audio": "none (first technical benchmark)",
        "elapsed_seconds": round(time.time() - started, 1),
    }
    output_path.with_suffix(".report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print("PRUEBA COMPLETADA\n" + json.dumps(report, indent=2, ensure_ascii=False), flush=True)
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate and join Wan 2.1 T2V scenes.")
    parser.add_argument("--config", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("/content/evolution-engine-test.mp4"))
    args = parser.parse_args()
    try:
        generate_and_merge(args.config, args.output)
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr, flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
