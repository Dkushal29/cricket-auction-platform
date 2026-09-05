"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "brass";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-14 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-[4px] border transition-all duration-200 text-[13px] ${
              toast.type === "brass"
                ? "bg-[#1B2229] border-[#C7A046] text-[#EDEAE1]"
                : toast.type === "success"
                ? "bg-[#1B2229] border-emerald-500/60 text-[#EDEAE1]"
                : toast.type === "error"
                ? "bg-[#1B2229] border-red-500/60 text-[#EDEAE1]"
                : "bg-[#1B2229] border-[#2B343C] text-[#EDEAE1]"
            }`}
          >
            {toast.type === "brass" && <span className="w-2 h-2 rounded-full bg-[#C7A046] mt-1 shrink-0" />}
            {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
            {toast.type === "info" && <Info className="w-4 h-4 text-[#8B939A] shrink-0 mt-0.5" />}

            <div className="flex-1 font-medium leading-snug">{toast.message}</div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              className="text-[#8B939A] hover:text-[#EDEAE1] p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
