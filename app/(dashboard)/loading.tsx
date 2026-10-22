import { SkeletonPage } from "@/components/ui/Skeleton";

// Shown instantly while a dashboard page opens.
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#050505] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10">
      <SkeletonPage />
    </div>
  );
}
