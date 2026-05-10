const { createServer } = require('http');
const { parse } = require('url');
const path = require('path');

const port = parseInt(process.env.PORT || '3000', 10);

// Start a minimal health check server first
const healthServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', port }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WA Bot Console is running on port ' + port);
});

healthServer.listen(port, '0.0.0.0', () => {
  console.log(`Health server listening on 0.0.0.0:${port}`);
});

// Then start Next.js
const { spawn } = require('child_process');

const nextProcess = spawn('node_modules/.bin/next', ['start', '-H', '0.0.0.0', '-p', String(port)], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, PORT: String(port), HOSTNAME: '0.0.0.0' },
});

nextProcess.stdout.on('data', (data) => {
  console.log(`[next] ${data}`);
});

nextProcess.stderr.on('data', (data) => {
  console.error(`[next:error] ${data}`);
});

nextProcess.on('close', (code) => {
  console.log(`Next.js exited with code ${code}`);
  if (code !== 0) {
    process.exit(code || 1);
  }
});

nextProcess.on('error', (err) => {
  console.error('Failed to start Next.js:', err);
});
