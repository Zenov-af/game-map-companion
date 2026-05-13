const { spawnSync } = require('child_process');

const args = ['tsx', '--test', 'components/**/*.test.tsx', 'app/**/*.test.ts', 'hooks/**/*.test.ts', 'lib/**/*.test.ts'];

const result = spawnSync('npx', args, { stdio: 'inherit', shell: true });
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status);
