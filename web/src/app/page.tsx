"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ModeSelectionModal, { AppMode } from "@/components/ModeSelectionModal";
import { getSavedMode } from "@/lib/modeStorage";

export default function Home() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<AppMode>(null);

  useEffect(() => {
    const savedMode = getSavedMode();
    
    if (savedMode) {
      // Mode already selected, redirect to appropriate page
      setMode(savedMode);
      if (savedMode === "card") {
        router.replace("/upload");
      } else {
        router.replace("/book-upload");
      }
    } else {
      // No mode selected, show modal
      setShowModal(true);
    }
  }, [router]);

  const handleModeSelect = (selectedMode: AppMode) => {
    if (!selectedMode) return;
    
    setMode(selectedMode);
    setShowModal(false);
    
    // Navigate to appropriate page using replace to update URL
    if (selectedMode === "card") {
      router.replace("/upload");
    } else if (selectedMode === "book") {
      router.replace("/book-upload");
    }
  };

  const handleClose = () => {
    // Don't allow closing without selection - user must choose
    // Modal will stay open
  };

  return (
    <ModeSelectionModal
      isOpen={showModal}
      onClose={handleClose}
      onModeSelect={handleModeSelect}
    />
  );
}
