import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import TrialUpgradeModal from "@/components/plans/TrialUpgradeModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <DashboardSidebar />

      <main className="min-w-0 flex-1">
        {children}
      </main>

      <TrialUpgradeModal />
    </div>
  );
}