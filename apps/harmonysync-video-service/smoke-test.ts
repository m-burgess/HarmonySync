import http from 'http';
import { server } from './server';

async function run() {
  return new Promise<void>((resolve, reject) => {
    const listener = server.listen(0, '127.0.0.1', () => {
      const addr = listener.address();
      if (!addr || typeof addr === 'string') return reject(new Error('Failed to get address'));
      const port = addr.port;

      const req = http.request({ host: '127.0.0.1', port, path: '/api/health', method: 'GET' }, (res) => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          console.log('smoke-test: status', res.statusCode);
          listener.close();
          resolve();
        });
      });

      req.on('error', (err) => {
        listener.close();
        reject(err);
      });

      req.end();
    });
  });
}

run().catch(err => {
  console.error('smoke-test failed', err);
  process.exitCode = 1;
});
