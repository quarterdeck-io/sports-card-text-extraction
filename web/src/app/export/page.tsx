"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ExportSuccessModal from "@/components/ExportSuccessModal";
import api from "@/lib/api";

export default function ExportPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    const cardId = sessionStorage.getItem("currentCardId");
    if (!cardId) {
      alert("No card data found. Please upload an image first.");
      router.push("/upload");
      return;
    }

    setIsExporting(true);
    try {
      const response = await api.post(
        "/api/export/csv",
        { cardId },
        {
          responseType: "blob",
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `card-${cardId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setIsModalOpen(true);
    } catch (error) {
      console.error("CSV export error:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSheets = async () => {
    const cardId = sessionStorage.getItem("currentCardId");
    if (!cardId) {
      alert("No card data found. Please upload an image first.");
      router.push("/upload");
      return;
    }

    setIsExporting(true);
    try {
      const response = await api.post("/api/export/sheets", { cardId });
      
      if (response.data.sheetUrl) {
        setIsModalOpen(true);
        // Store sheet URL for the modal
        sessionStorage.setItem("sheetUrl", response.data.sheetUrl);
      } else {
        alert("Data exported to Google Sheets successfully!");
      }
    } catch (error: any) {
      console.error("Google Sheets export error:", error);
      const errorMessage = error.response?.data?.error || "Failed to export to Google Sheets. Please try again.";
      alert(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Export Data</h1>

        <div className="bg-white rounded-lg shadow-md p-8">
          <p className="text-gray-700 mb-6">
            Choose how you'd like to export your card data:
          </p>

          <div className="flex flex-col gap-4">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="w-full px-6 py-4 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4f7a] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting..." : "Export to CSV"}
            </button>
            <button
              onClick={handleExportSheets}
              disabled={isExporting}
              className="w-full px-6 py-4 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4f7a] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? "Exporting..." : "Export to Google Sheets"}
            </button>
          </div>
        </div>
      </div>

      <ExportSuccessModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDownloadCSV={handleExportCSV}
        onOpenGoogleSheet={handleExportSheets}
      />
    </div>
  );
}

