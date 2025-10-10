import numpy as np
import matplotlib
matplotlib.use("Agg")  # no GUI needed
import matplotlib.pyplot as plt
from io import BytesIO
from PIL import Image

def render_latex_bitmaps(
    formulas,
    size=128,
    keep_aspect=True,
    *,
    fontsize=200,
    dpi=200,
    pad_px=10,
    invert=False,
    threshold=0.5,
    bold=False,
    italic=False,
    family="serif",
    return_type="array",  # "array" or "png"
):
    """
    Render LaTeX-like math strings to binary bitmaps (0/255) or PNG bytes.

    Parameters
    ----------
    formulas : list[str]
        List of LaTeX math strings.
    size : int or tuple(int,int)
        Target (height, width) in pixels or single int for square.
    keep_aspect : bool
        Whether to preserve original aspect ratio when resizing.
    fontsize, dpi, pad_px, invert, threshold, bold, italic, family:
        Rendering parameters (same as previous version).
    return_type : str
        "array" -> return list[np.ndarray] (uint8)
        "png" -> return list[bytes] (encoded PNG)

    Returns
    -------
    list[np.ndarray] or list[bytes]
    """

    plt.rcParams.update({
        "mathtext.fontset": "dejavusans",
        "font.family": family,
        "font.size": fontsize,
        "font.weight": "bold" if bold else "normal",
        "font.style": "italic" if italic else "normal",
    })

    if isinstance(size, int):
        target_h = target_w = size
    else:
        target_h, target_w = size

    results = []

    for s in formulas:
        text = s if "$" in s else f"${s}$"

        fig = plt.figure(figsize=(1, 1), dpi=dpi)
        ax = fig.add_axes([0, 0, 1, 1])
        ax.axis("off")

        # draw once to get bounds
        t = ax.text(0.5, 0.5, text, ha="center", va="center", color="black")
        fig.canvas.draw()
        bbox = t.get_window_extent(renderer=fig.canvas.get_renderer())
        w_px = int(np.ceil(bbox.width)) + 2 * pad_px
        h_px = int(np.ceil(bbox.height)) + 2 * pad_px

        # re-render at correct size
        fig.set_size_inches(w_px / dpi, h_px / dpi)
        ax.set_position([0, 0, 1, 1])
        ax.clear()
        ax.axis("off")
        ax.text(0.5, 0.5, text, ha="center", va="center", color="black")

        fig.canvas.draw()
        buf = np.frombuffer(fig.canvas.tostring_argb(), dtype=np.uint8)
        buf = buf.reshape((h_px, w_px, 4))
        rgba = buf[:, :, [1, 2, 3, 0]]  # ARGB → RGBA
        plt.close(fig)

        alpha = rgba[:, :, 3].astype(np.float32) / 255.0
        ys, xs = np.where(alpha > 0.01)
        if len(xs) == 0:
            mask = np.zeros((target_h, target_w), np.uint8)
        else:
            y0, y1 = ys.min(), ys.max() + 1
            x0, x1 = xs.min(), xs.max() + 1
            alpha_cropped = alpha[y0:y1, x0:x1]
            mask = (alpha_cropped >= threshold).astype(np.uint8) * 255

            img = Image.fromarray(mask, mode="L")

            # resize to target
            if keep_aspect:
                img.thumbnail((target_w, target_h), Image.Resampling.LANCZOS)
                out = Image.new("L", (target_w, target_h), 0 if invert else 255)
                offset = ((target_w - img.width) // 2, (target_h - img.height) // 2)
                out.paste(img, offset)
                img = out
            else:
                img = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

            if invert:
                img = Image.eval(img, lambda x: 255 - x)
            mask = np.array(img, dtype=np.uint8)

        if return_type == "array":
            results.append(mask)
        elif return_type == "png":
            buf = BytesIO()
            Image.fromarray(mask).save(buf, format="PNG")
            results.append(buf.getvalue())
        else:
            raise ValueError("return_type must be 'array' or 'png'")

    return results


# Example usage
if __name__ == "__main__":
    formulas = [r"\int", r"\sum_{i=1}^n i^2", r"\alpha", r"\nabla \cdot \vec{E}= \rho/\varepsilon_0"]
    bitmaps = render_latex_bitmaps(formulas, size=128, invert=False, return_type="array")

    print("Shapes:", [b.shape for b in bitmaps])

    # Preview & save
    for f, arr in zip(formulas, bitmaps):
        Image.fromarray(arr).save(f"latex_{f.strip('$').replace('\\','')[:8]}.png")
