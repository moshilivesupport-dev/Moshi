import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none",
          variant === "default" && "bg-red-500 text-white hover:bg-red-600",
          variant === "outline" && "border border-neutral-600 bg-transparent text-white hover:bg-neutral-800",
          variant === "ghost" && "bg-transparent text-white hover:bg-neutral-800",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
