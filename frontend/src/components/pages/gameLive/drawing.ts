// Draws a tracked hand: its skeleton in the player's color, the recognized
// gesture as an emoji label, and the hitbox used to collect coins.
import { HandLandmarker, type DrawingUtils } from "@/mediapipe";
import type { Hitbox, PlayerId, ProcessedHand } from "./hands";

const PLAYER_COLORS: Record<PlayerId, string> = {
  1: "#4cc3ff",
  2: "#ff5c74"
};
const UNASSIGNED_COLOR = "#c9d1ff";
const HIGHLIGHT_RGB = { r: 120, g: 255, b: 180 };

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) {
    return { r: 255, g: 255, b: 255 };
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function mixWithHighlight(baseHex: string, blend: number) {
  const clamped = Math.max(0, Math.min(1, blend));
  const base = hexToRgb(baseHex);
  const r = Math.round(base.r + (HIGHLIGHT_RGB.r - base.r) * clamped);
  const g = Math.round(base.g + (HIGHLIGHT_RGB.g - base.g) * clamped);
  const b = Math.round(base.b + (HIGHLIGHT_RGB.b - base.b) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * @param highlight 0–1, how strongly to flash the hand after a matched target
 */
export function drawHand(
  ctx: CanvasRenderingContext2D,
  drawingUtils: DrawingUtils,
  hand: ProcessedHand,
  hitbox: Hitbox,
  highlight: number
) {
  const { width } = ctx.canvas;
  const eased = Math.pow(highlight, 0.6);
  const baseColor = hitbox.playerId !== null ? PLAYER_COLORS[hitbox.playerId] : UNASSIGNED_COLOR;
  const color = eased > 0 ? mixWithHighlight(baseColor, eased) : baseColor;

  drawingUtils.drawConnectors(hand.landmarks, HandLandmarker.HAND_CONNECTIONS, {
    color,
    lineWidth: 2 + eased * 2
  });

  const labelText = hand.gesture?.emoji ?? "";
  if (labelText) {
    const wrist = hand.landmarks[0];
    const x = wrist.x * width;
    const y = wrist.y * ctx.canvas.height;
    const fontSize = 30;
    const padding = 8;
    ctx.save();
    // The canvas is mirrored with CSS; flip the text back so it stays readable
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.font = `${fontSize}px 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif`;
    const rectWidth = ctx.measureText(labelText).width + padding * 2;
    const rectHeight = fontSize + padding;
    const rectX = Math.max(0, Math.min(width - x - rectWidth / 2, width - rectWidth));
    const rectY = Math.max(0, y - 48);

    ctx.fillStyle = "rgba(12, 14, 22, 0.65)";
    ctx.fillRect(rectX, rectY, rectWidth, rectHeight);

    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(labelText, rectX + padding, rectY + rectHeight / 2);
    ctx.restore();
  }

  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${(0.55 + 0.45 * eased).toFixed(2)})`;
  ctx.lineWidth = 2 + eased * 1.5;
  ctx.setLineDash([3, 9]);
  if (eased > 0) {
    ctx.shadowColor = `rgba(120, 255, 180, ${(0.4 * eased).toFixed(2)})`;
    ctx.shadowBlur = 14 * eased;
  }
  ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
  ctx.restore();
}
