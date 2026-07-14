# CodeAlpha Lite - Trello Clone 🎯

A full-stack, lightweight Trello-inspired project management application built with **React**, **TypeScript**, **Express**, and **SQLite**. Organize your projects, create tasks, collaborate in real-time, and manage work efficiently with real-time updates powered by Socket.io.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Real-Time Communication](#real-time-communication)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### Core Features
- **User Authentication** - Secure sign-up and login with JWT authentication
- **Project Management** - Create, update, and delete projects with team collaboration
- **Board Organization** - Organize work using Kanban-style lists and cards
- **Task Management** - Create, assign, prioritize, and track tasks with due dates
- **Real-Time Updates** - Socket.io-powered live collaboration and notifications
- **Comments & Discussions** - Add comments to tasks for team communication
- **Notifications** - Real-time notifications for project activities
- **User Profiles** - Customizable user profiles with avatar and bio

### Security Features
- JWT-based authentication
- Password hashing with bcryptjs
- CORS enabled for secure cross-origin requests
- Database foreign key constraints

---

## 🛠 Tech Stack

### Frontend
- **React 19** - Modern UI framework with hooks
- **TypeScript 6.0** - Type-safe development
- **Vite** - Lightning-fast build tool and dev server
- **React Router** - Client-side routing
- **Socket.io Client** - Real-time communication
- **Lucide React** - Icon library
- **CSS3** - Styling and responsive design

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.io** - Real-time bidirectional communication
- **SQLite3** - Lightweight relational database
- **JWT** - Authentication token management
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin request handling

### Development Tools
- **Nodemon** - Auto-restart server during development
- **Oxlint** - Rust-powered linting for frontend
- **TypeScript** - Type checking

---

## 📁 Project Structure

```
CodeAlpha_Lite-Trello/
├── frontend/                    # React TypeScript frontend
│   ├── src/                    # React components and pages
│   ├── public/                 # Static assets
│   ├── index.html              # HTML entry point
│   ├── vite.config.ts          # Vite configuration
│   ├── tsconfig.json           # TypeScript config
│   ├── package.json            # Frontend dependencies
│   └── .oxlintrc.json          # Linting rules
│
├── backend/                     # Express.js backend
│   ├── routes/                 # API route handlers
│   │   ├── auth.js             # Authentication endpoints
│   │   ├── projects.js         # Project CRUD operations
│   │   ├── tasks.js            # Task management
│   │   ├── comments.js         # Comment operations
│   │   └── notifications.js    # Notification endpoints
│   ├── middleware/             # Express middleware
│   ├── db.js                   # Database initialization and helpers
│   ├── server.js               # Express server setup
│   ├── trello.db               # SQLite database file
│   ├── package.json            # Backend dependencies
│   ├── .env                    # Environment variables
│   └── node_modules/           # Dependencies (git ignored)
│
└── README.md                    # This file
```

**How it fits together:**
The backend Express server initializes the SQLite database on startup, setting up tables for users, projects, tasks, comments, and notifications. Socket.io is integrated at the server level to enable real-time board updates across connected clients. Frontend React components communicate with the backend via REST API calls and subscribe to real-time events through Socket.io to instantly reflect changes made by other team members.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v16 or higher
- **npm** v8 or higher
- A modern web browser

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/naimulislamsaikat/CodeAlpha_Lite-Trello.git
cd CodeAlpha_Lite-Trello
```

#### 2. Backend Setup

Navigate to the backend directory:
```bash
cd backend
```

Install dependencies:
```bash
npm install
```

Create a `.env` file in the `backend` directory:
```env
PORT=5000
JWT_SECRET=your_jwt_secret_key_here
```

#### 3. Frontend Setup

Navigate to the frontend directory:
```bash
cd ../frontend
```

Install dependencies:
```bash
npm install
```

### Running the Application

#### Backend Server

From the `backend` directory:

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:5000`

#### Frontend Application

From the `frontend` directory:

**Development mode (with hot reload):**
```bash
npm run dev
```

**Build for production:**
```bash
npm run build
```

**Preview production build:**
```bash
npm run preview
```

The frontend will typically run on `http://localhost:5173` (Vite default)

#### Access the Application
Open your browser and navigate to `http://localhost:5173` to use the application.

---

## 📡 API Documentation

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Register a new user |
| POST | `/login` | Login user and get JWT token |
| GET | `/profile` | Get current user profile |
| PUT | `/profile` | Update user profile |

### Projects Routes (`/api/projects`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List all user projects |
| POST | `/` | Create a new project |
| GET | `/:projectId` | Get project details |
| PUT | `/:projectId` | Update project |
| DELETE | `/:projectId` | Delete project |
| POST | `/:projectId/members` | Add project member |
| DELETE | `/:projectId/members/:userId` | Remove project member |

### Tasks Routes (`/api/tasks`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/project/:projectId` | Get all tasks in project |
| POST | `/` | Create new task |
| PUT | `/:taskId` | Update task |
| DELETE | `/:taskId` | Delete task |
| PUT | `/:taskId/assign` | Assign task to user |

### Comments Routes (`/api/comments`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/task/:taskId` | Get task comments |
| POST | `/` | Add comment to task |
| DELETE | `/:commentId` | Delete comment |

### Notifications Routes (`/api/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get user notifications |
| PUT | `/:notificationId/read` | Mark notification as read |

### Health Check
```
GET /health
```

---

## 🗄 Database Schema

### Users Table
- `id` - Primary key (auto-increment)
- `email` - Unique email address
- `username` - User's display name
- `password_hash` - Hashed password
- `avatar_url` - Profile picture URL
- `organization` - User's organization
- `education` - Educational background
- `date_of_birth` - Birth date
- `contact_number` - Phone number
- `bio` - User biography

### Projects Table
- `id` - Primary key (auto-increment)
- `name` - Project name
- `description` - Project description
- `owner_id` - Foreign key to users table
- `created_at` - Timestamp of creation

### Project Members Table (Join Table)
- `project_id` - Foreign key to projects
- `user_id` - Foreign key to users
- `role` - Member role (owner, member)

### Lists Table (Kanban Columns)
- `id` - Primary key (auto-increment)
- `project_id` - Foreign key to projects
- `name` - List name (e.g., "To Do", "In Progress")
- `position` - Order of list on board

### Tasks Table
- `id` - Primary key (auto-increment)
- `list_id` - Foreign key to lists
- `title` - Task title
- `description` - Task description
- `assignee_id` - Foreign key to users (nullable)
- `priority` - Priority level (low, medium, high)
- `due_date` - Task due date
- `position` - Order within list
- `created_at` - Timestamp of creation

### Comments Table
- `id` - Primary key (auto-increment)
- `task_id` - Foreign key to tasks
- `user_id` - Foreign key to users
- `content` - Comment text
- `created_at` - Timestamp of creation

### Notifications Table
- `id` - Primary key (auto-increment)
- `user_id` - Foreign key to users
- `title` - Notification title
- `content` - Notification message
- `is_read` - Read status (boolean)
- `created_at` - Timestamp of creation

---

## 🔄 Real-Time Communication

The application uses **Socket.io** for real-time updates:

### Socket Events

**Client → Server:**
- `join-project` - Join a project room
- `leave-project` - Leave a project room
- `join-user` - Join personal notification room
- `leave-user` - Leave personal notification room
- `notify-board-change` - Broadcast board update to team

**Server → Client:**
- `board-updated` - Board data has changed
- `task-created` - New task added
- `task-updated` - Task modified
- `comment-added` - New comment on task
- `notification-received` - New user notification

This enables live collaboration where changes made by one user are instantly reflected for all team members viewing the same project.

---

## 🔐 Environment Variables

Create a `.env` file in the `backend` directory with:

```env
PORT=5000
JWT_SECRET=your-secret-key-here
```

---

## 📝 Development Workflow

### Code Quality
- Frontend linting: `npm run lint` (from frontend directory)
- Backend uses Node.js standards

### Building for Production
1. **Frontend:**
   ```bash
   cd frontend
   npm run build
   ```
   This creates an optimized build in `dist/` directory

2. **Backend:**
   Set `NODE_ENV=production` and start normally with `npm start`

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🙋 Support

For issues, feature requests, or questions:
- Open an [Issue](https://github.com/naimulislamsaikat/CodeAlpha_Lite-Trello/issues)
- Check existing issues for solutions
- Contact the maintainer

---

## 🚀 Future Enhancements

- [ ] Drag and drop support for tasks
- [ ] User role-based access control (RBAC)
- [ ] Task labels and filters
- [ ] File attachments for tasks
- [ ] Activity timeline and audit logs
- [ ] Dark mode support
- [ ] Mobile app (React Native)
- [ ] Export board data (PDF, CSV)

---

**Made with ❤️ by [naimulislamsaikat](https://github.com/naimulislamsaikat)**
