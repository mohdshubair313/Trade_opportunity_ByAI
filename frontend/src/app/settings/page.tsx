"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { User, Mail, Lock, Shield, LogOut, Loader2, CheckCircle2, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
    getCurrentUser,
    updateProfile,
    changePassword,
    UserProfile,
    Persona,
    CapitalRange,
    RiskAppetite,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
    const router = useRouter();
    const { logout, isAuthenticated } = useAuth();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);

    const [persona, setPersona] = useState<Persona | "">("");
    const [capitalRange, setCapitalRange] = useState<CapitalRange | "">("");
    const [region, setRegion] = useState("");
    const [riskAppetite, setRiskAppetite] = useState<RiskAppetite | "">("");
    const [personaSaving, setPersonaSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            try {
                const p = await getCurrentUser();
                if (cancelled) return;
                setProfile(p);
                setFullName(p.full_name ?? "");
                setEmail(p.email);
                setPersona((p.persona ?? "") as Persona | "");
                setCapitalRange((p.capital_range ?? "") as CapitalRange | "");
                setRegion(p.region ?? "");
                setRiskAppetite((p.risk_appetite ?? "") as RiskAppetite | "");
            } catch {
                if (!cancelled) {
                    setProfileError("Failed to load profile. Please try again.");
                }
                return;
            } finally {
                if (!cancelled) setProfileLoading(false);
            }
        }

        if (isAuthenticated === false) {
            router.push("/login");
            return;
        }
        load();
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, router]);

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileError(null);

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setProfileError("Please enter a valid email address.");
            return;
        }

        setProfileSaving(true);
        try {
            const updated = await updateProfile({
                full_name: fullName.trim() || null,
                email: email.trim(),
            });
            setProfile(updated);
            toast.success("Profile updated.");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Could not update profile.";
            setProfileError(msg);
        } finally {
            setProfileSaving(false);
        }
    };

    const handleSavePersona = async (e: React.FormEvent) => {
        e.preventDefault();
        setPersonaSaving(true);
        try {
            const updated = await updateProfile({
                persona: (persona || null) as Persona | null,
                capital_range: (capitalRange || null) as CapitalRange | null,
                region: region.trim() || null,
                risk_appetite: (riskAppetite || null) as RiskAppetite | null,
            });
            setProfile(updated);
            toast.success("Preferences saved — future reports will be tailored.");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Could not save preferences.");
        } finally {
            setPersonaSaving(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError(null);

        if (!currentPassword) {
            setPasswordError("Enter your current password.");
            return;
        }
        if (newPassword.length < 8) {
            setPasswordError("New password must be at least 8 characters.");
            return;
        }
        if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            setPasswordError("Password must contain upper, lower and a digit.");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError("Passwords do not match.");
            return;
        }

        setPasswordSaving(true);
        try {
            await changePassword(currentPassword, newPassword);
            toast.success("Password changed.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Could not change password.";
            setPasswordError(msg);
        } finally {
            setPasswordSaving(false);
        }
    };

    if (profileLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    if (profileError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-destructive text-sm">{profileError}</p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setProfileError(null);
                        setProfileLoading(true);
                        getCurrentUser()
                            .then((p) => {
                                setProfile(p);
                                setFullName(p.full_name ?? "");
                                setEmail(p.email);
                                setPersona((p.persona ?? "") as Persona | "");
                                setCapitalRange((p.capital_range ?? "") as CapitalRange | "");
                                setRegion(p.region ?? "");
                                setRiskAppetite((p.risk_appetite ?? "") as RiskAppetite | "");
                            })
                            .catch(() => setProfileError("Failed to load profile. Please try again."))
                            .finally(() => setProfileLoading(false));
                    }}
                >
                    Retry
                </Button>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <h1 className="text-3xl font-bold">Settings</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Manage your account, security and subscription.
                </p>
            </motion.div>

            <SectionCard
                icon={User}
                title="Account"
                description="Your public-facing name and the email we send reports to."
            >
                <form onSubmit={handleSaveProfile} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-2">Username</label>
                        <Input
                            type="text"
                            value={profile.username}
                            disabled
                            icon={<User className="h-4 w-4" />}
                        />
                        <p className="mt-1.5 text-xs text-muted-foreground">
                            Username can&apos;t be changed right now.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Full name</label>
                        <Input
                            type="text"
                            placeholder="Your name"
                            icon={<User className="h-4 w-4" />}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Email</label>
                        <Input
                            type="email"
                            placeholder="you@example.com"
                            icon={<Mail className="h-4 w-4" />}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    {profileError && (
                        <p className="text-sm text-destructive">{profileError}</p>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" isLoading={profileSaving}>
                            Save changes
                        </Button>
                    </div>
                </form>
            </SectionCard>

            <SectionCard
                icon={Target}
                title="Your analysis lens"
                description="Tell us who you are so reports are framed for you. You can change this anytime."
            >
                <form onSubmit={handleSavePersona} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-2">I am primarily a…</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {(
                                [
                                    { v: "investor", label: "Investor" },
                                    { v: "exporter", label: "Exporter" },
                                    { v: "sme_owner", label: "SME owner" },
                                    { v: "student", label: "Student" },
                                    { v: "consultant", label: "Consultant" },
                                ] as { v: Persona; label: string }[]
                            ).map((opt) => (
                                <button
                                    key={opt.v}
                                    type="button"
                                    onClick={() => setPersona(persona === opt.v ? "" : opt.v)}
                                    className={`h-10 rounded-lg border text-sm font-medium transition-colors ${persona === opt.v
                                        ? "border-primary bg-primary/10 text-primary"
                                        : "border-border text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Capital range</label>
                            <select
                                value={capitalRange}
                                onChange={(e) => setCapitalRange(e.target.value as CapitalRange | "")}
                                className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
                            >
                                <option value="">—</option>
                                <option value="under_5L">Under ₹5L</option>
                                <option value="5L_50L">₹5L – ₹50L</option>
                                <option value="50L_5Cr">₹50L – ₹5Cr</option>
                                <option value="5Cr_plus">₹5Cr+</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Region</label>
                            <Input
                                type="text"
                                placeholder="e.g. Maharashtra, EU, Global"
                                value={region}
                                onChange={(e) => setRegion(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Risk appetite</label>
                            <select
                                value={riskAppetite}
                                onChange={(e) => setRiskAppetite(e.target.value as RiskAppetite | "")}
                                className="w-full h-11 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:border-primary"
                            >
                                <option value="">—</option>
                                <option value="low">Low — capital preservation</option>
                                <option value="medium">Medium — balanced</option>
                                <option value="high">High — growth-first</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" isLoading={personaSaving}>
                            Save preferences
                        </Button>
                    </div>
                </form>
            </SectionCard>

            <SectionCard
                icon={Lock}
                title="Password"
                description="Use a strong password with upper, lower and a digit."
            >
                <form onSubmit={handleChangePassword} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium mb-2">Current password</label>
                        <Input
                            type="password"
                            placeholder="••••••••"
                            icon={<Lock className="h-4 w-4" />}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">New password</label>
                        <Input
                            type="password"
                            placeholder="At least 8 characters"
                            icon={<Lock className="h-4 w-4" />}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Confirm new password</label>
                        <Input
                            type="password"
                            placeholder="Re-type the new password"
                            icon={<Lock className="h-4 w-4" />}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>

                    {passwordError && (
                        <p className="text-sm text-destructive">{passwordError}</p>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" isLoading={passwordSaving}>
                            Update password
                        </Button>
                    </div>
                </form>
            </SectionCard>

            <SectionCard
                icon={Shield}
                title="Subscription"
                description="Your current plan and usage this month."
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <Stat label="Plan" value={profile.is_premium ? "Pro" : "Free"} />
                    <Stat label="Status" value={profile.is_active ? "Active" : "Disabled"} accent={profile.is_active} />
                    <Stat label="Member since" value={new Date(profile.created_at).toLocaleDateString()} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                    <div>
                        <p className="text-sm font-medium">Want higher limits or team features?</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Contact sales for custom plans, white-label exports and SSO.
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => router.push("/contact")}>
                        Contact Sales
                    </Button>
                </div>
            </SectionCard>

            <SectionCard
                icon={LogOut}
                title="Session"
                description="Sign out on this device."
            >
                <Button variant="outline" onClick={logout}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                </Button>
            </SectionCard>
        </div>
    );
}

function SectionCard({
    icon: Icon,
    title,
    description,
    children,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/60 rounded-2xl overflow-hidden"
        >
            <div className="p-6 border-b border-border/60 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                </div>
            </div>
            <div className="p-6">{children}</div>
        </motion.section>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <div className="flex items-center gap-1 mt-1">
                {accent && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <p className="font-semibold text-foreground">{value}</p>
            </div>
        </div>
    );
}
