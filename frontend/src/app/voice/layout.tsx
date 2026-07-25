"use client";

import { AppLayout } from "@/components/dashboard/AppLayout";

export default function VoiceLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Voice Agent Studio">{children}</AppLayout>;
}
