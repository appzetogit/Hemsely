import http from 'http';
import { execSync } from 'child_process';
import 'dotenv/config';
import app from './app.js';
import connectDB from './config/database.js';
import { initSocket } from './socket/index.js';

// Connect to database
connectDB();

const PORT = process.env.PORT || 5000;
const httpServer = http.createServer(app);

initSocket(httpServer);

// Helper to kill orphan process on port in development mode
const killPortProcess = (port) => {
  if (process.env.NODE_ENV === 'production') return false;
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`).toString();
      const lines = output.split('\n').filter((line) => line.includes('LISTENING'));
      let killed = false;
      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && parseInt(pid, 10) !== process.pid) {
          try {
            execSync(`taskkill /F /PID ${pid}`);
            console.log(`🧹 Auto-cleared stale process PID ${pid} holding port ${port}`);
            killed = true;
          } catch (_) {}
        }
      });
      return killed;
    } else {
      execSync(`npx kill-port ${port}`);
      console.log(`🧹 Auto-cleared stale process holding port ${port}`);
      return true;
    }
  } catch (err) {
    return false;
  }
};

let retryCount = 0;
const MAX_RETRIES = 3;

// Handle port busy / retry logic gracefully
httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    retryCount += 1;
    console.log(`⚠️ Port ${PORT} is busy (attempt ${retryCount}/${MAX_RETRIES}). Clearing port...`);
    const cleared = killPortProcess(PORT);
    
    if (retryCount <= MAX_RETRIES) {
      setTimeout(() => {
        try {
          if (typeof httpServer.closeAllConnections === 'function') {
            httpServer.closeAllConnections();
          }
          httpServer.close();
        } catch (_) {}
        httpServer.listen(PORT);
      }, cleared ? 300 : 1000);
    } else {
      console.error(`❌ Port ${PORT} could not be automatically freed.`);
      process.exit(1);
    }
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

httpServer.listen(PORT, () => {
  retryCount = 0;
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

const gracefulShutdown = (signal, callback) => {
  try {
    if (typeof httpServer.closeAllConnections === 'function') {
      httpServer.closeAllConnections();
    }
  } catch (_) {}
  httpServer.close(() => {
    if (callback) callback();
  });
};

// Clean shutdown for Nodemon restarts & system signals
process.once('SIGUSR2', () => {
  gracefulShutdown('SIGUSR2', () => {
    process.kill(process.pid, 'SIGUSR2');
  });
});

process.on('SIGINT', () => {
  gracefulShutdown('SIGINT', () => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  gracefulShutdown('SIGTERM', () => {
    process.exit(0);
  });
});
