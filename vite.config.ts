/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// base: './' permet d'ouvrir le site construit depuis n'importe quel dossier
// (le routage utilise des URL avec # : aucune configuration serveur requise).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: { chunkSizeWarningLimit: 900 },
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    include: ['src/**/*.test.ts'],
  },
});
