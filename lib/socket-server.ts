import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { prisma } from "./prisma";
import { verifyToken } from "./auth";
import { verifyGuestToken } from "./guest-session";
import { isAuctionConfigComplete } from "./auction-state";
import { finalizeOrUnsoldLot } from "./auction-finalization";

declare global {
  // eslint-disable-next-line no-var
  var ioServer: SocketIOServer | undefined;
  // eslint-disable-next-line no-var
  var auctionActiveTimers: Map<string, AuctionTimerState> | undefined;
  // eslint-disable-next-line no-var
  var auctionRoomPresence: Map<string, Map<string, SocketMetadata>> | undefined;
}

// Track active countdown timers per auction
export interface AuctionTimerState {
  auctionId: string;
  itemId: string;
  timerExpiry: number; // unix timestamp ms
  intervalId: NodeJS.Timeout;
}

if (!global.auctionActiveTimers) {
  global.auctionActiveTimers = new Map();
}
const activeTimers = global.auctionActiveTimers;

// Presence tracking per auction room: Map<auctionId, Set<socketId with metadata>>
export interface SocketMetadata {
  socketId: string;
  userId?: string;
  role?: string;
  teamSlot?: string;
  participantId?: string;
  auctionId?: string;
}

if (!global.auctionRoomPresence) {
  global.auctionRoomPresence = new Map();
}
const roomPresence = global.auctionRoomPresence;

export function checkBidderReadiness(
  auctionId: string,
  participants: { id: string; userId?: string }[]
): {
  bidderAReady: boolean;
  bidderBReady: boolean;
  allBiddersReady: boolean;
} {
  const socketsMap = roomPresence.get(auctionId);
  if (!socketsMap || participants.length < 2) {
    return { bidderAReady: false, bidderBReady: false, allBiddersReady: false };
  }

  const pA = participants[0];
  const pB = participants[1];

  let bidderAReady = false;
  let bidderBReady = false;

  for (const meta of socketsMap.values()) {
    // Spectators are strictly excluded
    if (meta.role !== "BIDDER") continue;

    // Cross-auction check: guest or user must belong to this specific auction
    if (meta.auctionId && meta.auctionId !== auctionId) continue;

    // Match Team A
    if (
      meta.teamSlot === "A" ||
      (meta.participantId && meta.participantId === pA.id) ||
      (meta.userId && meta.userId === pA.userId)
    ) {
      bidderAReady = true;
    }

    // Match Team B
    if (
      meta.teamSlot === "B" ||
      (meta.participantId && meta.participantId === pB.id) ||
      (meta.userId && meta.userId === pB.userId)
    ) {
      bidderBReady = true;
    }
  }

  return {
    bidderAReady,
    bidderBReady,
    allBiddersReady: bidderAReady && bidderBReady,
  };
}

export function registerMockPresence(auctionId: string, metadata: SocketMetadata) {
  if (!roomPresence.has(auctionId)) {
    roomPresence.set(auctionId, new Map());
  }
  roomPresence.get(auctionId)!.set(metadata.socketId, metadata);
}

export function clearMockPresence(auctionId: string) {
  roomPresence.delete(auctionId);
}

export async function broadcastPresence(auctionId: string) {
  const io = global.ioServer;
  if (!io) return;
  const room = `auction_${auctionId}`;
  const socketsMap = roomPresence.get(auctionId);
  const totalCount = socketsMap ? socketsMap.size : 0;

  const connectedUsers = socketsMap ? Array.from(socketsMap.values()) : [];
  const hasAuctioneer = connectedUsers.some((u) => u.role === "AUCTIONEER");
  const connectedUserIds = connectedUsers.map((u) => u.userId).filter(Boolean);

  try {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { participants: true, items: true },
    });

    const { bidderAReady, bidderBReady, allBiddersReady } = auction
      ? checkBidderReadiness(auctionId, auction.participants)
      : { bidderAReady: false, bidderBReady: false, allBiddersReady: false };

    // If auction is in DRAFT, both required bidder teams are connected AND configuration is complete, transition to READY
    if (
      auction &&
      auction.status === "DRAFT" &&
      allBiddersReady &&
      isAuctionConfigComplete(auction)
    ) {
      await prisma.auction.update({
        where: { id: auctionId },
        data: { status: "READY" },
      });
      io.to(room).emit("auction_ready", {
        auctionId,
        status: "READY",
        bidderAReady,
        bidderBReady,
      });
      io.to(room).emit("auction_status_changed", {
        auctionId,
        status: "READY",
      });
    } else if (
      auction &&
      auction.status === "READY" &&
      !allBiddersReady
    ) {
      // If a bidder disconnects while in READY (prior to live start), revert to DRAFT
      await prisma.auction.update({
        where: { id: auctionId },
        data: { status: "DRAFT" },
      });
      io.to(room).emit("auction_status_changed", {
        auctionId,
        status: "DRAFT",
      });
    }

    io.to(room).emit("presence_updated", {
      auctionId,
      spectatorCount: totalCount,
      hasAuctioneer,
      connectedUserIds,
      bidderAReady,
      bidderBReady,
      allBiddersReady,
    });
    io.to(room).emit("spectator_count_updated", { auctionId, count: totalCount });
  } catch (e) {
    // Database or socket error fallback
    io.to(room).emit("presence_updated", {
      auctionId,
      spectatorCount: totalCount,
      hasAuctioneer,
      connectedUserIds,
    });
    io.to(room).emit("spectator_count_updated", { auctionId, count: totalCount });
  }
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  if (global.ioServer) return global.ioServer;

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  global.ioServer = io;

  // Socket Auth & Room Logic
  io.on("connection", (socket) => {
    // 1. Extract token from handshake auth, query, or cookies
    let token = (socket.handshake.auth?.token as string) || (socket.handshake.query?.token as string);

    if (!token && socket.handshake.headers?.cookie) {
      const cookieHeader = socket.handshake.headers.cookie;
      const guestMatch = cookieHeader.match(/guest_token=([^;]+)/);
      const userMatch = cookieHeader.match(/token=([^;]+)/);
      token = guestMatch?.[1] || userMatch?.[1] || "";
    }

    if (token) {
      // Try User JWT first
      const user = verifyToken(token);
      if (user) {
        socket.data.user = { ...user, isGuest: false };
      } else {
        // Try Guest Session JWT
        const guest = verifyGuestToken(token);
        if (guest) {
          socket.data.user = guest;
        }
      }
    }

    // Join Auction Room with presence and cross-auction validation
    socket.on("join_auction", async ({ auctionId }: { auctionId: string }) => {
      if (!auctionId) return;

      // If guest, verify they are joining their authorized auction
      if (socket.data.user?.isGuest && socket.data.user.auctionId !== auctionId) {
        socket.emit("error", { message: "Unauthorized auction room" });
        return;
      }

      const room = `auction_${auctionId}`;
      socket.join(room);

      if (!roomPresence.has(auctionId)) {
        roomPresence.set(auctionId, new Map());
      }

      roomPresence.get(auctionId)!.set(socket.id, {
        socketId: socket.id,
        userId: socket.data.user?.userId,
        role: socket.data.user?.role || "SPECTATOR",
        teamSlot: socket.data.user?.teamSlot,
        participantId: socket.data.user?.participantId,
        auctionId: socket.data.user?.auctionId || auctionId,
      });

      broadcastPresence(auctionId);

      // If an item timer is actively running for this auction, emit the exact remaining time
      // immediately to the newly joined/reconnected socket without waiting for the next 1s interval tick
      const activeTimer = activeTimers.get(auctionId);
      if (activeTimer) {
        const msRemaining = activeTimer.timerExpiry - Date.now();
        const secondsRemaining = Math.max(0, Math.ceil(msRemaining / 1000));
        socket.emit("timer_updated", {
          auctionId,
          itemId: activeTimer.itemId,
          secondsRemaining,
          timerExpiry: new Date(activeTimer.timerExpiry).toISOString(),
        });
      }
    });

    // Leave Auction Room
    socket.on("leave_auction", ({ auctionId }: { auctionId: string }) => {
      if (!auctionId) return;
      const room = `auction_${auctionId}`;
      socket.leave(room);

      if (roomPresence.has(auctionId)) {
        roomPresence.get(auctionId)!.delete(socket.id);
        broadcastPresence(auctionId);
      }
    });

    socket.on("disconnecting", () => {
      Array.from(socket.rooms).forEach((room) => {
        if (room.startsWith("auction_")) {
          const auctionId = room.replace("auction_", "");
          if (roomPresence.has(auctionId)) {
            roomPresence.get(auctionId)!.delete(socket.id);
            broadcastPresence(auctionId);
          }
        }
      });
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  const io = global.ioServer;
  if (!io) {
    throw new Error("Socket.IO server has not been initialized yet");
  }
  return io;
}

export function setMockIO(mockIo: any) {
  global.ioServer = mockIo;
}

// Timer Management Helpers
export function startItemTimer(
  auctionId: string,
  itemId: string,
  durationSeconds: number = 15,
  onExpire?: () => void
) {
  // Clear any existing timer for this auction
  stopItemTimer(auctionId);

  const timerExpiry = Date.now() + durationSeconds * 1000;
  const room = `auction_${auctionId}`;

  const intervalId = setInterval(async () => {
    const now = Date.now();
    const currentTimer = activeTimers.get(auctionId);
    if (!currentTimer) {
      clearInterval(intervalId);
      return;
    }

    const msRemaining = currentTimer.timerExpiry - now;
    const secondsRemaining = Math.max(0, Math.ceil(msRemaining / 1000));
    const io = global.ioServer;

    if (io) {
      io.to(room).emit("timer_updated", {
        auctionId,
        itemId: currentTimer.itemId,
        secondsRemaining,
        timerExpiry: new Date(currentTimer.timerExpiry).toISOString(),
      });
    }

    if (secondsRemaining <= 0) {
      stopItemTimer(auctionId);
      if (onExpire) {
        onExpire();
      }
      // Server-authoritative auto-finalization on timeout
      try {
        await finalizeOrUnsoldLot(auctionId, itemId);
      } catch (err) {
        console.error(`Failed to auto-finalize lot ${itemId} for auction ${auctionId}:`, err);
      }
    }
  }, 1000);

  activeTimers.set(auctionId, {
    auctionId,
    itemId,
    timerExpiry,
    intervalId,
  });

  // Emit immediate initial timer tick
  const io = global.ioServer;
  if (io) {
    io.to(room).emit("timer_updated", {
      auctionId,
      itemId,
      secondsRemaining: durationSeconds,
      timerExpiry: new Date(timerExpiry).toISOString(),
    });
  }
}

export function extendItemTimer(auctionId: string, extensionSeconds: number): number | null {
  const currentTimer = activeTimers.get(auctionId);
  if (!currentTimer) return null;

  currentTimer.timerExpiry = currentTimer.timerExpiry + extensionSeconds * 1000;
  const msRemaining = currentTimer.timerExpiry - Date.now();
  const secondsRemaining = Math.max(0, Math.ceil(msRemaining / 1000));
  const room = `auction_${auctionId}`;
  const io = global.ioServer;

  if (io) {
    io.to(room).emit("timer_updated", {
      auctionId,
      itemId: currentTimer.itemId,
      secondsRemaining,
      timerExpiry: new Date(currentTimer.timerExpiry).toISOString(),
    });
  }

  return secondsRemaining;
}

/**
 * Authoritatively resets the bidding countdown timer to exactly resetSeconds (default 15s)
 * on every accepted bid:
 * - Resets timerExpiry to Date.now() + resetSeconds * 1000
 * - Broadcasts timer_updated immediately to all clients in the auction room
 */
export function handleBidTimer(
  auctionId: string,
  itemId: string,
  resetSeconds: number = 15,
  onExpire?: () => void
): { secondsRemaining: number; timerExpiry: string } {
  const currentTimer = activeTimers.get(auctionId);
  const now = Date.now();
  const resetDuration = resetSeconds || 15;
  const newExpiry = now + resetDuration * 1000;
  const timerExpiryIso = new Date(newExpiry).toISOString();
  const room = `auction_${auctionId}`;
  const io = global.ioServer;

  if (currentTimer && currentTimer.itemId === itemId) {
    currentTimer.timerExpiry = newExpiry;

    if (io) {
      io.to(room).emit("timer_updated", {
        auctionId,
        itemId,
        secondsRemaining: resetDuration,
        timerExpiry: timerExpiryIso,
      });
    }

    return {
      secondsRemaining: resetDuration,
      timerExpiry: timerExpiryIso,
    };
  } else {
    // Start fresh rolling timer for this item if not already running
    startItemTimer(auctionId, itemId, resetDuration, onExpire);
    return {
      secondsRemaining: resetDuration,
      timerExpiry: timerExpiryIso,
    };
  }
}

export function stopItemTimer(auctionId: string) {
  const existing = activeTimers.get(auctionId);
  if (existing) {
    clearInterval(existing.intervalId);
    activeTimers.delete(auctionId);
  }
}

export function getRemainingTimerSeconds(auctionId: string): number | null {
  const currentTimer = activeTimers.get(auctionId);
  if (!currentTimer) return null;
  const msRemaining = currentTimer.timerExpiry - Date.now();
  return Math.max(0, Math.ceil(msRemaining / 1000));
}
