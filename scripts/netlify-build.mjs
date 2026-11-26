// Netlify build for both sites from one netlify.toml.
//  - The public sample site (branch main) has no POCKET_API_URL: the usual production build (data stays in the browser).
//  - The private staging site (branch staging) sets POCKET_API_URL=https://<API_HOST>/api/v1 in its Netlify settings:
//    this writes it into the staging environment and builds with the "Staging" ribbon.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const api = (process.env.POCKET_API_URL ?? '').trim().replace(/\/$/, '');
let config = 'production';
if (api) {
  if (!/^https:\/\/[a-z0-9.-]+(:\d+)?\/api\/v1$/i.test(api)) {
    console.error(`POCKET_API_URL must look like https://<server>/api/v1 (got "${api}")`);
    process.exit(1);
  }
  writeFileSync(
    'src/environments/environment.staging.ts',
    `// Written by scripts/netlify-build.mjs for this build only.\nexport const environment = {\n  apiUrl: '${api}',\n  stage: 'staging',\n};\n`,
  );
  config = 'staging';
  console.log(`Staging build against ${api}`);
}
const r = spawnSync('npx', ['ng', 'build', '--configuration', config], { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(r.status ?? 1);
