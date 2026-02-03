"use client";

import { Book, CreditCard, X } from "lucide-react";

export type AppMode = "card" | "book" | null;

interface ModeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModeSelect: (mode: AppMode) => void;
}

export default function ModeSelectionModal({
  isOpen,
  onClose,
  onModeSelect,
}: ModeSelectionModalProps) {
  const handleModeSelect = (mode: "card" | "book") => {
    // Save to localStorage
    localStorage.setItem("appMode", mode);
    // Call parent handler - parent will handle navigation
    onModeSelect(mode);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Select Scanner Mode</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <p className="text-gray-600 mb-8 text-center text-lg">
            Choose the type of scanning you want to perform:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card Scanner Option */}
            <button
              onClick={() => handleModeSelect("card")}
              className="group relative p-8 border-2 border-gray-300 rounded-lg hover:border-[#1e3a5f] hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <CreditCard className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Sports Card Scanner
                </h3>
                <p className="text-gray-600 text-sm">
                  Extract information from sports trading cards including player names, year, set, grading information, and more.
                </p>
              </div>
            </button>

            {/* Book Scanner Option */}
            <button
              onClick={() => handleModeSelect("book")}
              className="group relative p-8 border-2 border-gray-300 rounded-lg hover:border-[#1e3a5f] hover:shadow-lg transition-all duration-200 text-left"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Book className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Book Title Page Scanner
                </h3>
                <p className="text-gray-600 text-sm">
                  Extract bibliographic information from book title pages including ISBN, author, publisher, edition, and more.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
