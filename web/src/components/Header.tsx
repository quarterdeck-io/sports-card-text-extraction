"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Upload", path: "/upload" },
  { name: "Processing", path: "/processing" },
  { name: "Review", path: "/review" },
  { name: "Export", path: "/export" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="bg-[#1e3a5f] text-white w-full sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <div className="text-xl font-bold">
          CardExtract Pro
        </div>
        <nav className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`transition-colors hover:text-blue-200 ${
                  isActive ? "font-semibold underline" : ""
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

