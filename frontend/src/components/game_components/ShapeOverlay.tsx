import { useEffect, useRef } from 'react';

export interface Shape {
  id: string;
  type: 'left-half' | 'right-half' | 'top-half' | 'bottom-half' |
        'top-left-quarter' | 'top-right-quarter' | 'bottom-left-quarter' | 'bottom-right-quarter' |
        'circle' | 'rectangle';
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
      case 'bottom-half':
        ctx.fillRect(0, canvasHeight / 2, canvasWidth, canvasHeight);
        break;
      case 'top-left-quarter':
        ctx.fillRect(0, 0, canvasWidth / 2, canvasHeight / 2);
        break;
      case 'top-right-quarter':
        ctx.fillRect(canvasWidth / 2, 0, canvasWidth / 2, canvasHeight / 2);
        break;
      case 'bottom-left-quarter':
        ctx.fillRect(0, canvasHeight / 2, canvasWidth / 2, canvasHeight / 2);
        break;
      case 'bottom-right-quarter':
        ctx.fillRect(canvasWidth / 2, canvasHeight / 2, canvasWidth / 2, canvasHeight / 2);
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
