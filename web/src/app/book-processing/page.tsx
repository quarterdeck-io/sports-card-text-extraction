"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { processBookImage } from "@/lib/api";

interface ProcessingTimings {
  upload?: number;
  ocr?: number;
  normalization?: number;
  titleGeneration?: number;
  total?: number;
}

export default function BookProcessingPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Processing book title page...");
  const [timings, setTimings] = useState<ProcessingTimings>({});

  useEffect(() => {
    const processBook = async () => {
      try {
        const sourceImageId = sessionStorage.getItem("currentImageId");
        const filename = sessionStorage.getItem("imageFilename");
        const url = sessionStorage.getItem("imageUrl");

        if (!sourceImageId || !filename || !url) {
          router.push("/book-upload");
          return;
        }

        const uploadTiming = sessionStorage.getItem("uploadTiming");
        const allTimings: ProcessingTimings = {};
        
        if (uploadTiming) {
          allTimings.upload = parseFloat(uploadTiming);
          console.log("📊 Upload timing retrieved:", allTimings.upload, "s");
          setTimings({ ...allTimings });
        }
        
        setStatus("Running OCR...");
        const result = await processBookImage(filename, sourceImageId, url);
        
        sessionStorage.setItem("currentBookId", result.bookId);
        sessionStorage.setItem("bookData", JSON.stringify(result.book));
        
        if (result.timings) {
          const finalTimings = {
            ...allTimings,
            ...result.timings,
          };
          setTimings(finalTimings);
          sessionStorage.setItem("processingTimings", JSON.stringify(finalTimings));
        } else if (allTimings.upload) {
          setTimings(allTimings);
          sessionStorage.setItem("processingTimings", JSON.stringify(allTimings));
        }
        
        setStatus("Complete!");
        setTimeout(() => {
          router.push("/book-review");
        }, 500);
      } catch (error: any) {
        console.error("Processing error:", error);
        
        let errorMessage = "Processing failed. Please try again.";
        
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;
          
          if (status === 404 && data.error?.includes("Image file not found")) {
            errorMessage = "Image file not found. Please upload the image again.";
          } else if (data.step === "ocr" || data.message?.includes("OCR")) {
            errorMessage = "Unable to extract text from this image. Please ensure:\n• The image is clear and in focus\n• The title page text is visible\n• The image is not corrupted\n• Try a different image format (JPG, PNG, or PDF)";
          } else if (data.step === "normalization" || data.message?.includes("Normalization") || data.message?.includes("AI service")) {
            errorMessage = data.message || "Unable to process the extracted text. The AI service may be temporarily unavailable. Please try again.";
          } else if (data.error || data.message) {
            errorMessage = data.message || data.error;
          }
        } else if (error.message) {
          if (error.message.includes("Network Error") || error.message.includes("ERR_CONNECTION_REFUSED")) {
            errorMessage = "Cannot connect to server. Please check your connection and try again.";
          } else {
            errorMessage = error.message;
          }
        }
        
        setStatus(errorMessage);
        setTimeout(() => {
          router.push("/book-upload");
        }, 5000);
      }
    };

    processBook();
  }, [router]);

  const isError = status.includes("failed") || status.includes("Unable") || status.includes("error") || status.includes("not found") || status.includes("corrupted");
  
  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto text-center">
        <div className="mb-8">
          {!isError && (
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          )}
          {isError && (
            <div className="w-16 h-16 border-4 border-red-500 rounded-full mx-auto mb-4 flex items-center justify-center">
              <span className="text-4xl">⚠️</span>
            </div>
          )}
          <h2 className={`text-2xl font-semibold mb-2 ${isError ? "text-red-400" : "text-white"}`}>
            {status.split('\n')[0]}
          </h2>
          {status.includes('\n') && (
            <div className="mt-4 text-left bg-red-900/20 border border-red-500/30 rounded-lg p-4 max-w-lg mx-auto">
              <p className="text-red-300 text-sm whitespace-pre-line">
                {status.split('\n').slice(1).join('\n')}
              </p>
            </div>
          )}
          {!isError && (
            <p className="text-gray-300">
              Please wait while we extract and process your book bibliographic information...
            </p>
          )}
          
          {Object.keys(timings).length > 0 && (
            <div className="mt-8 max-w-md mx-auto">
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-white mb-4 text-center">
                  Processing Breakdown
                </h3>
                <div className="space-y-2">
                  {timings.upload !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Image Upload</span>
                      <span className="text-blue-400 font-mono">{timings.upload}s</span>
                    </div>
                  )}
                  {timings.ocr !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">OCR Extraction</span>
                      <span className="text-blue-400 font-mono">{timings.ocr}s</span>
                    </div>
                  )}
                  {timings.normalization !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">AI Normalization</span>
                      <span className="text-blue-400 font-mono">{timings.normalization}s</span>
                    </div>
                  )}
                  {timings.titleGeneration !== undefined && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400">Title Generation</span>
                      <span className="text-blue-400 font-mono">{timings.titleGeneration}s</span>
                    </div>
                  )}
                  {timings.total !== undefined && (
                    <div className="flex justify-between items-center text-sm pt-2 mt-2 border-t border-gray-700">
                      <span className="text-white font-semibold">Total Processing Time</span>
                      <span className="text-green-400 font-mono font-semibold">{timings.total}s</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
