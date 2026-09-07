"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { Shield, User, Mail, Lock, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { addToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validation
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage("Please enter your full name (minimum 2 characters).");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: "AUCTIONEER",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || "Registration failed. Please try again.");
        addToast(data.error || "Registration failed", "error");
      } else {
        login(data.token, data.user);
        addToast(`Welcome, ${data.user.name}! Your auctioneer account is ready.`, "success");
        router.push("/dashboard");
      }
    } catch (err: any) {
      const msg = err.message || "Network error. Please try again.";
      setErrorMessage(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#10151A] text-[#EDEAE1] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="max-w-md w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="w-3 h-3 bg-[#C7A046] rounded-[2px]" />
            <span className="font-bold text-[18px] text-[#EDEAE1]">Real-time auction broadcast</span>
          </div>
          <h1 className="text-[26px] sm:text-[30px] font-bold text-[#EDEAE1]">
            Create Auctioneer Account
          </h1>
          <p className="text-[14px] text-[#8B939A]">
            Register as an auctioneer to create arenas, configure lots, and host live auctions.
          </p>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 bg-[#1B2229] border border-[#2B343C] rounded-[4px] text-[13px] text-[#8B939A] space-y-1">
          <div className="flex items-center gap-1.5 text-[#C7A046] font-semibold text-[13px]">
            <Shield className="w-4 h-4" />
            <span>Auctioneer Only</span>
          </div>
          <p>
            Bidders and spectators do <strong className="text-[#EDEAE1]">not</strong> need an account — they join directly via your private invite links.
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 rounded-[4px] bg-[#1B2229] border border-[#2B343C] space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-[3px] bg-red-950/40 border border-red-800/60 text-red-300 text-[13px]">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="text-[12px] font-medium text-[#8B939A] block mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#8B939A] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Dravid"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px] text-[#EDEAE1] focus:outline-none focus:border-[#8B939A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#8B939A] block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#8B939A] absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="auctioneer@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px] text-[#EDEAE1] focus:outline-none focus:border-[#8B939A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#8B939A] block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#8B939A] absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px] text-[#EDEAE1] focus:outline-none focus:border-[#8B939A]"
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-medium text-[#8B939A] block mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#8B939A] absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="Re-type your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 rounded-[2px] bg-[#10151A] border border-[#2B343C] text-[13px] text-[#EDEAE1] focus:outline-none focus:border-[#8B939A]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 rounded-[2px] font-semibold text-[13px] transition-colors flex items-center justify-center gap-2 ${
                loading
                  ? "bg-[#2B343C] text-[#8B939A] cursor-not-allowed"
                  : "bg-[#EDEAE1] text-[#10151A] hover:bg-white"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-[#2B343C] text-center">
            <p className="text-[13px] text-[#8B939A]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[#C7A046] font-semibold hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
