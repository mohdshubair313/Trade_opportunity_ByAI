"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  LoginRequest,
  RegisterRequest,
  UserProfile,
  isAuthenticated as checkAuth,
  clearTokens,
} from "@/lib/api";
import { useStore } from "@/store/useStore";
import toast from "react-hot-toast";

export interface AuthState {
  isLoading: boolean;
  isAuthenticating: boolean;
  error: string | null;
  isAuthenticated: boolean;
  user: UserProfile | null;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const router = useRouter();
  const { setToken, setUser, logout: storeLogout, isAuthenticated, user } = useStore();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      if (checkAuth()) {
        try {
          const profile = await getCurrentUser();
          setUserProfile(profile);
          setUser({ username: profile.username, isGuest: false });
        } catch {
          // Token expired or invalid
          clearTokens();
          storeLogout();
        }
      }
      setIsLoading(false);
    };

    checkAuthentication();
  }, [setUser, storeLogout]);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      setIsAuthenticating(true);
      setError(null);

      try {
        const response = await apiLogin(credentials);
        setToken(response.access_token);

        // Fetch user profile
        const profile = await getCurrentUser();
        setUserProfile(profile);
        setUser({ username: profile.username, isGuest: false });

        toast.success("Login successful!");
        router.push("/dashboard");
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Invalid credentials";
        setError(errorMessage);
        toast.error("Login failed. Check your credentials.");
        throw err;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [router, setToken, setUser]
  );

  const register = useCallback(
    async (data: RegisterRequest) => {
      setIsAuthenticating(true);
      setError(null);

      try {
        const response = await apiRegister(data);
        setToken(response.access_token);

        // Fetch user profile
        const profile = await getCurrentUser();
        setUserProfile(profile);
        setUser({ username: profile.username, isGuest: false });

        toast.success("Registration successful! Welcome to TradeInsight.");
        router.push("/dashboard");
        return response;
      } catch (err) {
        let errorMessage = "Registration failed";
        if (err instanceof Error) {
          // Parse error message from API response
          if (err.message.includes("Username already")) {
            errorMessage = "Username already taken";
          } else if (err.message.includes("Email already")) {
            errorMessage = "Email already registered";
          } else {
            errorMessage = err.message;
          }
        }
        setError(errorMessage);
        toast.error(errorMessage);
        throw err;
      } finally {
        setIsAuthenticating(false);
      }
    },
    [router, setToken, setUser]
  );

  const loginAsGuest = useCallback(() => {
    setUser({ username: "guest", isGuest: true });
    toast.success("Welcome! Using guest mode.");
    router.push("/dashboard");
  }, [router, setUser]);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // Ignore logout API errors, just clear local state
    } finally {
      storeLogout();
      setUserProfile(null);
      toast.success("Logged out successfully");
      router.push("/");
    }
  }, [router, storeLogout]);

  const refreshUserProfile = useCallback(async () => {
    if (checkAuth()) {
      try {
        const profile = await getCurrentUser();
        setUserProfile(profile);
        return profile;
      } catch {
        // Token expired
        storeLogout();
        return null;
      }
    }
    return null;
  }, [storeLogout]);

  return {
    isLoading,
    isAuthenticating,
    error,
    isAuthenticated,
    user,
    userProfile,
    login,
    register,
    loginAsGuest,
    logout,
    refreshUserProfile,
  };
}
