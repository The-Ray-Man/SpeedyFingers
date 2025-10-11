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
    
    case 'bottom-half':
      return y > canvasHeight / 2;
    
    case 'top-left-quarter':
      return x < canvasWidth / 2 && y < canvasHeight / 2;
    
    case 'top-right-quarter':
      return x > canvasWidth / 2 && y < canvasHeight / 2;
    
    case 'bottom-left-quarter':
      return x < canvasWidth / 2 && y > canvasHeight / 2;
    
    case 'bottom-right-quarter':
      return x > canvasWidth / 2 && y > canvasHeight / 2;
    
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
 * Shapes alternate to provide opposite patterns
 */
export function generateShapeSequence(count: number): Shape[] {
  const shapes: Shape[] = [];
  
  // Easy shapes (halves) - alternating opposites
  const easyPairs: Array<[Shape['type'], Shape['type']]> = [
    ['right-half', 'left-half'],
    ['top-half', 'bottom-half'],
    ['left-half', 'right-half'],
    ['bottom-half', 'top-half'],
  ];
  
  for (let i = 0; i < Math.min(8, count); i++) {
    const pairIndex = Math.floor(i / 2) % easyPairs.length;
    const pair = easyPairs[pairIndex];
    const type = pair[i % 2];
    shapes.push({
      id: `shape-${i}`,
      type,
    });
  }
  
  // Medium shapes (quarters) - alternating opposites
  const mediumPairs: Array<[Shape['type'], Shape['type']]> = [
    ['top-left-quarter', 'bottom-right-quarter'],
    ['top-right-quarter', 'bottom-left-quarter'],
    ['bottom-left-quarter', 'top-right-quarter'],
    ['bottom-right-quarter', 'top-left-quarter'],
  ];
  
  for (let i = 8; i < Math.min(16, count); i++) {
    const pairIndex = Math.floor((i - 8) / 2) % mediumPairs.length;
    const pair = mediumPairs[pairIndex];
    const type = pair[(i - 8) % 2];
    shapes.push({
      id: `shape-${i}`,
      type,
    });
  }
  
  // Hard shapes (mix) - continuing patterns
  for (let i = 16; i < count; i++) {
    const allPairs = [...easyPairs, ...mediumPairs];
    const pairIndex = Math.floor((i - 16) / 2) % allPairs.length;
    const pair = allPairs[pairIndex];
    const type = pair[(i - 16) % 2];
    shapes.push({
      id: `shape-${i}`,
      type,
    });
  }
  
  return shapes;
}
