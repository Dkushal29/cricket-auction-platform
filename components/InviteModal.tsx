"use client";

import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ClientAuction } from "@/lib/types";
import { useToast } from "./ToastNotifications";
import { useAuth } from "./AuthContext";
import { Copy, Check, QrCode, X, Share2, Shield, Eye, RefreshCw } from "lucide-react";

interface InviteModalProps {
  auction: ClientAuction;
  isOpen: boolean;
  onClose: () => void;
}

export function InviteModal({ auction, isOpen, onClose }: InviteModalProps) {
  const { user, token } = useAuth();
  const { addToast } = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeQrLink, setActiveQrLink] = useState<{ title: string; url: string } | null>(null);

  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://cricket-auction-platform.onrender.com";

  const spectatorInvite = auction.spectatorInvite || "";
  const bidderInviteA = auction.bidderInviteA || "";
  const bidderInviteB = auction.bidderInviteB || "";

  const [currentSpectatorToken, setCurrentSpectatorToken] = useState(spectatorInvite);
  const [currentTeamAToken, setCurrentTeamAToken] = useState(bidderInviteA);
  const [currentTeamBToken, setCurrentTeamBToken] = useState(bidderInviteB);
  const [revoking, setRevoking] = useState<string | null>(null);

  if (!isOpen) return null;

  const teamA = auction.participants[0];
  const teamB = auction.participants[1];

  const teamAUrl = `${origin}/auction/${auction.id}/bidder${currentTeamAToken ? `?token=${currentTeamAToken}` : ""}`;
  const teamBUrl = `${origin}/auction/${auction.id}/bidder${currentTeamBToken ? `?token=${currentTeamBToken}` : ""}`;
  const spectatorUrl = `${origin}/auction/${auction.id}/watch${currentSpectatorToken ? `?token=${currentSpectatorToken}` : ""}`;
  const auctioneerUrl = `${origin}/auction/${auction.id}/control`;

  const copyToClipboard = (url: string, key: string, label: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    addToast(`Copied ${label} to clipboard`, "brass");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRevokeToken = async (
    tokenType: "bidderInviteA" | "bidderInviteB" | "spectatorInvite",
    label: string
  ) => {
    try {
      setRevoking(tokenType);
      const res = await fetch(`/api/auctions/${auction.id}/invites`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tokenType }),
      });
      if (!res.ok) throw new Error("Failed to regenerate token");
      const data = await res.json();
      if (tokenType === "bidderInviteA") setCurrentTeamAToken(data.newToken);
      if (tokenType === "bidderInviteB") setCurrentTeamBToken(data.newToken);
      if (tokenType === "spectatorInvite") setCurrentSpectatorToken(data.newToken);
      addToast(`Regenerated private link for ${label}`, "brass");
    } catch (err: any) {
      addToast(err.message || "Failed to regenerate token", "error");
    } finally {
      setRevoking(null);
    }
  };

  const isOwnerAuctioneer = Boolean(
    user?.role === "AUCTIONEER" && user.id === auction.auctioneerId && (auction.bidderInviteA || auction.bidderInviteB)
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#070B12]/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0D131C] border border-[#202B38] rounded-[4px] p-6 max-w-xl w-full space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#202B38] pb-3">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-[#E5AE3F]" />
            <div>
              <h2 className="text-[16px] font-bold text-[#F5F7FA]">
                {isOwnerAuctioneer ? "Private Auction Invites" : "Share Spectator Link"}
              </h2>
              <span className="text-[12px] text-[#8B98A8]">
                Room code: <strong className="text-[#F5F7FA]">{auction.roomCode}</strong>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#8B98A8] hover:text-[#F5F7FA]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="p-3 bg-[#070B12] border border-[#202B38] rounded-[3px] text-[13px] text-[#8B98A8]">
          {isOwnerAuctioneer ? (
            <>
              <span className="text-[#F5F7FA] font-semibold block mb-0.5">Passwordless Private Links:</span>
              Share these private links. Recipients can join instantly without creating an account or logging in.
            </>
          ) : (
            <>
              <span className="text-[#F5F7FA] font-semibold block mb-0.5">Live Spectator Broadcast:</span>
              Anyone with this link can watch this auction.
            </>
          )}
        </div>

        {/* Modal Content */}
        {activeQrLink ? (
          /* QR Code View */
          <div className="flex flex-col items-center justify-center p-6 bg-[#070B12] border border-[#202B38] rounded-[3px] text-center space-y-4">
            <div className="p-3 bg-white rounded-[4px] inline-block">
              <QRCodeSVG
                value={activeQrLink.url}
                size={180}
                bgColor="#FFFFFF"
                fgColor="#070B12"
                level="Q"
              />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#F5F7FA]">
                {activeQrLink.title} QR Code
              </h3>
              <p className="text-[12px] text-[#8B98A8] mt-0.5">
                Scan with mobile camera to watch the live auction stream.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveQrLink(null)}
              className="px-3 py-1 bg-[#0D131C] border border-[#202B38] text-[#F5F7FA] text-[12px] rounded-[2px]"
            >
              Back to link
            </button>
          </div>
        ) : isOwnerAuctioneer ? (
          /* Full Auctioneer Management Links List */
          <div className="space-y-3.5">
            {/* 1. Bidder A Link */}
            <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38] space-y-2" style={{ borderLeft: "4px solid #3E7CB1" }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#F5F7FA]">
                  Bidder A — {teamA?.teamName || "Team Alpha"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRevokeToken("bidderInviteA", "Bidder A")}
                  disabled={revoking === "bidderInviteA"}
                  className="text-[11px] text-[#3E7CB1] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${revoking === "bidderInviteA" ? "animate-spin" : ""}`} />
                  <span>{revoking === "bidderInviteA" ? "Regenerating..." : "Regenerate"}</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={teamAUrl}
                  className="flex-1 px-2.5 py-1 text-[12px] bg-[#161D24] border border-[#202B38] text-[#8B98A8] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(teamAUrl, "teamA", "Bidder A link")}
                  className="px-3 py-1 bg-[#F5F7FA] text-[#070B12] rounded-[2px] text-[12px] font-semibold flex items-center gap-1 hover:bg-white"
                >
                  {copiedKey === "teamA" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "teamA" ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQrLink({ title: `Bidder A (${teamA?.teamName || "Team Alpha"})`, url: teamAUrl })}
                  className="px-2.5 py-1 bg-[#0D131C] border border-[#202B38] text-[#F5F7FA] rounded-[2px] text-[12px] font-semibold flex items-center gap-1 hover:border-[#8B98A8]"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#E5AE3F]" />
                  <span>QR</span>
                </button>
              </div>
            </div>

            {/* 2. Bidder B Link */}
            <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38] space-y-2" style={{ borderLeft: "4px solid #B85C38" }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#F5F7FA]">
                  Bidder B — {teamB?.teamName || "Team Beta"}
                </span>
                <button
                  type="button"
                  onClick={() => handleRevokeToken("bidderInviteB", "Bidder B")}
                  disabled={revoking === "bidderInviteB"}
                  className="text-[11px] text-[#B85C38] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${revoking === "bidderInviteB" ? "animate-spin" : ""}`} />
                  <span>{revoking === "bidderInviteB" ? "Regenerating..." : "Regenerate"}</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={teamBUrl}
                  className="flex-1 px-2.5 py-1 text-[12px] bg-[#161D24] border border-[#202B38] text-[#8B98A8] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(teamBUrl, "teamB", "Bidder B link")}
                  className="px-3 py-1 bg-[#F5F7FA] text-[#070B12] rounded-[2px] text-[12px] font-semibold flex items-center gap-1 hover:bg-white"
                >
                  {copiedKey === "teamB" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "teamB" ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQrLink({ title: `Bidder B (${teamB?.teamName || "Team Beta"})`, url: teamBUrl })}
                  className="px-2.5 py-1 bg-[#0D131C] border border-[#202B38] text-[#F5F7FA] rounded-[2px] text-[12px] font-semibold flex items-center gap-1 hover:border-[#8B98A8]"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#E5AE3F]" />
                  <span>QR</span>
                </button>
              </div>
            </div>

            {/* 3. Spectator Link */}
            <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#F5F7FA] flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-[#8B98A8]" />
                  Spectator (Live read-only stream)
                </span>
                <button
                  type="button"
                  onClick={() => handleRevokeToken("spectatorInvite", "Spectator")}
                  disabled={revoking === "spectatorInvite"}
                  className="text-[11px] text-[#8B98A8] hover:text-[#E5AE3F] underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${revoking === "spectatorInvite" ? "animate-spin" : ""}`} />
                  <span>{revoking === "spectatorInvite" ? "Regenerating..." : "Regenerate"}</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={spectatorUrl}
                  className="flex-1 px-2.5 py-1 text-[12px] bg-[#161D24] border border-[#202B38] text-[#8B98A8] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(spectatorUrl, "spectator", "Spectator link")}
                  className="px-3 py-1 bg-[#F5F7FA] text-[#070B12] rounded-[2px] text-[12px] font-semibold flex items-center gap-1 hover:bg-white"
                >
                  {copiedKey === "spectator" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "spectator" ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQrLink({ title: "Spectator Stream", url: spectatorUrl })}
                  className="px-2.5 py-1 bg-[#0D131C] border border-[#202B38] text-[#F5F7FA] rounded-[2px] text-[12px] font-semibold flex items-center gap-1 hover:border-[#8B98A8]"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#E5AE3F]" />
                  <span>QR</span>
                </button>
              </div>
            </div>

            {/* Auctioneer Controller Link */}
            <div className="p-3 rounded-[3px] bg-[#070B12] border border-[#202B38] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold text-[#F5F7FA] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#E5AE3F]" />
                  Auctioneer Controller (Requires your login)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={auctioneerUrl}
                  className="flex-1 px-2.5 py-1 text-[12px] bg-[#161D24] border border-[#202B38] text-[#8B98A8] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(auctioneerUrl, "auctioneer", "Auctioneer link")}
                  className="px-3 py-1 bg-[#F5F7FA] text-[#070B12] rounded-[2px] text-[12px] font-semibold flex items-center gap-1 hover:bg-white"
                >
                  {copiedKey === "auctioneer" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "auctioneer" ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Spectator-Only Share Card */
          <div className="space-y-3">
            <div className="p-4 rounded-[3px] bg-[#070B12] border border-[#202B38] space-y-2.5">
              <span className="text-[13px] font-bold text-[#F5F7FA] flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-[#8B98A8]" />
                Spectator Link
              </span>
              <p className="text-[12px] text-[#8B98A8]">
                Anyone with this link can watch this auction live with real-time bids and timer.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={spectatorUrl}
                  className="flex-1 px-2.5 py-1.5 text-[12px] bg-[#161D24] border border-[#202B38] text-[#8B98A8] rounded-[2px] font-mono select-all"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(spectatorUrl, "spectator", "Spectator link")}
                  className="px-3.5 py-1.5 bg-[#F5F7FA] text-[#070B12] rounded-[2px] text-[12px] font-semibold flex items-center gap-1.5 hover:bg-white"
                >
                  {copiedKey === "spectator" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === "spectator" ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveQrLink({ title: "Spectator Live Stream", url: spectatorUrl })}
                  className="px-3 py-1.5 bg-[#0D131C] border border-[#202B38] text-[#F5F7FA] rounded-[2px] text-[12px] font-semibold flex items-center gap-1.5 hover:border-[#8B98A8]"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#E5AE3F]" />
                  <span>QR</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#070B12] border border-[#202B38] text-[#F5F7FA] text-[13px] rounded-[2px] hover:border-[#8B98A8]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
