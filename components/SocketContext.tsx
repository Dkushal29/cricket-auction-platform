"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  spectatorCount: number;
  onlineUserIds: string[];
  hasAuctioneer: boolean;
  lastEventTime: number;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  spectatorCount: 0,
  onlineUserIds: [],
  hasAuctioneer: false,
  lastEventTime: 0,
});

export function SocketProvider({
  auctionId,
  children,
  onEvent,
}: {
  auctionId: string;
  children: React.ReactNode;
  onEvent?: (eventName: string, data: any) => void;
}) {
  const { token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [spectatorCount, setSpectatorCount] = useState(1);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [hasAuctioneer, setHasAuctioneer] = useState(false);
  const [lastEventTime, setLastEventTime] = useState(Date.now());
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      setConnected(true);
      socketInstance.emit("join_auction", { auctionId });
      // Request fresh authoritative state on reconnect
      if (onEventRef.current) {
        onEventRef.current("reconnected_sync", { auctionId });
      }
    });

    socketInstance.on("disconnect", () => {
      setConnected(false);
    });

    socketInstance.on("spectator_count_updated", ({ count }) => {
      setSpectatorCount(count);
    });

    socketInstance.on("presence_updated", (data: any) => {
      if (data.spectatorCount !== undefined) setSpectatorCount(data.spectatorCount);
      if (data.connectedUserIds) setOnlineUserIds(data.connectedUserIds);
      if (data.hasAuctioneer !== undefined) setHasAuctioneer(data.hasAuctioneer);
      if (onEventRef.current) {
        onEventRef.current("presence_updated", data);
      }
    });

    const events = [
      "auction_started",
      "auction_paused",
      "auction_resumed",
      "auction_completed",
      "auction_cancelled",
      "player_started",
      "player_sold",
      "player_unsold",
      "player_undo_finalized",
      "bid_placed",
      "bid_rejected",
      "timer_updated",
      "participant_updated",
      "presence_updated",
    ];

    events.forEach((ev) => {
      socketInstance.on(ev, (data: any) => {
        setLastEventTime(Date.now());
        if (onEventRef.current) {
          onEventRef.current(ev, data);
        }
      });
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.emit("leave_auction", { auctionId });
      socketInstance.disconnect();
    };
  }, [auctionId, token]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        spectatorCount,
        onlineUserIds,
        hasAuctioneer,
        lastEventTime,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useAuctionSocket() {
  return useContext(SocketContext);
}
