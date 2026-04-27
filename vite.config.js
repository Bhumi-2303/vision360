import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'public/index.html'),
        viewer: path.resolve(__dirname, 'public/viewer.html'),
        vr: path.resolve(__dirname, 'public/vr.html'),
        login: path.resolve(__dirname, 'public/admin/login.html'),
        dashboard: path.resolve(__dirname, 'public/admin/dashboard.html'),
        notfound: path.resolve(__dirname, 'public/404.html')
      }
    }
  },
  server: {
    open: true
  }
});
