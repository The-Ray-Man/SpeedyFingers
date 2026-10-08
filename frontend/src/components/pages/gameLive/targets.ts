// Gesture targets the players have to show. The ids are the categories of
// MediaPipe's built-in gesture recognizer model.

export interface GestureInfo {
  id: string;
  name: string;
  emoji: string;
}

export interface Target {
  type: "single" | "double";
  gestures: GestureInfo[];
}

export const GESTURE_VOCABULARY: GestureInfo[] = [
  { id: "Closed_Fist", name: "Closed Fist", emoji: "✊" },
  { id: "Open_Palm", name: "Open Palm", emoji: "✋" },
  { id: "Pointing_Up", name: "Pointing Up", emoji: "☝️" },
  { id: "Victory", name: "Victory", emoji: "✌️" },
  { id: "Thumb_Up", name: "Thumb Up", emoji: "👍" },
  { id: "Thumb_Down", name: "Thumb Down", emoji: "👎" },
  { id: "ILoveYou", name: "I Love You", emoji: "🤟" }
];

export const GESTURE_LOOKUP: Record<string, GestureInfo> = Object.fromEntries(
  GESTURE_VOCABULARY.map(item => [item.id, item])
);

// Share of targets that need two gestures (one per hand)
const DOUBLE_GESTURE_RATE = 0.4;

function randomGesture() {
  return GESTURE_VOCABULARY[Math.floor(Math.random() * GESTURE_VOCABULARY.length)];
}

function pickDistinctGestures(): GestureInfo[] {
  const first = randomGesture();
  const pool = GESTURE_VOCABULARY.filter(g => g.id !== first.id);
  const second = pool[Math.floor(Math.random() * pool.length)];
  return [first, second];
}

export function createRandomTarget(): Target {
  const isDouble = Math.random() < DOUBLE_GESTURE_RATE && GESTURE_VOCABULARY.length >= 2;
  const gestures = isDouble ? pickDistinctGestures() : [randomGesture()];
  return {
    type: gestures.length === 1 ? "single" : "double",
    gestures
  };
}

// True if every required gesture is shown by a different hand
export function isTargetSatisfied(target: Target, gestureIds: string[]) {
  if (!gestureIds.length) {
    return false;
  }

  const pool = [...gestureIds];
  return target.gestures.every(required => {
    const idx = pool.indexOf(required.id);
    if (idx === -1) {
      return false;
    }
    pool.splice(idx, 1);
    return true;
  });
}

export function formatTarget(target: Target) {
  const emojis = target.gestures.map(item => item.emoji);
  return emojis.length === 2 ? emojis.join("  ") : emojis.join("");
}
