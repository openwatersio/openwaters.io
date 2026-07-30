// Cloudflare Workers entry: the Express app bridged to workerd via
// cloudflare:node's httpServerHandler.
import { httpServerHandler } from "cloudflare:node";
import { createTidesApp } from "./app.js";

// compress:false — compression() corrupts bodies through workerd's node:http bridge.
const app = createTidesApp({ compress: false });
app.listen(8080);

export default httpServerHandler({ port: 8080 });
