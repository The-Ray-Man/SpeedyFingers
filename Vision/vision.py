from __future__ import annotations

from pathlib import Path
from typing import Callable, Dict, Optional, Tuple

import numpy as np
from PIL import Image

try:
    import matplotlib

    matplotlib.use("Agg")
    from matplotlib import mathtext
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "matplotlib is required for rendering LaTeX strings to bitmaps."
    ) from exc

Bitmap = np.ndarray

DEFAULTS: Dict[str, object] = {
    "data_dir": Path(__file__).resolve().parent / "data",
    "bitmap_size": (128, 128),  # (height, width)
    "latex_dpi": 200,
    "segmentation_threshold": 0.9,
    "metric_epsilon": 1e-8,
}

_MATH_PARSER = mathtext.MathTextParser("path")


def resize_binary_bitmap(bitmap: Bitmap, size: Tuple[int, int]) -> Bitmap:
    """Resize a binary bitmap to the target (height, width)."""
    if bitmap.ndim != 2:
        raise ValueError("resize_binary_bitmap expects a 2D array.")

    height, width = size
    pil_image = Image.fromarray((bitmap > 0).astype(np.uint8) * 255, mode="L")
    resized = pil_image.resize((width, height), Image.BILINEAR)
    resized_array = np.array(resized, dtype=np.float32) / 255.0
    return (resized_array > 0.5).astype(np.uint8)


def threshold_foreground_segmenter(
    image: np.ndarray, *, threshold: float = DEFAULTS["segmentation_threshold"]
) -> Bitmap:
    """Segment foreground by thresholding away a bright (white) background."""
    if image.ndim != 3 or image.shape[2] not in (3, 4):
        raise ValueError("Expected image with shape (H, W, 3|4).")

    rgb = image[..., :3].astype(np.float32) / 255.0
    grayscale = np.dot(rgb, np.array([0.2989, 0.5870, 0.1140], dtype=np.float32))
    foreground_mask = grayscale < float(threshold)
    return foreground_mask.astype(np.uint8)


def render_latex_bitmap(
    latex_expression: str,
    *,
    size: Tuple[int, int],
    dpi: int = DEFAULTS["latex_dpi"],
) -> Bitmap:
    """Render a LaTeX expression to a bitmap and resize it."""
    if not latex_expression:
        raise ValueError("latex_expression must be a non-empty string.")

    mask, _ = _MATH_PARSER.to_mask(latex_expression, dpi=int(dpi))
    bitmap = np.array(mask, dtype=np.uint8)
    return resize_binary_bitmap(bitmap, size)


def binary_iou_similarity(
    left: Bitmap,
    right: Bitmap,
    *,
    epsilon: float = DEFAULTS["metric_epsilon"],
) -> float:
    """Compute intersection-over-union for two binary bitmaps."""
    if left.shape != right.shape:
        raise ValueError("Bitmaps must share the same shape for comparison.")

    left_bool = left.astype(bool)
    right_bool = right.astype(bool)
    intersection = np.logical_and(left_bool, right_bool).sum()
    union = np.logical_or(left_bool, right_bool).sum()
    if union == 0:
        return 0.0
    return float(intersection / (union + float(epsilon)))


def image_to_bitmap(
    image_name: str,
    *,
    data_dir: Path = DEFAULTS["data_dir"],
    bitmap_size: Tuple[int, int] = DEFAULTS["bitmap_size"],
    segmenter: Callable[..., Bitmap] = threshold_foreground_segmenter,
    segmenter_kwargs: Optional[Dict[str, object]] = None,
) -> Bitmap:
    """Load an image and convert it to a binary bitmap using the provided segmenter."""
    image_path = Path(data_dir) / image_name
    if not image_path.exists():
        raise FileNotFoundError(f"Image not found: {image_path}")

    with Image.open(image_path) as pil_image:
        rgb_image = np.array(pil_image.convert("RGB"))

    kwargs = segmenter_kwargs or {}
    segmented = segmenter(rgb_image, **kwargs)
    return resize_binary_bitmap(segmented, bitmap_size)


def latex_to_bitmap(
    latex_expression: str,
    *,
    bitmap_size: Tuple[int, int] = DEFAULTS["bitmap_size"],
    renderer: Callable[..., Bitmap] = render_latex_bitmap,
    renderer_kwargs: Optional[Dict[str, object]] = None,
) -> Bitmap:
    """Convert a LaTeX string to a bitmap using the provided renderer."""
    kwargs = {"size": bitmap_size}
    if renderer_kwargs:
        kwargs.update(renderer_kwargs)
    return renderer(latex_expression, **kwargs)


def compare_image_with_latex(
    image_name: str,
    latex_expression: str,
    *,
    data_dir: Path = DEFAULTS["data_dir"],
    bitmap_size: Tuple[int, int] = DEFAULTS["bitmap_size"],
    segmenter: Callable[..., Bitmap] = threshold_foreground_segmenter,
    segmenter_kwargs: Optional[Dict[str, object]] = None,
    renderer: Callable[..., Bitmap] = render_latex_bitmap,
    renderer_kwargs: Optional[Dict[str, object]] = None,
    metric: Callable[..., float] = binary_iou_similarity,
    metric_kwargs: Optional[Dict[str, object]] = None,
) -> float:
    """Main entry point: return similarity score between an image and LaTeX expression."""
    human_bitmap = image_to_bitmap(
        image_name,
        data_dir=data_dir,
        bitmap_size=bitmap_size,
        segmenter=segmenter,
        segmenter_kwargs=segmenter_kwargs,
    )
    latex_bitmap = latex_to_bitmap(
        latex_expression,
        bitmap_size=bitmap_size,
        renderer=renderer,
        renderer_kwargs=renderer_kwargs,
    )
    kwargs = metric_kwargs or {}
    return metric(human_bitmap, latex_bitmap, **kwargs)


__all__ = [
    "Bitmap",
    "DEFAULTS",
    "resize_binary_bitmap",
    "threshold_foreground_segmenter",
    "render_latex_bitmap",
    "binary_iou_similarity",
    "image_to_bitmap",
    "latex_to_bitmap",
    "compare_image_with_latex",
]

