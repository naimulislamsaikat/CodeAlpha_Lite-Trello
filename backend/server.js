import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';

// Routers
import authRouter from './routes/auth.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import commentsRouter from './routes/comments.js';
import notificationsRouter from './routes/notifications.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development server
app.use(cors({
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Create HTTP Server
const server = http.createServer(app);

// Integrate Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Expose Socket.io instance on the req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Setup API Routes
app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/notifications', notificationsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join a board/project room
  socket.on('join-project', (projectId) => {
    socket.join(`project_${projectId}`);
    console.log(`Socket ${socket.id} joined project room: project_${projectId}`);
  });

  // Leave a board/project room
  socket.on('leave-project', (projectId) => {
    socket.leave(`project_${projectId}`);
    console.log(`Socket ${socket.id} left project room: project_${projectId}`);
  });

  // Join a personal user room for private notifications
  socket.on('join-user', (userId) => {
    socket.join(`user_${userId}`);
    console.log(`Socket ${socket.id} joined personal room: user_${userId}`);
  });

  // Leave personal user room
  socket.on('leave-user', (userId) => {
    socket.leave(`user_${userId}`);
    console.log(`Socket ${socket.id} left personal room: user_${userId}`);
  });

  // Broadcast manual change trigger
  socket.on('notify-board-change', (data) => {
    const { projectId, senderId } = data;
    // Broadcast to other users in project room
    socket.to(`project_${projectId}`).emit('board-updated', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start Database and HTTP server
const startServer = async () => {
  try {
    await initDb();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

startServer();