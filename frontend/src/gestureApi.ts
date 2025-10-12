/**
 * API client for gesture management endpoints
 */

const API_BASE_URL = "/api";

export interface GestureVariant {
  id: string;
  handCount: number;
  landmarks: number[][][];
  activeFingers?: Record<string, boolean>;
  activeRegions?: Record<string, boolean>;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface GestureDefinition {
  symbol: string;
  variants: GestureVariant[];
  threshold: number; // Similarity threshold for this gesture (default 0.55)
}

export interface GestureSubmission {
  symbol: string;
  handCount: number;
  landmarks: number[][][];
  activeFingers?: Record<string, boolean>;
  activeRegions?: Record<string, boolean>;
  metadata?: Record<string, any>;
  threshold?: number; // Similarity threshold for this gesture (default 0.55)
}

export interface MatchRequest {
  symbol: string;
  landmarks: number[][][];
}

export interface MatchResponse {
  similarity: number;
  variantId: string;
  confidence: number;
  threshold: number; // The threshold configured for this gesture
}

export interface GestureSummary {
  symbol: string;
  variantCount: number;
  lastUpdated: string | null;
}

/**
 * Save a new gesture variant
 */
export async function saveGesture(
  submission: GestureSubmission
): Promise<{ success: boolean; symbol: string; variantId: string; totalVariants: number }> {
  const response = await fetch(`${API_BASE_URL}/gestures`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(submission),
  });

  if (!response.ok) {
    throw new Error(`Failed to save gesture: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all gesture symbols
 */
export async function getAllGestures(): Promise<{ symbols: GestureSummary[] }> {
  const response = await fetch(`${API_BASE_URL}/gestures`);

  if (!response.ok) {
    throw new Error(`Failed to fetch gestures: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get all variants for a specific symbol
 */
export async function getGestureBySymbol(symbol: string): Promise<GestureDefinition> {
  const response = await fetch(`${API_BASE_URL}/gestures/${encodeURIComponent(symbol)}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch gesture for symbol ${symbol}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get a random gesture for gameplay
 */
export async function getRandomGesture(): Promise<{ symbol: string; definition: GestureDefinition }> {
  const response = await fetch(`${API_BASE_URL}/gestures/random/get`);

  if (!response.ok) {
    throw new Error(`Failed to fetch random gesture: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Match current hand pose against stored gesture
 */
export async function matchGesture(request: MatchRequest): Promise<MatchResponse> {
  const response = await fetch(`${API_BASE_URL}/gestures/match`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Failed to match gesture: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete a specific gesture variant
 */
export async function deleteGestureVariant(symbol: string, variantId: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/gestures/${encodeURIComponent(symbol)}/${variantId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete gesture variant: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Update the threshold for a specific gesture
 */
export async function updateGestureThreshold(symbol: string, threshold: number): Promise<{ success: boolean; symbol: string; threshold: number }> {
  const response = await fetch(`${API_BASE_URL}/gestures/${encodeURIComponent(symbol)}/threshold?threshold=${threshold}`, {
    method: "PATCH",
  });

  if (!response.ok) {
    throw new Error(`Failed to update gesture threshold: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Delete an entire gesture symbol with all its variants
 */
export async function deleteGesture(symbol: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/gestures/${encodeURIComponent(symbol)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Failed to delete gesture: ${response.statusText}`);
  }

  return response.json();
}
