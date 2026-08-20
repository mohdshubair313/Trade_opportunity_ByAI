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
  ArrowLeft,
  TrendingUp,
  KeyRound,
} from "lucide-react";
import {
  AuthBackground,
  AuthVisualPanel,
  AuthCard,
  AuthInput,
  GradientButton,
} from "@/components/auth";
import { OtpInput } from "@/components/auth/OtpInput";
import { register, sendOtp, verifyOtp } from "@/lib/api";
import { useStore } from "@/store/useStore";

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  full_name?: string;
}

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // OTP Verification state
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const router = useRouter();
  const { setToken, setUser, resetUserScoped } = useStore();

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
    return { text: "Strong", color: "bg-emerald-400", width: "100%" };
  };

  const validateRegister = (): boolean => {
    const newErrors: FormErrors = {};

    if (!username || username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password || password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    } else {
      if (!/[A-Z]/.test(password)) {
        newErrors.password = "Password must contain at least one uppercase letter";
      } else if (!/[a-z]/.test(password)) {
        newErrors.password = "Password must contain at least one lowercase letter";
      } else if (!/[0-9]/.test(password)) {
        newErrors.password = "Password must contain at least one digit";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async () => {
    if (!validateRegister()) return;
    setIsLoading(true);
    try {
      await sendOtp(email);
      setOtpStep(true);
      setResendTimer(60);
      toast.success("Verification code sent to your email!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to send verification code";
      if (msg.includes("Email already")) {
        setErrors({ email: "Email already registered" });
      } else if (msg.includes("Username already")) {
        setErrors({ username: "Username already taken" });
      } else {
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsLoading(true);
    try {
      await sendOtp(email);
      setResendTimer(60);
      toast.success("New verification code sent!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndRegister = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter the complete 6-digit OTP code");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Verify OTP
      await verifyOtp(email, otpCode);

      // 2. Register user
      resetUserScoped();
      const response = await register({
        username,
        email,
        password,
        full_name: fullName || undefined,
      });

      setToken(response.access_token);
      setUser({ username, isGuest: false });
      toast.success("Registration successful! Welcome to TradeInsight.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification or registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  const strength = passwordStrength();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070710] text-white font-sans selection:bg-violet-500/30">
      <AuthBackground />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-[1440px] flex-col items-center justify-center gap-10 px-5 py-10 sm:px-8 lg:flex-row lg:gap-16 lg:px-12">
        <AuthVisualPanel />

        {/* Right side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center">
          <AuthCard>
            {/* Mobile logo (left panel hidden on small screens) */}
            <Link
              href="/"
              className="lg:hidden flex items-center justify-center gap-2.5 mb-7"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 via-fuchsia-500 to-cyan-400 flex items-center justify-center shadow-[0_0_18px_rgba(168,85,247,0.4)]">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">TradeInsight</span>
            </Link>

            {/* Header */}
            <motion.div {...fadeUp} className="text-center mb-8">
              <p className="text-[11px] uppercase tracking-[0.28em] text-violet-300/80 font-semibold mb-3">
                {otpStep ? "Security Check" : "Welcome to TradeInsight"}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                {otpStep ? (
                  <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                    Verify Your Email
                  </span>
                ) : (
                  "Create An Account"
                )}
              </h1>
              <p className="mt-2 text-sm text-white/45">
                {otpStep
                  ? `We sent a 6-digit code to ${email}`
                  : "Start discovering AI-powered market opportunities"}
              </p>
            </motion.div>

            <AnimatePresence mode="wait">
              {otpStep ? (
                // OTP STEP
                <motion.div key="otp" {...fadeUp} className="space-y-6">
                  <div>
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-3xl bg-violet-500/10 blur-xl" />
                      <OtpInput
                        value={otpCode}
                        onChange={(val) => setOtpCode(val)}
                        onComplete={(val) => {
                          setOtpCode(val);
                          if (val.length === 6 && !isLoading) {
                            void handleVerifyAndRegister();
                          }
                        }}
                        disabled={isLoading}
                      />
                    </div>
                    <p className="text-xs text-white/40 text-center">
                      Check your inbox or spam folder. Code valid for 5 minutes.
                    </p>
                  </div>

                  <GradientButton
                    isLoading={isLoading}
                    loadingText="Verifying…"
                    disabled={otpCode.length !== 6}
                    onClick={() => void handleVerifyAndRegister()}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Verify &amp; Create Account
                  </GradientButton>

                  <div className="flex items-center justify-between text-sm pt-1">
                    <button
                      type="button"
                      onClick={() => setOtpStep(false)}
                      className="text-white/45 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Change Email
                    </button>

                    <button
                      type="button"
                      disabled={resendTimer > 0 || isLoading}
                      onClick={() => void handleResendOtp()}
                      className="text-violet-300 hover:text-violet-200 font-medium disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                      {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                    </button>
                  </div>
                </motion.div>
              ) : (
                // REGISTER FORM
                <motion.div
                  key="form"
                  {...fadeUp}
                  role="form"
                  aria-label="Sign up form"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isLoading) void handleSendOtp();
                  }}
                  className="space-y-4"
                >
                  <div className="flex gap-3">
                    <AuthInput
                      label="Username"
                      icon={<User className="h-4 w-4" />}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      error={errors.username}
                      autoComplete="username"
                    />
                    <AuthInput
                      label="Full Name"
                      icon={<User className="h-4 w-4" />}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={errors.full_name}
                      autoComplete="name"
                    />
                  </div>

                  <AuthInput
                    label="Email Address"
                    type="email"
                    icon={<Mail className="h-4 w-4" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    autoComplete="email"
                  />

                  <AuthInput
                    label="Password"
                    type="password"
                    icon={<Lock className="h-4 w-4" />}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    error={errors.password}
                    autoComplete="new-password"
                  />

                  {/* Password strength */}
                  <AnimatePresence>
                    {password && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${strength.color}`}
                              initial={{ width: 0 }}
                              animate={{ width: strength.width }}
                              transition={{ duration: 0.4, ease: "easeOut" }}
                            />
                          </div>
                          <span className="text-[11px] font-medium text-white/50 w-12 text-right">
                            {strength.text}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-3">
                    <GradientButton
                      isLoading={isLoading}
                      loadingText="Sending…"
                      onClick={() => void handleSendOtp()}
                    >
                      <KeyRound className="h-4 w-4" />
                      Send Verification Code
                    </GradientButton>
                  </div>

                  <p className="text-center text-sm text-white/45 pt-2">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="text-violet-300 hover:text-violet-200 font-medium transition-colors"
                    >
                      Sign in
                    </Link>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </AuthCard>
        </div>
      </div>
    </div>
  );
}