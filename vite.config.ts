import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const devProxyTarget = process.env.VITE_API_PROXY_TARGET ?? process.env.DEV_API_PROXY_TARGET ?? "";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  base: "./", // ✅ This fixes the white screen issue
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    port: 5000,
    host: "0.0.0.0",
    proxy: devProxyTarget
      ? {
          "/api": {
            target: devProxyTarget,
            changeOrigin: true,
            secure: true,
            headers: {
              "X-Forwarded-Host": "localhost:5000",
              "X-Forwarded-Proto": "http",
            },
            configure: (proxy) => {
              proxy.on("proxyRes", (proxyRes) => {
                const cookies = proxyRes.headers["set-cookie"];
                if (!cookies) {
                  return;
                }

                const cleanCookies = Array.isArray(cookies) ? cookies : [cookies];
                proxyRes.headers["set-cookie"] = cleanCookies.map((cookie) =>
                  cookie.replace(/;\s*Secure/gi, "")
                );
              });
            },
          },
        }
      : undefined,
  },
});
