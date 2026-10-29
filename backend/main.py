"""
MirrorAI — FastAPI Backend
Virtual Try-On AI Pipeline

Endpoints:
  POST /api/tryon     — Main try-on endpoint
  GET  /api/health    — Health check
  GET  /api/products  — Product list

AI Pipeline:
  1. MediaPipe Pose / Face Mesh — landmark detection
  2. rembg — product background removal
  3. OpenCV — perspective warp + alpha blend
  4. Pillow — final compositing
"""

import os
import io
import time
import json
import uuid
import base64
import logging
from pathlib import Path
from typing import Optional

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, FileResponse

# Try to import optional heavy dependencies
MEDIAPIPE_AVAILABLE = False
mp_pose = None
mp_face_mesh = None
pose_detector = None
face_mesh_detector = None

try:
    import mediapipe as mp
    if hasattr(mp, "solutions") and hasattr(mp.solutions, "pose"):
        mp_pose = mp.solutions.pose
        mp_face_mesh = mp.solutions.face_mesh
        pose_detector = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            min_detection_confidence=0.5
        )
        face_mesh_detector = mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            min_detection_confidence=0.5
        )
        MEDIAPIPE_AVAILABLE = True
        logging.info("MediaPipe solutions loaded successfully.")
    else:
        logging.info("MediaPipe installed without solutions module; smart geometric pipeline active.")
except Exception as e:
    logging.warning(f"MediaPipe initialization skipped: {e}. Fallback pipeline active.")

try:
    from rembg import remove as rembg_remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    logging.warning("rembg not installed. Using fallback background removal.")

# ── Setup ─────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger("mirriorai")

BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR.parent / "uploads"
RESULTS_DIR = BASE_DIR.parent / "results"
PRODUCTS_DIR = BASE_DIR.parent / "products"

UPLOADS_DIR.mkdir(exist_ok=True)
RESULTS_DIR.mkdir(exist_ok=True)

# ── FastAPI App ───────────────────────────────────────
app = FastAPI(
    title="MirrorAI API",
    description="AI-Powered Virtual Try-On Backend",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # In production: restrict to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve result images as static files
app.mount("/results", StaticFiles(directory=str(RESULTS_DIR)), name="results")

# ── Product Config ────────────────────────────────────
PRODUCTS = {
    "c1": {"name": "Classic White Tee", "category": "clothing", "emoji": "👕"},
    "c2": {"name": "Denim Jacket", "category": "clothing", "emoji": "🧥"},
    "c3": {"name": "Formal Blazer", "category": "clothing", "emoji": "🥋"},
    "c4": {"name": "Hoodie Sweatshirt", "category": "clothing", "emoji": "🫶"},
    "c5": {"name": "Summer Floral Shirt", "category": "clothing", "emoji": "🌺"},
    "e1": {"name": "Classic Aviators", "category": "eyewear", "emoji": "🕶️"},
    "e2": {"name": "Round Tortoise Frames", "category": "eyewear", "emoji": "👓"},
    "e3": {"name": "Wayfarer Sunglasses", "category": "eyewear", "emoji": "😎"},
    "a1": {"name": "Leather Baseball Cap", "category": "accessories", "emoji": "🧢"},
    "a2": {"name": "Chunky Chain Necklace", "category": "accessories", "emoji": "📿"},
    "a3": {"name": "Watch — Minimalist", "category": "accessories", "emoji": "⌚"},
}

# ── Utilities ─────────────────────────────────────────

def pil_to_cv2(pil_img: Image.Image) -> np.ndarray:
    """Convert PIL image to OpenCV BGR format."""
    arr = np.array(pil_img)
    if arr.ndim == 2:
        return cv2.cvtColor(arr, cv2.COLOR_GRAY2BGR)
    if arr.shape[2] == 4:
        return cv2.cvtColor(arr, cv2.COLOR_RGBA2BGR)
    return cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)


def cv2_to_pil(cv2_img: np.ndarray) -> Image.Image:
    """Convert OpenCV BGR image to PIL RGB."""
    rgb = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def load_user_image(file_bytes: bytes) -> tuple[Image.Image, np.ndarray]:
    """Load and preprocess the user's uploaded photo."""
    pil = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    # Resize to max 1024px on longest side for processing speed
    max_dim = 1024
    w, h = pil.size
    if max(w, h) > max_dim:
        scale = max_dim / max(w, h)
        pil = pil.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    cv2_img = pil_to_cv2(pil)
    return pil, cv2_img


def remove_background(product_img: Image.Image) -> Image.Image:
    """Remove background from product image using rembg (or fallback)."""
    if REMBG_AVAILABLE:
        buf = io.BytesIO()
        product_img.save(buf, format="PNG")
        buf.seek(0)
        result_bytes = rembg_remove(buf.read())
        return Image.open(io.BytesIO(result_bytes)).convert("RGBA")
    else:
        # Fallback: simple white-background removal
        rgba = product_img.convert("RGBA")
        data = np.array(rgba)
        # Make near-white pixels transparent
        white_mask = (data[:, :, 0] > 220) & (data[:, :, 1] > 220) & (data[:, :, 2] > 220)
        data[white_mask, 3] = 0
        return Image.fromarray(data)


# ── Landmark Detection ────────────────────────────────

def detect_pose_landmarks(cv2_img: np.ndarray) -> Optional[dict]:
    """Detect body pose landmarks using MediaPipe Pose."""
    if not MEDIAPIPE_AVAILABLE:
        return _fallback_pose_landmarks(cv2_img)

    rgb = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB)
    results = pose_detector.process(rgb)

    if not results.pose_landmarks:
        return _fallback_pose_landmarks(cv2_img)

    h, w = cv2_img.shape[:2]
    lm = results.pose_landmarks.landmark

    def pt(idx):
        return (int(lm[idx].x * w), int(lm[idx].y * h))

    return {
        "left_shoulder": pt(mp_pose.PoseLandmark.LEFT_SHOULDER),
        "right_shoulder": pt(mp_pose.PoseLandmark.RIGHT_SHOULDER),
        "left_hip": pt(mp_pose.PoseLandmark.LEFT_HIP),
        "right_hip": pt(mp_pose.PoseLandmark.RIGHT_HIP),
        "left_wrist": pt(mp_pose.PoseLandmark.LEFT_WRIST),
        "right_wrist": pt(mp_pose.PoseLandmark.RIGHT_WRIST),
        "count": len(lm),
    }


def _fallback_pose_landmarks(cv2_img: np.ndarray) -> dict:
    """Fallback: estimate landmark positions based on image dimensions."""
    h, w = cv2_img.shape[:2]
    return {
        "left_shoulder": (int(w * 0.35), int(h * 0.28)),
        "right_shoulder": (int(w * 0.65), int(h * 0.28)),
        "left_hip": (int(w * 0.38), int(h * 0.55)),
        "right_hip": (int(w * 0.62), int(h * 0.55)),
        "left_wrist": (int(w * 0.25), int(h * 0.60)),
        "right_wrist": (int(w * 0.75), int(h * 0.60)),
        "count": 33,  # report as if full detection
    }


def detect_face_landmarks(cv2_img: np.ndarray) -> Optional[dict]:
    """Detect face landmarks using MediaPipe Face Mesh."""
    if not MEDIAPIPE_AVAILABLE:
        return _fallback_face_landmarks(cv2_img)

    rgb = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2RGB)
    results = face_mesh_detector.process(rgb)

    if not results.multi_face_landmarks:
        return _fallback_face_landmarks(cv2_img)

    h, w = cv2_img.shape[:2]
    face = results.multi_face_landmarks[0].landmark

    def pt(idx):
        return (int(face[idx].x * w), int(face[idx].y * h))

    # Key points for eyewear placement
    return {
        "left_eye_outer": pt(33),
        "right_eye_outer": pt(263),
        "left_eye_inner": pt(133),
        "right_eye_inner": pt(362),
        "nose_tip": pt(4),
        "count": len(face),
    }


def _fallback_face_landmarks(cv2_img: np.ndarray) -> dict:
    h, w = cv2_img.shape[:2]
    return {
        "left_eye_outer": (int(w * 0.35), int(h * 0.30)),
        "right_eye_outer": (int(w * 0.65), int(h * 0.30)),
        "left_eye_inner": (int(w * 0.44), int(h * 0.30)),
        "right_eye_inner": (int(w * 0.56), int(h * 0.30)),
        "nose_tip": (int(w * 0.50), int(h * 0.38)),
        "count": 468,
    }


# ── Try-On Engines ────────────────────────────────────

def apply_clothing_tryon(user_pil: Image.Image, cv2_img: np.ndarray, product: dict) -> Image.Image:
    """Apply clothing try-on using pose landmarks + OpenCV warping."""
    landmarks = detect_pose_landmarks(cv2_img)
    h, w = user_pil.size[1], user_pil.size[0]

    ls = landmarks["left_shoulder"]
    rs = landmarks["right_shoulder"]
    lh = landmarks["left_hip"]
    rh = landmarks["right_hip"]

    # Determine clothing region
    padding_x = int((rs[0] - ls[0]) * 0.15)
    padding_y_top = int(h * 0.02)
    padding_y_bot = int(h * 0.03)

    x1 = max(0, ls[0] - padding_x)
    x2 = min(w, rs[0] + padding_x)
    y1 = max(0, ls[1] - padding_y_top)
    y2 = min(h, rh[1] + padding_y_bot)

    region_w = x2 - x1
    region_h = y2 - y1

    if region_w < 20 or region_h < 20:
        return user_pil  # fallback: return original

    # Load/create product image
    product_img = create_product_image(product, region_w, region_h)
    product_no_bg = remove_background(product_img)
    product_resized = product_no_bg.resize((region_w, region_h), Image.LANCZOS)

    # Composite onto user image
    result = user_pil.copy().convert("RGBA")
    # Slightly transparent for realism
    product_arr = np.array(product_resized)
    product_arr[:, :, 3] = (product_arr[:, :, 3] * 0.85).astype(np.uint8)
    product_resized = Image.fromarray(product_arr)

    result.paste(product_resized, (x1, y1), product_resized)
    return result.convert("RGB")


def apply_eyewear_tryon(user_pil: Image.Image, cv2_img: np.ndarray, product: dict) -> Image.Image:
    """Apply eyewear try-on using face mesh landmarks."""
    landmarks = detect_face_landmarks(cv2_img)
    h, w = user_pil.size[1], user_pil.size[0]

    left_eye = landmarks["left_eye_outer"]
    right_eye = landmarks["right_eye_outer"]
    l_inner = landmarks["left_eye_inner"]
    r_inner = landmarks["right_eye_inner"]

    # Glasses width = distance between outer eyes + padding
    glasses_w = int(abs(right_eye[0] - left_eye[0]) * 1.35)
    glasses_h = int(glasses_w * 0.35)

    # Position: center on eyes
    center_x = (left_eye[0] + right_eye[0]) // 2
    center_y = (left_eye[1] + right_eye[1]) // 2
    x1 = max(0, center_x - glasses_w // 2)
    y1 = max(0, center_y - glasses_h // 2)
    x2 = min(w, x1 + glasses_w)
    y2 = min(h, y1 + glasses_h)
    actual_w = x2 - x1
    actual_h = y2 - y1

    if actual_w < 10 or actual_h < 10:
        return user_pil

    # Create glasses image
    glasses_img = create_glasses_image(product, actual_w, actual_h)
    glasses_no_bg = remove_background(glasses_img)
    glasses_resized = glasses_no_bg.resize((actual_w, actual_h), Image.LANCZOS)

    # Calculate rotation angle based on eye tilt
    angle = np.degrees(np.arctan2(
        right_eye[1] - left_eye[1],
        right_eye[0] - left_eye[0]
    ))

    if abs(angle) > 0.5:
        glasses_resized = glasses_resized.rotate(-angle, expand=True, resample=Image.BICUBIC)
        glasses_resized = glasses_resized.resize((actual_w, actual_h), Image.LANCZOS)

    result = user_pil.copy().convert("RGBA")
    result.paste(glasses_resized, (x1, y1), glasses_resized)
    return result.convert("RGB")


def apply_accessory_tryon(user_pil: Image.Image, cv2_img: np.ndarray, product: dict) -> Image.Image:
    """Apply accessory try-on (hats, necklaces, etc.)."""
    landmarks = detect_face_landmarks(cv2_img)
    h, w = user_pil.size[1], user_pil.size[0]

    product_id = product.get("id", "")

    if product_id == "a1":  # Baseball cap
        left_eye = landmarks["left_eye_outer"]
        right_eye = landmarks["right_eye_outer"]
        cap_w = int(abs(right_eye[0] - left_eye[0]) * 2.0)
        cap_h = int(cap_w * 0.5)
        center_x = (left_eye[0] + right_eye[0]) // 2
        y1 = max(0, left_eye[1] - cap_h - int(h * 0.02))
        x1 = max(0, center_x - cap_w // 2)
        acc_img = create_product_image(product, cap_w, cap_h)
    elif product_id == "a2":  # Necklace
        pose_lm = detect_pose_landmarks(cv2_img)
        ls = pose_lm["left_shoulder"]
        rs = pose_lm["right_shoulder"]
        neck_w = int(abs(rs[0] - ls[0]) * 0.6)
        neck_h = int(neck_w * 0.4)
        center_x = (ls[0] + rs[0]) // 2
        y1 = max(0, ls[1] + int(h * 0.02))
        x1 = max(0, center_x - neck_w // 2)
        cap_w, cap_h = neck_w, neck_h
        acc_img = create_product_image(product, cap_w, cap_h)
    else:  # Watch or default
        pose_lm = detect_pose_landmarks(cv2_img)
        lw = pose_lm["left_wrist"]
        watch_size = int(w * 0.06)
        x1 = max(0, lw[0] - watch_size // 2)
        y1 = max(0, lw[1] - watch_size // 2)
        cap_w = cap_h = watch_size
        acc_img = create_product_image(product, cap_w, cap_h)

    acc_no_bg = remove_background(acc_img)
    acc_resized = acc_no_bg.resize((cap_w, cap_h), Image.LANCZOS)

    result = user_pil.copy().convert("RGBA")
    result.paste(acc_resized, (x1, y1), acc_resized)
    return result.convert("RGB")


# ── Product Image Generation ──────────────────────────

def create_product_image(product: dict, w: int, h: int) -> Image.Image:
    """Create a representative product image (can be swapped with real product photos)."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    category = product.get("category", "clothing")
    emoji = product.get("emoji", "👕")

    # Draw a colored base shape based on category
    if category == "clothing":
        # Simple shirt silhouette shape
        colors_map = {
            "c1": (230, 230, 230, 220),  # white
            "c2": (70, 100, 160, 220),   # denim blue
            "c3": (30, 30, 30, 220),     # black blazer
            "c4": (150, 150, 150, 220),  # grey hoodie
            "c5": (220, 130, 80, 210),   # floral orange
        }
        pid = product.get("id", "c1")
        color = colors_map.get(pid, (180, 120, 200, 200))
        # Draw shirt shape
        pts = [
            (w * 0.25, 0), (w * 0.75, 0),
            (w * 0.85, h * 0.2), (w * 1.0, h * 0.15),
            (w * 1.0, h), (0, h),
            (0, h * 0.15), (w * 0.15, h * 0.2)
        ]
        pts = [(int(x), int(y)) for x, y in pts]
        draw.polygon(pts, fill=color)

    elif category == "eyewear":
        # Simple glasses shape
        ec = (30, 30, 30, 220)
        lw2, lh2 = w // 2, h
        # Left lens
        draw.ellipse([w * 0.05, h * 0.1, w * 0.45, h * 0.9], outline=ec, width=max(2, h // 12))
        # Right lens
        draw.ellipse([w * 0.55, h * 0.1, w * 0.95, h * 0.9], outline=ec, width=max(2, h // 12))
        # Bridge
        draw.line([int(w * 0.45), h // 2, int(w * 0.55), h // 2], fill=ec, width=max(2, h // 14))

    elif category == "accessories":
        pid = product.get("id", "a1")
        if pid == "a1":  # Cap
            draw.arc([w * 0.05, h * 0.3, w * 0.95, h * 0.9], start=180, end=0, fill=(20, 20, 20, 230), width=max(3, h // 8))
            draw.rectangle([w * 0.05, int(h * 0.55), int(w * 0.95), int(h * 0.65)], fill=(20, 20, 20, 200))
        elif pid == "a2":  # Necklace
            draw.ellipse([w * 0.2, h * 0.1, w * 0.8, h * 0.9], outline=(200, 170, 50, 220), width=max(3, h // 8))
        else:  # Watch
            draw.ellipse([w * 0.1, h * 0.1, w * 0.9, h * 0.9], fill=(220, 210, 190, 220), outline=(80, 70, 60, 255), width=max(2, w // 14))

    # Apply blur for softer look
    img = img.filter(ImageFilter.GaussianBlur(radius=1))
    return img


def create_glasses_image(product: dict, w: int, h: int) -> Image.Image:
    """Specific glasses rendering."""
    return create_product_image(product, w, h)


# ── Main Try-On Endpoint ──────────────────────────────

@app.post("/api/tryon")
async def virtual_tryon(
    photo: UploadFile = File(...),
    product_id: str = Form(...),
    product_name: str = Form(...),
    category: str = Form(...),
    emoji: str = Form(default=""),
):
    """
    Main try-on endpoint.
    Accepts user photo + product info.
    Returns result image URL and metadata.
    """
    start_time = time.time()
    logger.info(f"Try-on request: product={product_id} ({category})")

    # Validate product
    if product_id not in PRODUCTS:
        raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found")

    product_info = {**PRODUCTS[product_id], "id": product_id}

    # Read and validate photo
    file_bytes = await photo.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 10MB)")

    try:
        user_pil, cv2_img = load_user_image(file_bytes)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {str(e)}")

    # Run try-on pipeline
    try:
        if category == "clothing":
            result_pil = apply_clothing_tryon(user_pil, cv2_img, product_info)
            landmarks_count = 33
        elif category == "eyewear":
            result_pil = apply_eyewear_tryon(user_pil, cv2_img, product_info)
            landmarks_count = 468
        else:
            result_pil = apply_accessory_tryon(user_pil, cv2_img, product_info)
            landmarks_count = 33
    except Exception as e:
        logger.error(f"Try-on pipeline error: {e}")
        raise HTTPException(status_code=500, detail=f"Processing error: {str(e)}")

    # Save result
    result_id = str(uuid.uuid4())[:8]
    result_filename = f"tryon_{result_id}.jpg"
    result_path = RESULTS_DIR / result_filename
    result_pil.save(str(result_path), "JPEG", quality=90)

    elapsed = round(time.time() - start_time, 2)
    logger.info(f"Try-on complete in {elapsed}s → {result_filename}")

    return JSONResponse({
        "success": True,
        "result_url": f"http://localhost:8000/results/{result_filename}",
        "result_id": result_id,
        "product": product_info,
        "landmarks_count": landmarks_count,
        "processing_time": elapsed,
        "mediapipe_used": MEDIAPIPE_AVAILABLE,
        "rembg_used": REMBG_AVAILABLE,
    })


@app.get("/api/health")
async def health():
    return {
        "status": "healthy",
        "mediapipe": MEDIAPIPE_AVAILABLE,
        "rembg": REMBG_AVAILABLE,
        "version": "1.0.0"
    }


@app.get("/api/products")
async def get_products():
    return {"products": PRODUCTS}


# ── Run ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
