const { spawn } = require('child_process');

function callMcp(method, params = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn('C:\\Program Files\\ArtCraft\\FigCraft\\figcraft-cli.exe', ['mcp', '--attach', '7980']);
    let stdout = '';
    let stderr = '';

    const req = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: method,
        arguments: params,
      },
    }) + '\n';

    p.stdout.on('data', (d) => {
      stdout += d.toString();
    });

    p.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    p.on('close', (code) => {
      try {
        const lines = stdout.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.id) {
              if (parsed.error) return reject(parsed.error);
              return resolve(parsed.result);
            }
          } catch {}
        }
        resolve({ stdout, stderr });
      } catch (err) {
        reject(err);
      }
    });

    p.stdin.write(req);
    p.stdin.end();
  });
}

module.exports = { callMcp };

if (require.main === module) {
  const tool = process.argv[2] || 'inspect_ui';
  const args = process.argv[3] ? JSON.parse(process.argv[3]) : {};
  callMcp(tool, args)
    .then((res) => console.log(JSON.stringify(res, null, 2)))
    .catch((err) => console.error('Error:', err));
}
