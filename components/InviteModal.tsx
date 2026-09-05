"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ClientAuction } from "@/lib/types";
import { useToast } from "./ToastNotifications";
import { Copy, Check, QrCode, X, Share2, Users, Shield, Eye } from "lucide-react";

interface InviteModalProps {
  auction: ClientAuction;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ auction, isOpen, onClose }: InviteModalProps) {
  const { addToast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"links" | "qr">("links");

  if (!isOpen) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const spectatorInvite = auction.spectatorInvite || "";
  const bidderInviteA = auction.bidderInviteA || "";
  const bidderInviteB = auction.bidderInviteB || "";

  const [currentSpectatorToken, setCurrentSpectatorToken] = useState(spectatorInvite);
  const [currentTeamAToken, setCurrentTeamAToken] = useState(bidderInviteA);
  const [currentTeamBToken, setCurrentTeamBToken] = useState(bidderInviteB);
  const [revoking, setRevoking] = useState<string | null>(null);

  const spectatorUrl = `${origin}/auction/${auction.id}/watch${currentSpectatorToken ? `?token=${currentSpectatorToken}` : ""}`;
  const auctioneerUrl = `${origin}/auction/${auction.id}/control`;

  const teamA = auction.participants[0];
  const teamB = auction.participants[1];

  const teamAUrl = `${origin}/auction/${auction.id}/bidder${currentTeamAToken ? `?token=${currentTeamAToken}` : ""}`;
  const teamBUrl = `${origin}/auction/${auction.id}/bidder${currentTeamBToken ? `?token=${currentTeamBToken}` : ""}`;

  const copyToClipboard = (url: string, key: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    addToast(`Copied ${label} to clipboard`, "brass");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevokeToken = async (tokenType: "bidderInviteA" | "bidderInviteB" | "spectatorInvite", label: string) => {
    try {
      setRevoking(tokenType);
      const res = await fetch(`/api/auctions/${auction.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenType }),
      });
      if (!res.ok) throw new Error("Failed to revoke token");
      const data = await res.json();
      if (tokenType === "bidderInviteA") setCurrentTeamAToken(data.newToken);
      if (tokenType === "bidderInviteB") setCurrentTeamBToken(data.newToken);
      if (tokenType === "spectatorInvite") setCurrentSpectatorToken(data.newToken);
      addToast(`Regenerated new secure token for ${label}`, "brass");
    } catch (err: any) {
      addToast(err.message || "Failed to regenerate token", "error");
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#10151A]/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1B2229] border border-[#2B343C] rounded-[4px] p-6 max-w-lg w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2B343C] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#C7A046]" />
            <div>
              <h2 className="text-[16px] font-bold text-[#EDEAE1]">
                Invite friends to auction
              </h2>
              <span className="text-[12px] text-[#8B939A]">
                Room code: <strong className="text-[#EDEAE1]">{auction.roomCode}</strong> (Encrypted crypto tokens)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8B939A] hover:text-[#EDEAE1]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border border-[#2B343C] rounded-[2px] p-0.5 bg-[#10151A]">
          <button
            type="button"
            onClick={() => setActiveTab("links")}
            className={`flex-1 py-1 text-[13px] font-medium rounded-[2px] transition-colors ${
              activeTab === "links" ? "bg-[#1B2229] text-[#EDEAE1]" : "text-[#8B939A]"
            }`}
          >
            Private links
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("qr")}
            className={`flex-1 py-1 text-[13px] font-medium rounded-[2px] transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === "qr" ? "bg-[#1B2229] text-[#EDEAE1]" : "text-[#8B939A]"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Spectator QR code</span>
          </button>
        </div>

        {activeTab === "links" ? (
          <div className="space-y-3">
            {/* Spectator Link */}
            <div className="p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#EDEAE1] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#8B939A]" />
                  Public spectator broadcast (friends & fans)
                </span>
                <button
                  type="button"
                  onClick={() => handleRevokeToken("spectatorInvite", "Spectator Link")}
                  disabled={revoking === "spectatorInvite"}
                  className="text-[11px] text-[#8B939A] hover:text-[#C7A046] underline"
                >
                  {revoking === "spectatorInvite" ? "Regenerating..." : "Revoke & reset"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={spectatorUrl}
                  className="flex-1 px-2.5 py-1 text-[12px] bg-[#161D24] border border-[#2B343C] text-[#8B939A] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(spectatorUrl, "spectator", "Spectator link")}
                  className="px-3 py-1 bg-[#EDEAE1] text-[#10151A] rounded-[2px] text-[12px] font-semibold flex items-center gap-1"
                >
                  {copiedKey === "spectator" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "spectator" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Team A Link */}
            <div className="p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-1.5" style={{ borderLeft: "3px solid #3E7CB1" }}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#EDEAE1]">
                  Team Alpha Bidder Link ({teamA?.teamName || "Team Alpha"})
                </span>
                <button
                  type="button"
                  onClick={() => handleRevokeToken("bidderInviteA", "Team Alpha")}
                  disabled={revoking === "bidderInviteA"}
                  className="text-[11px] text-[#3E7CB1] hover:underline"
                >
                  {revoking === "bidderInviteA" ? "Regenerating..." : "Revoke token"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={teamAUrl}
                  className="flex-1 px-2.5 py-1 text-[12px] bg-[#161D24] border border-[#2B343C] text-[#8B939A] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(teamAUrl, "teamA", "Team Alpha link")}
                  className="px-3 py-1 bg-[#EDEAE1] text-[#10151A] rounded-[2px] text-[12px] font-semibold flex items-center gap-1"
                >
                  {copiedKey === "teamA" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "teamA" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Team B Link */}
            <div className="p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-1.5" style={{ borderLeft: "3px solid #B85C38" }}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#EDEAE1]">
                  Team Beta Bidder Link ({teamB?.teamName || "Team Beta"})
                </span>
                <button
                  type="button"
                  onClick={() => handleRevokeToken("bidderInviteB", "Team Beta")}
                  disabled={revoking === "bidderInviteB"}
                  className="text-[11px] text-[#B85C38] hover:underline"
                >
                  {revoking === "bidderInviteB" ? "Regenerating..." : "Revoke token"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={teamBUrl}
                  className="flex-1 px-2.5 py-1 text-[12px] bg-[#161D24] border border-[#2B343C] text-[#8B939A] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(teamBUrl, "teamB", "Team Beta link")}
                  className="px-3 py-1 bg-[#EDEAE1] text-[#10151A] rounded-[2px] text-[12px] font-semibold flex items-center gap-1"
                >
                  {copiedKey === "teamB" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "teamB" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            {/* Auctioneer Control Link */}
            <div className="p-3 rounded-[2px] bg-[#10151A] border border-[#2B343C] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[#EDEAE1] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#C7A046]" />
                  Auctioneer controller (Admin only)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={auctioneerUrl}
                  className="flex-1 px-2.5 py-1 text-[12px] bg-[#161D24] border border-[#2B343C] text-[#8B939A] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(auctioneerUrl, "auctioneer", "Auctioneer link")}
                  className="px-3 py-1 bg-[#EDEAE1] text-[#10151A] rounded-[2px] text-[12px] font-semibold flex items-center gap-1"
                >
                  {copiedKey === "auctioneer" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "auctioneer" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 bg-[#10151A] border border-[#2B343C] rounded-[2px] text-center space-y-4">
            <div className="p-3 bg-white rounded-[4px] inline-block">
              <QRCodeSVG
                value={spectatorUrl}
                size={180}
                bgColor="#FFFFFF"
                fgColor="#10151A"
                level="Q"
              />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#EDEAE1]">
                Scan to watch live on mobile
              </h3>
              <p className="text-[12px] text-[#8B939A] mt-0.5">
                Friends can scan using their phone camera to open spectator broadcast immediately.
              </p>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#10151A] border border-[#2B343C] text-[#EDEAE1] text-[13px] rounded-[2px] hover:border-[#8B939A]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
