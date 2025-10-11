"""
AI module for gesture comparison and similarity calculation.
"""

import math
from typing import List


def calculate_euclidean_distance(point1: List[float], point2: List[float]) -> float:
    """Calculate Euclidean distance between two 3D points."""
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(point1, point2)))


def normalize_landmarks(landmarks: List[List[float]]) -> List[List[float]]:
    """
    Normalize landmarks to be scale and translation invariant.
    Centers around wrist (landmark 0) and scales based on hand size.
    """
    if not landmarks or len(landmarks) == 0:
        return landmarks
    
    # Use wrist as reference point
    wrist = landmarks[0]
    
    # Translate to origin
    translated = [[p[0] - wrist[0], p[1] - wrist[1], p[2] - wrist[2]] for p in landmarks]
    
    # Calculate hand size (max distance from wrist)
    max_distance = max(
        math.sqrt(p[0]**2 + p[1]**2 + p[2]**2) 
        for p in translated
    )
    
    # Scale to unit size
    if max_distance > 0:
        scaled = [[p[0]/max_distance, p[1]/max_distance, p[2]/max_distance] for p in translated]
    else:
        scaled = translated
    
    return scaled


def compare_single_hand(hand1: List[List[float]], hand2: List[List[float]]) -> float:
    """
    Compare two single-hand landmark sets.
    Returns similarity score between 0 and 1.
    """
    if len(hand1) != len(hand2):
        return 0.0
    
    # Normalize both hands
    norm1 = normalize_landmarks(hand1)
    norm2 = normalize_landmarks(hand2)
    
    # Calculate average distance between corresponding landmarks
    total_distance = sum(
        calculate_euclidean_distance(p1, p2)
        for p1, p2 in zip(norm1, norm2)
    )
    
    avg_distance = total_distance / len(hand1)
    
    # Convert distance to similarity (closer = more similar)
    # Use exponential decay: similarity = e^(-k * distance)
    # k=5 gives good sensitivity
    similarity = math.exp(-5 * avg_distance)
    
    return similarity


def compare_hand_poses(
    current_hands: List[List[List[float]]], 
    reference_hands: List[List[List[float]]]
) -> float:
    """
    Compare current hand pose(s) with reference pose(s).
    Handles both single and dual-hand gestures.
    
    Args:
        current_hands: List of hand landmark arrays (1 or 2 hands)
        reference_hands: List of hand landmark arrays (1 or 2 hands)
    
    Returns:
        Similarity score between 0 and 1
    """
    if not current_hands or not reference_hands:
        return 0.0
    
    # Check hand count matches
    if len(current_hands) != len(reference_hands):
        # If reference expects 2 hands but only 1 detected, penalize but don't zero out
        if len(reference_hands) == 2 and len(current_hands) == 1:
            # Compare with first reference hand only
            return compare_single_hand(current_hands[0], reference_hands[0]) * 0.5
        elif len(reference_hands) == 1 and len(current_hands) == 2:
            # Compare first current hand with reference
            return compare_single_hand(current_hands[0], reference_hands[0]) * 0.5
        else:
            return 0.0
    
    # Single hand comparison
    if len(current_hands) == 1:
        return compare_single_hand(current_hands[0], reference_hands[0])
    
    # Two hands comparison
    # Try both orderings (left-right and right-left) and take the better match
    similarity1 = (
        compare_single_hand(current_hands[0], reference_hands[0]) +
        compare_single_hand(current_hands[1], reference_hands[1])
    ) / 2
    
    similarity2 = (
        compare_single_hand(current_hands[0], reference_hands[1]) +
        compare_single_hand(current_hands[1], reference_hands[0])
    ) / 2
    
    return max(similarity1, similarity2)


def extract_finger_states(landmarks: List[List[float]]) -> dict:
    """
    Extract which fingers are extended from landmarks.
    Returns a dictionary with finger names as keys and boolean values.
    """
    # MediaPipe hand landmark indices
    WRIST = 0
    THUMB_TIP = 4
    INDEX_TIP = 8
    MIDDLE_TIP = 12
    RING_TIP = 16
    PINKY_TIP = 20
    
    THUMB_MCP = 2
    INDEX_MCP = 5
    MIDDLE_MCP = 9
    RING_MCP = 13
    PINKY_MCP = 17
    
    def is_extended(mcp_idx: int, tip_idx: int) -> bool:
        """Check if a finger is extended based on tip distance from wrist."""
        wrist = landmarks[WRIST]
        mcp = landmarks[mcp_idx]
        tip = landmarks[tip_idx]
        
        wrist_to_mcp = calculate_euclidean_distance(wrist, mcp)
        wrist_to_tip = calculate_euclidean_distance(wrist, tip)
        
        # Finger is extended if tip is significantly farther than MCP
        return wrist_to_tip > wrist_to_mcp * 1.3
    
    return {
        "thumb": is_extended(THUMB_MCP, THUMB_TIP),
        "index": is_extended(INDEX_MCP, INDEX_TIP),
        "middle": is_extended(MIDDLE_MCP, MIDDLE_TIP),
        "ring": is_extended(RING_MCP, RING_TIP),
        "pinky": is_extended(PINKY_MCP, PINKY_TIP),
    }

