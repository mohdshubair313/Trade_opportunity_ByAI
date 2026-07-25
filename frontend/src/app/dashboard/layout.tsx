"use client";

import { AppLayout } from "@/components/dashboard/AppLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Dashboard">{children}</AppLayout>;
}
