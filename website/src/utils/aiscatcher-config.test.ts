import assert from "node:assert/strict";
import test from "node:test";
import { aiscatcherConfig } from "./aiscatcher-config.ts";

test("download config sends NMEA to Open Waters with the current token and waits for Start", () => {
  const token = 'test.token:"\\secret';
  const config = JSON.parse(aiscatcherConfig(token));
  const output = config.mqtt[0];
  const url = new URL(output.url);
  assert.equal(url.protocol, "wssmqtt:");
  assert.equal(url.host, "ais.openwaters.io:443");
  assert.equal(url.pathname, "/v1/stream");
  assert.equal(url.username, "x");
  assert.equal(decodeURIComponent(url.password), token);
  assert.equal(output.msgformat, "NMEA");
  assert.equal(output.active, true);
  assert.equal(output.topic, "ais/data");
  assert.equal(config.config, "aiscatcher");
  assert.equal(config.version, 1);
  assert.equal(config.receiver[0].input, "rtlsdr");
  assert.equal(config.engine, "off");
  assert.equal(config.sharing, false);
  assert.equal(config.control.wizard, false);
  assert.ok(!aiscatcherConfig("new.token").includes(encodeURIComponent(token)));
});
