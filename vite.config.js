import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import net from "net";

function checkPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once("close", () => resolve(true));
      server.close();
    });
    server.on("error", () => resolve(false));
  });
}

async function getAvailablePort(preferredPort = 3000, fallbackPort = 3009) {
  const preferredAvailable = await checkPort(preferredPort);
  return preferredAvailable ? preferredPort : fallbackPort;
}

export default defineConfig(async () => {
  const port = await getAvailablePort(3000, 3009);

  return {
    plugins: [react()],
    server: {
      port: port,
      strictPort: false,
      open: true,
    },
  };
});
