const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

const clients = new Set();

server.on("connection", (client) => {
  console.log("Client connected");
  clients.add(client);

  client.on("message", (message) => {
    for (const otherClient of clients) {
      if (otherClient !== client && otherClient.readyState === WebSocket.OPEN) {
        otherClient.send(message);
      }
    }
  });

  client.on("close", () => {
    console.log("Client disconnected");
    clients.delete(client);
  });
});

console.log("Signaling server started on port 8080");
