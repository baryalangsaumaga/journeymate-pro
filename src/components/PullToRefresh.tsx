import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { RefreshCw } from "lucide-react";

interface Props {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children, className = "" }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const pullDistance = useMotionValue(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rotation = useTransform(pullDistance, [0, THRESHOLD], [0, 360]);
  const opacity = useTransform(pullDistance, [0, 40, THRESHOLD], [0, 0.5, 1]);
  const scale = useTransform(pullDistance, [0, THRESHOLD], [0.5, 1]);
  const indicatorY = useTransform(pullDistance, [0, MAX_PULL], [-40, 20]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const scrollTop = containerRef.current?.scrollTop ?? 0;
    if (scrollTop > 0) {
      pulling.current = false;
      pullDistance.set(0);
      return;
    }
    const deltaY = Math.max(0, e.touches[0].clientY - startY.current);
    const dampened = Math.min(MAX_PULL, deltaY * 0.5);
    pullDistance.set(dampened);
  }, [refreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current) return;
    pulling.current = false;
    const current = pullDistance.get();

    if (current >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      animate(pullDistance, THRESHOLD * 0.6, { type: "spring", stiffness: 300, damping: 30 });
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        animate(pullDistance, 0, { type: "spring", stiffness: 400, damping: 35 });
      }
    } else {
      animate(pullDistance, 0, { type: "spring", stiffness: 400, damping: 35 });
    }
  }, [pullDistance, refreshing, onRefresh]);

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center"
        style={{ y: indicatorY, opacity, scale }}
      >
        <motion.div
          className={`w-9 h-9 rounded-full flex items-center justify-center shadow-travel ${
            refreshing ? "bg-primary" : "bg-card border border-border"
          }`}
          style={{ rotate: refreshing ? undefined : rotation }}
          animate={refreshing ? { rotate: 360 } : undefined}
          transition={refreshing ? { repeat: Infinity, duration: 0.8, ease: "linear" } : undefined}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "text-primary-foreground" : "text-primary"}`} />
        </motion.div>
      </motion.div>

      <div
        ref={containerRef}
        className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden overscroll-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
