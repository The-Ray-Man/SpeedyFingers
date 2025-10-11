import { type NormalizedLandmarkList } from "@mediapipe/hands";

// Hand landmark indices (MediaPipe Hands provides 21 landmarks per hand)
export const LANDMARKS = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
};

export interface HandPose {
  thumbExtended: boolean;
  indexExtended: boolean;
  middleExtended: boolean;
  ringExtended: boolean;
  pinkyExtended: boolean;
  thumbAngle: number;
  indexAngle: number;
  middleAngle: number;
  ringAngle: number;
  pinkyAngle: number;
  thumbRelevant: boolean; // Whether thumb should be considered for this gesture
}

/**
 * Convert MediaPipe landmarks to plain array format
 */
export function landmarksToArray(landmarks: NormalizedLandmarkList): number[][] {
  return landmarks.map((lm) => [lm.x, lm.y, lm.z]);
}

/**
 * Calculate the angle of a finger based on its landmarks
 */
function calculateFingerAngle(
  landmarks: NormalizedLandmarkList,
  mcp: number,
  pip: number,
  tip: number
): number {
  const mcpPoint = landmarks[mcp];
  const pipPoint = landmarks[pip];
  const tipPoint = landmarks[tip];

  // Vector from MCP to PIP
  const v1x = pipPoint.x - mcpPoint.x;
  const v1y = pipPoint.y - mcpPoint.y;

  // Vector from PIP to TIP
  const v2x = tipPoint.x - pipPoint.x;
  const v2y = tipPoint.y - pipPoint.y;

  // Calculate angle between vectors
  const dot = v1x * v2x + v1y * v2y;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y);

  const cosAngle = dot / (mag1 * mag2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

  // Convert to degrees
  return (angle * 180) / Math.PI;
}

/**
 * Check if a finger is extended based on its landmarks
 */
function isFingerExtended(
  landmarks: NormalizedLandmarkList,
  mcp: number,
  tip: number,
  wrist: number
): boolean {
  const mcpPoint = landmarks[mcp];
  const tipPoint = landmarks[tip];
  const wristPoint = landmarks[wrist];

  // Distance from wrist to MCP
  const baseDistance = Math.sqrt(
    Math.pow(mcpPoint.x - wristPoint.x, 2) + Math.pow(mcpPoint.y - wristPoint.y, 2)
  );

  // Distance from wrist to tip
  const tipDistance = Math.sqrt(
    Math.pow(tipPoint.x - wristPoint.x, 2) + Math.pow(tipPoint.y - wristPoint.y, 2)
  );

  // Finger is extended if tip is significantly farther from wrist than MCP
  return tipDistance > baseDistance * 1.3;
}

/**
 * Detect if thumb should be considered based on its position relative to palm
 */
function isThumbRelevant(landmarks: NormalizedLandmarkList): boolean {
  const thumbTip = landmarks[LANDMARKS.THUMB_TIP];
  const indexMcp = landmarks[LANDMARKS.INDEX_MCP];
  const wrist = landmarks[LANDMARKS.WRIST];

  // Calculate thumb extension from palm
  const thumbDistance = Math.sqrt(
    Math.pow(thumbTip.x - wrist.x, 2) + Math.pow(thumbTip.y - wrist.y, 2)
  );

  const indexMcpDistance = Math.sqrt(
    Math.pow(indexMcp.x - wrist.x, 2) + Math.pow(indexMcp.y - wrist.y, 2)
  );

  // If thumb tip is far from palm (relative to index MCP), it's relevant
  return thumbDistance > indexMcpDistance * 1.2;
}

/**
 * Extract current hand pose from landmarks
 */
export function getCurrentHandPose(landmarks: NormalizedLandmarkList): HandPose {
  // Check if each finger is extended
  const thumbExtended = isFingerExtended(
    landmarks,
    LANDMARKS.THUMB_MCP,
    LANDMARKS.THUMB_TIP,
    LANDMARKS.WRIST
  );
  const indexExtended = isFingerExtended(
    landmarks,
    LANDMARKS.INDEX_MCP,
    LANDMARKS.INDEX_TIP,
    LANDMARKS.WRIST
  );
  const middleExtended = isFingerExtended(
    landmarks,
    LANDMARKS.MIDDLE_MCP,
    LANDMARKS.MIDDLE_TIP,
    LANDMARKS.WRIST
  );
  const ringExtended = isFingerExtended(
    landmarks,
    LANDMARKS.RING_MCP,
    LANDMARKS.RING_TIP,
    LANDMARKS.WRIST
  );
  const pinkyExtended = isFingerExtended(
    landmarks,
    LANDMARKS.PINKY_MCP,
    LANDMARKS.PINKY_TIP,
    LANDMARKS.WRIST
  );

  // Calculate finger angles
  const thumbAngle = calculateFingerAngle(
    landmarks,
    LANDMARKS.THUMB_MCP,
    LANDMARKS.THUMB_IP,
    LANDMARKS.THUMB_TIP
  );
  const indexAngle = calculateFingerAngle(
    landmarks,
    LANDMARKS.INDEX_MCP,
    LANDMARKS.INDEX_PIP,
    LANDMARKS.INDEX_TIP
  );
  const middleAngle = calculateFingerAngle(
    landmarks,
    LANDMARKS.MIDDLE_MCP,
    LANDMARKS.MIDDLE_PIP,
    LANDMARKS.MIDDLE_TIP
  );
  const ringAngle = calculateFingerAngle(
    landmarks,
    LANDMARKS.RING_MCP,
    LANDMARKS.RING_PIP,
    LANDMARKS.RING_TIP
  );
  const pinkyAngle = calculateFingerAngle(
    landmarks,
    LANDMARKS.PINKY_MCP,
    LANDMARKS.PINKY_PIP,
    LANDMARKS.PINKY_TIP
  );

  const thumbRelevant = isThumbRelevant(landmarks);

  return {
    thumbExtended,
    indexExtended,
    middleExtended,
    ringExtended,
    pinkyExtended,
    thumbAngle,
    indexAngle,
    middleAngle,
    ringAngle,
    pinkyAngle,
    thumbRelevant,
  };
}

/**
 * Calculate similarity between two poses
 */
export function comparePoses(currentPose: HandPose, referencePose: HandPose): number {
  let totalScore = 0;
  let totalWeight = 0;

  // Determine which fingers to consider based on reference pose
  const considerThumb = referencePose.thumbRelevant;

  // Extension state comparison (binary: extended or not)
  const extensionWeight = 0.6; // 60% of total score
  const fingerCount = considerThumb ? 5 : 4;
  const extensionScorePerFinger = extensionWeight / fingerCount;

  // Compare each finger's extension state
  if (considerThumb) {
    totalScore += currentPose.thumbExtended === referencePose.thumbExtended ? extensionScorePerFinger : 0;
    totalWeight += extensionScorePerFinger;
  }
  
  totalScore += currentPose.indexExtended === referencePose.indexExtended ? extensionScorePerFinger : 0;
  totalWeight += extensionScorePerFinger;
  
  totalScore += currentPose.middleExtended === referencePose.middleExtended ? extensionScorePerFinger : 0;
  totalWeight += extensionScorePerFinger;
  
  totalScore += currentPose.ringExtended === referencePose.ringExtended ? extensionScorePerFinger : 0;
  totalWeight += extensionScorePerFinger;
  
  totalScore += currentPose.pinkyExtended === referencePose.pinkyExtended ? extensionScorePerFinger : 0;
  totalWeight += extensionScorePerFinger;

  // Angle comparison (continuous: how similar the angles are)
  const angleWeight = 0.4; // 40% of total score
  const angleScorePerFinger = angleWeight / fingerCount;

  // Helper function to calculate angle similarity (0 to 1)
  const angleSimilarity = (angle1: number, angle2: number): number => {
    const diff = Math.abs(angle1 - angle2);
    // If difference is > 45 degrees, score is 0
    // If difference is 0, score is 1
    return Math.max(0, 1 - diff / 45);
  };

  if (considerThumb) {
    totalScore += angleSimilarity(currentPose.thumbAngle, referencePose.thumbAngle) * angleScorePerFinger;
    totalWeight += angleScorePerFinger;
  }
  
  totalScore += angleSimilarity(currentPose.indexAngle, referencePose.indexAngle) * angleScorePerFinger;
  totalWeight += angleScorePerFinger;
  
  totalScore += angleSimilarity(currentPose.middleAngle, referencePose.middleAngle) * angleScorePerFinger;
  totalWeight += angleScorePerFinger;
  
  totalScore += angleSimilarity(currentPose.ringAngle, referencePose.ringAngle) * angleScorePerFinger;
  totalWeight += angleScorePerFinger;
  
  totalScore += angleSimilarity(currentPose.pinkyAngle, referencePose.pinkyAngle) * angleScorePerFinger;
  totalWeight += angleScorePerFinger;

  return totalScore;
}

/**
 * Get debug information about current hand pose
 */
export function getHandPoseDebugInfo(landmarks: NormalizedLandmarkList): string {
  const pose = getCurrentHandPose(landmarks);
  
  const fingers = [];
  if (pose.thumbExtended) fingers.push("👍 Thumb");
  if (pose.indexExtended) fingers.push("☝️ Index");
  if (pose.middleExtended) fingers.push("🖕 Middle");
  if (pose.ringExtended) fingers.push("💍 Ring");
  if (pose.pinkyExtended) fingers.push("🤙 Pinky");
  
  return `Extended: ${fingers.join(", ") || "None"}\n` +
         `Thumb relevant: ${pose.thumbRelevant ? "Yes" : "No"}\n` +
         `Angles: T=${pose.thumbAngle.toFixed(0)}° I=${pose.indexAngle.toFixed(0)}° ` +
         `M=${pose.middleAngle.toFixed(0)}° R=${pose.ringAngle.toFixed(0)}° P=${pose.pinkyAngle.toFixed(0)}°`;
}

