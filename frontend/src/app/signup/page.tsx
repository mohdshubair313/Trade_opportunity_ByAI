"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  TrendingUp,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ExpandToggle } from "@/components/ui/ExpandToggle";
import { OtpInput } from "@/components/auth/OtpInput";
import { GradientText } from "@/components/animations/AnimatedText";
import { GridBackground, Spotlight } from "@/components/animations/AnimatedBackground";
import { register, sendOtp, verifyOtp } from "@/lib/api";
import { useStore } from "@/store/useStore";

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  full_name?: string;
}

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

    if (score <= 2) return { text: "Weak", color: "bg-red-500", width: "33%" };
    if (score <= 4) return { text: "Medium", color: "bg-amber-500", width: "66%" };
    return { text: "Strong", color: "bg-emerald-500", width: "100%" };
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

  return (
    <main className="min-h-screen bg-background relative flex items-center justify-center p-4 overflow-hidden">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="#10b981" />
      <GridBackground />

      {/* Top Navbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 max-w-7xl mx-auto px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:inline">
            Trade<span className="text-primary">Insight</span>
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <ExpandToggle />
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 my-16">
        <div className="rounded-2xl border border-white/10 bg-black/60 p-8 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              {otpStep ? "Verify Your Email" : <GradientText>Create Account</GradientText>}
            </h1>
            <p className="text-sm text-muted-foreground">
              {otpStep
                ? `We sent a 6-digit verification code to ${email}`
                : "Join TradeInsight to unlock AI-powered market analysis"}
            </p>
          </div>

          {/* Form */}
          <div role="form" onKeyDown={(e) => { if (e.key === "Enter" && !otpStep) void handleSendOtp(); }} className="space-y-5">
            {otpStep ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-3 text-center">
                    Enter 6-Digit Verification Code
                  </label>
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
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Check your email inbox or spam folder for the code. Valid for 5 minutes.
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                  onClick={() => void handleVerifyAndRegister()}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Verify & Create Account
                </Button>

                <div className="flex items-center justify-between text-sm pt-2">
                  <button
                    type="button"
                    onClick={() => setOtpStep(false)}
                    className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Change Email
                  </button>

                  <button
                    type="button"
                    disabled={resendTimer > 0 || isLoading}
                    onClick={() => void handleResendOtp()}
                    className="text-primary hover:underline font-medium disabled:opacity-50 disabled:no-underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name <span className="text-muted-foreground">(optional)</span></label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    icon={<User className="h-4 w-4" />}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={errors.full_name}
                    autoComplete="name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <Input
                    type="text"
                    placeholder="Choose a username"
                    icon={<User className="h-4 w-4" />}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    error={errors.username}
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    icon={<Mail className="h-4 w-4" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Password</label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      icon={<Lock className="h-4 w-4" />}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      error={errors.password}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {password && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                      <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                        <motion.div className={`h-full ${passwordStrength().color}`} animate={{ width: passwordStrength().width }} transition={{ duration: 0.3 }} />
                      </div>
                      <p className="text-xs mt-1 text-muted-foreground">Password strength: {passwordStrength().text}</p>
                    </motion.div>
                  )}
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1">
                    <CheckCircle2 className={`h-3 w-3 ${password.length >= 8 ? "text-green-500" : ""}`} />
                    At least 8 characters
                  </p>
                  <p className="flex items-center gap-1">
                    <CheckCircle2 className={`h-3 w-3 ${/[A-Z]/.test(password) ? "text-green-500" : ""}`} />
                    One uppercase letter
                  </p>
                  <p className="flex items-center gap-1">
                    <CheckCircle2 className={`h-3 w-3 ${/[0-9]/.test(password) ? "text-green-500" : ""}`} />
                    One number
                  </p>
                </div>

                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  isLoading={isLoading}
                  onClick={() => void handleSendOtp()}
                >
                  Send Verification Code
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
