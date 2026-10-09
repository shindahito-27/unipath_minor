let socketServer;

export function registerSocketServer(io) {
  socketServer = io;
}

export function emitNotificationToUser(userId, notification) {
  if (!socketServer) return false;
  try {
    socketServer.to(`user:${userId}`).emit('notification:new', notification);
    return true;
  } catch {
    return false;
  }
}
