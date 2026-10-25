import http from "node:http";
import net from "node:net";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const apiAgent = new http.Agent({ keepAlive: true, maxSockets: 32 });
apiAgent.createConnection = (_options, callback) => {
  const base = 18000 + Math.floor(Math.random() * 4000);
  const tryPort = (offset: number) => {
    const socket = net.connect({ host: "127.0.0.1", port: 9001, localPort: base + offset });
    const fail = (err: NodeJS.ErrnoException) => {
      socket.destroy();
      if (offset < 30 && (err.code === "EADDRINUSE" || err.code === "EACCES")) {
        tryPort(offset + 1);
        return;
      }
      callback(err);
    };
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.removeListener("error", fail);
      callback(null, socket);
    });
  };
  tryPort(0);
};

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
    host: true,
    port: 9002,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:9001",
        changeOrigin: true,
        agent: apiAgent,
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
});
