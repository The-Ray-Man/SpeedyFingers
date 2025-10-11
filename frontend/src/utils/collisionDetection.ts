import type { Shape } from '../components/game_components/ShapeOverlay';
import type { Keypoint } from '@tensorflow-models/pose-detection';

/**
 * Check if a keypoint collides with a shape
 */
export function checkKeypointCollision(
  keypoint: Keypoint,
  shape: Shape,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  // Skip keypoints with low confidence
  if (keypoint.score && keypoint.score < 0.3) {
    return false;
  }

  const x = keypoint.x;
  const y = keypoint.y;

  switch (shape.type) {
    case 'left-half':
      return x < canvasWidth / 2;
    
    case 'right-half':
      return x > canvasWidth / 2;
    
    case 'top-half':
      return y < canvasHeight / 2;
    
    case 'top-third':
      return y < canvasHeight / 3;
    
    case 'middle-third':
      return y >= canvasHeight / 3 && y < (canvasHeight * 2) / 3;
    
    case 'top-left-quarter':
      return x < canvasWidth / 2 && y < canvasHeight / 2;
    
    case 'top-right-quarter':
      return x > canvasWidth / 2 && y < canvasHeight / 2;
    
    case 'left-third':
      return x < canvasWidth / 3;
    
    case 'middle-third-vertical':
      return x >= canvasWidth / 3 && x < (canvasWidth * 2) / 3;
    
    case 'right-third':
      return x > (canvasWidth * 2) / 3;
    
    case 'two-columns':
      return x < canvasWidth / 4 || x > (canvasWidth * 3) / 4;
    
    case 'three-columns':
      return x < canvasWidth / 5 || 
             (x >= (canvasWidth * 2) / 5 && x < (canvasWidth * 3) / 5) ||
             x >= (canvasWidth * 4) / 5;
    
    case 'diagonal-left':
      // Point is above the diagonal line from top-left to bottom-right
      return y < (x * canvasHeight) / canvasWidth;
    
    case 'diagonal-right':
      // Point is above the diagonal line from top-right to bottom-left
      return y < ((canvasWidth - x) * canvasHeight) / canvasWidth;
    
    case 'circle':
      if (shape.x !== undefined && shape.y !== undefined && shape.radius) {
        const dx = x - shape.x;
        const dy = y - shape.y;
        return Math.sqrt(dx * dx + dy * dy) < shape.radius;
      }
      return false;
    
    case 'rectangle':
      if (shape.x !== undefined && shape.y !== undefined && shape.width && shape.height) {
        return (
          x >= shape.x &&
          x <= shape.x + shape.width &&
          y >= shape.y &&
          y <= shape.y + shape.height
        );
      }
      return false;
    
    default:
      return false;
  }
}

/**
 * Check if any keypoint from any pose collides with the shape
 */
export function checkAnyPoseCollision(
  poses: Array<{ keypoints: Keypoint[] }>,
  shape: Shape,
  canvasWidth: number,
  canvasHeight: number
): boolean {
  for (const pose of poses) {
    for (const keypoint of pose.keypoints) {
      if (checkKeypointCollision(keypoint, shape, canvasWidth, canvasHeight)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Generate a progressive sequence of shapes (easy to hard)
 * Shapes are designed for people standing on the ground who can move, duck, and bend
 */
export function generateShapeSequence(count: number): Shape[] {
  const shapes: Shape[] = [];
  
  // EASY LEVEL (Shapes 1-8): Simple halves and sides - people just move left/right
  const easyShapes: Shape[] = [
    { id: 'shape-0', type: 'right-half' },
    { id: 'shape-1', type: 'left-half' },
    { id: 'shape-2', type: 'left-half' },
    { id: 'shape-3', type: 'right-half' },
    { id: 'shape-4', type: 'top-half' }, // Duck
    { id: 'shape-5', type: 'left-half' },
    { id: 'shape-6', type: 'right-half' },
    { id: 'shape-7', type: 'top-third' }, // Duck lower
  ];
  
  // MEDIUM LEVEL (Shapes 9-14): Vertical thirds and quarters - more precision needed
  const mediumShapes: Shape[] = [
    { id: 'shape-8', type: 'left-third' },
    { id: 'shape-9', type: 'right-third' },
    { id: 'shape-10', type: 'middle-third-vertical' },
    { id: 'shape-11', type: 'top-left-quarter' },
    { id: 'shape-12', type: 'top-right-quarter' },
    { id: 'shape-13', type: 'middle-third' }, // Duck to mid height
  ];
  
  // HARD LEVEL (Shapes 15-19): Columns, diagonals, and circles - complex movements
  const hardShapes: Shape[] = [
    { id: 'shape-14', type: 'two-columns' }, // Stand between columns
    { id: 'shape-15', type: 'diagonal-left' }, // Move to bottom-left
    { id: 'shape-16', type: 'three-columns' }, // Stand in gaps
    { id: 'shape-17', type: 'diagonal-right' }, // Move to bottom-right
    { id: 'shape-18', type: 'two-columns' },
    { id: 'shape-19', type: 'middle-third' }, // Final duck challenge
  ];
  
  // Combine all shapes up to the requested count
  const allShapes = [...easyShapes, ...mediumShapes, ...hardShapes];
  
  for (let i = 0; i < Math.min(count, allShapes.length); i++) {
    shapes.push(allShapes[i]);
  }
  
  // If more shapes requested, add circles at various positions (upper areas only)
  for (let i = allShapes.length; i < count; i++) {
    const positions = [
      { x: 0.25, y: 0.3, radius: 0.15 }, // Upper left
      { x: 0.75, y: 0.3, radius: 0.15 }, // Upper right
      { x: 0.5, y: 0.25, radius: 0.2 },  // Upper center
      { x: 0.2, y: 0.35, radius: 0.12 }, // Small upper left
      { x: 0.8, y: 0.35, radius: 0.12 }, // Small upper right
    ];
    
    const pos = positions[(i - allShapes.length) % positions.length];
    shapes.push({
      id: `shape-${i}`,
      type: 'circle',
      x: pos.x * 640,  // Assuming typical canvas width
      y: pos.y * 480,  // Assuming typical canvas height
      radius: pos.radius * 400,
    });
  }
  
  return shapes;
}
