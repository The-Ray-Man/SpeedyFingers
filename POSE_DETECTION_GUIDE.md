# Pose Detection with MoveNet - Usage Guide

## Overview
The VideoComponent now includes real-time human pose detection using TensorFlow.js and MoveNet. The model runs entirely on the client-side using WebAssembly, so no backend connection is needed.

## Features

### 1. **Toggle Skeleton Display**
- Use the "Show/Hide Skeleton" button to toggle the pose visualization on and off
- The skeleton overlay is drawn on top of the video feed

### 2. **Model Selection**
You can choose between three different MoveNet models:

- **Single Pose (Fast)** - `SinglePose.Lightning`
  - Fastest model, best for real-time performance
  - Tracks one person
  - Lower accuracy but very responsive
  
- **Single Pose (Accurate)** - `SinglePose.Thunder`
  - More accurate single person tracking
  - Slightly slower than Lightning
  - Better for detailed pose analysis
  
- **Multi Pose** - `MultiPose.Lightning`
  - Can track multiple people simultaneously
  - Set the maximum number of people to track (1-6)
  - Best for group activities

### 3. **Max Poses Configuration**
When using Multi Pose mode:
- Use the "Max Poses" dropdown to select how many people to track (1-6)
- More poses = more computation, may affect performance

### 4. **Visualization Options**

#### Keypoints Button
- Toggle visibility of joint keypoints (the dots on body parts)
- Shows 17 body keypoints:
  - Face: nose, eyes, ears
  - Upper body: shoulders, elbows, wrists
  - Lower body: hips, knees, ankles

#### Skeleton Button
- Toggle visibility of connecting lines between keypoints
- Shows the body structure as connected lines

### 5. **Confidence Thresholds**
The system uses confidence scores to filter out unreliable detections:
- **minPoseScore** (0.25): Minimum confidence for a pose to be detected
- **minKeypointScore** (0.3): Minimum confidence for a keypoint to be displayed

## Programmatic Configuration

### Customizing Pose Detection Settings

You can modify the initial configuration in the component:

```typescript
const [poseConfig, setPoseConfig] = useState<PoseDetectionConfig>({
  modelType: 'SinglePose.Lightning',  // Change model type
  maxPoses: 1,                        // Max people to track
  minPoseScore: 0.25,                 // Pose confidence threshold
  minKeypointScore: 0.3,              // Keypoint confidence threshold
});
```

### Customizing Visual Appearance

Modify the drawing options:

```typescript
const [drawOptions, setDrawOptions] = useState<DrawOptions>({
  showKeypoints: true,        // Show/hide keypoints
  showSkeleton: true,         // Show/hide skeleton lines
  keypointRadius: 4,          // Size of keypoint dots
  lineWidth: 2,               // Thickness of skeleton lines
  keypointColor: '#00ff00',   // Color of keypoints (hex)
  skeletonColor: '#00ff00',   // Color of skeleton lines (hex)
});
```

### Available Keypoints

The MoveNet model detects 17 keypoints:

```typescript
0: nose
1: left_eye
2: right_eye
3: left_ear
4: right_ear
5: left_shoulder
6: right_shoulder
7: left_elbow
8: right_elbow
9: left_wrist
10: right_wrist
11: left_hip
12: right_hip
13: left_knee
14: right_knee
15: left_ankle
16: right_ankle
```

## Accessing Pose Data for Game Logic

### Getting Pose Information

The pose detection loop in VideoComponent can be extended to access pose data:

```typescript
// In the pose detection useEffect:
const poses = await detectPoses(video);

// Each pose contains:
poses.forEach(pose => {
  console.log('Pose confidence:', pose.score);
  
  pose.keypoints.forEach((keypoint, index) => {
    console.log(`Keypoint ${index}:`, {
      name: KEYPOINT_NAMES[index],
      x: keypoint.x,
      y: keypoint.y,
      confidence: keypoint.score
    });
  });
});
```

### Example: Detecting Raised Arms

```typescript
const isArmsRaised = (pose: poseDetection.Pose) => {
  const leftWrist = pose.keypoints[9];
  const rightWrist = pose.keypoints[10];
  const leftShoulder = pose.keypoints[5];
  const rightShoulder = pose.keypoints[6];

  // Check if wrists are above shoulders
  return (
    leftWrist.y < leftShoulder.y && 
    rightWrist.y < rightShoulder.y &&
    leftWrist.score! > 0.3 && 
    rightWrist.score! > 0.3
  );
};
```

### Example: Calculating Distance Between Points

```typescript
const getDistance = (point1: Keypoint, point2: Keypoint) => {
  const dx = point1.x - point2.x;
  const dy = point1.y - point2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Use it:
const leftElbow = pose.keypoints[7];
const leftWrist = pose.keypoints[9];
const armLength = getDistance(leftElbow, leftWrist);
```

### Example: Detecting Pose Type

```typescript
const detectPoseType = (pose: poseDetection.Pose) => {
  const leftWrist = pose.keypoints[9];
  const rightWrist = pose.keypoints[10];
  const nose = pose.keypoints[0];
  const leftHip = pose.keypoints[11];
  const rightHip = pose.keypoints[12];
  
  // Standing with arms raised
  if (leftWrist.y < nose.y && rightWrist.y < nose.y) {
    return 'arms_raised';
  }
  
  // Squatting (hips lowered)
  const avgKneeY = (pose.keypoints[13].y + pose.keypoints[14].y) / 2;
  const avgHipY = (leftHip.y + rightHip.y) / 2;
  if (avgHipY > avgKneeY * 0.8) {
    return 'squatting';
  }
  
  return 'neutral';
};
```

## Performance Tips

1. **Use Lightning models** for better performance
2. **Reduce maxPoses** when using MultiPose mode
3. **Lower minKeypointScore** if keypoints are flickering
4. **Raise minPoseScore** to filter out uncertain detections

## Browser Compatibility

- Requires WebGL support
- Works best in Chrome, Edge, and modern Firefox
- Camera permissions required
- Hardware acceleration recommended for smooth performance

## Troubleshooting

### Model Loading Issues
- Check console for error messages
- Ensure stable internet connection for initial model download
- Models are cached after first load

### Performance Issues
- Switch to SinglePose.Lightning model
- Close other tabs/applications
- Enable hardware acceleration in browser settings

### Camera Not Working
- Grant camera permissions
- Check if camera is being used by another application
- Try refreshing the page
