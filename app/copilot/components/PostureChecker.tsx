import { useEffect, useRef, useState } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

const PostureChecker = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [poseLandmarker, setPoseLandmarker] = useState<PoseLandmarker | null>(null);
  const [webcamRunning, setWebcamRunning] = useState<boolean>(false);
  const drawingUtilsRef = useRef<DrawingUtils | null>(null);

  useEffect(() => {
    const createPoseLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      const landmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      setPoseLandmarker(landmarker);
    };

    createPoseLandmarker();
  }, []);

  const enableCam = async () => {
    if (!poseLandmarker) {
      console.log("PoseLandmarker not loaded yet.");
      return;
    }

    const constraints = {
      video: true,
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setWebcamRunning(true);
      videoRef.current.addEventListener("loadeddata", predictWebcam);
    }
  };

  const predictWebcam = async () => {
    if (webcamRunning && poseLandmarker && videoRef.current && canvasRef.current) {
      const canvasCtx = canvasRef.current.getContext("2d");
      if (canvasCtx) {
        const result = await poseLandmarker.detectForVideo(videoRef.current, performance.now());
        canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        drawingUtilsRef.current = new DrawingUtils(canvasCtx);
        for (const landmark of result.landmarks) {
          drawingUtilsRef.current.drawLandmarks(landmark, {
            radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
          });
          drawingUtilsRef.current.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
        }
      }
      requestAnimationFrame(predictWebcam);
    }
  };

  return (
    <div>
      <h2>Live Posture Checker</h2>
      <button onClick={enableCam}>
        {webcamRunning ? "Disable Webcam" : "Enable Webcam"}
      </button>
      <div style={{ position: "relative" }}>
        <video ref={videoRef} style={{ width: "640px", height: "480px" }} autoPlay playsInline />
        <canvas ref={canvasRef} style={{ position: "absolute", left: "0", top: "0" }} width="640" height="480" />
      </div>
    </div>
  );
};

export default PostureChecker;