const { execSync } = require('node:child_process');
const path = require('node:path');

execSync('npm run build', {
  stdio: 'inherit',
  cwd: path.resolve(__dirname, '..'),
});

require(path.resolve(__dirname, '../dist/prisma/seed.js'));
