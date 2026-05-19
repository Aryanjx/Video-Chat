const Meeting = require('../models/Meeting');

// Track rooms: roomId -> { socketId -> { userId, userName, peerId } }
const rooms = new Map();

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── JOIN ROOM ──────────────────────────────────────────────────────────────
    socket.on('join-room', async ({ roomId, userId, userName }) => {
      try {
        socket.join(roomId);

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Map());
        }

        const room = rooms.get(roomId);
        room.set(socket.id, { userId, userName, socketId: socket.id });

        // Notify existing peers of the new user
        socket.to(roomId).emit('user-joined', {
          socketId: socket.id,
          userId,
          userName,
        });

        // Send existing participants to the new user
        const participants = Array.from(room.entries())
          .filter(([sid]) => sid !== socket.id)
          .map(([sid, data]) => ({ socketId: sid, ...data }));

        socket.emit('existing-participants', participants);

        // Update participant list for everyone
        const allParticipants = Array.from(room.values());
        io.to(roomId).emit('participants-updated', allParticipants);

        // Update DB
        await Meeting.findOneAndUpdate(
          { meetingId: roomId },
          {
            $push: {
              participants: {
                name: userName,
                joinedAt: new Date(),
              },
            },
          }
        );

        console.log(`👤 ${userName} joined room ${roomId}. Total: ${room.size}`);
      } catch (err) {
        console.error('join-room error:', err);
      }
    });

    // ─── WEBRTC SIGNALING ────────────────────────────────────────────────────────
    socket.on('offer', ({ targetSocketId, offer, fromSocketId }) => {
      io.to(targetSocketId).emit('offer', {
        offer,
        fromSocketId: fromSocketId || socket.id,
      });
    });

    socket.on('answer', ({ targetSocketId, answer }) => {
      io.to(targetSocketId).emit('answer', {
        answer,
        fromSocketId: socket.id,
      });
    });

    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('ice-candidate', {
        candidate,
        fromSocketId: socket.id,
      });
    });

    // ─── MEDIA STATE ─────────────────────────────────────────────────────────────
    socket.on('toggle-audio', ({ roomId, isMuted }) => {
      socket.to(roomId).emit('user-audio-toggle', {
        socketId: socket.id,
        isMuted,
      });
    });

    socket.on('toggle-video', ({ roomId, isVideoOff }) => {
      socket.to(roomId).emit('user-video-toggle', {
        socketId: socket.id,
        isVideoOff,
      });
    });

    // ─── SCREEN SHARE ────────────────────────────────────────────────────────────
    socket.on('screen-share-started', ({ roomId }) => {
      socket.to(roomId).emit('user-screen-sharing', { socketId: socket.id });
    });

    socket.on('screen-share-stopped', ({ roomId }) => {
      socket.to(roomId).emit('user-stopped-screen-sharing', { socketId: socket.id });
    });

    // ─── CHAT ────────────────────────────────────────────────────────────────────
    socket.on('send-message', async ({ roomId, message, sender, senderId }) => {
      const chatMessage = {
        sender,
        senderId,
        message,
        timestamp: new Date(),
      };

      io.to(roomId).emit('receive-message', chatMessage);

      try {
        await Meeting.findOneAndUpdate(
          { meetingId: roomId },
          { $push: { chat: chatMessage } }
        );
      } catch (err) {
        console.error('Chat save error:', err);
      }
    });

    // ─── REACTIONS ───────────────────────────────────────────────────────────────
    socket.on('send-reaction', ({ roomId, reaction, userName }) => {
      io.to(roomId).emit('receive-reaction', {
        reaction,
        userName,
        socketId: socket.id,
      });
    });

    // ─── LEAVE / DISCONNECT ───────────────────────────────────────────────────────
    const handleLeave = async (socketId) => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.has(socketId)) {
          const userData = room.get(socketId);
          room.delete(socketId);

          io.to(roomId).emit('user-left', { socketId, userName: userData?.userName });

          const allParticipants = Array.from(room.values());
          io.to(roomId).emit('participants-updated', allParticipants);

          if (room.size === 0) {
            rooms.delete(roomId);
            try {
              await Meeting.findOneAndUpdate(
                { meetingId: roomId },
                { isActive: false, endedAt: new Date() }
              );
            } catch (err) {
              console.error('Meeting end error:', err);
            }
          }

          console.log(`👤 ${userData?.userName} left room ${roomId}. Remaining: ${room.size}`);
          break;
        }
      }
    };

    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId);
      handleLeave(socket.id);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      handleLeave(socket.id);
    });
  });
};

module.exports = { setupSocketHandlers };
