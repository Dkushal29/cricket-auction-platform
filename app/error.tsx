"use client";

import React, { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <span className="text-3xl">🏏</span>
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-sm text-[#8B98A8]">
          {error?.message || "An unexpected error occurred in the auction platform."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 bg-[#E5AE3F] text-[#070B12] font-semibold rounded-[4px] hover:bg-[#F4C65E] transition-colors text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
