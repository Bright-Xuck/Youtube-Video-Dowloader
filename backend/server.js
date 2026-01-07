require("dotenv").config();
console.log("[SERVER] Starting backend...");

const app = require("./src/app");
console.log("[SERVER] App module loaded");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});

// Handle server errors
server.on("error", (err) => {
  console.error("[SERVER] Error:", err);
});

process.on("uncaughtException", (err) => {
  console.error("[SERVER] Uncaught Exception:", err);
  process.exit(1);
});

