"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sun,
  Moon,
  TrendingUp,
  Landmark,
  Ship,
  FileSpreadsheet,
} from "lucide-react";
import { AuthLeftPanel } from "@/components/auth/AuthLeftPanel";
import { Button } from "@/components/ui/Button";
import { register, sendOtp, verifyOtp } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useTheme } from "@/components/ui/ThemeProvider";

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  full_name?: string;
  otp?: string;
}

const PERSONA_OPTIONS = [
  {
    id: "investor",
    label: "Equity Investor",
    tag: "INVEST-LONG",
    desc: "Fundamental growth, 5-yr moat & macro trends",
    icon: Landmark,
  },
  {
    id: "student",
    label: "Day Trader",
    tag: "TRADER-ALPHA",
    desc: "Breakout signals, volume momentum & pivot levels",
    icon: TrendingUp,
  },
  {
    id: "exporter",
    label: "SME & Exporter",
    tag: "SME-FOUNDER",
    desc: "Raw material costs, FX hedging & supply chain",
    icon: Ship,
  },
  {
    id: "consultant",
    label: "Strategy Consultant",
    tag: "STRAT-CONSULT",
    desc: "Audited sector share shifts & board memos",
    icon: FileSpreadsheet,
  },
];

export default function SignupPage() {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Account credentials
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  // Step 2: OTP verification
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [resendTimer, setResendTimer] = useState(0);

  // Step 3: Password & Persona
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("investor");

  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const router = useRouter();
  const { setToken, setUser, resetUserScoped } = useStore();
  const { theme, toggleTheme } = useTheme();

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const passwordStrength = () => {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { text: "Weak", color: "bg-rose-500", width: "33%" };
    if (score <= 4) return { text: "Medium", color: "bg-amber-400", width: "66%" };
    return { text: "Strong", color: "bg-primary", width: "100%" };
  };

  // Step 1: Send OTP
  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    if (!username || username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = "Only letters, numbers, and underscores allowed";
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      await sendOtp(email);
      toast.success(`Verification code sent to ${email}`);
      setResendTimer(30);
      setCurrentStep(2);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send OTP code";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // OTP digit input change handler with auto-advance
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste of multiple digits
      const pasted = value.replace(/\D/g, "").slice(0, 6);
      const newDigits = [...otpDigits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setOtpDigits(newDigits);
      const nextIdx = Math.min(pasted.length, 5);
      const nextInput = document.getElementById(`otp-input-${nextIdx}`);
      nextInput?.focus();
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newDigits = [...otpDigits];
    newDigits[index] = digit;
    setOtpDigits(newDigits);

    if (digit && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Step 2: Verify OTP
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setErrors({ otp: "Please enter all 6 digits" });
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyOtp(email, fullOtp);
      if (res.verified) {
        toast.success("Email verified successfully!");
        setCurrentStep(3);
      } else {
        toast.error("Invalid verification code. Please check and retry.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      await sendOtp(email);
      toast.success("New code sent to your email");
      setResendTimer(30);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend code";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Final Account Registration
  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};

    if (!password || password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsLoading(true);
    try {
      const tokenData = await register({
        username,
        email,
        password,
        full_name: fullName.trim() || undefined,
      });

      resetUserScoped();
      setToken(tokenData.access_token);
      setUser({
        username,
        isGuest: false,
      });

      toast.success("Account created! Welcome to TradeInsight AI.");
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-10 bg-background text-foreground transition-colors duration-300">
      
      {/* Background Ambient Spotlight */}
      <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute top-1/4 right-1/4 w-[600px] h-[400px] rounded-full blur-[140px] opacity-15"
          style={{
            background: "radial-gradient(circle, var(--primary) 0%, transparent 70%)",
          }}
        />
        <div className="terminal-grid absolute inset-0 opacity-20" />
      </div>

      {/* Floating Split-Screen Card */}
      <div className="relative z-10 w-full max-w-6xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        
        {/* ================================================================
            LEFT BRAND PANEL: Artwork + Headline + Live Ticker
           ================================================================ */}
        <div className="lg:col-span-6 xl:col-span-5 h-full">
          <AuthLeftPanel
            title="Ask the market anything."
            subtitle="Get cited, persona-tuned research dossiers for 20+ Indian equity sectors in under 15 seconds."
          />
        </div>

        {/* ================================================================
            RIGHT FORM PANEL: 3-Step Interactive OTP Verification Flow
           ================================================================ */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between p-8 sm:p-10 md:p-12 bg-card">
          
          {/* Top Bar: Step Navigation + Theme Switcher */}
          <div className="flex items-center justify-between pb-6 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-primary px-2.5 py-1 rounded bg-primary/10 border border-primary/20">
                STEP 0{currentStep} / 03
              </span>
              <span className="font-kalam text-xs sm:text-sm text-muted-foreground">
                {currentStep === 1 && "Account Credentials"}
                {currentStep === 2 && "Email OTP Verification"}
                {currentStep === 3 && "Profile & Persona"}
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

          {/* Form Step Progress Bar */}
          <div className="w-full bg-muted h-1 rounded-full my-6 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>

          {/* Step Views */}
          <div className="my-auto py-2">
            <AnimatePresence mode="wait">
              
              {/* ============================================================
                  STEP 1: Email & Username
                 ============================================================ */}
              {currentStep === 1 && (
                <motion.form
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleStep1Submit}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-kalam-bold text-foreground">
                      Create your account
                    </h3>
                    <p className="text-sm text-muted-foreground font-kalam mt-1">
                      We use email verification codes for secure, passwordless access.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Username Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-kalam font-semibold text-foreground">
                        Username
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value.toLowerCase())}
                          placeholder="e.g. rajesh_trader"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-kalam focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      {errors.username && (
                        <p className="text-xs text-rose-500 font-kalam">{errors.username}</p>
                      )}
                    </div>

                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-kalam font-semibold text-foreground">
                        Work or Personal Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="rajesh@company.in"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm font-kalam focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          required
                        />
                      </div>
                      {errors.email && (
                        <p className="text-xs text-rose-500 font-kalam">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-kalam-bold text-sm shadow-md transition-all mt-4"
                  >
                    <span>Send Verification Code</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.form>
              )}

              {/* ============================================================
                  STEP 2: 6-Digit OTP Verification
                 ============================================================ */}
              {currentStep === 2 && (
                <motion.form
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleStep2Submit}
                  className="space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-kalam-bold text-foreground">
                        Enter 6-Digit Code
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground font-kalam mt-1">
                        Code sent to <span className="text-foreground font-bold">{email}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs font-kalam text-primary hover:underline"
                    >
                      Change email
                    </button>
                  </div>

                  {/* 6 Segmented Input Boxes */}
                  <div className="py-2">
                    <div className="flex items-center justify-between gap-2 sm:gap-3">
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-input-${idx}`}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                        />
                      ))}
                    </div>
                    {errors.otp && (
                      <p className="text-xs text-rose-500 font-kalam mt-2 text-center">{errors.otp}</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      disabled={resendTimer > 0 || isLoading}
                      onClick={handleResendOtp}
                      className="inline-flex items-center gap-1.5 text-xs font-kalam text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      <span>{resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}</span>
                    </button>

                    <Button
                      type="submit"
                      isLoading={isLoading}
                      className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-kalam-bold text-sm shadow-md"
                    >
                      <span>Verify Code</span>
                      <CheckCircle2 className="ml-1.5 h-4 w-4" />
                    </Button>
                  </div>
                </motion.form>
              )}

              {/* ============================================================
                  STEP 3: Profile, Password & Persona Selection
                 ============================================================ */}
              {currentStep === 3 && (
                <motion.form
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  onSubmit={handleStep3Submit}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-kalam-bold text-foreground">
                      Pick your primary persona
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground font-kalam mt-1">
                      TradeInsight tunes report tone, volatility indicators, and risk metrics to your mandate.
                    </p>
                  </div>

                  {/* Persona Chip Tiles (4 Grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {PERSONA_OPTIONS.map((p) => {
                      const isSelected = selectedPersona === p.id;
                      const Icon = p.icon;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedPersona(p.id)}
                          className={`text-left p-3.5 rounded-xl border transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/40"
                              : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                              <span className="font-kalam-bold text-sm text-foreground">
                                {p.label}
                              </span>
                            </div>
                            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-muted">
                              {p.tag}
                            </span>
                          </div>
                          <p className="text-[11px] font-kalam leading-tight line-clamp-2">
                            {p.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Full Name & Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                      <label className="block text-xs font-kalam font-semibold text-foreground">
                        Full Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Rajesh Kumar"
                        className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-kalam focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-kalam font-semibold text-foreground">
                        Set Password
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 8 characters"
                          className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-border bg-background text-foreground text-sm font-kalam focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-kalam">
                        <span className="text-muted-foreground">Password strength:</span>
                        <span className="font-bold">{passwordStrength().text}</span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength().color} transition-all duration-300`}
                          style={{ width: passwordStrength().width }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    isLoading={isLoading}
                    className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-kalam-bold text-sm shadow-md transition-all mt-2"
                  >
                    <span>Create Account &amp; Access Market</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.form>
              )}

            </AnimatePresence>
          </div>

          {/* Bottom Trust Line & Log In Link */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-kalam text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              Bank-grade encryption. 100% cited data. No spam.
            </span>

            <div>
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Log in
              </Link>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}