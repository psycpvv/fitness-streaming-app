"use client";

import { useEffect, useRef, useState } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [feedback, setFeedback] = useState("Loading...");
  const [landmarker, setLandmarker] = useState<PoseLandmarker | null>(null);

  useEffect(() => {
    async function init() {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );

      const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });

      setLandmarker(poseLandmarker);

      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadeddata = () => {
          videoRef.current!.play();
          requestAnimationFrame(predict);
        };
      }

      const canvas = canvasRef.current!;
      const ctx = canvas.getContext("2d")!;
      const drawingUtils = new DrawingUtils(ctx);

      const predict = async () => {
        if (!videoRef.current || !landmarker) return;

        const video = videoRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        landmarker?.detectForVideo(video, performance.now(), (result) => {
          if (result.landmarks && result.landmarks.length > 0) {
            const keypoints = result.landmarks[0];
            drawingUtils.drawLandmarks(keypoints);
            drawingUtils.drawConnectors(keypoints);

            const leftHip = keypoints[23].y;
            const leftKnee = keypoints[25].y;

            if (leftHip > leftKnee - 0.05) {
              setFeedback("✅ Squatting");
            } else {
              setFeedback("⬇️ Go Lower");
            }
          } else {
            setFeedback("No person detected");
          }
        });

        requestAnimationFrame(predict);
      };
    }

    init();
  }, []);

  return (
    <main className="flex flex-col items-center p-6 gap-4 min-h-screen bg-gray-100">
      <div className="relative">
        <video
          ref={videoRef}
          className="rounded shadow"
          autoPlay
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
      </div>
      <div className="text-2xl font-semibold text-blue-700">{feedback}</div>
    </main>
  );
}
