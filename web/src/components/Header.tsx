"use client";

import { usePathname, useRouter } from "next/navigation";
import { CreditCard, Book } from "lucide-react";
import { saveMode } from "@/lib/modeStorage";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();

  // Determine if we're in book mode
  const isBookMode = pathname?.startsWith("/book-");
  const appTitle = isBookMode ? "BookExtract Pro" : "CardExtract Pro";

  const handleModeSwitch = (mode: "card" | "book") => {
    saveMode(mode);
    if (mode === "card") {
      router.replace("/upload");
    } else {
      router.replace("/book-upload");
    }
  };

  return (
    <header className="bg-[#1e3a5f] text-white w-full sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold">
            {isBookMode ? "B" : "C"}
          </span>
          <span className="text-lg md:text-xl font-semibold tracking-tight">
            {appTitle}
          </span>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 rounded-full px-2 py-1">
          <button
            onClick={() => handleModeSwitch("card")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm transition-colors ${
              !isBookMode
                ? "bg-white text-[#1e3a5f] font-semibold shadow-sm"
                : "text-white/80 hover:bg-white/10"
            }`}
            title="Switch to Sports Card Scanner"
          >
            <CreditCard className="w-3 h-3 md:w-4 md:h-4" />
            <span>Card Scanner</span>
          </button>
          <button
            onClick={() => handleModeSwitch("book")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs md:text-sm transition-colors ${
              isBookMode
                ? "bg-white text-[#1e3a5f] font-semibold shadow-sm"
                : "text-white/80 hover:bg-white/10"
            }`}
            title="Switch to Book Title Scanner"
          >
            <Book className="w-3 h-3 md:w-4 md:h-4" />
            <span>Book Scanner</span>
          </button>
        </div>
      </div>
    </header>
  );
}

