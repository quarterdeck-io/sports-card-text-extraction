"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle } from "lucide-react";

export default function ReviewPage() {
  const router = useRouter();
  const [fields, setFields] = useState({
    year: "",
    set: "",
    cardNumber: "",
    title: "",
    playerFirstName: "",
    playerLastName: "",
    gradingCompany: "",
    grade: "",
    cert: "",
    caption: "",
  });

  useEffect(() => {
    const cardDataStr = sessionStorage.getItem("cardData");
    if (cardDataStr) {
      try {
        const cardData = JSON.parse(cardDataStr);
        if (cardData.normalized) {
          setFields(cardData.normalized);
        }
      } catch (error) {
        console.error("Error parsing card data:", error);
      }
    } else {
      // No card data, redirect to upload
      router.push("/upload");
    }
  }, [router]);

  const handleFieldChange = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  const handleExport = () => {
    router.push("/export");
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Review & Edit</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.entries(fields).map(([key, value]) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={() => router.push("/upload")}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4f7a]"
          >
            Continue to Export
          </button>
        </div>
      </div>
    </div>
  );
}

