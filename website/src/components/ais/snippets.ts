// The quick-start examples: one subscription, equivalent output in each language.
import type { SNIPPET_LANGS } from "../../utils/shiki";

const SERVER = "ais.openwaters.io";
const bbox = "59,10,60,11";

export const snippets: {
  id: string;
  label: string;
  lang: (typeof SNIPPET_LANGS)[number];
  code: string;
}[] = [
  {
    id: "js",
    label: "JavaScript",
    lang: "js",
    code: `const ws = new WebSocket("wss://${SERVER}/v1/stream");
ws.onopen = () =>
  ws.send(JSON.stringify({
    type: "subscribe",
    bbox: [[59, 10, 60, 11]]
  }));
ws.onmessage = ({ data }) => {
  const ev = JSON.parse(data);
  if (ev.type !== "event") return; // welcome, ack, error
  console.log(ev.mmsi, ev.msg_type, ev.lat, ev.lon);
};`,
  },
  {
    id: "python",
    label: "Python",
    lang: "python",
    code: `import asyncio, json, websockets

URL = "wss://${SERVER}/v1/stream"
SUB = {"type": "subscribe", "bbox": [[59, 10, 60, 11]]}

async def main():
    async with websockets.connect(URL) as ws:
        await ws.send(json.dumps(SUB))
        async for frame in ws:
            ev = json.loads(frame)
            if ev["type"] != "event":  # welcome, ack, error
                continue
            print(ev["mmsi"], ev["msg_type"],
                  ev.get("lat"), ev.get("lon"))

asyncio.run(main())`,
  },
  {
    id: "go",
    label: "Go",
    lang: "go",
    code: `url := "wss://${SERVER}/v1/stream"
c, _, err := websocket.DefaultDialer.Dial(url, nil)
if err != nil {
	log.Fatal(err)
}
c.WriteJSON(map[string]any{
	"type": "subscribe",
	"bbox": [][]float64{{59, 10, 60, 11}},
})
for {
	var ev struct {
		Type    string  \`json:"type"\`
		MMSI    int     \`json:"mmsi"\`
		MsgType string  \`json:"msg_type"\`
		Lat     float64 \`json:"lat"\`
		Lon     float64 \`json:"lon"\`
	}
	if err := c.ReadJSON(&ev); err != nil {
		log.Fatal(err)
	}
	if ev.Type != "event" { // welcome, ack, error
		continue
	}
	fmt.Println(ev.MMSI, ev.MsgType, ev.Lat, ev.Lon)
}`,
  },
  {
    id: "rust",
    label: "Rust",
    lang: "rust",
    code: `use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::Message};

#[tokio::main]
async fn main() {
    let url = "wss://${SERVER}/v1/stream";
    let (mut ws, _) = connect_async(url).await.unwrap();
    let sub = r#"{"type":"subscribe","bbox":[[59,10,60,11]]}"#;
    ws.send(Message::text(sub)).await.unwrap();
    while let Some(Ok(msg)) = ws.next().await {
        let Message::Text(frame) = msg else { continue };
        let ev: serde_json::Value =
            serde_json::from_str(&frame).unwrap();
        if ev["type"] != "event" { continue } // welcome, ack, error
        println!("{} {} {} {}",
            ev["mmsi"], ev["msg_type"], ev["lat"], ev["lon"]);
    }
}`,
  },
  {
    id: "shell",
    label: "Shell",
    lang: "sh",
    code: `# live stream
SUB='{"type":"subscribe","bbox":[[59,10,60,11]]}'
echo "$SUB" | websocat -n wss://${SERVER}/v1/stream

# snapshot of what is in the box right now
curl "https://${SERVER}/v1/vessels?bbox=${bbox}"`,
  },
];
