import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "outline" | "ghost" | "gold";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          "inline-flex items-center justify-center rounded-full font-semibold transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          (variant === "default" || variant === "primary") &&
            "bg-red-500 text-white hover:bg-red-600",
          variant === "outline" &&
            "border border-neutral-600 bg-transparent text-white hover:bg-neutral-800",
          variant === "ghost" && "bg-transparent text-white hover:bg-neutral-800",
          variant === "gold" &&
            "bg-gradient-to-r from-amber-400 to-yellow-500 text-black hover:from-amber-300 hover:to-yellow-400",
          size === "sm" && "px-3 py-1.5 text-xs",
          size === "md" && "px-5 py-2.5 text-sm",
          size === "lg" && "px-6 py-3 text-base",
          className
        )}
        {...props}
      >
        {loading && (
          <span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";