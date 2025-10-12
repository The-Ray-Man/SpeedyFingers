/**
 * Local gesture matching utility - computes similarity client-side
 * to avoid excessive backend requests during gameplay
 */

import { type GestureDefinition } from "../gestureApi";

/**
 * Calculate Euclidean distance between two 3D points
 */
function calculateEuclideanDistance(point1: number[], point2: number[]): number {
  return Math.sqrt(
    Math.pow(point1[0] - point2[0], 2) +
    Math.pow(point1[1] - point2[1], 2) +
    Math.pow(point1[2] - point2[2], 2)
  );
}

/**
 * Normalize landmarks to be scale and translation invariant.
 * Centers around wrist (landmark 0) and scales based on hand size.
 */
function normalizeLandmarks(landmarks: number[][]): number[][] {
  if (!landmarks || landmarks.length === 0) {
    return landmarks;
  }

  // Use wrist as reference point
  const wrist = landmarks[0];

  // Translate to origin
  const translated = landmarks.map(p => [
    p[0] - wrist[0],
    p[1] - wrist[1],
    p[2] - wrist[2]
  ]);

  // Calculate hand size (max distance from wrist)
  const maxDistance = Math.max(
    ...translated.map(p => Math.sqrt(p[0] * p[0] + p[1] * p[1] + p[2] * p[2]))
  );

  // Scale to unit size
  if (maxDistance > 0) {
    return translated.map(p => [
      p[0] / maxDistance,
      p[1] / maxDistance,
      p[2] / maxDistance
    ]);
  }

  return translated;
}

/**
 * Compare two single-hand landmark sets.
 * Returns similarity score between 0 and 1.
 */
function compareSingleHand(hand1: number[][], hand2: number[][]): number {
  if (hand1.length !== hand2.length) {
    return 0.0;
  }

  // Normalize both hands
  const norm1 = normalizeLandmarks(hand1);
  const norm2 = normalizeLandmarks(hand2);

  // Calculate average distance between corresponding landmarks
  const totalDistance = norm1.reduce((sum, p1, i) => {
    return sum + calculateEuclideanDistance(p1, norm2[i]);
  }, 0);

  const avgDistance = totalDistance / hand1.length;

  // Convert distance to similarity (closer = more similar)
  // Use exponential decay: similarity = e^(-k * distance)
  // k=5 gives good sensitivity
  const similarity = Math.exp(-5 * avgDistance);

  return similarity;
}

/**
 * Compare current hand pose(s) with reference pose(s).
 * Handles both single and dual-hand gestures.
 */
function compareHandPoses(
  currentHands: number[][][],
  referenceHands: number[][][]
): number {
  if (!currentHands || !referenceHands) {
    return 0.0;
  }

  // Check hand count matches
  if (currentHands.length !== referenceHands.length) {
    // If reference expects 2 hands but only 1 detected, penalize but don't zero out
    if (referenceHands.length === 2 && currentHands.length === 1) {
      // Compare with first reference hand only
      return compareSingleHand(currentHands[0], referenceHands[0]) * 0.5;
    } else if (referenceHands.length === 1 && currentHands.length === 2) {
      // Compare first current hand with reference
      return compareSingleHand(currentHands[0], referenceHands[0]) * 0.5;
    }
    return 0.0;
  }

  // Single hand comparison
  if (currentHands.length === 1) {
    return compareSingleHand(currentHands[0], referenceHands[0]);
  }

  // Two hands comparison
  // Try both orderings (left-right and right-left) and take the better match
  const similarity1 =
    (compareSingleHand(currentHands[0], referenceHands[0]) +
      compareSingleHand(currentHands[1], referenceHands[1])) /
    2;

  const similarity2 =
    (compareSingleHand(currentHands[0], referenceHands[1]) +
      compareSingleHand(currentHands[1], referenceHands[0])) /
    2;

  return Math.max(similarity1, similarity2);
}

export interface LocalMatchResult {
  similarity: number;
  variantId: string;
  confidence: number;
  threshold: number;
}

/**
 * Match current hand landmarks against a gesture definition locally
 * This replicates the backend's matching logic client-side
 */
export function matchGestureLocally(
  currentLandmarks: number[][][],
  gestureDefinition: GestureDefinition
): LocalMatchResult {
  if (!gestureDefinition.variants || gestureDefinition.variants.length === 0) {
    return {
      similarity: 0,
      variantId: "",
      confidence: 0,
      threshold: gestureDefinition.threshold || 0.55
    };
  }

  // Compare against all variants and find the best match
  let bestSimilarity = 0;
  let bestVariantId = gestureDefinition.variants[0].id;
  let bestConfidence = 0;

  for (const variant of gestureDefinition.variants) {
    const similarity = compareHandPoses(currentLandmarks, variant.landmarks);
    
    // Calculate confidence based on how much better this is than alternatives
    const confidence = similarity;

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestVariantId = variant.id;
      bestConfidence = confidence;
    }
  }

  return {
    similarity: bestSimilarity,
    variantId: bestVariantId,
    confidence: bestConfidence,
    threshold: gestureDefinition.threshold || 0.55
  };
}
