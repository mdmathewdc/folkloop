import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const { bundleWorkflowCode } = require(path.join(repoRoot, 'node_modules/@temporalio/worker'));

async function main() {
  const workflowsPath = path.join(repoRoot, 'src/temporal/workflow.ts');
  const outDir = path.join(repoRoot, 'dist');
  const outFile = path.join(outDir, 'workflow-bundle.js');

  console.log('Pre-bundling Temporal workflow code for production Worker...');
  const { code } = await bundleWorkflowCode({ workflowsPath });

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, code, 'utf8');
  console.log(`Wrote ${outFile} (${(Buffer.byteLength(code) / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((err) => {
  console.error('Failed to bundle workflow:', err);
  process.exit(1);
});
