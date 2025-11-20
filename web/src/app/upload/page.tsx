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
    // Capture client-side upload start time
    const clientUploadStartTime = performance.now();
    
    try {
      const uploadResponse = await uploadImage(file);
      
      // Calculate total upload time (client-side measurement includes network transfer)
      const clientUploadEndTime = performance.now();
      const totalUploadTime = Math.round((clientUploadEndTime - clientUploadStartTime) / 100) / 10;
      
      // Store image info for processing
      sessionStorage.setItem("currentImageId", uploadResponse.sourceImageId);
      sessionStorage.setItem("imageFilename", uploadResponse.filename);
      sessionStorage.setItem("imageUrl", uploadResponse.url);
      
      // Store upload timing (use client-side measurement for more accurate total time)
      console.log("📊 Upload timing (client-side):", totalUploadTime, "s");
      sessionStorage.setItem("uploadTiming", totalUploadTime.toString());
      
      router.push("/processing");
    } catch (error: any) {
      console.error("Upload error:", error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to upload image. Please try again.";
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 400) {
          errorMessage = data.message || data.error || "Invalid file. Please check that your image is a valid JPG, PNG, GIF, or WebP file.";
        } else if (status === 413) {
          errorMessage = "File is too large. Please upload an image smaller than 10MB.";
        } else if (status === 500) {
          errorMessage = data.message || "Server error. Please try again in a moment.";
        } else {
          errorMessage = data.message || data.error || errorMessage;
        }
      } else if (error.message) {
        if (error.message.includes("Network Error") || error.message.includes("ERR_CONNECTION_REFUSED")) {
          errorMessage = "Cannot connect to server. Please make sure the backend is running.";
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
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

