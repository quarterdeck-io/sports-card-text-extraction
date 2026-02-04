"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Download, FileSpreadsheet } from "lucide-react";
import { getExportPreference, saveExportPreference, type ExportType } from "@/lib/exportPreferences";
import api, { getBook } from "@/lib/api";
import ExportSuccessModal from "@/components/ExportSuccessModal";

const LOW_CONFIDENCE_THRESHOLD = 0.7;

const fieldLabels: Record<string, string> = {
  // TIER 1 - Direct Extraction
  printISBN: "Print ISBN",
  eISBN: "eISBN",
  publisherName: "Publisher Name",
  placePublished: "Place Published",
  yearPublished: "Year Published",
  editionText: "Edition",
  printingText: "Printing",
  printRunNumbers: "Print Run Numbers",
  volume: "Volume",
  copyrightInfo: "Copyright Info",
  libraryOfCongress: "Library of Congress",
  coverDesigner: "Cover Designer",
  originalPublicationDetails: "Original Publication Details",
  
  // TIER 2 - AI-Enhanced
  title: "Title",
  author: "Author",
  illustrator: "Illustrator",
  completePublisherInfo: "Complete Publisher Info",
  description: "Description",
  genre: "Genre",
  category: "Category",
  retailPrice: "Retail Price",
  
  // TIER 3 - Defaults
  format: "Format",
  condition: "Condition",
  quantity: "Quantity",
  productType: "Product Type",
  language: "Language",
  jacketCondition: "Jacket Condition",
  signedText: "Signed",
};

export default function BookReviewPage() {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [autoTitle, setAutoTitle] = useState<string>("");
  const [autoDescription, setAutoDescription] = useState<string>("");
  const [confidenceByField, setConfidenceByField] = useState<Record<string, number>>({});
  const [savedPreference, setSavedPreference] = useState<ExportType | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasAutoTitleRef = useRef(false);
  const hasAutoDescriptionRef = useRef(false);

  useEffect(() => {
    const loadBookData = () => {
      const bookDataStr = sessionStorage.getItem("bookData");
      if (bookDataStr) {
        try {
          const bookData = JSON.parse(bookDataStr);
          if (bookData.normalized) {
            const normalizedFields = { ...bookData.normalized };
            
            // Map all normalized fields
            setFields({
              printISBN: normalizedFields.printISBN || "",
              eISBN: normalizedFields.eISBN || "",
              publisherName: normalizedFields.publisherName || "",
              placePublished: normalizedFields.placePublished || "",
              yearPublished: normalizedFields.yearPublished || "",
              editionText: normalizedFields.editionText || "",
              printingText: normalizedFields.printingText || "",
              printRunNumbers: normalizedFields.printRunNumbers || "",
              volume: normalizedFields.volume || "",
              copyrightInfo: normalizedFields.copyrightInfo || "",
              libraryOfCongress: normalizedFields.libraryOfCongress || "",
              coverDesigner: normalizedFields.coverDesigner || "",
              originalPublicationDetails: normalizedFields.originalPublicationDetails || "",
              title: normalizedFields.title || "",
              author: normalizedFields.author || "",
              illustrator: normalizedFields.illustrator || "",
              completePublisherInfo: normalizedFields.completePublisherInfo || "",
              description: bookData.autoDescription && bookData.autoDescription.trim() !== ""
                ? bookData.autoDescription
                : normalizedFields.description || "",
              genre: normalizedFields.genre || "",
              category: normalizedFields.category || "",
              retailPrice: normalizedFields.retailPrice || "",
              format: normalizedFields.format || "Hardcover",
              condition: normalizedFields.condition || "Acceptable",
              quantity: normalizedFields.quantity || "1",
              productType: normalizedFields.productType || "book",
              language: normalizedFields.language || "English",
              jacketCondition: normalizedFields.jacketCondition || "dust jacket included",
              signedText: normalizedFields.signedText || "not signed",
            });
            
            if (bookData.autoTitle && bookData.autoTitle.trim() !== "") {
              setAutoTitle(bookData.autoTitle);
              hasAutoTitleRef.current = true;
            }
            
            if (bookData.autoDescription && bookData.autoDescription.trim() !== "") {
              setAutoDescription(bookData.autoDescription);
              hasAutoDescriptionRef.current = true;
            }
          }
          
          if (bookData.confidenceByField) {
            setConfidenceByField(bookData.confidenceByField);
          }
        } catch (error) {
          console.error("Error parsing book data:", error);
        }
      } else {
        router.push("/book-upload");
      }
    };

    loadBookData();
    
    // Poll for autoTitle/autoDescription (and now AI-estimated retailPrice) updates
    let pollCount = 0;
    const maxPolls = 15;
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      if (pollCount >= maxPolls || (hasAutoTitleRef.current && hasAutoDescriptionRef.current)) {
        clearInterval(pollInterval);
        return;
      }
      
      const bookId = sessionStorage.getItem("currentBookId");
      if (bookId) {
        try {
          const book = await getBook(bookId);
          const hasNewTitle = book.autoTitle && book.autoTitle.trim() !== "";
          const hasNewDescription = book.autoDescription && book.autoDescription.trim() !== "";
          const hasNewRetailPrice =
            book.normalized?.retailPrice && book.normalized.retailPrice.trim() !== "";
          
          if (hasNewTitle && !hasAutoTitleRef.current) {
            setAutoTitle(book.autoTitle);
            hasAutoTitleRef.current = true;
            setFields((prev) => ({
              ...prev,
              title: book.autoTitle,
            }));
          }
          
          if (hasNewDescription && !hasAutoDescriptionRef.current) {
            setAutoDescription(book.autoDescription);
            hasAutoDescriptionRef.current = true;
            setFields((prev) => ({
              ...prev,
              description: book.autoDescription,
            }));
          }
          
          // If Gemini later fills in an estimated retailPrice, apply it
          // only when we don't already have a value (to avoid overwriting user input).
          if (hasNewRetailPrice) {
            setFields((prev) => {
              if (prev.retailPrice && prev.retailPrice.trim() !== "") {
                return prev;
              }
              return {
                ...prev,
                retailPrice: book.normalized.retailPrice,
              };
            });
          }
          
          const bookDataStr = sessionStorage.getItem("bookData");
          if (bookDataStr) {
            const bookData = JSON.parse(bookDataStr);
            if (hasNewTitle) bookData.autoTitle = book.autoTitle;
            if (hasNewDescription) bookData.autoDescription = book.autoDescription;
            if (hasNewRetailPrice) {
              bookData.normalized = {
                ...bookData.normalized,
                retailPrice: book.normalized.retailPrice,
              };
            }
            sessionStorage.setItem("bookData", JSON.stringify(bookData));
          }
          
          if (hasNewTitle && hasNewDescription && hasNewRetailPrice) {
            clearInterval(pollInterval);
          }
        } catch (error) {
          console.debug("Polling for autoTitle/autoDescription:", error);
        }
      }
    }, 2000);
    
    setSavedPreference(getExportPreference());
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [router]);

  const handleFieldChange = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  const getConfidenceScore = (field: string): number | null => {
    return confidenceByField[field] ?? null;
  };

  const getConfidenceLevel = (field: string): "high" | "medium" | "low" | null => {
    const confidence = getConfidenceScore(field);
    if (confidence === null) return null;
    if (confidence >= 0.9) return "high";
    if (confidence >= 0.7) return "medium";
    return "low";
  };

  const getConfidenceBadgeStyle = (level: "high" | "medium" | "low" | null) => {
    switch (level) {
      case "high":
        return "text-green-700 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-red-700 bg-red-50 border-red-200";
      default:
        return "text-gray-500 bg-gray-50 border-gray-200";
    }
  };

  const getInputFieldStyle = (level: "high" | "medium" | "low" | null) => {
    switch (level) {
      case "high":
        return "border-green-300 focus:ring-green-500";
      case "medium":
        return "border-yellow-300 focus:ring-yellow-500";
      case "low":
        return "border-red-300 focus:ring-red-500";
      default:
        return "border-gray-300";
    }
  };

  const getConfidenceBadgeText = (level: "high" | "medium" | "low" | null, confidence: number | null) => {
    if (confidence === null) return "N/A";
    const percentage = Math.round(confidence * 100);
    switch (level) {
      case "high":
        return `${percentage}% ✓`;
      case "medium":
        return `${percentage}% ⚠`;
      case "low":
        return `${percentage}% ✗`;
      default:
        return `${percentage}%`;
    }
  };

  const handleExportCSV = async () => {
    const bookId = sessionStorage.getItem("currentBookId");
    if (!bookId) {
      alert("No book data found. Please upload an image first.");
      router.push("/book-upload");
      return;
    }

    setIsExporting(true);
    try {
      await api.put(`/api/books/${bookId}`, {
        normalized: fields,
        autoTitle: autoTitle,
        autoDescription: autoDescription,
      });

      const response = await api.post(
        "/api/export/book/csv",
        { bookId },
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `book-${bookId}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      saveExportPreference("csv");
      setSavedPreference("csv");
      setIsModalOpen(true);
      
      setTimeout(() => {
        setIsModalOpen(false);
        router.push("/book-upload");
      }, 1500);
    } catch (error) {
      console.error("CSV export error:", error);
      alert("Failed to export CSV. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSheets = async () => {
    const bookId = sessionStorage.getItem("currentBookId");
    if (!bookId) {
      alert("No book data found. Please upload an image first.");
      router.push("/book-upload");
      return;
    }

    setIsExporting(true);
    try {
      await api.put(`/api/books/${bookId}`, {
        normalized: fields,
        autoTitle: autoTitle,
        autoDescription: autoDescription,
      });

      const response = await api.post("/api/export/book/sheets", { bookId });
      
      saveExportPreference("sheets");
      setSavedPreference("sheets");
      
      if (response.data.sheetUrl) {
        window.open(response.data.sheetUrl, "_blank");
        setIsModalOpen(true);
        sessionStorage.setItem("sheetUrl", response.data.sheetUrl);
        
        setTimeout(() => {
          setIsModalOpen(false);
          router.push("/book-upload");
        }, 1500);
      } else {
        setIsModalOpen(true);
        setTimeout(() => {
          setIsModalOpen(false);
          router.push("/book-upload");
        }, 500);
      }
    } catch (error: any) {
      console.error("Google Sheets export error:", error);
      const errorMessage = error.response?.data?.error || "Failed to export to Google Sheets. Please try again.";
      alert(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

  // Organize fields into sections
  const tier1Fields = [
    "printISBN", "eISBN", "publisherName", "placePublished", "yearPublished",
    "editionText", "printingText", "printRunNumbers", "volume",
  ];
  
  const tier2Fields = [
    "title", "author", "illustrator", "completePublisherInfo",
    "genre", "category", "retailPrice",
  ];
  
  const tier3Fields = [
    "format", "condition", "quantity", "productType", "language",
    "jacketCondition", "signedText",
  ];
  
  const additionalFields = [
    "copyrightInfo", "libraryOfCongress", "coverDesigner", "originalPublicationDetails",
  ];

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Review & Edit Book Information</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6 space-y-8">
          {/* TIER 1 - Direct Extraction */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Direct Extraction (from Title Page)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tier1Fields.map((key) => {
                const confidence = getConfidenceScore(key);
                const confidenceLevel = getConfidenceLevel(key);
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {fieldLabels[key]}
                      {confidence !== null && (
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${getConfidenceBadgeStyle(confidenceLevel)}`}>
                          {getConfidenceBadgeText(confidenceLevel, confidence)}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={fields[key] || ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 bg-white ${
                        confidenceLevel ? getInputFieldStyle(confidenceLevel) : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* TIER 2 - AI-Enhanced */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">AI-Enhanced Data</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tier2Fields.map((key) => {
                const confidence = getConfidenceScore(key);
                const confidenceLevel = getConfidenceLevel(key);
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {fieldLabels[key]}
                      {confidence !== null && (
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${getConfidenceBadgeStyle(confidenceLevel)}`}>
                          {getConfidenceBadgeText(confidenceLevel, confidence)}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={fields[key] || ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 bg-white ${
                        confidenceLevel ? getInputFieldStyle(confidenceLevel) : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description (full width) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={fields.description || ""}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white resize-y"
              placeholder={!autoDescription ? "Generating description..." : ""}
            />
          </div>

          {/* TIER 3 - Default Values */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Default Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tier3Fields.map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {fieldLabels[key]}
                  </label>
                  <input
                    type="text"
                    value={fields[key] || ""}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Additional Fields */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Additional Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {additionalFields.map((key) => {
                const confidence = getConfidenceScore(key);
                const confidenceLevel = getConfidenceLevel(key);
                return (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {fieldLabels[key]}
                      {confidence !== null && (
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${getConfidenceBadgeStyle(confidenceLevel)}`}>
                          {getConfidenceBadgeText(confidenceLevel, confidence)}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={fields[key] || ""}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 bg-white ${
                        confidenceLevel ? getInputFieldStyle(confidenceLevel) : "border-gray-300 focus:ring-blue-500"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4 flex-wrap">
          <button
            onClick={() => router.push("/book-upload")}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Cancel
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4f7a] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Download CSV"}
            </button>
            <button
              onClick={handleExportSheets}
              disabled={isExporting}
              className="px-6 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#2a4f7a] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              {isExporting ? "Exporting..." : "Export to Sheets"}
            </button>
          </div>
        </div>

        <ExportSuccessModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onDownloadCSV={handleExportCSV}
          onOpenGoogleSheet={handleExportSheets}
        />
      </div>
    </div>
  );
}
