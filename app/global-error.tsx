"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#070B12] text-[#F5F7FA] min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-4">
          <span className="text-3xl">🏏</span>
          <h2 className="text-xl font-bold">Auction Platform Error</h2>
          <p className="text-sm text-[#8B98A8]">{error?.message || "A critical error occurred."}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-[#E5AE3F] text-[#070B12] font-semibold rounded-[4px] hover:bg-[#F4C65E]"
          >
            Reload application
          </button>
        </div>
      </body>
    </html>
  );
}
