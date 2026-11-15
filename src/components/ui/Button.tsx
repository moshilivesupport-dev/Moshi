"use client";
import { ButtonHTMLAttributes } from "react";
import { motion } from "framer-motion";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "gradient" | "soft" | "glass";
};

// ✅ On exporte la fonction nommée ET par défaut
export function Button({
  variant = "soft",
  className = "",
  children,
  ...props
}: Props) {
  const styles = {
    gradient: "bg-gradient-to-r from-[#FF8FB1] via-[#9D7BEA] to-[#60A5FA] text-white shadow-lg shadow-purple-200/40",
    soft: "bg-white text-[#1F2937] shadow-sm",
    glass: "border border-white/30 bg-white/20 text-white backdrop-blur-xl",
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.18 }}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </motion.button>
  );
}

// ✅ Export par défaut pour que les deux fonctionnent
export default Button;