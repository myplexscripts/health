import { defineConfig } from 'vite';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 150000,
    rollupOptions: {
      input: resolve('app/index.html')
    }
  },
  plugins: [
    {
      name: 'place-pages-index-at-root',
      apply: 'build',
      async closeBundle() {
        const outputIndex = resolve('dist/index.html');
        await rename(resolve('dist/app/index.html'), outputIndex);
        const html = await readFile(outputIndex, 'utf8');
        await writeFile(outputIndex, html.replaceAll('../assets/', './assets/'));
        await rm(resolve('dist/app'), { recursive: true, force: true });
      }
    }
  ]
});
