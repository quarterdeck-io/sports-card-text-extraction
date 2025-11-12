"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/UploadZone";
import TipsPanel from "@/components/TipsPanel";
import { uploadImage } from "@/lib/api";

export default function UploadPage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (file: File) => {
    setIsUploading(true);
    try {
      const uploadResponse = await uploadImage(file);
      // Store image info for processing
      sessionStorage.setItem("currentImageId", uploadResponse.sourceImageId);
      sessionStorage.setItem("imageFilename", uploadResponse.filename);
      sessionStorage.setItem("imageUrl", uploadResponse.url);
      router.push("/processing");
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCameraCapture = () => {
    // TODO: Implement camera capture
    alert("Camera capture will be implemented");
  };

  return (
    <div className="container mx-auto px-6 py-12">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Extract Text from Sports Cards Instantly
        </h1>
        <p className="text-xl text-gray-300">
          Upload an image and let AI handle the rest
        </p>
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Left Panel - Upload/Capture */}
        <div className="w-full">
          <UploadZone
            onFileSelect={handleFileSelect}
            onCameraCapture={handleCameraCapture}
          />
          {isUploading && (
            <div className="mt-4 text-center text-gray-300">
              Uploading...
            </div>
          )}
        </div>

        {/* Right Panel - Tips */}
        <div className="w-full">
          <TipsPanel />
        </div>
      </div>
    </div>
  );
}

