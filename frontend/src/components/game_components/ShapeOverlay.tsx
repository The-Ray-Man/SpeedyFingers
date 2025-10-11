import { useEffect, useRef } from 'react';

export interface Shape {
  id: string;
  type: 'left-half' | 'right-half' | 'top-half' | 'top-third' | 'middle-third' |
        'top-left-quarter' | 'top-right-quarter' |
        'left-third' | 'middle-third-vertical' | 'right-third' |
        'circle' | 'rectangle' | 'two-columns' | 'three-columns' | 'diagonal-left' | 'diagonal-right';
  x?: number; // For positioned shapes
  y?: number;
  width?: number;
  height?: number;
  radius?: number; // For circles
}

interface ShapeOverlayProps {
  shape: Shape;
  isVisible: boolean;
  hasCollision: boolean;
  opacity?: number;
  canvasWidth: number;
  canvasHeight: number;
}

const ShapeOverlay: React.FC<ShapeOverlayProps> = ({
  shape,
  isVisible,
  hasCollision,
  opacity = 0.5,
  canvasWidth,
  canvasHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    if (!isVisible) return;

    // Determine color based on collision state
    const color = hasCollision ? 'rgba(255, 0, 0, ' : 'rgba(0, 255, 0, ';
    const finalOpacity = opacity;

    ctx.fillStyle = color + finalOpacity + ')';

    // Draw shape based on type
    switch (shape.type) {
      case 'left-half':
        ctx.fillRect(0, 0, canvasWidth / 2, canvasHeight);
        break;
      case 'right-half':
        ctx.fillRect(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight);
        break;
      case 'top-half':
        ctx.fillRect(0, 0, canvasWidth, canvasHeight / 2);
        break;
      case 'top-third':
        ctx.fillRect(0, 0, canvasWidth, canvasHeight / 3);
        break;
      case 'middle-third':
        ctx.fillRect(0, canvasHeight / 3, canvasWidth, canvasHeight / 3);
        break;
      case 'top-left-quarter':
        ctx.fillRect(0, 0, canvasWidth / 2, canvasHeight / 2);
        break;
      case 'top-right-quarter':
        ctx.fillRect(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight / 2);
        break;
      case 'left-third':
        ctx.fillRect(0, 0, canvasWidth / 3, canvasHeight);
        break;
      case 'middle-third-vertical':
        ctx.fillRect(canvasWidth / 3, 0, canvasWidth / 3, canvasHeight);
        break;
      case 'right-third':
        ctx.fillRect((canvasWidth * 2) / 3, 0, canvasWidth / 3, canvasHeight);
        break;
      case 'two-columns':
        // Two safe columns for people to stand between
        ctx.fillRect(0, 0, canvasWidth / 4, canvasHeight);
        ctx.fillRect((canvasWidth * 3) / 4, 0, canvasWidth / 4, canvasHeight);
        break;
      case 'three-columns':
        // Three safe columns creating two gaps
        ctx.fillRect(0, 0, canvasWidth / 5, canvasHeight);
        ctx.fillRect((canvasWidth * 2) / 5, 0, canvasWidth / 5, canvasHeight);
        ctx.fillRect((canvasWidth * 4) / 5, 0, canvasWidth / 5, canvasHeight);
        break;
      case 'diagonal-left':
        // Diagonal from top-left to bottom-right
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(canvasWidth, canvasHeight);
        ctx.lineTo(canvasWidth, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'diagonal-right':
        // Diagonal from top-right to bottom-left
        ctx.beginPath();
        ctx.moveTo(canvasWidth, 0);
        ctx.lineTo(0, canvasHeight);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        break;
      case 'circle':
        if (shape.x !== undefined && shape.y !== undefined && shape.radius) {
          ctx.beginPath();
          ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      case 'rectangle':
        if (shape.x !== undefined && shape.y !== undefined && shape.width && shape.height) {
          ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        }
        break;
    }
  }, [shape, isVisible, hasCollision, opacity, canvasWidth, canvasHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        transform: 'scaleX(-1)', // Mirror to match video
      }}
    />
  );
};

export default ShapeOverlay;
