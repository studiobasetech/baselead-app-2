import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TrialUpgradeModal from "@/components/plans/TrialUpgradeModal";
import HoverAccent from "@/components/ui/HoverAccent";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <DashboardSidebar />

      {/* On phones: room for the top bar (h-14) and bottom bar (h-16). */}
      <main className="baselead-main min-w-0 flex-1 pb-16 pt-14 lg:pb-0 lg:pt-0">
        {children}
      </main>

      <TrialUpgradeModal />
      <HoverAccent />
    </div>
  );
}
