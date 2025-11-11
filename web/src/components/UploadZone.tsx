"use client";

import { useRef, useState, useEffect, DragEvent, ChangeEvent } from "react";
import { Upload, Camera, X } from "lucide-react";

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  onCameraCapture?: () => void;
}

export default function UploadZone({ onFileSelect, onCameraCapture }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      onFileSelect(file);
    }
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleCameraCapture = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert("Unable to access camera. Please check permissions and try again.");
    }
  };

  // Set up video stream when modal opens and video element is available
  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = stream;
      
      // Explicitly play the video
      video.play().catch((error) => {
        console.error("Error playing video:", error);
      });
    }
  }, [isCameraOpen, stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `camera-capture-${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            onFileSelect(file);
            closeCamera();
          }
        }, "image/jpeg", 0.9);
      }
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-white hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
        <div className="flex flex-col items-center gap-4">
          <Upload className="w-16 h-16 text-blue-600" />
          <p className="text-gray-600 text-lg">
            Drop image here or click to browse
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          onClick={handleCameraCapture}
          className="flex items-center justify-center gap-2 bg-[#1e3a5f] text-white px-6 py-3 rounded-lg hover:bg-[#2a4f7a] transition-colors font-medium"
        >
          <Camera className="w-5 h-5" />
          Capture via Camera
        </button>
      </div>

      {/* Camera Modal */}
      {isCameraOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Camera Capture</h2>
              <button
                onClick={closeCamera}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="relative bg-black rounded-lg overflow-hidden" style={{ minHeight: "400px" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={capturePhoto}
                className="flex-1 bg-[#1e3a5f] text-white px-6 py-3 rounded-lg hover:bg-[#2a4f7a] transition-colors font-medium"
              >
                Capture Photo
              </button>
              <button
                onClick={closeCamera}
                className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

