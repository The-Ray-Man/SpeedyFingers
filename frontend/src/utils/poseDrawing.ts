import * as poseDetection from '@tensorflow-models/pose-detection';
import type { TrackedPerson } from './personTracking';

// MoveNet keypoint connections for drawing skeleton
export const POSE_CONNECTIONS: [number, number][] = [
  // Face
  [0, 1],   // nose to left_eye
  [0, 2],   // nose to right_eye
  [1, 3],   // left_eye to left_ear
  [2, 4],   // right_eye to right_ear
  
  // Torso
  [5, 6],   // left_shoulder to right_shoulder
  [5, 11],  // left_shoulder to left_hip
  [6, 12],  // right_shoulder to right_hip
  [11, 12], // left_hip to right_hip
  
  // Left arm
  [5, 7],   // left_shoulder to left_elbow
  [7, 9],   // left_elbow to left_wrist
  
  // Right arm
  [6, 8],   // right_shoulder to right_elbow
  [8, 10],  // right_elbow to right_wrist
  
  // Left leg
  [11, 13], // left_hip to left_knee
  [13, 15], // left_knee to left_ankle
  
  // Right leg
  [12, 14], // right_hip to right_knee
  [14, 16], // right_knee to right_ankle
];

export interface DrawOptions {
  showKeypoints?: boolean;
  showSkeleton?: boolean;
  keypointRadius?: number;
  lineWidth?: number;
  minKeypointScore?: number;
  keypointColor?: string;
  skeletonColor?: string;
}

const defaultDrawOptions: Required<DrawOptions> = {
  showKeypoints: true,
  showSkeleton: true,
  keypointRadius: 4,
  lineWidth: 2,
  minKeypointScore: 0.3,
  keypointColor: '#00ff00',
  skeletonColor: '#00ff00',
};

/**
 * Draw detected poses on a canvas
 */
export const drawPoses = (
  ctx: CanvasRenderingContext2D,
  poses: poseDetection.Pose[],
  options: DrawOptions = {}
): void => {
  const opts = { ...defaultDrawOptions, ...options };

  poses.forEach((pose) => {
    // Draw skeleton connections
    if (opts.showSkeleton) {
      drawSkeleton(ctx, pose, opts);
    }

    // Draw keypoints
    if (opts.showKeypoints) {
      drawKeypoints(ctx, pose, opts);
    }
  });
};

/**
 * Draw skeleton connections between keypoints
 */
const drawSkeleton = (
  ctx: CanvasRenderingContext2D,
  pose: poseDetection.Pose,
  options: Required<DrawOptions>
): void => {
  const { keypoints } = pose;

  POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
    const start = keypoints[startIdx];
    const end = keypoints[endIdx];

    // Only draw if both keypoints have sufficient confidence
    if (
      start.score !== undefined &&
      end.score !== undefined &&
      start.score >= options.minKeypointScore &&
      end.score >= options.minKeypointScore
    ) {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.strokeStyle = options.skeletonColor;
      ctx.lineWidth = options.lineWidth;
      ctx.stroke();
    }
  });
};

/**
 * Draw keypoints as circles
 */
const drawKeypoints = (
  ctx: CanvasRenderingContext2D,
  pose: poseDetection.Pose,
  options: Required<DrawOptions>
): void => {
  const { keypoints } = pose;

  keypoints.forEach((keypoint) => {
    if (
      keypoint.score !== undefined &&
      keypoint.score >= options.minKeypointScore
    ) {
      ctx.beginPath();
      ctx.arc(keypoint.x, keypoint.y, options.keypointRadius, 0, 2 * Math.PI);
      ctx.fillStyle = options.keypointColor;
      ctx.fill();
      
      // Optional: Add a border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  });
};

/**
 * Clear the canvas
 */
export const clearCanvas = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): void => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
};

/**
 * Get keypoint names for reference
 */
export const KEYPOINT_NAMES = [
  'nose',
  'left_eye',
  'right_eye',
  'left_ear',
  'right_ear',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
];

/**
 * Draw tracked persons with individual colors and labels
 */
export const drawTrackedPersons = (
  ctx: CanvasRenderingContext2D,
  trackedPeople: TrackedPerson[],
  options: DrawOptions = {}
): void => {
  const opts = { ...defaultDrawOptions, ...options };

  trackedPeople.forEach((person) => {
    const { pose, color, label } = person;

    // Draw skeleton connections with person's color
    if (opts.showSkeleton) {
      const { keypoints } = pose;
      
      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = keypoints[startIdx];
        const end = keypoints[endIdx];

        if (
          start.score !== undefined &&
          end.score !== undefined &&
          start.score >= opts.minKeypointScore &&
          end.score >= opts.minKeypointScore
        ) {
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(end.x, end.y);
          ctx.strokeStyle = color;
          ctx.lineWidth = opts.lineWidth;
          ctx.stroke();
        }
      });
    }

    // Draw keypoints with person's color
    if (opts.showKeypoints) {
      const { keypoints } = pose;
      
      keypoints.forEach((keypoint) => {
        if (
          keypoint.score !== undefined &&
          keypoint.score >= opts.minKeypointScore
        ) {
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, opts.keypointRadius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
          
          // Add a border
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }

    // Player names removed - no labels displayed
  });
};
