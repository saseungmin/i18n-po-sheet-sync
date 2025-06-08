import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  format: ['esm', 'cjs'],
  dts: true,
  minify: true,
  target: 'es2015',
});
