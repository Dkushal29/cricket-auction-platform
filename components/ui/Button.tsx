import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-semibold transition-all focus:outline-none focus:ring-1 rounded-[4px] select-none disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
      primary: "bg-[#E5AE3F] hover:bg-[#F4C65E] text-[#070B12] focus:ring-[#E5AE3F] shadow-[0_0_15px_rgba(229,174,63,0.18)] active:scale-[0.99]",
      secondary: "bg-[#121A24] hover:bg-[#1B2533] border border-[#202B38] text-[#F5F7FA] hover:border-[#E5AE3F]/50 focus:ring-[#E5AE3F]",
      outline: "bg-transparent hover:bg-[#0D131C] border border-[#202B38] hover:border-[#8B98A8] text-[#F5F7FA] focus:ring-[#E5AE3F]",
      danger: "bg-[#FF5C5C]/10 hover:bg-[#FF5C5C]/20 border border-[#FF5C5C]/40 text-[#FF5C5C] focus:ring-[#FF5C5C]",
      ghost: "bg-transparent hover:bg-[#0D131C] text-[#8B98A8] hover:text-[#F5F7FA] focus:ring-[#E5AE3F]",
    };

    const sizes = {
      sm: "px-2.5 py-1 text-[12px] h-8",
      md: "px-4 py-2 text-[13px] h-10",
      lg: "px-6 py-3 text-[15px] h-12",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = "Button";
