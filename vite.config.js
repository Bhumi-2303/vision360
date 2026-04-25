import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'public/index.html',
        viewer: 'public/viewer.html',
        vr: 'public/vr.html',
        login: 'public/admin/login.html',
        dashboard: 'public/admin/dashboard.html',
        notfound: 'public/404.html'
      }
    }
  },
  server: {
    open: true
  }
});
