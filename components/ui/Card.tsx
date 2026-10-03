import React from "react";

export function Card({
  className = "",
  children,
  variant = "surface",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { variant?: "surface" | "raised" | "base" }) {
  const backgrounds = {
    surface: "bg-[#0D131C] border border-[#202B38]",
    raised: "bg-[#121A24] border border-[#202B38]",
    base: "bg-[#070B12] border border-[#202B38]",
  };

  return (
    <div
      className={`rounded-[4px] ${backgrounds[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 border-b border-[#202B38] flex items-center justify-between gap-3 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}
