import { motion } from "framer-motion";

function Bone({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

const fadeIn = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const fadeItem = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

export function DashboardSkeleton() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="px-4 py-4 space-y-4">
      {/* Greeting */}
      <motion.div variants={fadeItem} className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-3 w-24" />
          <Bone className="h-6 w-36" />
        </div>
        <Bone className="w-10 h-10 rounded-2xl" />
      </motion.div>
      {/* Hero Card */}
      <motion.div variants={fadeItem}>
        <Bone className="h-44 rounded-2xl" />
      </motion.div>
      {/* Stats Grid */}
      <motion.div variants={fadeItem} className="grid grid-cols-4 gap-2">
        {[...Array(4)].map((_, i) => <Bone key={i} className="h-20 rounded-xl" />)}
      </motion.div>
      {/* Weather */}
      <motion.div variants={fadeItem}>
        <Bone className="h-24 rounded-2xl" />
      </motion.div>
      {/* Quick Actions */}
      <motion.div variants={fadeItem} className="grid grid-cols-2 gap-2.5">
        {[...Array(4)].map((_, i) => <Bone key={i} className="h-24 rounded-xl" />)}
      </motion.div>
      {/* Upcoming */}
      <motion.div variants={fadeItem} className="space-y-2">
        <Bone className="h-4 w-32" />
        {[...Array(2)].map((_, i) => <Bone key={i} className="h-20 rounded-xl" />)}
      </motion.div>
    </motion.div>
  );
}

export function ItinerarySkeleton() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="px-4 py-4 space-y-4">
      <motion.div variants={fadeItem} className="flex justify-between items-center">
        <div className="space-y-2">
          <Bone className="h-6 w-28" />
          <Bone className="h-3 w-20" />
        </div>
        <Bone className="h-8 w-24 rounded-xl" />
      </motion.div>
      {[...Array(3)].map((_, i) => (
        <motion.div key={i} variants={fadeItem}>
          <Bone className="h-36 rounded-2xl" />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function ExploreSkeleton() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="px-4 py-4 space-y-4">
      <motion.div variants={fadeItem} className="space-y-2">
        <Bone className="h-6 w-24" />
        <Bone className="h-3 w-48" />
      </motion.div>
      <motion.div variants={fadeItem}>
        <Bone className="h-11 rounded-xl" />
      </motion.div>
      <motion.div variants={fadeItem} className="flex gap-2">
        {[...Array(5)].map((_, i) => <Bone key={i} className="h-9 w-20 rounded-xl flex-shrink-0" />)}
      </motion.div>
      <motion.div variants={fadeItem} className="flex gap-2.5 overflow-hidden">
        {[...Array(3)].map((_, i) => <Bone key={i} className="h-36 w-44 rounded-xl flex-shrink-0" />)}
      </motion.div>
      <motion.div variants={fadeItem} className="space-y-2">
        {[...Array(4)].map((_, i) => <Bone key={i} className="h-18 rounded-xl" />)}
      </motion.div>
    </motion.div>
  );
}

export function ExpensesSkeleton() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="px-4 py-4 space-y-4">
      <motion.div variants={fadeItem} className="flex justify-between items-center">
        <div className="space-y-2">
          <Bone className="h-6 w-24" />
          <Bone className="h-3 w-36" />
        </div>
        <Bone className="h-8 w-16 rounded-xl" />
      </motion.div>
      <motion.div variants={fadeItem}>
        <Bone className="h-10 rounded-xl" />
      </motion.div>
      <motion.div variants={fadeItem}>
        <Bone className="h-48 rounded-2xl" />
      </motion.div>
      <motion.div variants={fadeItem} className="space-y-2.5">
        {[...Array(4)].map((_, i) => <Bone key={i} className="h-16 rounded-xl" />)}
      </motion.div>
    </motion.div>
  );
}

export function SocialSkeleton() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="px-4 py-4 space-y-3">
      <Bone className="h-10 rounded-xl" />
      <div className="flex items-center gap-2.5 py-2.5">
        <div className="flex -space-x-1.5">
          {[...Array(3)].map((_, i) => <Bone key={i} className="w-7 h-7 rounded-lg" />)}
        </div>
        <div className="space-y-1.5">
          <Bone className="h-3 w-32" />
          <Bone className="h-2 w-16" />
        </div>
      </div>
      {[...Array(5)].map((_, i) => (
        <div key={i} className={`flex gap-2 ${i % 2 === 0 ? "" : "flex-row-reverse"}`}>
          {i % 2 === 0 && <Bone className="w-7 h-7 rounded-lg flex-shrink-0" />}
          <Bone className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-3/4" : "w-2/3"}`} />
        </div>
      ))}
    </motion.div>
  );
}

export function ReviewsSkeleton() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="px-4 py-4 space-y-4">
      <motion.div variants={fadeItem} className="flex justify-between items-center">
        <div className="space-y-2">
          <Bone className="h-6 w-40" />
          <Bone className="h-3 w-28" />
        </div>
        <Bone className="h-8 w-20 rounded-xl" />
      </motion.div>
      <motion.div variants={fadeItem}>
        <Bone className="h-10 rounded-xl" />
      </motion.div>
      <motion.div variants={fadeItem}>
        <Bone className="h-72 rounded-2xl" />
      </motion.div>
      <motion.div variants={fadeItem} className="grid grid-cols-3 gap-2">
        {[...Array(3)].map((_, i) => <Bone key={i} className="h-20 rounded-xl" />)}
      </motion.div>
    </motion.div>
  );
}

export function MapSkeleton() {
  return (
    <div className="relative h-full">
      <Bone className="absolute inset-0 rounded-none" />
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-3 z-10">
        <div className="flex gap-2">
          {[...Array(4)].map((_, i) => <Bone key={i} className="flex-1 h-20 rounded-xl" />)}
        </div>
        <Bone className="h-28 rounded-2xl" />
        <Bone className="h-12 rounded-2xl" />
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="px-4 py-4 space-y-4">
      <motion.div variants={fadeItem} className="space-y-2">
        <Bone className="h-6 w-20" />
        <Bone className="h-3 w-48" />
      </motion.div>
      <motion.div variants={fadeItem}>
        <Bone className="h-24 rounded-2xl" />
      </motion.div>
      {[...Array(4)].map((_, i) => (
        <motion.div key={i} variants={fadeItem}>
          <Bone className="h-32 rounded-2xl" />
        </motion.div>
      ))}
    </motion.div>
  );
}

export function ReportsSkeleton() {
  return (
    <motion.div variants={fadeIn} initial="hidden" animate="show" className="px-4 py-4 space-y-4">
      <motion.div variants={fadeItem} className="space-y-2">
        <Bone className="h-6 w-36" />
        <Bone className="h-3 w-52" />
      </motion.div>
      <motion.div variants={fadeItem}>
        <Bone className="h-10 rounded-xl" />
      </motion.div>
      {[...Array(3)].map((_, i) => (
        <motion.div key={i} variants={fadeItem}>
          <Bone className="h-28 rounded-2xl" />
        </motion.div>
      ))}
    </motion.div>
  );
}
