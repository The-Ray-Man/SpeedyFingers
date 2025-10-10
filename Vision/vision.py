# requirements: matplotlib, numpy, pillow (PIL is optional if you want to save PNGs)
import numpy as np
import matplotlib
matplotlib.use("Agg")  # headless
import matplotlib.pyplot as plt

def render_latex_bitmaps(
    formulas,
    *,
    fontsize=200,
    dpi=200,
    pad_px=10,
    invert=False,
    threshold=0.5,
    bold=False,
    italic=False,
    family='serif'
):
    """
    Render LaTeX-like math strings to tight binary bitmaps (0/255).

    Parameters
    ----------
    formulas : list[str]
        Math strings, e.g. [r"\\int", r"\\sum", r"\\alpha^2"] or ["$\\int$"].
        You can include $...$ or omit them; either works.
    fontsize : int
        Font size (visual scale).
    dpi : int
        Rendering DPI; higher = smoother edges.
    pad_px : int
        Extra padding (pixels) around the symbol in the bitmap.
    invert : bool
        If True, foreground=0 (black) and background=255 (white). Default: False (foreground=255).
    threshold : float in [0,1]
        Alpha threshold for binarization after rasterization (0=all on, 1=all off).
    bold : bool
        Use bold weight.
    italic : bool
        Use italic style.
    family : str
        Font family name for mathtext fallback ("serif", "sans-serif", ...).

    Returns
    -------
    list[np.ndarray]
        Each element is a 2D uint8 array, shape (H, W), values in {0,255}.
    """
    # Configure mathtext (uses internal math renderer, no LaTeX install required)
    plt.rcParams.update({
        "mathtext.fontset": "dejavusans",  # robust default
        "font.family": family,
        "font.size": fontsize,
        "font.weight": "bold" if bold else "normal",
        "font.style": "italic" if italic else "normal",
    })

    bitmaps = []
    for s in formulas:
        # Accept with or without $...$
        text = s if ('$' in s) else f"${s}$"

        fig = plt.figure(figsize=(1, 1), dpi=dpi)
        fig.patch.set_alpha(0.0)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.axis("off")

        # Initial draw to get bounding box
        t = ax.text(0.5, 0.5, text, ha="center", va="center", color="black")
        fig.canvas.draw()
        bbox = t.get_window_extent(renderer=fig.canvas.get_renderer())

        # Convert bbox (display px) to figure-relative, then reset axes to tight box
        w_px = int(np.ceil(bbox.width)) + 2 * pad_px
        h_px = int(np.ceil(bbox.height)) + 2 * pad_px

        # Resize figure to fit the text tightly
        fig.set_size_inches(w_px / dpi, h_px / dpi)
        ax.set_position([0, 0, 1, 1])
        ax.clear()
        ax.axis("off")
        ax.text(0.5, 0.5, text, ha="center", va="center", color="black")

        # Render to RGBA
        fig.canvas.draw()
        buf = np.frombuffer(fig.canvas.tostring_argb(), dtype=np.uint8)
        buf = buf.reshape((h_px, w_px, 4))
        # Convert ARGB -> RGBA
        rgba = buf[:, :, [1, 2, 3, 0]].astype(np.uint8)

        plt.close(fig)

        # Use alpha to find exact tight crop (non-zero alpha = drawn pixels)
        alpha = rgba[:, :, 3].astype(np.float32) / 255.0
        ys, xs = np.where(alpha > 0.01)
        if len(xs) == 0 or len(ys) == 0:
            # Empty render (fallback to a 1x1 blank)
            bitmap = np.zeros((1, 1), dtype=np.uint8) if not invert else np.full((1,1), 255, np.uint8)
            bitmaps.append(bitmap)
            continue

        y0, y1 = ys.min(), ys.max() + 1
        x0, x1 = xs.min(), xs.max() + 1
        alpha_cropped = alpha[y0:y1, x0:x1]

        # Binarize: foreground where alpha >= threshold
        mask = (alpha_cropped >= float(threshold)).astype(np.uint8)

        if invert:
            bitmap = (1 - mask) * 255
        else:
            bitmap = mask * 255

        bitmaps.append(bitmap.astype(np.uint8))

    return bitmaps


# ---------- Example usage ----------
if __name__ == "__main__":
    samples = [r"\int", r"\sum_{i=1}^n i^2", r"\alpha", r"\LaTeX", r"\nabla \cdot \vec{E}= \rho/\varepsilon_0"]
    bmps = render_latex_bitmaps(samples, fontsize=220, dpi=240, pad_px=12, invert=False, threshold=0.3)

    # Optional: visualize sizes and save a few as PNGs (requires Pillow)
    try:
        from PIL import Image
        for s, arr in zip(samples, bmps):
            print(f"{s!r}: bitmap shape = {arr.shape}, dtype={arr.dtype}, values={np.unique(arr)}")
            Image.fromarray(arr, mode="L").save(f"symbol_{s.strip('$').replace('\\','')[:10]}.png")
    except Exception as e:
        print("PIL not available or save failed:", e)
