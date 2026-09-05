"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { UserRole } from "@/lib/types";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  teamName?: string;
  participantAuctionId?: string;
}

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  loading: boolean;
  login: (token: string, user: CurrentUser) => void;
  logout: () => Promise<void>;
  switchUserRole: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check localStorage and /api/auth/me
    const storedToken = localStorage.getItem("auction_token");
    const storedUser = localStorage.getItem("auction_user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
      }
    }

    // Refresh from /api/auth/me
    fetch("/api/auth/me", {
      headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          const u: CurrentUser = {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            teamName: data.user.participants?.[0]?.teamName,
            participantAuctionId: data.user.participants?.[0]?.auctionId,
          };
          setUser(u);
          localStorage.setItem("auction_user", JSON.stringify(u));
        } else if (!storedToken) {
          setUser(null);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = (newToken: string, newUser: CurrentUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("auction_token", newToken);
    localStorage.setItem("auction_user", JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    setToken(null);
    setUser(null);
    localStorage.removeItem("auction_token");
    localStorage.removeItem("auction_user");
  };

  const switchUserRole = async (email: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: "Password123!" }),
      });
      const data = await res.json();
      if (res.ok && data.token && data.user) {
        login(data.token, data.user);
      } else {
        alert(data.error || "Failed to switch role");
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchUserRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
