# CodeJam

CodeJam is a collaborative, real-time code editor and interview workspace. It provides a browser-based IDE with live collaboration, chat, file management, and code execution so teams and interviewers can work together on coding problems.

**Key features**
- Real-time collaborative editing and presence (multiple users in a room)
- Chat and invitations to collaborate
- File explorer and tabbed editor UI
- Integrated terminal and code execution (server-side)
- User authentication and room management

**Repository structure**
- `client/` — Frontend application (React + Vite + Tailwind)
- `server/` — Backend API and WebSocket server (Node.js + Express + Socket.IO)

Screenshots
-----------
Homepage
![Homepage](docs/screenshots/Homepage.png)

Dashboard
![Dashboard](docs/screenshots/Dashboard.png)

Room Editor
![Room Editor](docs/screenshots/RoomEditor.png)



Getting started
---------------

Prerequisites
 - Node.js (v16+ recommended)
 - npm or Yarn

Quick start (development)
1. Clone the repo

```powershell
git clone https://github.com/kajal-1402-yadav/CodeJam.git
cd CodeJam
```

2. Install and run the server

```powershell
cd server
npm install
npm run dev
```

3. Install and run the client (in a new terminal)

```powershell
cd client
npm install
npm run dev
```

Open the app in your browser at the address shown by the client dev server (usually `http://localhost:5173`). The server API runs by default on `http://localhost:3000` (or another port if configured).

