import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

const onlineUsers = new Map<string, { socketId: string; userId: string; name: string; connectedAt: Date }>();

export function getIO(): SocketIOServer | null {
  return io;
}

export function getOnlineUsers(): Map<string, { socketId: string; userId: string; name: string; connectedAt: Date }> {
  return onlineUsers;
}

export function initSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/api/socket",
  });

  io.on("connection", (socket) => {
    console.log("[Socket.io] Client connected:", socket.id);

    socket.on("user:online", (data: { userId: string; name: string }) => {
      onlineUsers.set(data.userId, {
        socketId: socket.id,
        userId: data.userId,
        name: data.name,
        connectedAt: new Date(),
      });

      io?.emit("users:status", {
        onlineUserIds: Array.from(onlineUsers.keys()),
      });
    });

    socket.on("timer:start", (data: { userId: string; projectId?: string }) => {
      io?.emit("timer:started", data);
    });

    socket.on("timer:stop", (data: { userId: string; entryId: string }) => {
      io?.emit("timer:stopped", data);
    });

    socket.on("screenshot:captured", (data: { userId: string; screenshotId: string }) => {
      io?.emit("screenshot:new", data);
    });

    socket.on("disconnect", () => {
      // Find and remove the disconnected user
      for (const [userId, userData] of onlineUsers.entries()) {
        if (userData.socketId === socket.id) {
          onlineUsers.delete(userId);
          break;
        }
      }

      io?.emit("users:status", {
        onlineUserIds: Array.from(onlineUsers.keys()),
      });

      console.log("[Socket.io] Client disconnected:", socket.id);
    });
  });

  return io;
}
