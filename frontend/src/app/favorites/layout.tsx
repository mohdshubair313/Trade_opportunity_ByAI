"use client";

import { Sidebar } from "@/components/dashboard/Sidebar";

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <main className="flex-1 w-full">{children}</main>
        </div>
    );
}
