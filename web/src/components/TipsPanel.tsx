"use client";

import { Check, X, Folder } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function TipsPanel() {
  const pathname = usePathname();
  const [goodImageError, setGoodImageError] = useState(false);
  const [badImageError, setBadImageError] = useState(false);

  const isBookMode = pathname?.startsWith("/book-");

  // Image sources & copy for each mode
  const goodSrc = isBookMode ? "/book-good.svg" : "/good.png";
  const badSrc = isBookMode ? "/book-bad.svg" : "/bad.JPG";
  const goodAlt = isBookMode
    ? "Good example: clear, flat photo of a book title page"
    : "Good example: clear, no-glare card photo";
  const badAlt = isBookMode
    ? "Bad example: glare or blurry book title page"
    : "Bad example: glare or blurry card photo";
  const goodFallback = isBookMode
    ? "book-good.svg missing in /public/ (clear book title page placeholder)"
    : "good.png missing in /public/ (clear card photo)";
  const badFallback = isBookMode
    ? "book-bad.svg missing in /public/ (bad book title page placeholder)"
    : "bad.JPG missing in /public/ (bad card photo)";

  const contextLabel = isBookMode ? "title page" : "card";

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Folder className="w-6 h-6 text-amber-600" />
        <h3 className="text-xl font-semibold text-gray-800">Tips for Best Photo</h3>
      </div>

      <div className="flex flex-col gap-6">
        {/* Good Example - Single Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-gray-700 font-medium">
              Good: Clear {contextLabel}, no glare
            </span>
          </div>
          <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-green-300 relative">
            {!goodImageError ? (
              <img
                src={goodSrc}
                alt={goodAlt}
                className="w-full h-full object-cover"
                onError={() => setGoodImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-sm">{goodFallback}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bad Example - Single Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            <span className="text-gray-700 font-medium">
              Bad: Glare, blurry {contextLabel}
            </span>
          </div>
          <div className="w-full h-48 bg-gray-100 rounded-lg overflow-hidden border-2 border-red-300 relative">
            {!badImageError ? (
              <img
                src={badSrc}
                alt={badAlt}
                className="w-full h-full object-cover"
                onError={() => setBadImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-400 text-sm">{badFallback}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

