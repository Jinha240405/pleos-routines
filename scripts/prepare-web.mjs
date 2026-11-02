import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
await mkdir('web/public', { recursive: true });

const visited = new Set(), licenses = [];
async function collect(name) {
  if (visited.has(name)) return;
  visited.add(name);
  const folder = `node_modules/${name}`;
  const pkg = JSON.parse(await readFile(`${folder}/package.json`, 'utf8'));
  const license = (await readdir(folder, { withFileTypes: true })).find(f => f.isFile() && /^(license|copying)(\.|$)/i.test(f.name));
  if (license) licenses.push(`${name} ${pkg.version}\n${await readFile(`${folder}/${license.name}`, 'utf8')}`);
  for (const dependency of Object.keys(pkg.dependencies ?? {})) await collect(dependency);
}
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
for (const name of Object.keys(pkg.dependencies)) await collect(name);
await writeFile('web/public/DEPENDENCY-LICENSES.txt', licenses.join('\n\n--------------------\n\n'));
