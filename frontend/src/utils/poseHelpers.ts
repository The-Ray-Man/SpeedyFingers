import type { Pose, Keypoint } from '@tensorflow-models/pose-detection';

/**
 * Keypoint indices for easy reference
 */
export const KeypointIndex = {
  NOSE: 0,
  LEFT_EYE: 1,
  RIGHT_EYE: 2,
  LEFT_EAR: 3,
  RIGHT_EAR: 4,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
} as const;

/**
 * Calculate Euclidean distance between two keypoints
 */
export const getDistance = (point1: Keypoint, point2: Keypoint): number => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate angle between three keypoints (in degrees)
 * point2 is the vertex of the angle
 */
export const getAngle = (point1: Keypoint, point2: Keypoint, point3: Keypoint): number => {
  const radians = Math.atan2(point3.y - point2.y, point3.x - point2.x) -
                  Math.atan2(point1.y - point2.y, point1.x - point2.x);
  let angle = Math.abs((radians * 180) / Math.PI);
  if (angle > 180) {
    angle = 360 - angle;
  }
  return angle;
};

/**
 * Check if a keypoint has sufficient confidence
 */
export const isKeypointValid = (keypoint: Keypoint, minScore = 0.3): boolean => {
  return (keypoint.score ?? 0) >= minScore;
};

/**
 * Get a keypoint safely with confidence check
 */
export const getKeypoint = (
  pose: Pose,
  index: number,
  minScore = 0.3
): Keypoint | null => {
  const keypoint = pose.keypoints[index];
  return isKeypointValid(keypoint, minScore) ? keypoint : null;
};

/**
 * Pose detection helpers - Example implementations for common poses
 */

/**
 * Check if both arms are raised above shoulders
 */
export const areArmsRaised = (pose: Pose, minScore = 0.3): boolean => {
  const leftWrist = getKeypoint(pose, KeypointIndex.LEFT_WRIST, minScore);
  const rightWrist = getKeypoint(pose, KeypointIndex.RIGHT_WRIST, minScore);
  const leftShoulder = getKeypoint(pose, KeypointIndex.LEFT_SHOULDER, minScore);
  const rightShoulder = getKeypoint(pose, KeypointIndex.RIGHT_SHOULDER, minScore);

  if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder) {
    return false;
  }

  return leftWrist.y < leftShoulder.y && rightWrist.y < rightShoulder.y;
};

/**
 * Check if person is in a squatting position
 */
export const isSquatting = (pose: Pose, minScore = 0.3): boolean => {
  const leftHip = getKeypoint(pose, KeypointIndex.LEFT_HIP, minScore);
  const rightHip = getKeypoint(pose, KeypointIndex.RIGHT_HIP, minScore);
  const leftKnee = getKeypoint(pose, KeypointIndex.LEFT_KNEE, minScore);
  const rightKnee = getKeypoint(pose, KeypointIndex.RIGHT_KNEE, minScore);

  if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
    return false;
  }

  const avgHipY = (leftHip.y + rightHip.y) / 2;
  const avgKneeY = (leftKnee.y + rightKnee.y) / 2;

  // If hips are close to knees level, person is squatting
  return avgHipY > avgKneeY * 0.8;
};

/**
 * Check if left arm is raised
 */
export const isLeftArmRaised = (pose: Pose, minScore = 0.3): boolean => {
  const leftWrist = getKeypoint(pose, KeypointIndex.LEFT_WRIST, minScore);
  const leftShoulder = getKeypoint(pose, KeypointIndex.LEFT_SHOULDER, minScore);

  if (!leftWrist || !leftShoulder) {
    return false;
  }

  return leftWrist.y < leftShoulder.y;
};

/**
 * Check if right arm is raised
 */
export const isRightArmRaised = (pose: Pose, minScore = 0.3): boolean => {
  const rightWrist = getKeypoint(pose, KeypointIndex.RIGHT_WRIST, minScore);
  const rightShoulder = getKeypoint(pose, KeypointIndex.RIGHT_SHOULDER, minScore);

  if (!rightWrist || !rightShoulder) {
    return false;
  }

  return rightWrist.y < rightShoulder.y;
};

/**
 * Check if arms are stretched out horizontally (T-pose)
 */
export const isTpose = (pose: Pose, minScore = 0.3, angleThreshold = 30): boolean => {
  const leftWrist = getKeypoint(pose, KeypointIndex.LEFT_WRIST, minScore);
  const rightWrist = getKeypoint(pose, KeypointIndex.RIGHT_WRIST, minScore);
  const leftShoulder = getKeypoint(pose, KeypointIndex.LEFT_SHOULDER, minScore);
  const rightShoulder = getKeypoint(pose, KeypointIndex.RIGHT_SHOULDER, minScore);
  const leftElbow = getKeypoint(pose, KeypointIndex.LEFT_ELBOW, minScore);
  const rightElbow = getKeypoint(pose, KeypointIndex.RIGHT_ELBOW, minScore);

  if (!leftWrist || !rightWrist || !leftShoulder || !rightShoulder || !leftElbow || !rightElbow) {
    return false;
  }

  // Calculate arm angles (should be close to 180° for T-pose)
  const leftArmAngle = getAngle(leftWrist, leftElbow, leftShoulder);
  const rightArmAngle = getAngle(rightWrist, rightElbow, rightShoulder);

  // Check if arms are approximately horizontal
  const leftArmHorizontal = Math.abs(leftShoulder.y - leftWrist.y) < Math.abs(leftShoulder.x - leftWrist.x) * 0.3;
  const rightArmHorizontal = Math.abs(rightShoulder.y - rightWrist.y) < Math.abs(rightShoulder.x - rightWrist.x) * 0.3;

  return (
    leftArmAngle > (180 - angleThreshold) &&
    rightArmAngle > (180 - angleThreshold) &&
    leftArmHorizontal &&
    rightArmHorizontal
  );
};

/**
 * Check if person is jumping (both feet off ground)
 * Note: This is an estimation based on ankle positions
 */
export const isJumping = (pose: Pose, baselineY: number, threshold = 50, minScore = 0.3): boolean => {
  const leftAnkle = getKeypoint(pose, KeypointIndex.LEFT_ANKLE, minScore);
  const rightAnkle = getKeypoint(pose, KeypointIndex.RIGHT_ANKLE, minScore);

  if (!leftAnkle || !rightAnkle) {
    return false;
  }

  const avgAnkleY = (leftAnkle.y + rightAnkle.y) / 2;
  return avgAnkleY < baselineY - threshold;
};

/**
 * Get the center point of the body (between hips)
 */
export const getBodyCenter = (pose: Pose, minScore = 0.3): Keypoint | null => {
  const leftHip = getKeypoint(pose, KeypointIndex.LEFT_HIP, minScore);
  const rightHip = getKeypoint(pose, KeypointIndex.RIGHT_HIP, minScore);

  if (!leftHip || !rightHip) {
    return null;
  }

  return {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2,
    score: Math.min(leftHip.score ?? 0, rightHip.score ?? 0),
  };
};

/**
 * Calculate elbow bend angle
 */
export const getElbowAngle = (pose: Pose, side: 'left' | 'right', minScore = 0.3): number | null => {
  const shoulderIndex = side === 'left' ? KeypointIndex.LEFT_SHOULDER : KeypointIndex.RIGHT_SHOULDER;
  const elbowIndex = side === 'left' ? KeypointIndex.LEFT_ELBOW : KeypointIndex.RIGHT_ELBOW;
  const wristIndex = side === 'left' ? KeypointIndex.LEFT_WRIST : KeypointIndex.RIGHT_WRIST;

  const shoulder = getKeypoint(pose, shoulderIndex, minScore);
  const elbow = getKeypoint(pose, elbowIndex, minScore);
  const wrist = getKeypoint(pose, wristIndex, minScore);

  if (!shoulder || !elbow || !wrist) {
    return null;
  }

  return getAngle(shoulder, elbow, wrist);
};

/**
 * Calculate knee bend angle
 */
export const getKneeAngle = (pose: Pose, side: 'left' | 'right', minScore = 0.3): number | null => {
  const hipIndex = side === 'left' ? KeypointIndex.LEFT_HIP : KeypointIndex.RIGHT_HIP;
  const kneeIndex = side === 'left' ? KeypointIndex.LEFT_KNEE : KeypointIndex.RIGHT_KNEE;
  const ankleIndex = side === 'left' ? KeypointIndex.LEFT_ANKLE : KeypointIndex.RIGHT_ANKLE;

  const hip = getKeypoint(pose, hipIndex, minScore);
  const knee = getKeypoint(pose, kneeIndex, minScore);
  const ankle = getKeypoint(pose, ankleIndex, minScore);

  if (!hip || !knee || !ankle) {
    return null;
  }

  return getAngle(hip, knee, ankle);
};

/**
 * Check if a specific keypoint is within a target area
 */
export const isKeypointInArea = (
  keypoint: Keypoint,
  area: { x: number; y: number; width: number; height: number },
  minScore = 0.3
): boolean => {
  if (!isKeypointValid(keypoint, minScore)) {
    return false;
  }

  return (
    keypoint.x >= area.x &&
    keypoint.x <= area.x + area.width &&
    keypoint.y >= area.y &&
    keypoint.y <= area.y + area.height
  );
};
