import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

/**
 * Library build. Storybook uses `.storybook/vite.config.ts` instead, so the
 * declaration plugin and library output only run for `npm run build`.
 */
export default defineConfig({
  plugins: [
    react(),
    dts({
      tsconfigPath: './tsconfig.build.json',
      entryRoot: 'src',
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/*.test.tsx',
        'src/**/*.test.ts',
        'src/test/**',
        'src/docs/**',
      ],
    }),
  ],
  css: {
    modules: {
      // Stable, readable, collision-safe class names in the published CSS.
      generateScopedName: 'lu-[name]__[local]--[hash:base64:5]',
    },
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'styles',
    },
    cssCodeSplit: false,
    sourcemap: true,
    rolldownOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime', 'react-dom/client'],
      output: {
        // Keep one file per module so consumers' bundlers can tree-shake.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
});
