"use client";

import { AppLayout } from "@/components/dashboard/AppLayout";

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Sector Report">{children}</AppLayout>;
}
