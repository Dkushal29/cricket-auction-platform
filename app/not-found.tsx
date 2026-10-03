import React from "react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="text-4xl">🏏</span>
        <h1 className="text-2xl font-bold font-hero uppercase tracking-wide">404 - Page Not Found</h1>
        <p className="text-sm text-[#8B98A8]">The requested auction room or page does not exist.</p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-[#E5AE3F] text-[#070B12] font-bold rounded-[4px] hover:bg-[#F4C65E] transition-colors text-sm"
        >
          Return to Homepage
        </Link>
      </div>
    </div>
  );
}
