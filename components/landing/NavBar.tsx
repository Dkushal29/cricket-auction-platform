"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Search, LayoutDashboard, Menu, X, User, LogOut, Shield, ChevronDown, Radio } from "lucide-react";

interface NavBarProps {
  onOpenJoinModal: () => void;
}

export function NavBar({ onOpenJoinModal }: NavBarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Live Arenas", href: "#live-arenas" },
    { label: "My Auctions", href: "/dashboard" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0A0F16]/90 backdrop-blur-md border-b border-[#232C36]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E] rounded-[2px] p-1">
            <div className="w-8 h-8 rounded-[4px] bg-[#131A22] border border-[#D9A94E]/50 flex items-center justify-center text-[#D9A94E] font-hero text-[18px] font-extrabold group-hover:border-[#D9A94E] transition-colors shadow-[0_0_12px_rgba(217,169,78,0.15)]">
              A
            </div>
            <div className="flex flex-col">
              <span className="font-hero text-[20px] font-bold text-[#F5F3EE] tracking-tight leading-none">
                CRICKET AUCTION <span className="text-[#D9A94E]">LIVE</span>
              </span>
              <span className="text-[10px] text-[#8B93A0] tracking-wider uppercase mt-0.5 font-medium">
                Bid · Build · Belong
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.label}
                href={link.href}
                className={`text-[13px] font-medium transition-colors py-1 relative focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E] rounded-[2px] ${
                  isActive
                    ? "text-[#F5F3EE] font-semibold"
                    : "text-[#8B93A0] hover:text-[#F5F3EE]"
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#D9A94E] rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Desktop CTAs & User Deck */}
        <div className="hidden md:flex items-center gap-3">
          {/* Join with Code Button */}
          <button
            type="button"
            onClick={onOpenJoinModal}
            className="px-3 py-1.5 rounded-[3px] bg-[#131A22] border border-[#232C36] hover:border-[#D9A94E]/60 text-[#F5F3EE] text-[13px] font-medium transition-all flex items-center gap-1.5 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
          >
            <Search className="w-3.5 h-3.5 text-[#D9A94E]" />
            <span>Join with code</span>
          </button>

          {/* User Account / Auth CTA */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="px-3 py-1.5 rounded-[3px] bg-[#131A22] border border-[#232C36] hover:border-[#8B93A0] text-[#F5F3EE] text-[13px] font-medium flex items-center gap-2 transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
              >
                <div className="w-5 h-5 rounded-full bg-[#D9A94E]/20 border border-[#D9A94E]/40 flex items-center justify-center text-[#D9A94E] text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[100px] truncate">{user.name}</span>
                <ChevronDown className="w-3 h-3 text-[#8B93A0]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#131A22] border border-[#232C36] rounded-[4px] shadow-xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-3 py-2 border-b border-[#232C36] text-[12px]">
                    <p className="text-[#F5F3EE] font-semibold truncate">{user.name}</p>
                    <p className="text-[#8B93A0] truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded-[2px] bg-[#0A0F16] text-[#D9A94E] text-[10px] font-mono">
                      {user.role}
                    </span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#F5F3EE] hover:bg-[#0A0F16]"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#3E7CB1]" />
                    <span>My Auctions</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-red-300 hover:bg-[#0A0F16] text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="px-3.5 py-1.5 rounded-[3px] text-[#F5F3EE] hover:text-[#D9A94E] text-[13px] font-medium transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
              >
                Sign in
              </Link>
              <Link
                href="/create-auction"
                className="px-3.5 py-1.5 rounded-[3px] bg-[#D9A94E] hover:bg-[#B9862E] text-[#0A0F16] text-[13px] font-bold transition-all shadow-[0_0_12px_rgba(217,169,78,0.2)] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
              >
                Create Auction
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={onOpenJoinModal}
            className="p-2 text-[#D9A94E] hover:bg-[#131A22] rounded-[3px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
            aria-label="Join with code"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#F5F3EE] hover:bg-[#131A22] rounded-[3px] focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#D9A94E]"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0A0F16] border-b border-[#232C36] px-4 py-4 space-y-3 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-[14px] font-medium text-[#F5F3EE] hover:bg-[#131A22] rounded-[2px]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-[#232C36] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenJoinModal();
              }}
              className="w-full py-2.5 rounded-[3px] bg-[#131A22] border border-[#232C36] text-[#F5F3EE] text-[14px] font-medium flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-[#D9A94E]" />
              <span>Enter Room Code</span>
            </button>

            {user ? (
              <div className="space-y-2 pt-1">
                <div className="p-2.5 bg-[#131A22] border border-[#232C36] rounded-[3px] text-[13px] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#F5F3EE] block">{user.name}</span>
                    <span className="text-[11px] text-[#8B93A0]">{user.email}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-[2px] bg-[#0A0F16] text-[#D9A94E] text-[10px] font-mono">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2 text-center text-[13px] text-red-300 hover:underline"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 rounded-[3px] bg-[#131A22] border border-[#232C36] text-center text-[#F5F3EE] text-[13px] font-semibold"
                >
                  Sign in
                </Link>
                <Link
                  href="/create-auction"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 rounded-[3px] bg-[#D9A94E] text-center text-[#0A0F16] text-[13px] font-bold"
                >
                  Create Auction
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
