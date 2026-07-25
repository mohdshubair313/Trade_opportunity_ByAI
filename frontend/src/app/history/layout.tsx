"use client";

import { AppLayout } from "@/components/dashboard/AppLayout";

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Analysis History">{children}</AppLayout>;
}
