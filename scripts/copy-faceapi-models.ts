import { mkdirSync, copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import url from 'url';

// Copy minimal face-api models from node_modules to public/models
const __dirname = dirname(url.fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const srcDir = join(projectRoot, 'node_modules', '@vladmandic', 'face-api', 'model');
const dstDir = join(projectRoot, 'public', 'models');
const mpDir = join(dstDir, 'mediapipe');

const files = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model.bin',
  'face_expression_model-weights_manifest.json',
  'face_expression_model.bin',
];

mkdirSync(dstDir, { recursive: true });
mkdirSync(mpDir, { recursive: true });
// Create README placeholder for MediaPipe model
try {
  const readme = join(mpDir, 'README.txt');
  if (!existsSync(readme)) {
    copyFileSync(join(__dirname, 'placeholder.README.txt'), readme);
  }
} catch {}

for (const f of files) {
  const from = join(srcDir, f);
  const to = join(dstDir, f);
  if (!existsSync(from)) {
    console.error(`[copy-faceapi-models] Missing source file: ${from}`);
    process.exitCode = 1;
    continue;
  }
  copyFileSync(from, to);
  console.log(`[copy-faceapi-models] Copied ${f}`);
}

console.log(`[copy-faceapi-models] Done -> ${dstDir}`);
