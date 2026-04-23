import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'index.html',
        viewer: 'viewer.html',
        vr: 'vr.html',
        login: 'admin/login.html',
        dashboard: 'admin/dashboard.html',
        notfound: '404.html'
      }
    }
  },
  server: {
    open: true
  }
});
