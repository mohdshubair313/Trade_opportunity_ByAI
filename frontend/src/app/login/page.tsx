"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { TrendingUp, Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GradientText } from "@/components/animations/AnimatedText";
import { GridBackground, Spotlight } from "@/components/animations/AnimatedBackground";
import { login } from "@/lib/api";
import { useStore } from "@/store/useStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const router = useRouter();
  const { setToken, setUser } = useStore();

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};
    if (!username || username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }
    if (!password || password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await login({ username, password });
      setToken(response.access_token);
      setUser({ username, isGuest: false });
      toast.success("Login successful!");
      router.push("/dashboard");
    } catch {
      toast.error("Invalid credentials. Try demo_user / demo_password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestAccess = () => {
    setUser({ username: "guest", isGuest: true });
    toast.success("Welcome! Using guest mode.");
    router.push("/dashboard");
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
          <h1 className="text-3xl font-bold mb-2">
            Welcome <GradientText>Back</GradientText>
          </h1>
          <p className="text-muted-foreground mb-8">
            Sign in to access your market intelligence dashboard
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Username
                </label>
                <Input
                  type="text"
                  placeholder="Enter your username"
                  icon={<Mail className="h-4 w-4" />}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  error={errors.username}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="Enter your password"
                  icon={<Lock className="h-4 w-4" />}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Sign In
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
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
            <code className="bg-muted px-1.5 py-0.5 rounded">demo_password</code>
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
