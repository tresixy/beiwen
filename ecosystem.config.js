module.exports = {
  apps: [{
    name: 'minigame',
    script: 'server/index.js',
    instances: 2, // 2核CPU，启动2个进程
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '600M', // 每个进程限制600MB，避免内存不足
    watch: false
  }]
};

