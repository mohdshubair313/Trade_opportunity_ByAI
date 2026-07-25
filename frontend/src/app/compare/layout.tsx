"use client";

import { AppLayout } from "@/components/dashboard/AppLayout";

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Compare Sectors">{children}</AppLayout>;
}
