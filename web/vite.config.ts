import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// Deelt de 3D-wereld uit ../src met de pitchvideo. React/three komen uit de root-node_modules (één kopie).
export default defineConfig({
  plugins: [react()],
  resolve: {dedupe: ['react', 'react-dom', 'three', '@react-three/fiber']},
  server: {fs: {allow: ['..']}},
  build: {outDir: 'dist', chunkSizeWarningLimit: 2000},
});
