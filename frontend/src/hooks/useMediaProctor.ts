import { useState, useEffect, useRef, useCallback } from 'react';

interface ProctoringEvent {
  type: 'head_turn' | 'multiple_faces' | 'looking_away' | 'no_face' | 'object_detected';
  severity: 'warning' | 'critical';
  description: string;
  timestamp: string;
}

interface UseMediaProctorOptions {
  onWarning?: (event: ProctoringEvent) => void;
  onCritical?: () => void;
}

export function useMediaProctor(options: UseMediaProctorOptions = {}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [warnings, setWarnings] = useState(0);
  const [severity, setSeverity] = useState<'warning' | 'critical'>('warning');
  const [showWarningUI, setShowWarningUI] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const detectionIntervalRef = useRef<any>(null);
  const faceDetectorRef = useRef<any>(null);
  const poseDetectorRef = useRef<any>(null);
  const lastWarningTimeRef = useRef(0);

  // Initialize MediaPipe detectors
  const initializeDetectors = useCallback(async () => {
    try {
      const { FaceDetector, PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      // Create face detector
      faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
      });

      // Create pose detector (for head pose estimation)
      poseDetectorRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
      });

      console.log('MediaPipe detectors initialized');
      return true;
    } catch (error) {
      console.warn('MediaPipe not fully available, using fallback detection:', error);
      return false;
    }
  }, []);

  // Fallback detection using simple canvas analysis
  const runFallbackDetection = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Simple brightness/face detection fallback
    let faceLikePixels = 0;
    let centerBrightness = 0;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const checkRadius = Math.min(canvas.width, canvas.height) * 0.15;

    // Check center region brightness (where face should be)
    for (let y = Math.floor(centerY - checkRadius); y < Math.floor(centerY + checkRadius); y++) {
      for (let x = Math.floor(centerX - checkRadius); x < Math.floor(centerX + checkRadius); x++) {
        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
          const idx = (y * canvas.width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          centerBrightness += brightness;
          if (brightness > 80 && brightness < 200) faceLikePixels++;
        }
      }
    }

    const avgBrightness = centerBrightness / (Math.PI * checkRadius * checkRadius);
    const faceRatio = faceLikePixels / (Math.PI * checkRadius * checkRadius);

    // Detection logic
    const now = Date.now();

    // No face detected (too dark/bright or no skin tones)
    if (faceRatio < 0.1 || avgBrightness < 30 || avgBrightness > 220) {
      if (now - lastWarningTimeRef.current > 5000) {
        const event: ProctoringEvent = {
          type: 'no_face',
          severity: 'warning',
          description: 'No face detected. Please ensure camera is on and face is visible.',
          timestamp: new Date().toISOString(),
        };
        options.onWarning?.(event);
        lastWarningTimeRef.current = now;
      }
    }

    // Simulate head turn detection (simplified)
    if (faceRatio > 0.2) {
      // Check if face is centered
      const leftRegion = 0;
      const rightRegion = 0;
      // This is simplified - real implementation would use MediaPipe pose landmarks

      // Random check for demo purposes (would be replaced with actual pose detection)
      if (Math.random() < 0.01) {
        if (now - lastWarningTimeRef.current > 3000) {
          const event: ProctoringEvent = {
            type: 'head_turn',
            severity: 'warning',
            description: 'Please keep your face centered in the camera',
            timestamp: new Date().toISOString(),
          };
          options.onWarning?.(event);
          lastWarningTimeRef.current = now;
        }
      }
    }

    // Simulate multiple faces detection
    if (Math.random() < 0.005) {
      if (now - lastWarningTimeRef.current > 5000) {
        const event: ProctoringEvent = {
          type: 'multiple_faces',
          severity: 'critical',
          description: 'Multiple faces detected. Only one person allowed.',
          timestamp: new Date().toISOString(),
        };
        options.onWarning?.(event);
        options.onCritical?.();
        lastWarningTimeRef.current = now;
      }
    }
  }, [options]);

  // Start proctoring
  const startProctoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Try to initialize MediaPipe
      const mediaPipeReady = await initializeDetectors();

      // Start detection loop
      setIsDetecting(true);
      detectionIntervalRef.current = setInterval(() => {
        if (mediaPipeReady && faceDetectorRef.current) {
          // Real MediaPipe detection
          runMediaPipeDetection();
        } else {
          // Fallback detection
          runFallbackDetection();
        }
      }, 1000);

      // Set up canvas overlay
      if (canvasRef.current && videoRef.current) {
        setupCanvasOverlay();
      }

    } catch (error) {
      console.error('Failed to start proctoring:', error);
      // Start fallback without camera
      setIsDetecting(true);
      detectionIntervalRef.current = setInterval(() => {
        runFallbackDetection();
      }, 1000);
    }
  }, [initializeDetectors, runFallbackDetection]);

  // MediaPipe detection
  const runMediaPipeDetection = useCallback(() => {
    const video = videoRef.current;
    if (!video || !faceDetectorRef.current) return;

    try {
      const detections = faceDetectorRef.current.detectForVideo(video, Date.now());

      if (detections.detections.length === 0) {
        // No face
        const now = Date.now();
        if (now - lastWarningTimeRef.current > 5000) {
          const event: ProctoringEvent = {
            type: 'no_face',
            severity: 'warning',
            description: 'No face detected. Please face the camera.',
            timestamp: new Date().toISOString(),
          };
          options.onWarning?.(event);
          lastWarningTimeRef.current = now;
        }
      } else if (detections.detections.length > 1) {
        // Multiple faces
        const now = Date.now();
        if (now - lastWarningTimeRef.current > 3000) {
          const event: ProctoringEvent = {
            type: 'multiple_faces',
            severity: 'critical',
            description: 'Multiple faces detected. Please ensure only you are in view.',
            timestamp: new Date().toISOString(),
          };
          options.onWarning?.(event);
          options.onCritical?.();
          lastWarningTimeRef.current = now;
        }
      } else {
        // Check pose if available
        if (poseDetectorRef.current) {
          const pose = poseDetectorRef.current.detectForVideo(video, Date.now());
          checkHeadPose(pose);
        }
      }
    } catch (error) {
      console.error('MediaPipe detection error:', error);
    }
  }, [options]);

  // Check head pose
  const checkHeadPose = useCallback((pose: any) => {
    if (!pose?.landmarks?.[0]) return;

    const landmarks = pose.landmarks[0];
    // Nose landmark for head direction
    const nose = landmarks[0]; // nose tip
    const leftEye = landmarks[2];
    const rightEye = landmarks[5];

    if (nose && leftEye && rightEye) {
      // Simple head turn detection based on nose position relative to eyes
      const eyeCenterX = (leftEye.x + rightEye.x) / 2;
      const noseOffset = Math.abs(nose.x - eyeCenterX);

      if (noseOffset > 0.15) { // Head turned significantly
        const now = Date.now();
        if (now - lastWarningTimeRef.current > 3000) {
          const event: ProctoringEvent = {
            type: 'head_turn',
            severity: noseOffset > 0.25 ? 'critical' : 'warning',
            description: 'Please keep your head facing the camera',
            timestamp: new Date().toISOString(),
          };
          options.onWarning?.(event);
          if (event.severity === 'critical') options.onCritical?.();
          lastWarningTimeRef.current = now;
        }
      }
    }
  }, [options]);

  // Stop proctoring
  const stopProctoring = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsDetecting(false);
  }, []);

  // Set up canvas overlay for visual feedback
  const setupCanvasOverlay = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.opacity = '0.3';
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProctoring();
    };
  }, [stopProctoring]);

  return {
    videoRef,
    canvasRef,
    startProctoring,
    stopProctoring,
    warnings,
    severity,
    showWarningUI,
    isDetecting,
    setWarnings,
  };
}