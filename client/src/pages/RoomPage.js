import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import VideoTile from '../components/Room/VideoTile';
import ChatPanel from '../components/Room/ChatPanel';
import ParticipantsPanel from '../components/Room/ParticipantsPanel';
import ControlsBar from '../components/Room/ControlsBar';

export default function RoomPage() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [sidebarTab, setSidebarTab] = useState('chat'); // 'chat' | 'participants'
  const [messages, setMessages] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  const timerRef = useRef(null);

  const {
    localVideoRef,
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
  } = useWebRTC({ socket, roomId, userId: user?._id, userName: user?.name });

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    const init = async () => {
      try {
        await startLocalStream();
        socket.emit('join-room', {
          roomId,
          userId: user._id,
          userName: user.name,
        });
        setJoined(true);
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      } catch (err) {
        setError('Could not access camera/microphone. Please check permissions.');
      }
    };

    init();

    return () => {
      clearInterval(timerRef.current);
      socket.emit('leave-room', { roomId });
      cleanup();
    };
  }, [socket, user, roomId]); // eslint-disable-line

  // ─── Chat ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.on('receive-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('receive-reaction', ({ reaction, userName, socketId }) => {
      const id = Date.now();
      const x = Math.random() * 60 + 20;
      setReactions((prev) => [...prev, { id, reaction, x }]);
      setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2600);
    });

    return () => {
      socket.off('receive-message');
      socket.off('receive-reaction');
    };
  }, [socket]);

  const sendMessage = useCallback(
    (text) => {
      if (!text.trim() || !socket) return;
      socket.emit('send-message', {
        roomId,
        message: text,
        sender: user.name,
        senderId: user._id,
      });
    },
    [socket, roomId, user]
  );

  const sendReaction = useCallback(
    (reaction) => {
      socket?.emit('send-reaction', { roomId, reaction, userName: user.name });
    },
    [socket, roomId, user]
  );

  const handleLeave = () => {
    socket?.emit('leave-room', { roomId });
    cleanup();
    navigate('/');
  };

  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
  };

  const totalCount = remoteStreams.length + 1;

  if (error) {
    return (
      <div className="loading-screen" style={{ flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 48 }}>🎥</div>
        <p style={{ color: 'var(--danger)', fontSize: 16 }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="room-page">
      {/* Floating Reactions */}
      {reactions.map((r) => (
        <div
          key={r.id}
          className="floating-reaction"
          style={{ left: `${r.x}%`, bottom: 120 }}
        >
          {r.reaction}
        </div>
      ))}

      {/* Header */}
      <div className="room-header">
        <div className="room-title">
          📹 {user?.name}'s Meeting
          <span className="room-id-badge" title="Click to copy" onClick={copyRoomId} style={{ cursor: 'pointer' }}>
            {roomId}
          </span>
        </div>
        <div className="room-timer">⏱ {formatTime(elapsed)}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          {totalCount} participant{totalCount !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Body */}
      <div className="room-body">
        {/* Video Grid */}
        <div className="video-grid-container">
          <div
            className={`video-grid ${
              totalCount === 1
                ? 'count-1'
                : totalCount === 2
                ? 'count-2'
                : totalCount <= 4
                ? 'count-3'
                : 'count-many'
            }`}
          >
            {/* Local video */}
            <VideoTile
              videoRef={localVideoRef}
              name={`${user?.name} (You)`}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              isLocal
            />

            {/* Remote videos */}
            {remoteStreams.map(({ socketId, stream }) => {
              const participant = participants.find((p) => p.socketId === socketId);
              return (
                <VideoTile
                  key={socketId}
                  stream={stream}
                  name={participant?.userName || 'Participant'}
                  isMuted={participant?.isMuted}
                  isVideoOff={participant?.isVideoOff}
                />
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div className="room-sidebar">
          <div className="sidebar-tabs">
            <button
              className={`sidebar-tab ${sidebarTab === 'chat' ? 'active' : ''}`}
              onClick={() => setSidebarTab('chat')}
            >
              💬 Chat
            </button>
            <button
              className={`sidebar-tab ${sidebarTab === 'participants' ? 'active' : ''}`}
              onClick={() => setSidebarTab('participants')}
            >
              👥 People ({totalCount})
            </button>
          </div>

          {sidebarTab === 'chat' ? (
            <ChatPanel
              messages={messages}
              onSend={sendMessage}
              currentUserId={user?._id}
            />
          ) : (
            <ParticipantsPanel
              participants={participants}
              localUser={{ name: user?.name, isMuted, isVideoOff }}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <ControlsBar
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onToggleScreen={toggleScreenShare}
        onLeave={handleLeave}
        onReaction={sendReaction}
        onCopyId={copyRoomId}
      />
    </div>
  );
}
