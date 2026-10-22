module.exports = {
  apps: [{
    name: 'jymberee-production-8001',
    script: './index.js',
    instances: 1,           // ← 1 process only
    exec_mode: 'fork',      // ← Single process
    node_args: '--import ./instrument.mjs',
    env: {
      NODE_ENV: 'production',
      PORT: 8001
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '400M',
    kill_timeout: 3000,
    listen_timeout: 3000,
    shutdown_with_message: true
  }]
};