import 'dotenv/config';
import http from 'node:http';
import { Server as SocketServer } from 'socket.io';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import User from './models/user.model.js';
import { verifyAccessToken } from './utils/jwt.js';
import { registerSocketServer } from './services/socket.service.js';

const port = Number(process.env.PORT) || 4000;
const clientOrigin = process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || 'http://localhost:5173';
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, { cors: { origin: clientOrigin } });

app.set('io', io);
registerSocketServer(io);
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const payload = verifyAccessToken(token);
    if (typeof payload === 'string' || !payload.sub) return next(new Error('Invalid or expired token'));
    const user = await User.findById(payload.sub).select('_id role').lean();
    if (!user) return next(new Error('Invalid or expired token'));
    socket.data.userId = String(user._id);
    socket.data.role = user.role;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});
io.on('connection', (socket) => {
  socket.join(`user:${socket.data.userId}`);
  socket.join(`role:${socket.data.role}`);
  logger.info(`Authenticated socket connected: ${socket.id} (${socket.data.role})`);
});

httpServer.listen(port, () => {
  logger.info(`UniPath API listening on http://localhost:${port}`);
  connectDatabase().catch((error) => logger.error(`MongoDB connection failed: ${error.message}`));
});

httpServer.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use. Stop the other UniPath backend process, then run npm run dev again.`);
  } else {
    logger.error(`HTTP server failed to start: ${error.message}`);
  }
  process.exitCode = 1;
});
