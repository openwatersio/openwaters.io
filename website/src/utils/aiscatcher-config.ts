export function aiscatcherConfig(token: string): string {
  return (
    JSON.stringify(
      {
        config: "aiscatcher",
        version: 1,
        engine: "off",
        sharing: false,
        control: { wizard: false },
        receiver: [{ input: "rtlsdr" }],
        mqtt: [
          {
            description: "Open Waters AIS",
            url: `wssmqtt://x:${encodeURIComponent(token)}@ais.openwaters.io:443/v1/stream`,
            msgformat: "NMEA",
            topic: "ais/data",
            active: true,
          },
        ],
      },
      null,
      2,
    ) + "\n"
  );
}
