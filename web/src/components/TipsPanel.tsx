"use client";

import { Check, X, Folder } from "lucide-react";

export default function TipsPanel() {
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
            <span className="text-gray-700 font-medium">Good: Clear, no glare</span>
          </div>
          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <span className="text-gray-400 text-sm">Good photo</span>
          </div>
        </div>

        {/* Bad Example - Single Column */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <X className="w-5 h-5 text-red-600" />
            <span className="text-gray-700 font-medium">Bad: Glare, blurry</span>
          </div>
          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            <span className="text-gray-400 text-sm">Bad photo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

