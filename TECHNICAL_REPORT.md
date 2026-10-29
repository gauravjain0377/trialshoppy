# TRIALSHOPPY — Technical Assessment Report
**Department:** AI/ML, Generative AI, Computer Vision & AR/VR  
**Role Applied:** Technical Development Intern  
**Project:** MirrorAI (Virtual Try-On Platform — Photo & Real-Time Live AR)  
**Submission Artifacts:** GitHub Repository Codebase + Technical Report + Working Prototype  

---

## 1. Executive Summary

This project implements an end-to-end Virtual Try-On (VTON) prototype designed to evaluate realistic fitting of upper-body clothing, eyewear, and fashion accessories across two core operational modes:
1. **Static Photo Try-On**: Server-assisted and client-fallback compositing pipeline taking single-user portrait/standing photos.
2. **Real-Time Live WebCam AR**: WebGL/Canvas2D-driven live tracking running at 30+ FPS directly in the browser using MediaPipe Pose estimation.

In strict alignment with the assessment brief (*"Clearly mention any incomplete features, limitations, or mocked components. Do not submit copied projects without attribution. Be prepared to explain every major component"*), this report candidly documents **actual algorithmic achievements**, **practical challenges in 2D vs. 3D AR clothing deformation**, **identified failure modes**, and **concrete steps toward commercial-grade VTON (like Amazon/Snapchat)**.

---

## 2. Architecture & Pipeline Overview

```
                      +-----------------------------+
                      |       User Client UI        |
                      |  (HTML5 / CSS3 / ES6 / Web) |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                                           |
        [Photo Upload]                              [Live AR Camera]
               |                                           |
               v                                           v
    +--------------------+                     +------------------------+
    |  FastAPI Backend   |                     | MediaPipe BlazePose    |
    |  (Python 3.10+)    |                     | (Client-side WASM/JS)  |
    +---------+----------+                     +-----------+------------+
              |                                            |
    +---------+----------+                                 v
    | MediaPipe / OpenCV |                     +------------------------+
    | Feature Landmark   |                     | Exponential Moving Avg |
    | Extractor          |                     | Smoothing Filter       |
    +---------+----------+                     +-----------+------------+
              |                                            |
              v                                            v
    +--------------------+                     +------------------------+
    | rembg (U2Net)      |                     | Dynamic Spatial Warp & |
    | Alpha Matting      |                     | Clavicle/Collar Anchor |
    +---------+----------+                     +-----------+------------+
              |                                            |
              v                                            v
    +--------------------+                     +------------------------+
    | Perspective Warping|                     | Real-Time Canvas2D     |
    | & Color Blending   |                     | Composite + Snapshot   |
    +---------+----------+                     +------------------------+
              |
              v
    +--------------------+
    | Result Image (JPG) |
    +--------------------+
```

---

## 3. Core Technical Implementations

### 3.1 Landmark Detection & Spatial Anchoring
- **Landmark Topology**: MediaPipe Pose (BlazePose 33-point topology).
  - Left Shoulder (`#11`), Right Shoulder (`#12`)
  - Left Hip (`#23`), Right Hip (`#24`)
  - Left Wrist (`#15`), Right Wrist (`#16`)
  - Nose (`#0`) & Ears (`#7`, `#8`) for cranial tilt.
- **Biomechanical Angle & Coordinate System**:
  - Shoulder Tilt Angle:
    $$\theta = \text{atan2}(y_{\text{right\_shoulder}} - y_{\text{left\_shoulder}}, x_{\text{right\_shoulder}} - x_{\text{left\_shoulder}})$$
  - Skeletal Span:
    $$\text{Span}_{\text{shoulder}} = \sqrt{(x_{\text{rs}} - x_{\text{ls}})^2 + (y_{\text{rs}} - y_{\text{ls}})^2}$$
- **Neck & Collar Placement**:
  The garment origin is anchored at the clavicle junction, with the collar cutout offset positioned dynamically relative to skeletal shoulder elevation and chin landmark constraints.

### 3.2 Jitter Reduction via Exponential Moving Average (EMA)
Raw frame-by-frame landmarks from webcams suffer from high-frequency jitter due to sensor noise and lighting variations. We implemented landmark smoothing:
$$P_t = \alpha \cdot P_{\text{raw}} + (1 - \alpha) \cdot P_{t-1}$$
With $\alpha = 0.40$, this eliminates shaking artifacts while maintaining low-latency tracking when users lean or rotate.

### 3.3 Dynamic Scaling & Aspect Preservation
Garment bounding boxes are scaled by skeletal shoulder width multiplied by an anatomical sleeve-span multiplier ($\approx 2.40\times$) to simulate natural fabric drape over the deltoids. The height is dynamically governed by the asset's true aspect ratio ($H/W$) to prevent non-uniform elongation.

---

## 4. Candid Technical Limitations & Root Cause Analysis

As explicitly instructed by the recruitment brief (*"Clearly mention any incomplete features, limitations, or mocked components"*), we document why 2D web AR cannot match high-end 3D physics engines without specialized infrastructure:

### 4.1 Why Current 2D AR Differs from Amazon/Snapchat Commercial AR
1. **Z-Axis Depth Lack & Non-Rigid Fabric Folding**:
   - *Current Implementation*: Planar 2D affine transformations (`translate`, `rotate`, `scale`).
   - *Limitation*: When a user turns sideways or raises their arms, a 2D PNG cannot reveal sleeve depth, armpit creases, or inner lining. An experimental quad-strip warp caused severe horizontal slicing artifacts when mapping non-affine deformations, necessitating a fallback to rigid affine rendering.
2. **True Dynamic Occlusion (Arms in Front of Chest)**:
   - When a person folds their arms or grabs their collar, standard canvas drawing layers the garment on top of hands unless deep semantic segmentation masks (e.g. MediaPipe Selfie Segmentation / BodyPix) are computed in real time.
3. **Asset Dependency**:
   - The quality of 2D overlay relies strictly on isolated, ghost-mannequin or flat-lay transparent PNGs. Catalogs with model photography or dual-view cutouts (e.g., front+back in one file) fail visually.

---

## 5. Technology Stack & Dataset/Model Attributions

| Component | Library / Framework | Model / Architecture | License |
|---|---|---|---|
| **Pose Estimation** | Google MediaPipe | BlazePose (33 keypoints) | Apache 2.0 |
| **Facial Keypoints** | MediaPipe / OpenCV Cascade | Haar / Face Mesh (468 keypoints) | Apache 2.0 / BSD |
| **Background Matting**| Python `rembg` | U2-Net Salient Object Detector | MIT |
| **CV Compositing** | OpenCV (`cv2`) & Pillow | Affine Transform & Alpha Blending | Apache 2.0 / HPND |
| **Backend API** | FastAPI / Uvicorn | ASGI Async Pipeline | MIT |
| **Frontend Runtime**| HTML5 Canvas2D / Vanilla JS | Browser-native hardware acceleration | Open Source |

---

## 6. Comprehensive Future Roadmap

1. **Phase 1: Generative AI Virtual Try-On (Server-Side)**:
   - Integrate modern Latent Diffusion pipelines (e.g., **IDM-VTON** or **OOTDiffusion**) using DensePose to generate photo-realistic fabric creases and realistic body shadows on user photos.
2. **Phase 2: 3D Mesh Deformation with Three.js**:
   - Transition from 2D flat-lay PNGs to rigged 3D glTF/GLB models using Three.js / WebGL.
   - Bind garment mesh vertices to MediaPipe skeletal landmarks via skinning weights for true 360-degree rotation.
3. **Phase 3: Real-Time Hand-Collar Interaction**:
   - Integrate MediaPipe Hands simultaneously with Pose to track fingertip proximity to collar bounds, dynamically toggling collar-lifted morph targets or blend shapes.

---

## 7. Conclusion

This project demonstrates a functional, dependency-conscious, and performant prototype built entirely with open-source tools. While real-time 2D planar projection provides high FPS and accessible zero-install client capability, the analysis clearly outlines the mathematical and architectural milestones required to scale to enterprise 3D/GenAI virtual fitting systems.

