import { createTidesApp } from "./app.js";

const app = createTidesApp();

// For Vercel serverless functions
export default app;

// For local development
if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });
}
