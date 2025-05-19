"use client";

import { useLayoutEffect, useRef } from "react";
import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from "@mediapipe/tasks-vision";
import "./home.css";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const webcamButton = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    console.log("useEffect: DOM updated");
    let poseLandmarker: PoseLandmarker | undefined = undefined;
    let webcamRunning = false;
    const videoWidth = "1200px";
    const videoHeight = "900px";

    // Before we can use PoseLandmarker class we must wait for it to finish
    // loading. Machine Learning models can be large and take a moment to
    // get everything needed to run.
    const createPoseLandmarker = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 2,
      });
    };
    createPoseLandmarker();

    /********************************************************************
    // Demo 2: Continuously grab image from webcam stream and detect it.
    ********************************************************************/

    const video = videoRef.current!;
    const canvasElement = canvasRef.current!;
    const enableWebcamButton = webcamButton.current!;
    const canvasCtx = canvasElement.getContext("2d")!;
    const drawingUtils = new DrawingUtils(canvasCtx);

    // Check if webcam access is supported.
    const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

    // If webcam supported, add event listener to button for when user
    // wants to activate it.
    if (hasGetUserMedia()) {
      enableWebcamButton.addEventListener("click", enableCam);
    } else {
      console.warn("getUserMedia() is not supported by your browser");
    }

    // Enable the live webcam view and start detection.
    function enableCam() {
      if (!poseLandmarker) {
        console.log("Wait! poseLandmaker not loaded yet.");
        return;
      }

      if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
      } else {
        webcamRunning = true;
        enableWebcamButton.innerText = "";
        // enableWebcamButton.style.display = "none";
      }

      // getUsermedia parameters.
      const constraints = {
        video: true,
      };

      // Activate the webcam stream.
      navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
      });
    }

    let lastVideoTime = -1;
    async function predictWebcam() {
      canvasElement.style.height = videoHeight;
      video.style.height = videoHeight;
      canvasElement.style.width = videoWidth;
      video.style.width = videoWidth;
      const startTimeMs = performance.now();
      if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        poseLandmarker?.detectForVideo(video, startTimeMs, (result) => {
          if (result.landmarks && result.landmarks.length > 0) {
            const keypoints = result.landmarks[0];

            const leftHip = keypoints[23].y;
            const leftKnee = keypoints[25].y;

            if (leftHip > leftKnee - 0.05) {
              enableWebcamButton.innerText = "✅ Squatting";
            } else {
              enableWebcamButton.innerText = "⬇️ Go Lower";
            }
          }

          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
          for (const landmark of result.landmarks) {
            drawingUtils.drawLandmarks(landmark, {
              radius: (data) =>
                DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1),
            });
            drawingUtils.drawConnectors(
              landmark,
              PoseLandmarker.POSE_CONNECTIONS
            );
          }
          canvasCtx.restore();
        });
      }

      // Call this function again to keep predicting when the browser is ready.
      if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
      }
    }
  });

  console.log("Rendering Component");

  return (
    <section>
      <button ref={webcamButton}>START DETECTION</button>
      <div className="relative">
        <video
          ref={videoRef}
          className="absolute w-[1280px] h-[720px]"
          autoPlay
          playsInline
        ></video>
        <canvas
          className="output_canvas absolute left-0 top-0"
          ref={canvasRef}
          width="1280"
          height="720"
        ></canvas>
      </div>
    </section>
  );
}
