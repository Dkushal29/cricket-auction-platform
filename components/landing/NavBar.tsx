"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { Search, LayoutDashboard, Menu, X, User, LogOut, ChevronDown } from "lucide-react";

interface NavBarProps {
  onOpenJoinModal: () => void;
}

export function NavBar({ onOpenJoinModal }: NavBarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const navLinks = [
    { label: "Auctions", href: "/dashboard" },
    { label: "Live", href: "/dashboard" },
    { label: "My Auctions", href: "/dashboard" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070B12]/95 backdrop-blur-md border-b border-[#202B38]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Minimal Subtitle */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 group focus:outline-none focus:ring-1 focus:ring-[#E5AE3F] rounded-[4px] py-1"
          >
            <div className="w-8 h-8 rounded-[4px] bg-[#0D131C] border border-[#202B38] flex items-center justify-center text-[16px] group-hover:border-[#E5AE3F] transition-colors shadow-[0_0_10px_rgba(229,174,63,0.15)]">
              🏏
            </div>
            <div className="flex flex-col">
              <span className="font-hero text-[22px] font-black text-[#F5F7FA] tracking-wide leading-none group-hover:text-[#E5AE3F] transition-colors">
                BIDXI
              </span>
              <span className="text-[9px] text-[#8B98A8] tracking-widest uppercase font-semibold">
                Real-Time Cricket Auctions
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`text-[13px] font-medium transition-colors py-1 relative focus:outline-none focus:text-[#F5F7FA] ${
                    isActive
                      ? "text-[#F5F7FA] font-semibold"
                      : "text-[#8B98A8] hover:text-[#F5F7FA]"
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#E5AE3F] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Desktop CTAs: Join Auction & User Profile */}
        <div className="hidden md:flex items-center gap-3">
          {/* Join Auction Button */}
          <button
            type="button"
            onClick={onOpenJoinModal}
            className="px-3.5 py-1.5 rounded-[4px] bg-[#121A24] border border-[#202B38] hover:border-[#E5AE3F]/60 text-[#F5F7FA] text-[13px] font-medium transition-all flex items-center gap-2 focus:outline-none focus:ring-1 focus:ring-[#E5AE3F]"
          >
            <Search className="w-3.5 h-3.5 text-[#E5AE3F]" />
            <span>Join Auction</span>
          </button>

          {/* User Account / Auth Dropdown */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="px-3 py-1.5 rounded-[4px] bg-[#0D131C] border border-[#202B38] hover:border-[#8B98A8] text-[#F5F7FA] text-[13px] font-medium flex items-center gap-2 transition-all focus:outline-none focus:ring-1 focus:ring-[#E5AE3F]"
              >
                <div className="w-5 h-5 rounded-full bg-[#E5AE3F]/15 border border-[#E5AE3F]/40 flex items-center justify-center text-[#E5AE3F] text-[10px] font-bold">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="max-w-[110px] truncate">{user.name}</span>
                <ChevronDown className="w-3 h-3 text-[#8B98A8]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#0D131C] border border-[#202B38] rounded-[4px] shadow-2xl py-1 z-50">
                  <div className="px-3 py-2 border-b border-[#202B38] text-[12px]">
                    <p className="text-[#F5F7FA] font-semibold truncate">{user.name}</p>
                    <p className="text-[#8B98A8] truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded-[2px] bg-[#070B12] text-[#E5AE3F] text-[10px] font-mono border border-[#202B38]">
                      {user.role}
                    </span>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-[13px] text-[#F5F7FA] hover:bg-[#121A24]"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-[#4DA3FF]" />
                    <span>My Auctions</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-[#FF5C5C] hover:bg-[#121A24] text-left"
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
                className="px-3.5 py-1.5 rounded-[4px] text-[#8B98A8] hover:text-[#F5F7FA] text-[13px] font-medium transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/create-auction"
                className="px-3.5 py-1.5 rounded-[4px] bg-[#E5AE3F] hover:bg-[#F4C65E] text-[#070B12] text-[13px] font-bold transition-all shadow-[0_0_12px_rgba(229,174,63,0.2)] focus:outline-none"
              >
                + Create Auction
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            type="button"
            onClick={onOpenJoinModal}
            className="p-2 text-[#E5AE3F] hover:bg-[#0D131C] rounded-[4px]"
            aria-label="Join auction"
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#F5F7FA] hover:bg-[#0D131C] rounded-[4px]"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#070B12] border-b border-[#202B38] px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-[14px] font-medium text-[#F5F7FA] hover:bg-[#0D131C] rounded-[3px]"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="pt-3 border-t border-[#202B38] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenJoinModal();
              }}
              className="w-full py-2.5 rounded-[4px] bg-[#121A24] border border-[#202B38] text-[#F5F7FA] text-[13px] font-medium flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4 text-[#E5AE3F]" />
              <span>Join Auction with Code</span>
            </button>

            {user ? (
              <div className="space-y-2 pt-1">
                <div className="p-2.5 bg-[#0D131C] border border-[#202B38] rounded-[4px] text-[13px] flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#F5F7FA] block">{user.name}</span>
                    <span className="text-[11px] text-[#8B98A8]">{user.email}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-[2px] bg-[#070B12] text-[#E5AE3F] text-[10px] font-mono border border-[#202B38]">
                    {user.role}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="w-full py-2 text-center text-[13px] text-[#FF5C5C] hover:underline"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 rounded-[4px] bg-[#0D131C] border border-[#202B38] text-center text-[#F5F7FA] text-[13px] font-semibold"
                >
                  Sign in
                </Link>
                <Link
                  href="/create-auction"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 rounded-[4px] bg-[#E5AE3F] text-center text-[#070B12] text-[13px] font-bold"
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
