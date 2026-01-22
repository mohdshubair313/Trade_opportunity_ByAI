"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin, LoginRequest } from "@/lib/api";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setToken, setUser, logout: storeLogout, isAuthenticated, user } = useStore();

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiLogin(credentials);
        setToken(response.access_token);
        setUser({ username: credentials.username, isGuest: false });
        toast.success("Login successful!");
        router.push("/dashboard");
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Invalid credentials";
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [router, setToken, setUser]
  );

  const loginAsGuest = useCallback(() => {
    setUser({ username: "guest", isGuest: true });
    toast.success("Welcome! Using guest mode.");
    router.push("/dashboard");
  }, [router, setUser]);

  const logout = useCallback(() => {
    storeLogout();
    toast.success("Logged out successfully");
    router.push("/");
  }, [router, storeLogout]);

  return {
    isLoading,
    error,
    isAuthenticated,
    user,
    login,
    loginAsGuest,
    logout,
  };
}
