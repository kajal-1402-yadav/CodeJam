# 🚀 CodeJam: Real-time Collaborative Code Editor

CodeJam is a **collaborative, real-time code editor and interview workspace**. It provides a browser-based IDE with live collaboration, chat, file management, and code execution so teams and interviewers can work together seamlessly on coding problems.

---

## ✨ Key Features

* **Real-time collaborative editing** and presence (multiple users in a room).
* **Chat** functionality and invitations to collaborate.
* **File explorer** and tabbed editor UI.
* **Integrated terminal** and **code execution** (server-side).
* User **authentication** and room management.

---

## 📂 Repository Structure

| Directory | Description | Technologies |
| :--- | :--- | :--- |
| `client/` | Frontend application | **React** + **Vite** + **Tailwind** |
| `server/` | Backend API and WebSocket server | **Node.js** + **Express** + **Socket.IO** |

---

## 🖼️ Screenshots

| Homepage | Dashboard | Room Editor |
| :---: | :---: | :---: |
| ![Homepage](docs/screenshots/Homepage.png) | ![Dashboard](docs/screenshots/Dashboard.png) | ![Room Editor](docs/screenshots/RoomEditor.png) |

---

## 🛠️ Getting Started

### Prerequisites

* **Node.js** (v16+ recommended)
* `npm` or `Yarn`

### Quick Start (Development)

1.  **Clone the repository:**
    ```powershell
    git clone [https://github.com/kajal-1402-yadav/CodeJam.git](https://github.com/kajal-1402-yadav/CodeJam.git)
    cd CodeJam
    ```

2.  **Install and run the server** (Backend):
    ```powershell
    cd server
    npm install
    npm run dev
    ```
    > **Note:** The server API runs by default on `http://localhost:3000` (or another port if configured).

3.  **Install and run the client** (Frontend - *in a new terminal*):
    ```powershell
    cd client
    npm install
    npm run dev
    ```
    > **Access:** Open the app in your browser at the address shown by the client dev server (usually `http://localhost:5173`).
