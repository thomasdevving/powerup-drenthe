import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {bundle} from '@remotion/bundler';
import {selectComposition} from '@remotion/renderer';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const GL = process.env.GL ?? 'angle';
export const chromiumOptions = {gl: GL};

export const makeBundle = () =>
  bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public'), onProgress: () => {}});

export const parseOverrides = () => {
  const arg = process.argv.find((a) => a.startsWith('--override='));
  if (!arg) return {};
  // --override=energy-hub:30,dashboard:12
  return Object.fromEntries(
    arg.slice('--override='.length).split(',').map((kv) => {
      const [k, v] = kv.split(':');
      return [k, Number(v)];
    }),
  );
};

export const select = (serveUrl, id, inputProps) =>
  selectComposition({serveUrl, id, inputProps, chromiumOptions});
