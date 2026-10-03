"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/components/ToastNotifications";
import { Shield, User, Mail, Lock, ArrowRight, Loader2, ArrowLeft } from "lucide-react";

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
        addToast(`Welcome, ${data.user.name}! Your auctioneer account is ready.`, "brass");
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
    <div className="min-h-screen bg-[#070B12] text-[#F5F7FA] flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-[#E5AE3F] selection:text-[#070B12]">
      <div className="max-w-md w-full space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-[#8B98A8] hover:text-[#F5F7FA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-[24px]">🏏</span>
            <span className="font-hero text-[28px] font-black text-[#F5F7FA] tracking-wide">BIDXI</span>
          </div>
          <h1 className="font-hero text-[30px] sm:text-[34px] font-black text-[#F5F7FA] uppercase tracking-wide">
            Create Auctioneer Account
          </h1>
          <p className="text-[13px] text-[#8B98A8]">
            Host live cricket arenas, manage player lots, and run real-time bidding.
          </p>
        </div>

        {/* Info Banner */}
        <div className="p-3.5 bg-[#0D131C] border border-[#202B38] rounded-[4px] text-[12px] text-[#8B98A8] space-y-1">
          <div className="flex items-center gap-1.5 text-[#E5AE3F] font-bold text-[12px]">
            <Shield className="w-3.5 h-3.5" />
            <span>Auctioneer Workspace</span>
          </div>
          <p>
            Bidders and spectators do <strong className="text-[#F5F7FA]">not</strong> need an account — they join directly via room code or invite link.
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6 rounded-[4px] bg-[#0D131C] border border-[#202B38] space-y-4 shadow-xl">
          {errorMessage && (
            <div className="p-3 rounded-[3px] bg-[#FF5C5C]/15 border border-[#FF5C5C]/40 text-[#FF5C5C] text-[12px] font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-3.5 h-3.5 text-[#8B98A8] absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[13px] text-[#F5F7FA] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#8B98A8] absolute left-3 top-3" />
                <input
                  type="email"
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[13px] text-[#F5F7FA] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#8B98A8] absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[13px] text-[#F5F7FA] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#8B98A8] block mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#8B98A8] absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="Re-type your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full pl-8 pr-3 py-2 rounded-[3px] bg-[#070B12] border border-[#202B38] text-[13px] text-[#F5F7FA] focus:outline-none focus:border-[#E5AE3F]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-[4px] bg-[#E5AE3F] text-[#070B12] font-bold text-[13px] hover:bg-[#F4C65E] transition-all flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(229,174,63,0.15)] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-[#202B38] text-center">
            <p className="text-[12px] text-[#8B98A8]">
              Already have an account?{" "}
              <Link href="/login" className="text-[#E5AE3F] font-bold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
