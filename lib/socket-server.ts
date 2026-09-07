import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { prisma } from "./prisma";
import { verifyToken } from "./auth";
import { verifyGuestToken } from "./guest-session";

let io: SocketIOServer | null = null;

// Track active countdown timers per auction
interface AuctionTimerState {
  auctionId: string;
  itemId: string;
  timerExpiry: number; // unix timestamp ms
  intervalId: NodeJS.Timeout;
}

const activeTimers: Map<string, AuctionTimerState> = new Map();

// Presence tracking per auction room: Map<auctionId, Set<socketId with metadata>>
interface SocketMetadata {
  socketId: string;
  userId?: string;
  role?: string;
}

const roomPresence: Map<string, Map<string, SocketMetadata>> = new Map();

function broadcastPresence(auctionId: string) {
  if (!io) return;
  const room = `auction_${auctionId}`;
  const socketsMap = roomPresence.get(auctionId);
  const totalCount = socketsMap ? socketsMap.size : 0;

  const connectedUsers = socketsMap ? Array.from(socketsMap.values()) : [];
  const hasAuctioneer = connectedUsers.some((u) => u.role === "AUCTIONEER");
  const connectedUserIds = connectedUsers.map((u) => u.userId).filter(Boolean);

  io.to(room).emit("presence_updated", {
    auctionId,
    spectatorCount: totalCount,
    hasAuctioneer,
    connectedUserIds,
  });
  io.to(room).emit("spectator_count_updated", { auctionId, count: totalCount });
}

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "*",
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

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
  if (!io) {
    throw new Error("Socket.IO server has not been initialized yet");
  }
  return io;
}

// Timer Management Helpers
export function startItemTimer(
  auctionId: string,
  itemId: string,
  durationSeconds: number,
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

    if (io) {
      io.to(room).emit("timer_updated", {
        auctionId,
        itemId,
        secondsRemaining,
        timerExpiry: new Date(currentTimer.timerExpiry).toISOString(),
      });
    }

    if (secondsRemaining <= 0) {
      stopItemTimer(auctionId);
      if (onExpire) onExpire();
    }
  }, 1000);

  activeTimers.set(auctionId, {
    auctionId,
    itemId,
    timerExpiry,
    intervalId,
  });

  // Emit immediate initial timer tick
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
