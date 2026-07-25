"use client";

import { AppLayout } from "@/components/dashboard/AppLayout";

export default function AlertsLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Alerts & Watchlist">{children}</AppLayout>;
}
