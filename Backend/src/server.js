const app = require('./app');
const config = require('./config/env');
const { prisma, checkDatabaseConnection } = require('./config/prisma');

const PORT = config.port;

const server = app.listen(PORT, async () => {
  console.log(`[SERVER] Running in ${config.nodeEnv} mode on http://localhost:${PORT}`);
  console.log(`[SERVER] Health check available at: http://localhost:${PORT}/api/health`);

  // Verify PostgreSQL connection through Prisma on startup
  const dbCheck = await checkDatabaseConnection();
  if (dbCheck.connected) {
    console.log(`[PRISMA] Successfully connected to PostgreSQL (latency: ${dbCheck.latencyMs}ms)`);
  } else {
    console.error('[PRISMA] Initial database connection check failed:', dbCheck.error);
  }
});

// Graceful Shutdown Handling
async function handleShutdown(signal) {
  console.log(`\n[SERVER] Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    console.log('[SERVER] HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('[PRISMA] Disconnected from database.');
      process.exit(0);
    } catch (err) {
      console.error('[PRISMA] Error during disconnect:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if graceful shutdown hangs
  setTimeout(() => {
    console.error('[SERVER] Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = server;
