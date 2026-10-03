import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, label, helperText, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-[12px] font-semibold uppercase tracking-wider text-[#8B98A8]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={`w-full px-3.5 py-2.5 rounded-[4px] bg-[#070B12] border ${
            error ? "border-[#FF5C5C]" : "border-[#202B38] hover:border-[#8B98A8]/60 focus:border-[#E5AE3F]"
          } text-[#F5F7FA] text-[14px] placeholder-[#8B98A8]/50 focus:outline-none transition-colors ${className}`}
          {...props}
        />
        {error ? (
          <p className="text-[11px] text-[#FF5C5C] font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-[11px] text-[#8B98A8]">{helperText}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
