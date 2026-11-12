"use client";

import { useRef, useState, ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
}

export default function PullToRefresh({ children, onRefresh }: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (refreshing) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;
    
    // Seulement si on tire vers le bas et qu'on est en haut de la page
    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(distance * 0.5, 100)); // Résistance élastique
    }
  };

  const handleTouchEnd = async () => {
    if (refreshing) return;
    
    if (pullDistance > 60) {
      setRefreshing(true);
      setPullDistance(80);
      await onRefresh();
      setRefreshing(false);
    }
    setPullDistance(0);
  };

  return (
    <div className="relative h-full">
      {/* Indicateur de pull */}
      {pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none"
          style={{ height: pullDistance }}
        >
          <RefreshCw
            className={`w-6 h-6 text-white transition-transform ${
              pullDistance > 60 ? "rotate-180" : ""
            } ${refreshing ? "animate-spin" : ""}`}
          />
        </div>
      )}

      {/* Contenu avec translation */}
      <motion.div
        ref={containerRef}
        className="h-full overflow-y-auto"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: refreshing ? "transform 0.3s" : "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </motion.div>
    </div>
  );
}
