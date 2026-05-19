import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await axios.get('/api/meetings/history/all');
      setMeetings(res.data);
    } catch (e) {}
  };

  const handleNewMeeting = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await axios.post('/api/meetings/create', {
        title: `${user.name}'s Meeting`,
      });
      navigate(`/room/${res.data.meetingId}`);
    } catch (e) {
      setError('Could not create meeting. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    const id = joinId.trim().toUpperCase();
    try {
      await axios.get(`/api/meetings/${id}`);
      navigate(`/room/${id}`);
    } catch (e) {
      setError(e.response?.data?.message || 'Meeting not found or has ended.');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="home-page">
      <nav className="navbar">
        <div className="nav-logo">
          <div className="nav-logo-icon">📹</div>
          ZoomClone
        </div>
        <div className="nav-actions">
          <div className="nav-user">
            <div className="nav-avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <span>{user?.name}</span>
          </div>
          <button className="btn btn-secondary" onClick={logout} style={{ padding: '8px 16px', fontSize: '13px' }}>
            Sign out
          </button>
        </div>
      </nav>

      <div className="home-content">
        <div className="home-hero">
          <h1>Video meetings for everyone</h1>
          <p>Secure, reliable video calls. Start or join a meeting in seconds.</p>
        </div>

        {error && <div className="error-msg" style={{ maxWidth: 600, margin: '0 auto 24px' }}>{error}</div>}

        <div className="meeting-actions">
          <div className="action-card">
            <div className="action-icon blue">🎥</div>
            <h3>New Meeting</h3>
            <p>Start an instant meeting and invite others to join.</p>
            <button className="btn btn-primary" onClick={handleNewMeeting} disabled={creating}>
              {creating ? 'Creating...' : '+ New Meeting'}
            </button>
          </div>

          <div className="action-card">
            <div className="action-icon green">🔗</div>
            <h3>Join Meeting</h3>
            <p>Enter a meeting ID to join an existing session.</p>
            <form onSubmit={handleJoin}>
              <div className="join-form">
                <input
                  className="form-input"
                  placeholder="MEETING ID"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <button className="btn btn-secondary" type="submit" style={{ whiteSpace: 'nowrap' }}>
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>

        {meetings.length > 0 && (
          <div>
            <div className="section-title">
              📋 Recent Meetings
            </div>
            <div className="history-grid">
              {meetings.map((m) => (
                <div className="history-item" key={m._id}>
                  <div className="history-info">
                    <h4>{m.title}</h4>
                    <div className="history-meta">
                      <span>ID: {m.meetingId}</span>
                      <span>{formatDate(m.startedAt)}</span>
                      <span>{m.participants?.length || 0} participant(s)</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className={`badge ${m.isActive ? 'badge-active' : 'badge-ended'}`}>
                      {m.isActive ? 'Active' : 'Ended'}
                    </span>
                    {m.isActive && (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 14px', fontSize: '13px' }}
                        onClick={() => navigate(`/room/${m.meetingId}`)}
                      >
                        Rejoin
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
