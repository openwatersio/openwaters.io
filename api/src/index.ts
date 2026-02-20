import express from "express";
import { createApp } from "@neaps/api";

const app = express();

app.get("/", (req, res) => {
  res.json({
    name: "Open Waters API",
    documentation: "https://openwaters.io/api",
  });
});

app.use("/", createApp());

// Placeholder for bathymetry API
// TODO: Replace with actual bathymetry API from @openwatersio/crowd-depth/packages/api once published
app.use("/bathymetry", (req, res) => {
  res.status(501).json({ error: "Bathymetry API coming soon" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// For Vercel serverless functions
export default app;

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}
