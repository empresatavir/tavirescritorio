import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    // React islands (Radix Themes modal) — must run before Solid
    react({
      include: /\.react\.[jt]sx?$/,
    }),
    solid({
      exclude: /\.react\.[jt]sx?$/,
    }),
    tailwindcss(),
  ],
  server: {
    port: 9002,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
      },
    },
  },
});
