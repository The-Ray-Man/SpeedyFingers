// Turns gesture recognizer results into hands and assigns them to the two
// players by which half of the (mirrored) frame they are in.
import type { Category, GestureRecognizerResult, NormalizedLandmark } from "@/mediapipe";
import { GESTURE_LOOKUP, type GestureInfo } from "./targets";

export type PlayerId = 1 | 2;

export const PLAYER_IDS: PlayerId[] = [1, 2];

export interface RecognizedGesture extends GestureInfo {
  score: number;
}

export interface Hitbox {
  x: number;
  y: number;
  width: number;
  height: number;
  playerId: PlayerId | null;
}

export interface ProcessedHand {
  index: number;
  score: number;
  center: { x: number; y: number };
  // Horizontal center as seen by the players (the video is mirrored)
  displayCenterX: number;
  landmarks: NormalizedLandmark[];
  gesture: RecognizedGesture | null;
}

export interface Player {
  id: PlayerId;
  hands: ProcessedHand[];
}

// Hands below this handedness confidence are ignored, unless no hand passes
const MIN_HAND_SCORE = 0.35;
// Hands this close to the middle line are assigned to the player with fewer hands
const MID_POINT = 0.5;
const DEAD_ZONE = 0.06;

function interpretGesture(candidates: Category[] | undefined): RecognizedGesture | null {
  const top = candidates?.[0];
  if (!top) {
    return null;
  }
  const meta = GESTURE_LOOKUP[top.categoryName];
  if (!meta) {
    return null;
  }
  return { ...meta, score: top.score ?? 0 };
}

export function processHands(results: GestureRecognizerResult): ProcessedHand[] {
  return results.landmarks.map((landmarks, index) => {
    const handedness = results.handedness?.[index]?.[0];
    const center = { x: 0, y: 0 };
    for (const point of landmarks) {
      center.x += point.x;
      center.y += point.y;
    }
    center.x /= landmarks.length;
    center.y /= landmarks.length;

    return {
      index,
      score: handedness?.score ?? 0,
      center,
      displayCenterX: 1 - center.x,
      landmarks,
      gesture: interpretGesture(results.gestures?.[index])
    };
  });
}

export function groupHandsIntoPlayers(hands: ProcessedHand[]) {
  const confidenceFiltered = hands.filter(hand => hand.score >= MIN_HAND_SCORE);
  const candidateHands = confidenceFiltered.length ? confidenceFiltered : hands;

  const handToPlayer = new Map<number, PlayerId>();
  const players: Player[] = [];

  if (!candidateHands.length) {
    return { players, handToPlayer };
  }

  const buckets: Record<PlayerId, ProcessedHand[]> = { 1: [], 2: [] };
  const ambiguous: ProcessedHand[] = [];

  candidateHands.forEach(hand => {
    const x = hand.displayCenterX;
    if (x < MID_POINT - DEAD_ZONE) {
      buckets[1].push(hand);
    } else if (x > MID_POINT + DEAD_ZONE) {
      buckets[2].push(hand);
    } else {
      ambiguous.push(hand);
    }
  });

  ambiguous.forEach(hand => {
    const leftDistance = Math.abs(hand.displayCenterX - (MID_POINT - DEAD_ZONE));
    const rightDistance = Math.abs(hand.displayCenterX - (MID_POINT + DEAD_ZONE));
    if (buckets[1].length === 0 && buckets[2].length > 0) {
      buckets[1].push(hand);
    } else if (buckets[2].length === 0 && buckets[1].length > 0) {
      buckets[2].push(hand);
    } else if (leftDistance <= rightDistance) {
      buckets[1].push(hand);
    } else {
      buckets[2].push(hand);
    }
  });

  PLAYER_IDS.forEach(playerId => {
    const bucket = buckets[playerId];
    if (!bucket.length) {
      return;
    }
    bucket.forEach(hand => handToPlayer.set(hand.index, playerId));
    players.push({ id: playerId, hands: bucket });
  });

  return { players, handToPlayer };
}

// Bounding box of a hand in canvas pixels, used to collect coins
export function computeHitbox(
  hand: ProcessedHand,
  playerId: PlayerId | null,
  width: number,
  height: number
): Hitbox {
  const xs = hand.landmarks.map(point => point.x * width);
  const ys = hand.landmarks.map(point => point.y * height);
  const padding = 18;
  const x = Math.max(Math.min(...xs) - padding, 0);
  const y = Math.max(Math.min(...ys) - padding, 0);
  return {
    x,
    y,
    width: Math.min(Math.max(...xs) + padding, width) - x,
    height: Math.min(Math.max(...ys) + padding, height) - y,
    playerId
  };
}
