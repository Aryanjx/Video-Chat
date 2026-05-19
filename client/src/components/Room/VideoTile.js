import React, { useEffect, useRef } from 'react';

export default function VideoTile({ videoRef, stream, name, isMuted, isVideoOff, isLocal }) {
  const internalRef = useRef(null);
  const ref = videoRef || internalRef;

  useEffect(() => {
    if (stream && ref.current) {
      ref.current.srcObject = stream;
    }
  }, [stream, ref]);

  const initials = name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`video-tile ${isLocal ? 'local' : ''}`}>
      {isVideoOff ? (
        <div className="video-off-placeholder">
          <div className="video-avatar">{initials}</div>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{name}</span>
        </div>
      ) : (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={isLocal}
        />
      )}

      <div className="video-tile-overlay">
        <div className="tile-name">
          {isLocal && <span style={{ fontSize: 10, color: 'var(--accent)' }}>YOU</span>}
          {name}
        </div>
        <div className="tile-icons">
          {isMuted && <div className="tile-icon" title="Muted">🔇</div>}
          {isVideoOff && <div className="tile-icon" title="Camera off">📷</div>}
        </div>
      </div>
    </div>
  );
}
