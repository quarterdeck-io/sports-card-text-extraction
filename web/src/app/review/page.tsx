"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, Download, FileSpreadsheet } from "lucide-react";
import { getExportPreference, saveExportPreference, type ExportType } from "@/lib/exportPreferences";
import api, { getCard } from "@/lib/api";
import ExportSuccessModal from "@/components/ExportSuccessModal";

// Confidence threshold for low confidence warning
const LOW_CONFIDENCE_THRESHOLD = 0.7;

// Field label mapping
const fieldLabels: Record<string, string> = {
  year: "Year",
  set: "Set",
  cardNumber: "Card Number",
  title: "Title",
  listingTitle: "Listing Title",
  playerFirstName: "Player First Name",
  playerLastName: "Player Last Name",
  gradingCompany: "Grading Company",
  grade: "Grade",
  cert: "Cert",
  description: "Description",
  caption: "Caption",
};

export default function ReviewPage() {
  const router = useRouter();
  const [fields, setFields] = useState({
    year: "",
    set: "",
    cardNumber: "",
    title: "", // Original title from OCR (normalized.title)
    listingTitle: "", // Auto-generated title (autoTitle)
    playerFirstName: "",
    playerLastName: "",
    gradingCompany: "",
    grade: "",
    cert: "",
    description: "", // Auto-generated description (autoDescription)
    caption: "", // Original caption from OCR (normalized.caption)
  });
  const [autoTitle, setAutoTitle] = useState<string>("");
  const [autoDescription, setAutoDescription] = useState<string>("");
  const [confidenceByField, setConfidenceByField] = useState<Record<string, number>>({});
  const [savedPreference, setSavedPreference] = useState<ExportType | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const hasAutoTitleRef = useRef(false);
  const hasAutoDescriptionRef = useRef(false);

  // Load card data and poll for autoTitle updates
  useEffect(() => {
    const loadCardData = () => {
      const cardDataStr = sessionStorage.getItem("cardData");
      if (cardDataStr) {
        try {
          const cardData = JSON.parse(cardDataStr);
          if (cardData.normalized) {
            const normalizedFields = { ...cardData.normalized };
            
            // Map normalized fields to our field structure
            // Title = normalized.title (original from OCR)
            // Listing Title = autoTitle (generated format)
            // Description = autoDescription (generated description)
            // Caption = normalized.caption (original from OCR)
            const mappedFields = {
              year: normalizedFields.year || "",
              set: normalizedFields.set || "",
              cardNumber: normalizedFields.cardNumber || "",
              title: normalizedFields.title || "", // Original title from OCR
              listingTitle: cardData.autoTitle && cardData.autoTitle.trim() !== "" 
                ? cardData.autoTitle 
                : "", // Auto-generated title
              playerFirstName: normalizedFields.playerFirstName || "",
              playerLastName: normalizedFields.playerLastName || "",
              gradingCompany: normalizedFields.gradingCompany || "",
              grade: normalizedFields.grade || "",
              cert: normalizedFields.cert || "",
              description: cardData.autoDescription && cardData.autoDescription.trim() !== ""
                ? cardData.autoDescription
                : "", // Auto-generated description
              caption: normalizedFields.caption || "", // Original caption from OCR
            };
            
            if (cardData.autoTitle && cardData.autoTitle.trim() !== "") {
              console.log("   ✅ Loading autoTitle into Listing Title field:", cardData.autoTitle);
              setAutoTitle(cardData.autoTitle);
              hasAutoTitleRef.current = true;
            } else {
              console.log("   ⚠️  autoTitle not available yet");
            }
            
            if (cardData.autoDescription && cardData.autoDescription.trim() !== "") {
              console.log("   ✅ Loading autoDescription into Description field");
              setAutoDescription(cardData.autoDescription);
              hasAutoDescriptionRef.current = true;
            } else {
              console.log("   ⚠️  autoDescription not available yet");
            }
            
            setFields(mappedFields);
          }
          
          // Load confidence scores
          if (cardData.confidenceByField) {
            setConfidenceByField(cardData.confidenceByField);
          }
          
          // Load autoTitle separately to track updates
          if (cardData.autoTitle && cardData.autoTitle.trim() !== "") {
            setAutoTitle(cardData.autoTitle);
            hasAutoTitleRef.current = true;
          }
        } catch (error) {
          console.error("Error parsing card data:", error);
        }
      } else {
        // No card data, redirect to upload
        router.push("/upload");
      }
    };

    loadCardData();
    
    // Poll for autoTitle and autoDescription updates (since they're generated in background)
    // Check every 2 seconds for up to 30 seconds
    let pollCount = 0;
    const maxPolls = 15; // 15 * 2s = 30 seconds max
    
    const pollInterval = setInterval(async () => {
      pollCount++;
      
      // Stop polling after max attempts or if we already have both autoTitle and autoDescription
      if (pollCount >= maxPolls || (hasAutoTitleRef.current && hasAutoDescriptionRef.current)) {
        clearInterval(pollInterval);
        return;
      }
      
      // Try to fetch updated card data from backend
      const cardId = sessionStorage.getItem("currentCardId");
      if (cardId) {
        try {
          const card = await getCard(cardId);
          // Check if we have new data (autoTitle or autoDescription)
          const hasNewTitle = card.autoTitle && card.autoTitle.trim() !== "";
          const hasNewDescription = card.autoDescription && card.autoDescription.trim() !== "";
          
          if (hasNewTitle && !hasAutoTitleRef.current) {
            setAutoTitle(card.autoTitle);
            hasAutoTitleRef.current = true;
            
            // Update Listing Title field with autoTitle (the generated format)
            setFields((prev) => {
              console.log("   ✅ Updating Listing Title field with autoTitle:", card.autoTitle);
              return {
                ...prev,
                listingTitle: card.autoTitle, // Auto-generated title format
              };
            });
          }
          
          if (hasNewDescription && !hasAutoDescriptionRef.current) {
            setAutoDescription(card.autoDescription);
            hasAutoDescriptionRef.current = true;
            
            // Update Description field with autoDescription
            setFields((prev) => {
              console.log("   ✅ Updating Description field with autoDescription");
              return {
                ...prev,
                description: card.autoDescription, // Auto-generated description
              };
            });
          }
          
          // Update sessionStorage with both autoTitle and autoDescription
          const cardDataStr = sessionStorage.getItem("cardData");
          if (cardDataStr) {
            const cardData = JSON.parse(cardDataStr);
            if (hasNewTitle) {
              cardData.autoTitle = card.autoTitle;
            }
            if (hasNewDescription) {
              cardData.autoDescription = card.autoDescription;
              console.log("   ✅ autoDescription updated:", card.autoDescription.substring(0, 50) + "...");
            } else {
              console.warn("   ⚠️  autoDescription is still empty");
            }
            sessionStorage.setItem("cardData", JSON.stringify(cardData));
          }
          
          // Stop polling once we have both
          if (hasNewTitle && hasNewDescription) {
            clearInterval(pollInterval);
          }
        } catch (error) {
          // Silently fail - card might not be ready yet
          console.debug("Polling for autoTitle/autoDescription:", error);
        }
      }
    }, 2000);
    
    // Load saved export preference
    setSavedPreference(getExportPreference());
    
    return () => {
      clearInterval(pollInterval);
    };
  }, [router]);

  const handleFieldChange = (field: string, value: string) => {
    setFields((prev) => ({ ...prev, [field]: value }));
  };

  // Get confidence score for a field
  const getConfidenceScore = (field: string): number | null => {
    return confidenceByField[field] ?? null;
  };

  // Get confidence level for styling
  const getConfidenceLevel = (field: string): "high" | "medium" | "low" | null => {
    const confidence = getConfidenceScore(field);
    if (confidence === null) return null;
    if (confidence >= 0.9) return "high"; // Green
    if (confidence >= 0.7) return "medium"; // Yellow
    return "low"; // Red
  };

  // Check if field has low confidence
  const hasLowConfidence = (field: string): boolean => {
    const confidence = getConfidenceScore(field);
    return confidence !== null && confidence < LOW_CONFIDENCE_THRESHOLD;
  };

  // Get field label
  const getFieldLabel = (key: string): string => {
    return fieldLabels[key] || key.replace(/([A-Z])/g, " $1").trim();
  };

  // Get confidence badge styling
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

  // Get input field styling based on confidence (only border, no background)
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

  // Get confidence badge text
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

  // Separate fields: regular fields + Title and Caption (above divider)
  // Bottom fields: Listing Title and Description (below divider)
  // Order: year, set, cardNumber, playerFirstName, playerLastName, gradingCompany, grade, cert, title, caption
  const regularFieldsOrder = [
    "year",
    "set",
    "cardNumber",
    "playerFirstName",
    "playerLastName",
    "gradingCompany",
    "grade",
    "cert",
    "title",
    "caption",
  ];
  const regularFields = regularFieldsOrder.map(key => [key, fields[key as keyof typeof fields]]);
  
  // Bottom fields: Listing Title (full width), then Description (full width)
  const bottomFieldsOrder = ["listingTitle", "description"];
  const bottomFields = bottomFieldsOrder.map(key => [key, fields[key as keyof typeof fields]]);

  const handleQuickExport = async () => {
    if (!savedPreference) {
      // No preference saved, go to export page
      router.push("/export");
      return;
    }

    const cardId = sessionStorage.getItem("currentCardId");
    if (!cardId) {
      alert("No card data found. Please upload an image first.");
      router.push("/upload");
      return;
    }

    setIsExporting(true);
    try {
      if (savedPreference === "csv") {
        const response = await api.post(
          "/api/export/csv",
          { cardId },
          {
            responseType: "blob",
          }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `card-${cardId}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        setIsModalOpen(true);
        
        // Auto-redirect to upload page after 1.5 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          router.push("/upload");
        }, 1500);
      } else {
        const response = await api.post("/api/export/sheets", { cardId });
        
        if (response.data.sheetUrl) {
          setIsModalOpen(true);
          sessionStorage.setItem("sheetUrl", response.data.sheetUrl);
          
          // Auto-redirect to upload page after 1.5 seconds
          setTimeout(() => {
            setIsModalOpen(false);
            router.push("/upload");
          }, 1500);
        } else {
          // Auto-redirect immediately if no sheet URL
          setTimeout(() => {
            router.push("/upload");
          }, 500);
        }
      }
    } catch (error: any) {
      console.error("Export error:", error);
      const errorMessage = error.response?.data?.error || "Failed to export. Please try again.";
      alert(errorMessage);
    } finally {
      setIsExporting(false);
    }
  };

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

      // Save preference
      saveExportPreference("csv");
      setSavedPreference("csv");
      setIsModalOpen(true);
      
      // Auto-redirect to upload page after 1.5 seconds
      setTimeout(() => {
        setIsModalOpen(false);
        router.push("/upload");
      }, 1500);
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
      
      // Save preference
      saveExportPreference("sheets");
      setSavedPreference("sheets");
      
      if (response.data.sheetUrl) {
        // Open Google Sheet in new tab
        window.open(response.data.sheetUrl, "_blank");
        setIsModalOpen(true);
        sessionStorage.setItem("sheetUrl", response.data.sheetUrl);
        
        // Auto-redirect to upload page after 1.5 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          router.push("/upload");
        }, 1500);
      } else {
        setIsModalOpen(true);
        // Auto-redirect immediately if no sheet URL
        setTimeout(() => {
          setIsModalOpen(false);
          router.push("/upload");
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

  const handleExport = () => {
    router.push("/export");
  };

  return (
    <div className="container mx-auto px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Review & Edit</h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Regular fields including Title and Caption (above divider) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {regularFields.map(([key, value]) => {
              // Get confidence for title and caption fields
              let confidence = null;
              let confidenceLevel: "high" | "medium" | "low" | null = null;
              
              if (key === "title" || key === "listingTitle") {
                confidence = getConfidenceScore("title");
                confidenceLevel = getConfidenceLevel("title");
              } else if (key === "caption") {
                confidence = getConfidenceScore("caption");
                confidenceLevel = getConfidenceLevel("caption");
              } else {
                confidence = getConfidenceScore(key);
                confidenceLevel = getConfidenceLevel(key);
              }
              
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    {getFieldLabel(key)}
                    {confidence !== null && (
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${getConfidenceBadgeStyle(confidenceLevel)}`}>
                        {getConfidenceBadgeText(confidenceLevel, confidence)}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => handleFieldChange(key, e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 bg-white ${
                      confidenceLevel ? getInputFieldStyle(confidenceLevel) : "border-gray-300 focus:ring-blue-500"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-6"></div>

          {/* Bottom fields: Listing Title (full width), then Description (full width) */}
          <div className="space-y-6">
            {bottomFields.map(([key, value]) => {
              // Get confidence for listingTitle
              let confidence = null;
              let confidenceLevel: "high" | "medium" | "low" | null = null;
              
              if (key === "listingTitle") {
                confidence = getConfidenceScore("title");
                confidenceLevel = getConfidenceLevel("title");
              }
              // Description doesn't have confidence (AI-generated)
              
              const isTextarea = key === "description";
              
              return (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    {getFieldLabel(key)}
                    {confidence !== null && (
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${getConfidenceBadgeStyle(confidenceLevel)}`}>
                        {getConfidenceBadgeText(confidenceLevel, confidence)}
                      </span>
                    )}
                  </label>
                  {isTextarea ? (
                    <textarea
                      value={value}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white resize-y"
                      placeholder={!autoDescription ? "Generating description..." : ""}
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleFieldChange(key, e.target.value)}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:border-transparent text-gray-900 bg-white ${
                        confidenceLevel ? getInputFieldStyle(confidenceLevel) : "border-gray-300 focus:ring-blue-500"
                      }`}
                      placeholder={key === "listingTitle" && !autoTitle ? "Generating title..." : ""}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-4 flex-wrap">
          <button
            onClick={() => router.push("/upload")}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Cancel
          </button>
          
          {/* Direct Export Buttons */}
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
              {isExporting ? "Exporting..." : "Download Sheet"}
            </button>
          </div>
          
          {/* Optional: Keep export page link for changing preferences */}
          <button
            onClick={handleExport}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm underline"
          >
            Change Export Settings
          </button>
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

