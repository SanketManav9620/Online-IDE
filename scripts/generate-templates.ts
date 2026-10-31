import { scanTemplateDirectory } from '../features/playground/libs/path-to-json';
import path from 'path';
import fs from 'fs';

async function generate() {
  const templates = {
    REACT: './vibecode-starters/react-ts',
    NEXTJS: './vibecode-starters/nextjs-new',
    EXPRESS: './vibecode-starters/express-simple',
    VUE: './vibecode-starters/vue',
    HONO: './vibecode-starters/hono-nodejs-starter',
    ANGULAR: './vibecode-starters/angular',
  };

  const results: Record<string, any> = {};

  for (const [key, relPath] of Object.entries(templates)) {
    const fullPath = path.join(process.cwd(), relPath);
    console.log(`Scanning ${key} at ${fullPath}...`);
    const data = await scanTemplateDirectory(fullPath);
    results[key] = data;
    console.log(`✓ ${key}: ${data.items.length} items scanned`);
  }

  const outPath = path.join(process.cwd(), 'lib', 'templates-data.json');
  fs.writeFileSync(outPath, JSON.stringify(results), 'utf8');
  const stats = fs.statSync(outPath);
  console.log(`Done! Written ${Math.round(stats.size / 1024)} KB to ${outPath}`);
}

generate().catch(err => {
  console.error('Error generating templates:', err);
  process.exit(1);
});
