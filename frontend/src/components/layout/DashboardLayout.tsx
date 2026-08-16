import { useState, type ReactNode } from "react";

import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="dashboard-layout min-h-screen bg-(--color-soft-mint)">
      <Navbar />

      <div className="dashboard-body mx-auto flex max-w-7xl">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />

        <main className="dashboard-main flex-1 p-6 md:p-8">{children}</main>
      </div>

      <Footer />
    </div>
  );
}
