// Cloudflare Workers entry. Runs the same Express app as the Vercel entry,
// bridged to workerd via cloudflare:node's httpServerHandler.
import { httpServerHandler } from "cloudflare:node";
import { createTidesApp } from "./app.js";

// compress:false — compression() corrupts bodies through workerd's node:http bridge.
const app = createTidesApp({ compress: false });
app.listen(8080);

export default httpServerHandler({ port: 8080 });
