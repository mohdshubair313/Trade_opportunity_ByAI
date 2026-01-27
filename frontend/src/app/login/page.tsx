"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GradientText } from "@/components/animations/AnimatedText";
import { GridBackground, Spotlight } from "@/components/animations/AnimatedBackground";
import { login, register, LoginRequest, RegisterRequest } from "@/lib/api";
import { useStore } from "@/store/useStore";

type AuthMode = "login" | "register";

interface FormErrors {
  username?: string;
  email?: string;
  password?: string;
  full_name?: string;
}

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const router = useRouter();
  const { setToken, setUser } = useStore();

  const validateLogin = (): boolean => {
    const newErrors: FormErrors = {};
    if (!username || username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    if (!password || password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      if (!validateLogin()) return;

      setIsLoading(true);
      try {
        const response = await login({ username, password });
        setToken(response.access_token);
        setUser({ username, isGuest: false });
        toast.success("Login successful!");
        router.push("/dashboard");
      } catch {
        toast.error("Invalid credentials. Try demo_user / Demo@123");
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!validateRegister()) return;

      setIsLoading(true);
      try {
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
        if (err instanceof Error) {
          if (err.message.includes("Username already")) {
            setErrors({ username: "Username already taken" });
          } else if (err.message.includes("Email already")) {
            setErrors({ email: "Email already registered" });
          } else {
            toast.error("Registration failed. Please try again.");
          }
        } else {
          toast.error("Registration failed. Please try again.");
        }
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleGuestAccess = () => {
    setUser({ username: "guest", isGuest: true });
    toast.success("Welcome! Using guest mode.");
    router.push("/dashboard");
  };

  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setErrors({});
  };

  const passwordStrength = (): { text: string; color: string; width: string } => {
    if (!password) return { text: "", color: "", width: "0%" };
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;

    if (strength <= 2) return { text: "Weak", color: "bg-red-500", width: "33%" };
    if (strength <= 3) return { text: "Medium", color: "bg-yellow-500", width: "66%" };
    return { text: "Strong", color: "bg-green-500", width: "100%" };
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <span className="font-bold text-xl">
              Trade<span className="text-primary">Insight</span>
            </span>
          </Link>

          {/* Header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="text-3xl font-bold mb-2">
                {mode === "login" ? (
                  <>Welcome <GradientText>Back</GradientText></>
                ) : (
                  <>Create <GradientText>Account</GradientText></>
                )}
              </h1>
              <p className="text-muted-foreground mb-8">
                {mode === "login"
                  ? "Sign in to access your market intelligence dashboard"
                  : "Join TradeInsight to unlock AI-powered market analysis"}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  key="fullname"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm font-medium mb-2">
                    Full Name <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    icon={<User className="h-4 w-4" />}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    error={errors.full_name}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium mb-2">
                Username
              </label>
              <Input
                type="text"
                placeholder="Enter your username"
                icon={<User className="h-4 w-4" />}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                error={errors.username}
              />
            </div>

            <AnimatePresence mode="wait">
              {mode === "register" && (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="block text-sm font-medium mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    icon={<Mail className="h-4 w-4" />}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    error={errors.email}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="block text-sm font-medium mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  icon={<Lock className="h-4 w-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password strength indicator */}
              {mode === "register" && password && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2"
                >
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${passwordStrength().color}`}
                      initial={{ width: 0 }}
                      animate={{ width: passwordStrength().width }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-xs mt-1 text-muted-foreground">
                    Password strength: {passwordStrength().text}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Password requirements for register */}
            {mode === "register" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-muted-foreground space-y-1"
              >
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
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              {mode === "login" ? "Sign In" : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Switch mode */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don&apos;t have an account?{" "}
                <button
                  onClick={switchMode}
                  className="text-primary hover:underline font-medium"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={switchMode}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </button>
              </>
            )}
          </p>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-background px-4 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {/* Guest Access */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            size="lg"
            onClick={handleGuestAccess}
          >
            <Sparkles className="h-4 w-4" />
            Continue as Guest
          </Button>

          {/* Demo credentials */}
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Demo: <code className="bg-muted px-1.5 py-0.5 rounded">demo_user</code> /{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded">Demo@123</code>
          </p>
        </motion.div>
      </div>

      {/* Right side - Visual */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-muted/30">
        <GridBackground className="opacity-30" />
        <Spotlight className="-top-40 left-0" fill="#22c55e" />

        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center mb-8 mx-auto">
              <TrendingUp className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-3xl font-bold mb-4">
              AI-Powered <GradientText>Market Intelligence</GradientText>
            </h2>
            <p className="text-muted-foreground max-w-md">
              Get comprehensive trade opportunity analysis for any sector in
              Indian markets, powered by advanced AI and real-time data.
            </p>

            {/* Feature list */}
            <div className="mt-12 text-left space-y-4">
              {[
                "Real-time market analysis",
                "20+ sectors covered",
                "Export-import opportunities",
                "Strategic recommendations",
                "Save & track favorites",
              ].map((feature, i) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.4 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                  </div>
                  <span className="text-muted-foreground">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
