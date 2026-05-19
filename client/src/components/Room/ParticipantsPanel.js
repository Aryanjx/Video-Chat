import React from 'react';

export default function ParticipantsPanel({ participants, localUser }) {
  const allPeople = [
    { socketId: 'local', userName: localUser?.name, isMuted: localUser?.isMuted, isVideoOff: localUser?.isVideoOff, isLocal: true },
    ...participants,
  ];

  return (
    <div className="sidebar-content">
      {allPeople.map((p) => (
        <div key={p.socketId} className="participant-item">
          <div className="participant-avatar">
            {p.userName?.[0]?.toUpperCase()}
          </div>
          <div className="participant-info">
            <div className="participant-name">
              {p.userName}
              {p.isLocal && (
                <span style={{ fontSize: 11, color: 'var(--accent)', marginLeft: 6 }}>(You)</span>
              )}
            </div>
            <div className="participant-status">
              {p.isMuted ? 'Muted' : 'Unmuted'} · {p.isVideoOff ? 'Video off' : 'Video on'}
            </div>
          </div>
          <div className="participant-icons">
            {p.isMuted && <span title="Muted">🔇</span>}
            {p.isVideoOff && <span title="Video off">📷</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
