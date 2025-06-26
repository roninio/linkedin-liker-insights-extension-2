import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  // Load .env file variables (e.g., API_KEY if you set it there)
  const env = loadEnv(mode, (process as any).cwd(), ''); // Load all env vars

  const currentDir = dirname(fileURLToPath(import.meta.url));

  return {
    plugins: [
      react(), // Enables React support (JSX, Fast Refresh)
      viteStaticCopy({
        targets: [
          {
            src: resolve(currentDir, 'manifest.json'),
            dest: '.', // Copies to the root of the dist folder
          },
          {
            src: resolve(currentDir, 'icons', '*.png'),
            dest: 'icons',
          },
          {
            src: resolve(currentDir, 'popup.html'),
            dest: '.',
          },

        ],
      }),
    ],
    build: {
      rollupOptions: {
        input: {
          popup: resolve(currentDir, 'index.html'),
          background: resolve(currentDir, 'background.ts'),
          content_script: resolve(currentDir, 'content_script.ts'),
          popup_script: resolve(currentDir, 'popup.ts'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'background' || chunkInfo.name === 'content_script') {
              return '[name].js';
            }
            // Handle popup script
            if (chunkInfo.name === 'popup_script') {
              return 'popup.js';
            }
            // For popup script, if the entry is index.tsx, Vite might name the output based on that.
            // Explicitly name it index.js for consistency with index.html's script tag.
            if (chunkInfo.name === 'index' || (chunkInfo.facadeModuleId && chunkInfo.facadeModuleId.endsWith('index.tsx'))) {
              return 'index.js';
            }
            return 'assets/[name]-[hash].js';
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            // Generic naming for assets, including CSS.
            // If Vite bundles any CSS (e.g., from an import in TSX), it will go here.
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/style-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
        },
      },
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || null),
    },
    base: './',
  };
});