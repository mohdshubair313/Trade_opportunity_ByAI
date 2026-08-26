"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Sun,
  Moon,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { AuthLeftPanel } from "@/components/auth/AuthLeftPanel";
import { Button } from "@/components/ui/Button";
import { login, sendOtp, verifyOtp } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useTheme } from "@/components/ui/ThemeProvider";

interface FormErrors {
  username?: string;
  password?: string;
  resetEmail?: string;
  resetOtp?: string;
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Forgot password OTP modal / drawer state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [isForgotLoading, setIsForgotLoading] = useState(false);

  const router = useRouter();
  const { setToken, setUser, resetUserScoped } = useStore();
  const { theme, toggleTheme } = useTheme();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    if (!username.trim()) {
      newErrors.username = "Please enter your username or email";
    }
    if (!password) {
      newErrors.password = "Please enter your password";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const tokenData = await login({
        username: username.trim(),
        password,
      });

      resetUserScoped();
      setToken(tokenData.access_token);
      setUser({
        username: username.trim(),
        isGuest: false,
      });

      toast.success("Welcome back! Redirecting to workspace...");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid credentials. Please check and retry.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot password step 1: send OTP
  const handleForgotSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setIsForgotLoading(true);
    try {
      await sendOtp(forgotEmail);
      toast.success(`Verification code sent to ${forgotEmail}`);
      setForgotStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send reset code";
      toast.error(msg);
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Forgot password step 2: verify OTP
  const handleForgotVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }
    setIsForgotLoading(true);
    try {
      const res = await verifyOtp(forgotEmail, forgotOtp);
      if (res.verified) {
        toast.success("Code verified! Temporary password reset link sent.");
        setShowForgotModal(false);
        setForgotStep(1);
      } else {
        toast.error("Invalid verification code. Please check and retry.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast.error(msg);
    } finally {
      setIsForgotLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-background text-foreground transition-colors duration-300">
      
      {/* Background Ambient Spotlight */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 left-1/4 w-[600px] h-[400px] rounded-full blur-[140px] opacity-15"
          style={{
            background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
          }}
        />
        <div className="terminal-grid absolute inset-0 opacity-20" />
      </div>

      {/* Floating Split-Screen Card */}
      <div className="relative z-10 w-full max-w-6xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[600px]">
        
        {/* ================================================================
            LEFT BRAND PANEL: Artwork + Headline + Live Ticker
           ================================================================ */}
        <div className="lg:col-span-6 xl:col-span-5 h-full">
          <AuthLeftPanel
            title="Welcome back to the terminal."
            subtitle="Real-time Indian market intelligence grounded in exchange filings, macroeconomic data, and cited research."
          />
        </div>

        {/* ================================================================
            RIGHT FORM PANEL: Fast Credentials Form & OTP Reset Flow
           ================================================================ */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between p-8 sm:p-10 md:p-12 bg-card">
          
          {/* Top Bar: Kicker + Theme Switcher */}
          <div className="flex items-center justify-between pb-6 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-primary px-2.5 py-1 rounded bg-primary/10 border border-primary/20">
                SECURE AUTH
              </span>
              <span className="font-kalam text-xs sm:text-sm text-muted-foreground">
                Terminal Access
              </span>
            </div>

            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-[#E8A33D]" />
              ) : (
                <Moon className="h-4 w-4 text-[#d97757]" />
              )}
            </button>
          </div>

          {/* Form Body */}
          <div className="my-auto py-6">
            <div className="mb-6 space-y-1">
              <h3 className="text-2xl sm:text-3xl font-kalam-bold text-foreground">
                Sign in to your account
              </h3>
              <p className="text-sm text-muted-foreground font-kalam">
                Enter your credentials to access your market workspace and saved dossiers.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-kalam font-semibold text-foreground">
                  Username or Email
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. rajesh_trader or name@domain.in"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-kalam focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                </div>
                {errors.username && (
                  <p className="text-xs text-rose-500 font-kalam">{errors.username}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-kalam font-semibold text-foreground">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-xs font-kalam text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-kalam focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-500 font-kalam">{errors.password}</p>
                )}
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-kalam-bold text-sm shadow-md transition-all mt-4"
              >
                <span>Log in to Terminal</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Bottom Trust Line & Sign Up Link */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-kalam text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Secure session · End-to-end encrypted · JWT-scoped
            </span>

            <div>
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-bold hover:underline">
                Sign up
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* ================================================================
          FORGOT PASSWORD OTP RESET MODAL
         ================================================================ */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative z-10 w-full max-w-md p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <h4 className="text-lg font-kalam-bold text-foreground">
                    Reset Password
                  </h4>
                </div>
                <button
                  onClick={() => setShowForgotModal(false)}
                  className="text-muted-foreground hover:text-foreground text-sm font-mono"
                >
                  ✕
                </button>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotSendOtp} className="space-y-4">
                  <p className="text-xs sm:text-sm text-muted-foreground font-kalam">
                    Enter your account email. We&apos;ll send you a 6-digit OTP verification code to securely reset your password.
                  </p>
                  <div className="space-y-1">
                    <label className="block text-xs font-kalam font-semibold text-foreground">
                      Account Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="rajesh@company.in"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-kalam focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    isLoading={isForgotLoading}
                    className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-kalam-bold text-sm shadow-md"
                  >
                    <span>Send Reset Code</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleForgotVerifyOtp} className="space-y-4">
                  <p className="text-xs sm:text-sm text-muted-foreground font-kalam">
                    Enter the 6-digit code sent to <span className="text-foreground font-bold">{forgotEmail}</span>
                  </p>
                  <div className="space-y-1">
                    <label className="block text-xs font-kalam font-semibold text-foreground">
                      6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      className="w-full text-center text-xl font-mono font-bold py-2.5 rounded-xl border border-border bg-background text-foreground tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setForgotStep(1)}
                      className="flex-1 h-11 rounded-xl border-border text-foreground font-kalam text-xs"
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isForgotLoading}
                      className="flex-1 h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-kalam-bold text-xs shadow-md"
                    >
                      <span>Verify &amp; Reset</span>
                      <CheckCircle2 className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}