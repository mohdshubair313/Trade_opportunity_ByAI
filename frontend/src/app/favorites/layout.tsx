"use client";

import { AppLayout } from "@/components/dashboard/AppLayout";

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout title="Favorite Sectors">{children}</AppLayout>;
}
