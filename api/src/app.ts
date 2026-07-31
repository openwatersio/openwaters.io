import express, { type Application } from "express";
import { createApp } from "@neaps/api";

export interface TidesAppOptions {
  // Passed through to @neaps/api. On Cloudflare Workers set compress:false —
  // compression() corrupts bodies through workerd's node:http bridge, and the
  // edge compresses anyway.
  compress?: boolean;
}

export function createTidesApp({ compress }: TidesAppOptions = {}): Application {
  const app = express();

  app.get("/", (req, res) => {
    res.json({
      name: "Open Waters API",
      documentation: "https://openwaters.io/api",
    });
  });

  app.use("/", createApp({ compress }));

  // Placeholder for bathymetry API
  // TODO: Replace with actual bathymetry API from @openwatersio/crowd-depth/packages/api once published
  app.use("/bathymetry", (req, res) => {
    res.status(501).json({ error: "Bathymetry API coming soon" });
  });

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  return app;
}
