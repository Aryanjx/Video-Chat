import React, { useState } from 'react';

const REACTIONS = ['👍', '❤️', '😂', '😮', '👏', '🎉'];

export default function ControlsBar({
  isMuted,
  isVideoOff,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onToggleScreen,
  onLeave,
  onReaction,
  onCopyId,
}) {
  const [showReactions, setShowReactions] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopyId();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReaction = (r) => {
    onReaction(r);
    setShowReactions(false);
  };

  return (
    <>
      {showReactions && (
        <div className="reaction-popup">
          {REACTIONS.map((r) => (
            <button key={r} className="reaction-btn" onClick={() => handleReaction(r)}>
              {r}
            </button>
          ))}
        </div>
      )}

      <div className="controls-bar">
        {/* Audio */}
        <button
          className={`ctrl-btn ${isMuted ? 'off' : ''}`}
          onClick={onToggleAudio}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🎤'}
          <span className="ctrl-label">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        {/* Video */}
        <button
          className={`ctrl-btn ${isVideoOff ? 'off' : ''}`}
          onClick={onToggleVideo}
          title={isVideoOff ? 'Start Video' : 'Stop Video'}
        >
          {isVideoOff ? '🚫' : '📹'}
          <span className="ctrl-label">{isVideoOff ? 'Start Vid' : 'Stop Vid'}</span>
        </button>

        {/* Screen Share */}
        <button
          className={`ctrl-btn ${isScreenSharing ? 'active' : ''}`}
          onClick={onToggleScreen}
          title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
        >
          🖥️
          <span className="ctrl-label">{isScreenSharing ? 'Sharing' : 'Share'}</span>
        </button>

        {/* Reactions */}
        <button
          className={`ctrl-btn ${showReactions ? 'active' : ''}`}
          onClick={() => setShowReactions((v) => !v)}
          title="Reactions"
        >
          😊
          <span className="ctrl-label">React</span>
        </button>

        {/* Copy Link */}
        <button className="ctrl-btn" onClick={handleCopy} title="Copy meeting ID">
          {copied ? '✅' : '🔗'}
          <span className="ctrl-label">{copied ? 'Copied!' : 'Copy ID'}</span>
        </button>

        <div className="ctrl-spacer" />

        {/* End / Leave */}
        <button className="ctrl-btn end-call" onClick={onLeave} title="Leave meeting">
          📵
          <span className="ctrl-label">Leave</span>
        </button>
      </div>
    </>
  );
}
