import { useEffect, useRef, useState } from 'react';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export interface PoseDetectionConfig {
  modelType?: 'SinglePose.Lightning' | 'SinglePose.Thunder' | 'MultiPose.Lightning';
  maxPoses?: number; // Only used for MultiPose
  minPoseScore?: number; // Minimum confidence score for a pose to be detected
  minKeypointScore?: number; // Minimum confidence score for a keypoint to be shown
}

export const usePoseDetection = (config: PoseDetectionConfig = {}) => {
  const {
    modelType = 'SinglePose.Lightning',
    maxPoses = 1,
    minPoseScore = 0.25,
    minKeypointScore = 0.3,
  } = config;

  const [detector, setDetector] = useState<poseDetection.PoseDetector | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize TensorFlow and load the model
  useEffect(() => {
    let mounted = true;

    const initDetector = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize TensorFlow backend
        await tf.ready();
        await tf.setBackend('webgl');

        // Configure model based on type
        const model = poseDetection.SupportedModels.MoveNet;
        let modelConfig: poseDetection.MoveNetModelConfig;

        if (modelType.startsWith('MultiPose')) {
          modelConfig = {
            modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING,
            enableTracking: true,
            trackerType: poseDetection.TrackerType.BoundingBox,
          };
        } else if (modelType === 'SinglePose.Thunder') {
          modelConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
          };
        } else {
          // Default: SinglePose.Lightning
          modelConfig = {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          };
        }

        // Load the detector
        const detectorInstance = await poseDetection.createDetector(model, modelConfig);

        if (mounted) {
          setDetector(detectorInstance);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error initializing pose detector:', err);
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize pose detector');
          setIsLoading(false);
        }
      }
    };

    initDetector();

    return () => {
      mounted = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      detector?.dispose();
    };
  }, [modelType]);

  // Detect poses in a video element
  const detectPoses = async (
    videoElement: HTMLVideoElement
  ): Promise<poseDetection.Pose[]> => {
    if (!detector || !videoElement) {
      return [];
    }

    try {
      const estimationConfig: poseDetection.MoveNetEstimationConfig = {};
      
      if (modelType.startsWith('MultiPose')) {
        estimationConfig.maxPoses = maxPoses;
      }

      const poses = await detector.estimatePoses(videoElement, estimationConfig);
      
      // Filter poses by score if needed
      if (modelType.startsWith('MultiPose')) {
        return poses.filter(pose => (pose.score ?? 0) >= minPoseScore);
      }
      
      return poses;
    } catch (err) {
      console.error('Error detecting poses:', err);
      return [];
    }
  };

  // Start continuous pose detection
  const startDetection = (
    videoElement: HTMLVideoElement,
    onPosesDetected: (poses: poseDetection.Pose[]) => void
  ) => {
    const detect = async () => {
      const poses = await detectPoses(videoElement);
      onPosesDetected(poses);
      animationFrameRef.current = requestAnimationFrame(detect);
    };

    detect();
  };

  // Stop continuous pose detection
  const stopDetection = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  return {
    detector,
    isLoading,
    error,
    detectPoses,
    startDetection,
    stopDetection,
    config: {
      modelType,
      maxPoses,
      minPoseScore,
      minKeypointScore,
    },
  };
};
