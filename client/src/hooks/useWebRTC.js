import { useEffect, useRef, useState, useCallback } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useWebRTC = ({ socket, roomId, userId, userName }) => {
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef({});
  const screenStreamRef = useRef(null);

  const [remoteStreams, setRemoteStreams] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);

  // ─── Start local stream ────────────────────────────────────────────────────
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Error accessing media devices:', err);
      throw err;
    }
  }, []);

  // ─── Create peer connection ────────────────────────────────────────────────
  const createPeerConnection = useCallback(
    (targetSocketId) => {
      if (peerConnections.current[targetSocketId]) {
        return peerConnections.current[targetSocketId];
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      // Add local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          pc.addTrack(track, localStreamRef.current);
        });
      }

      // Handle remote track
      pc.ontrack = (event) => {
        const [remoteStream] = event.streams;
        setRemoteStreams((prev) => {
          const exists = prev.find((s) => s.socketId === targetSocketId);
          if (exists) {
            return prev.map((s) =>
              s.socketId === targetSocketId ? { ...s, stream: remoteStream } : s
            );
          }
          return [...prev, { socketId: targetSocketId, stream: remoteStream }];
        });
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            targetSocketId,
            candidate: event.candidate,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === 'disconnected' ||
          pc.connectionState === 'failed' ||
          pc.connectionState === 'closed'
        ) {
          setRemoteStreams((prev) => prev.filter((s) => s.socketId !== targetSocketId));
        }
      };

      peerConnections.current[targetSocketId] = pc;
      return pc;
    },
    [socket]
  );

  // ─── Make offer (caller) ───────────────────────────────────────────────────
  const makeOffer = useCallback(
    async (targetSocketId) => {
      const pc = createPeerConnection(targetSocketId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { targetSocketId, offer, fromSocketId: socket.id });
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    },
    [createPeerConnection, socket]
  );

  // ─── Socket event handlers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleExistingParticipants = (participants) => {
      participants.forEach(({ socketId }) => {
        makeOffer(socketId);
      });
    };

    const handleUserJoined = ({ socketId, userName: newUserName }) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.socketId === socketId)) return prev;
        return [...prev, { socketId, userName: newUserName, isMuted: false, isVideoOff: false }];
      });
    };

    const handleOffer = async ({ offer, fromSocketId }) => {
      const pc = createPeerConnection(fromSocketId);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { targetSocketId: fromSocketId, answer });
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    };

    const handleAnswer = async ({ answer, fromSocketId }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    };

    const handleIceCandidate = async ({ candidate, fromSocketId }) => {
      const pc = peerConnections.current[fromSocketId];
      if (pc && candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    };

    const handleUserLeft = ({ socketId, userName: leftUser }) => {
      if (peerConnections.current[socketId]) {
        peerConnections.current[socketId].close();
        delete peerConnections.current[socketId];
      }
      setRemoteStreams((prev) => prev.filter((s) => s.socketId !== socketId));
      setParticipants((prev) => prev.filter((p) => p.socketId !== socketId));
    };

    const handleParticipantsUpdated = (updatedParticipants) => {
      setParticipants(updatedParticipants.map((p) => ({
        socketId: p.socketId || p,
        userName: p.userName,
        isMuted: p.isMuted || false,
        isVideoOff: p.isVideoOff || false,
      })));
    };

    const handleUserAudioToggle = ({ socketId, isMuted }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isMuted } : p))
      );
    };

    const handleUserVideoToggle = ({ socketId, isVideoOff }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.socketId === socketId ? { ...p, isVideoOff } : p))
      );
    };

    socket.on('existing-participants', handleExistingParticipants);
    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('user-left', handleUserLeft);
    socket.on('participants-updated', handleParticipantsUpdated);
    socket.on('user-audio-toggle', handleUserAudioToggle);
    socket.on('user-video-toggle', handleUserVideoToggle);

    return () => {
      socket.off('existing-participants', handleExistingParticipants);
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('user-left', handleUserLeft);
      socket.off('participants-updated', handleParticipantsUpdated);
      socket.off('user-audio-toggle', handleUserAudioToggle);
      socket.off('user-video-toggle', handleUserVideoToggle);
    };
  }, [socket, roomId, createPeerConnection, makeOffer]);

  // ─── Toggle audio ──────────────────────────────────────────────────────────
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        const newMuted = !audioTrack.enabled;
        setIsMuted(newMuted);
        socket?.emit('toggle-audio', { roomId, isMuted: newMuted });
      }
    }
  }, [socket, roomId]);

  // ─── Toggle video ──────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        const newVideoOff = !videoTrack.enabled;
        setIsVideoOff(newVideoOff);
        socket?.emit('toggle-video', { roomId, isVideoOff: newVideoOff });
      }
    }
  }, [socket, roomId]);

  // ─── Screen share ──────────────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];

        // Replace video track in all peer connections
        Object.values(peerConnections.current).forEach((pc) => {
          const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        screenTrack.onended = () => {
          stopScreenShare();
        };

        setIsScreenSharing(true);
        socket?.emit('screen-share-started', { roomId });
      } catch (err) {
        console.error('Error starting screen share:', err);
      }
    } else {
      stopScreenShare();
    }
  }, [isScreenSharing, socket, roomId]);

  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }

    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      Object.values(peerConnections.current).forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(videoTrack);
      });
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }

    setIsScreenSharing(false);
    socket?.emit('screen-share-stopped', { roomId });
  }, [socket, roomId]);

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(peerConnections.current).forEach((pc) => pc.close());
    peerConnections.current = {};
    setRemoteStreams([]);
    setParticipants([]);
  }, []);

  return {
    localVideoRef,
    localStreamRef,
    remoteStreams,
    participants,
    isMuted,
    isVideoOff,
    isScreenSharing,
    startLocalStream,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
    cleanup,
  };
};
