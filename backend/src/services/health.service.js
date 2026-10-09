import mongoose from 'mongoose';

export function getHealthStatus() {
  return {
    success: true,
    message: 'UniPath API is running',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
}
