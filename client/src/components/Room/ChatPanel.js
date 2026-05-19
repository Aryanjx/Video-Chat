import React, { useState, useEffect, useRef } from 'react';

export default function ChatPanel({ messages, onSend, currentUserId }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <div className="sidebar-content">
        <div className="chat-messages">
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 32 }}>
              No messages yet.<br />Say hi! 👋
            </div>
          )}
          {messages.map((msg, i) => {
            const isOwn = msg.senderId === currentUserId;
            return (
              <div key={i} className={`chat-message ${isOwn ? 'own' : ''}`}>
                <div className="chat-message-header">
                  <span className="chat-sender">{isOwn ? 'You' : msg.sender}</span>
                  <span className="chat-time">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="chat-text">{msg.message}</div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="chat-input-area">
        <textarea
          className="chat-input"
          rows={2}
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
        />
        <button className="chat-send-btn" onClick={handleSend} title="Send">
          ➤
        </button>
      </div>
    </>
  );
}
