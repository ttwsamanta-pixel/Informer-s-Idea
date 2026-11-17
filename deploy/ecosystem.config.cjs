// Optional self-managed VPS only. Hostinger managed Node hosting manages the process itself.
module.exports = {
  apps: [{
    name: 'informers-idea',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    max_memory_restart: '1G',
    time: true,
    env: { NODE_ENV: 'production' },
    // Supply secrets through the service environment, never here.
  }],
};
