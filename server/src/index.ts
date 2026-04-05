import http from 'http';
import { execSync } from 'child_process';
import mongoose from 'mongoose';
import { createApp } from './app';
import { registerCoreTools, registerMCPTools } from './agents/manifest';
import { env } from './config/env';

function killPort(port: number): void {
  try {
    if (process.platform === 'win32') {
      const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: 'utf8',
      });
      const pid = result.trim().split(/\s+/).pop();
      if (pid && pid !== '0') {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[server] Killed process ${pid} holding port ${port}`);
      }
    } else {
      execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: 'ignore' });
      console.log(`[server] Killed process holding port ${port}`);
    }
  } catch {
    // nothing was holding the port
  }
}

async function start() {
  // Connect to MongoDB
  await mongoose.connect(env.MONGODB_URI);
  console.log('[db] Connected to MongoDB');

  // Core in-process tools — always registered, never fail startup
  registerCoreTools();

  const app = createApp();
  const httpServer = http.createServer(app);

  const port = parseInt(env.PORT, 10);

  const listen = (retries = 5) => {
    httpServer.listen(port, () => {
      console.log(`[server] byte API running on http://localhost:${port}`);

      // MCP subprocesses registered after server is up — failure is non-fatal
      registerMCPTools().catch(err =>
        console.error('[server] MCP tools failed to register (non-fatal):', err.message),
      );
    });

    httpServer.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE' && retries > 0) {
        console.warn(`[server] Port ${port} in use — killing occupying process...`);
        killPort(port);
        httpServer.closeAllConnections?.();
        httpServer.close(() => setTimeout(() => listen(retries - 1), 500));
      } else {
        console.error('[server] HTTP server error:', err);
        process.exit(1);
      }
    });
  };

  listen();
}

start().catch(err => {
  console.error('[server] Fatal startup error:', err);
  process.exit(1);
});
