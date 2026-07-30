import http from 'http';
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/database.js';
import { initSocket } from './socket/index.js';

// Connect to database
connectDB();

// Start server (wrapped in a plain http.Server so Socket.io can share the same port)
const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
