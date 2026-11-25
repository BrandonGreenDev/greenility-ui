import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/** Storybook-only Vite config: no library build, no declaration emit. */
export default defineConfig({
  plugins: [react()],
  css: {
    modules: { generateScopedName: 'gn-[name]__[local]--[hash:base64:5]' },
  },
});
