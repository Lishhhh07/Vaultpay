import { TopBar } from "../../components/TopBar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#ebe6e6]">
      <TopBar />
      <main className="p-8">{children}</main>
    </div>
  );
}