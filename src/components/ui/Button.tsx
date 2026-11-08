"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "gold" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) => {
    const base = "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-coral hover:bg-warm-red text-white shadow-lg shadow-coral/20",
      gold: "bg-gradient-to-r from-champagne to-gold text-onyx hover:opacity-90",
      outline: "border border-coral text-coral hover:bg-coral/10",
      ghost: "text-muted hover:text-white hover:bg-white/5",
      danger: "bg-red-600 hover:bg-red-700 text-white",
    };
    const sizes = {
      sm: "text-sm px-3 py-1.5",
      md: "text-sm px-5 py-2.5",
      lg: "text-base px-6 py-3",
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
