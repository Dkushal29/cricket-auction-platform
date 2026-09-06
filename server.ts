import { createServer } from "http";
import next from "next";
import { initSocketServer } from "./lib/socket-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      await handle(req, res);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  });

  // Initialize Socket.IO attached to HTTP server
  initSocketServer(httpServer);

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`> 🚀 Real-Time Auction Platform ready on http://${hostname}:${port}`);
    console.log(`> ⚡ WebSocket / Socket.IO listening on port ${port}`);
  });
});
