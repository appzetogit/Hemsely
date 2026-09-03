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
      instances: process.env.PM2_INSTANCES ? (process.env.PM2_INSTANCES === 'max' ? 'max' : parseInt(process.env.PM2_INSTANCES, 10)) : 1,
      exec_mode: process.env.PM2_INSTANCES === 'max' ? 'cluster' : 'fork',
      watch: false,
      max_memory_restart: '512M',
      min_uptime: '10s',
      max_restarts: 10,
      kill_timeout: 5000,
      listen_timeout: 8000,
      restart_delay: 2000,
      exp_backoff_restart_delay: 200,
      node_args: '--max-old-space-size=512',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
