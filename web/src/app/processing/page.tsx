"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { processImage } from "@/lib/api";

export default function ProcessingPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing image...");

  useEffect(() => {
    const processCard = async () => {
      try {
        const sourceImageId = sessionStorage.getItem("currentImageId");
        const filename = sessionStorage.getItem("imageFilename");
        const url = sessionStorage.getItem("imageUrl");

        if (!sourceImageId || !filename || !url) {
          router.push("/upload");
          return;
        }

        setStatus("Running OCR...");
        const result = await processImage(filename, sourceImageId, url);
        
        // Store card data
        sessionStorage.setItem("currentCardId", result.cardId);
        sessionStorage.setItem("cardData", JSON.stringify(result.card));
        
        setStatus("Complete!");
        setTimeout(() => {
          router.push("/review");
        }, 500);
      } catch (error) {
        console.error("Processing error:", error);
        setStatus("Processing failed. Please try again.");
        setTimeout(() => {
          router.push("/upload");
        }, 2000);
      }
    };

    processCard();
  }, [router]);

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            {status}
          </h2>
          <p className="text-gray-300">
            Please wait while we extract and process your card information...
          </p>
        </div>
      </div>
    </div>
  );
}

