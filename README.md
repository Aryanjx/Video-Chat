# 📹 ZoomClone — MERN Stack Video Conferencing App

A full-featured Zoom-like video conferencing application built with the MERN stack (MongoDB, Express, React, Node.js) and WebRTC for real-time peer-to-peer video/audio.

---

## ✨ Features

- 🔐 **Authentication** — Register / Login with JWT tokens
- 🎥 **Video Calls** — Real-time P2P video & audio via WebRTC
- 🖥️ **Screen Sharing** — Share your screen with all participants
- 💬 **In-Room Chat** — Real-time chat saved to MongoDB
- 👥 **Participants Panel** — See who's in the call, their mute/video status
- 😊 **Reactions** — Send floating emoji reactions
- 🔇 **Media Controls** — Mute/unmute mic, toggle camera
- 📋 **Meeting History** — View your past meetings
- 🔗 **Shareable Meeting IDs** — Copy & share an 8-character ID
- ⏱️ **Meeting Timer** — Live duration counter

---

## 🗂️ Project Structure

```
zoom-clone/
├── package.json                 ← root (concurrently)
├── README.md
│
├── server/                      ← Express + Socket.IO backend
│   ├── index.js
│   ├── .env
│   ├── package.json
│   ├── models/
│   │   ├── User.js
│   │   └── Meeting.js
│   ├── routes/
│   │   ├── auth.js
│   │   └── meetings.js
│   ├── middleware/
│   │   └── auth.js
│   └── socket/
│       └── socketHandlers.js
│
└── client/                      ← React frontend
    ├── package.json
    ├── public/index.html
    └── src/
        ├── App.js
        ├── App.css
        ├── index.js
        ├── context/
        │   ├── AuthContext.js
        │   └── SocketContext.js
        ├── hooks/
        │   └── useWebRTC.js
        ├── pages/
        │   ├── LoginPage.js
        │   ├── RegisterPage.js
        │   ├── HomePage.js
        │   └── RoomPage.js
        └── components/Room/
            ├── VideoTile.js
            ├── ChatPanel.js
            ├── ParticipantsPanel.js
            └── ControlsBar.js
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))
- A modern browser (Chrome/Edge recommended for WebRTC)

### 1. Clone / Download the project

```bash
# If using git:
git clone <your-repo-url>
cd zoom-clone

# Or just unzip and open the folder in VS Code
```

### 2. Install dependencies

```bash
npm run install-all
```

This installs dependencies for the root, server, and client simultaneously.

### 3. Configure environment

Edit `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/zoom-clone
JWT_SECRET=change_this_to_a_long_random_string
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

> For MongoDB Atlas, replace `MONGO_URI` with your Atlas connection string.

### 4. Start the app

```bash
npm run dev
```

This starts both the backend (port 5000) and frontend (port 3000) concurrently.

Open **http://localhost:3000** in your browser.

---

## 🔧 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both server and client |
| `npm run server` | Start backend only |
| `npm run client` | Start frontend only |
| `npm run build` | Build client for production |
| `npm run install-all` | Install all dependencies |

---

## 🌐 How It Works

### WebRTC Signaling Flow

```
User A joins room → Socket emits "join-room"
Server sends A the list of existing participants
A creates RTCPeerConnection for each existing participant
A sends "offer" to each via Socket.IO
Each participant receives offer → sends back "answer"
ICE candidates exchanged → P2P connection established
Video/audio streams flow directly between browsers
```

### Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router 6 |
| Styling | Custom CSS with CSS Variables |
| Real-time | Socket.IO (signaling) + WebRTC (media) |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |

---

## 🛡️ Security Notes

- Change `JWT_SECRET` in production to a long random string
- Use HTTPS in production (required for WebRTC getUserMedia)
- Add rate limiting for production (e.g. `express-rate-limit`)
- Consider adding TURN servers for NAT traversal in production

### TURN Server (for production)

In `client/src/hooks/useWebRTC.js`, update `ICE_SERVERS`:

```js
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:your-turn-server.com:3478',
      username: 'your-username',
      credential: 'your-password',
    },
  ],
};
```

Free TURN options: [Metered](https://www.metered.ca/tools/openrelay/), [Xirsys](https://xirsys.com/)

---

## 📱 Browser Support

| Browser | Status |
|---|---|
| Chrome / Edge | ✅ Full support |
| Firefox | ✅ Full support |
| Safari | ⚠️ Works, some WebRTC quirks |
| Mobile Chrome | ✅ Supported |

---

## 🤝 Contributing

Feel free to open issues and submit PRs!

---

## 📄 License

MIT
