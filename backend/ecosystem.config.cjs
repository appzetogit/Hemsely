// PM2 Ecosystem Configuration for Hemsely Backend
// Enables multi-core clustering to handle 15,000 – 20,000+ live concurrent users
// Usage:
//   Install PM2 globally: npm install -g pm2
//   Start in cluster mode: pm2 start ecosystem.config.cjs --env production
//   Monitor live performance: pm2 monit
//   Zero-downtime reload: pm2 reload hemsely-backend

module.exports = {
  apps: [
    {
      name: 'hemsely-backend',
      script: 'server.js',
      instances: process.env.PM2_INSTANCES || 'max', // Spawns 1 worker per CPU core
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      kill_timeout: 5000,
      listen_timeout: 8000,
      restart_delay: 1000,
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
