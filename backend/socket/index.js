import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Match from '../models/Match.js';
import { getOrCreateConfig } from '../controllers/appConfigController.js';
import { isAllowedOrigin } from '../utils/originUtils.js';

let io = null;

// userId -> Set of connected socket ids (a user can have multiple tabs/devices open)
const onlineUsers = new Map();

// userId -> when their current session started (first tab connected), used to
// accumulate totalActiveMinutes/sessionCount for the discovery ranking algorithm.
const sessionStartTimes = new Map();

const userRoom = (userId) => `user:${userId}`;

// High-speed targeted presence notification: only notify active matches instead of broadcasting to all 20,000+ users
const notifyMatchesPresence = async (userId, event, data) => {
  if (!io || !userId) return;
  try {
    const activeMatches = await Match.find({
      $or: [{ user1: userId }, { user2: userId }],
      status: 'accepted',
    }).select('user1 user2').lean();

    activeMatches.forEach((m) => {
      const u1 = String(m.user1);
      const partnerId = u1 === String(userId) ? String(m.user2) : u1;
      io.to(userRoom(partnerId)).emit(event, data);
    });
  } catch (err) {
    // Best-effort non-blocking notification
  }
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    },
    // Performance tuning for 20,000+ concurrent connections
    pingTimeout: 30000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });

  io.use(async (socket, next) => {
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication required'));
    }

    if (typeof token === 'string' && token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('isBanned isActive isPaused');
      if (!user || user.isBanned || (user.isActive === false && !user.isPaused)) {
        return next(new Error('Account is banned or inactive'));
      }
      socket.userId = decoded.id;
      next();
    } catch (err) {
      console.error('Socket auth failed:', err.message);
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket;
    socket.join(userRoom(userId));

    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // First connection for this user — tell ONLY their matches they're online (O(K) instead of O(N))
    if (onlineUsers.get(userId).size === 1) {
      sessionStartTimes.set(userId, Date.now());
      notifyMatchesPresence(userId, 'presence:online', { userId });
    }

    // Check if maintenance mode is currently active using in-memory cached config
    getOrCreateConfig().then((cfg) => {
      if (cfg && cfg.maintenanceMode) {
        socket.emit('system:maintenance_mode', {
          active: true,
          message: 'The app is temporarily down for maintenance. Please check back soon.',
        });
      }
    }).catch(() => {});

    socket.on('typing', ({ receiverId, isTyping }) => {
      if (!receiverId) return;
      io.to(userRoom(receiverId)).emit('typing', { senderId: userId, isTyping: !!isTyping });
    });

    socket.on('message:read', ({ senderId }) => {
      if (!senderId) return;
      io.to(userRoom(senderId)).emit('message:read', { readBy: userId });
    });

    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);

          const sessionStart = sessionStartTimes.get(userId);
          sessionStartTimes.delete(userId);
          const sessionMinutes = sessionStart ? Math.max((Date.now() - sessionStart) / 60000, 0) : 0;

          try {
            await User.findByIdAndUpdate(userId, {
              $set: { lastSeen: new Date() },
              ...(sessionMinutes > 0
                ? { $inc: { totalActiveMinutes: sessionMinutes, sessionCount: 1 } }
                : {}),
            });
          } catch {
            // Best-effort — a failed lastSeen write shouldn't crash the socket server.
          }
          // Targeted offline notification to active matches only
          notifyMatchesPresence(userId, 'presence:offline', { userId, lastSeen: new Date() });
        }
      }
    });
  });

  return io;
};

export const getIO = () => io;

export const isUserOnline = (userId) => onlineUsers.has(String(userId));

// Fire-and-forget push to every socket a user has open; safe to call before the
// socket server exists (e.g. in tests) since it just no-ops.
export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(userRoom(userId)).emit(event, payload);
};

// Force-closes any live sockets a user has open, so a ban takes effect immediately
// instead of waiting for their token to expire or for them to reconnect.
export const disconnectUser = (userId) => {
  if (!io || !userId) return;
  io.in(userRoom(userId)).disconnectSockets(true);
};

// Broadcasts real-time maintenance mode toggle to all connected client sockets
export const broadcastMaintenanceMode = (active, message) => {
  if (!io) return;
  io.emit('system:maintenance_mode', {
    active: !!active,
    message: message || 'The app is temporarily down for maintenance. Please check back soon.',
  });
};
