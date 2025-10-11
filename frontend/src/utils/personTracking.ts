import type { Pose } from '@tensorflow-models/pose-detection';

export interface TrackedPerson {
  id: number;
  pose: Pose;
  color: string;
  label: string;
  lastSeen: number;
}

const PERSON_COLORS = [
  '#00ff00', // Green - Person 1
  '#ff00ff', // Magenta - Person 2
  '#00ffff', // Cyan - Person 3
  '#ffff00', // Yellow - Person 4
];

const PERSON_LABELS = ['Player 1', 'Player 2', 'Player 3', 'Player 4'];

export class PersonTracker {
  private trackedPeople: Map<number, TrackedPerson> = new Map();
  private nextId = 1;
  private readonly DISTANCE_THRESHOLD = 100; // pixels
  private readonly TIMEOUT_MS = 1000; // 1 second

  /**
   * Calculate distance between two poses based on their center of mass
   */
  private calculateDistance(pose1: Pose, pose2: Pose): number {
    const getCenter = (pose: Pose) => {
      const validKeypoints = pose.keypoints.filter(kp => kp.score && kp.score > 0.3);
      if (validKeypoints.length === 0) return { x: 0, y: 0 };
      
      const sum = validKeypoints.reduce(
        (acc, kp) => ({ x: acc.x + kp.x, y: acc.y + kp.y }),
        { x: 0, y: 0 }
      );
      return {
        x: sum.x / validKeypoints.length,
        y: sum.y / validKeypoints.length,
      };
    };

    const center1 = getCenter(pose1);
    const center2 = getCenter(pose2);

    return Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + Math.pow(center1.y - center2.y, 2)
    );
  }

  /**
   * Update tracked people with new detected poses
   */
  public updatePoses(detectedPoses: Pose[]): TrackedPerson[] {
    const now = Date.now();
    const updatedPeople: TrackedPerson[] = [];
    const matchedIds = new Set<number>();

    // Try to match each detected pose with existing tracked people
    for (const pose of detectedPoses) {
      let bestMatch: { id: number; distance: number } | null = null;

      // Find closest existing person
      for (const [id, tracked] of this.trackedPeople.entries()) {
        if (matchedIds.has(id)) continue; // Already matched

        const distance = this.calculateDistance(pose, tracked.pose);
        
        if (distance < this.DISTANCE_THRESHOLD) {
          if (!bestMatch || distance < bestMatch.distance) {
            bestMatch = { id, distance };
          }
        }
      }

      if (bestMatch) {
        // Update existing person
        const existing = this.trackedPeople.get(bestMatch.id)!;
        const updated: TrackedPerson = {
          ...existing,
          pose,
          lastSeen: now,
        };
        this.trackedPeople.set(bestMatch.id, updated);
        matchedIds.add(bestMatch.id);
        updatedPeople.push(updated);
      } else {
        // New person detected
        const newPerson: TrackedPerson = {
          id: this.nextId,
          pose,
          color: PERSON_COLORS[(this.nextId - 1) % PERSON_COLORS.length],
          label: PERSON_LABELS[(this.nextId - 1) % PERSON_LABELS.length],
          lastSeen: now,
        };
        this.trackedPeople.set(this.nextId, newPerson);
        updatedPeople.push(newPerson);
        this.nextId++;
      }
    }

    // Remove people not seen for a while
    for (const [id, tracked] of this.trackedPeople.entries()) {
      if (now - tracked.lastSeen > this.TIMEOUT_MS) {
        this.trackedPeople.delete(id);
      }
    }

    return updatedPeople;
  }

  /**
   * Get all currently tracked people
   */
  public getTrackedPeople(): TrackedPerson[] {
    return Array.from(this.trackedPeople.values());
  }

  /**
   * Reset tracking (clear all tracked people)
   */
  public reset(): void {
    this.trackedPeople.clear();
    this.nextId = 1;
  }

  /**
   * Get person by ID
   */
  public getPerson(id: number): TrackedPerson | undefined {
    return this.trackedPeople.get(id);
  }
}
