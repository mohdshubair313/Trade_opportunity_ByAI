"use client";

import { AppLayout } from "@/components/dashboard/AppLayout";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Account Settings">{children}</AppLayout>;
}
