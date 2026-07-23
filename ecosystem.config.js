/**
 * PM2 ecosystem config for VPS / dedicated server deployments.
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save && pm2 startup   (survive reboots)
 */
module.exports = {
  apps: [
    {
      name: 'ibird-portal',
      script: 'server.js',
      cwd: __dirname,

      // Number of instances — use 'max' to use all CPU cores (cluster mode)
      // Use 1 if you need sticky sessions or the in-process rate limiter
      instances: 1,
      exec_mode: 'fork',

      // Restart on crash, max 10 times within 5 minutes
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',

      // Environment — override in .env.local; these are defaults only
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Logging
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
