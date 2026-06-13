import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("vue-baidu-map-next")) return "baidu-map";
          if (id.includes("echarts")) return "echarts";
          if (id.includes("bmaplib.heatmap")) return "heatmap";
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: "esbuild",
    target: "es2015",
    cssCodeSplit: true,
    reportCompressedSize: false,
    esbuild: {
      drop: ["console", "debugger"],
    },
  },
});
