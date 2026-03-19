export default async function handler(req, res) {
  const { flight } = req.query;

  if (!flight) {
    return res.status(400).json({ error: "Flight number required" });
  }

  try {
    // Step 1: Get aircraft details from AviationStack
    const asRes = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${process.env.AVIATIONSTACK_KEY}&flight_iata=${flight}&limit=1`
    );
    const asData = await asRes.json();

    if (!asData.data || asData.data.length === 0) {
      return res.status(404).json({ error: "Flight not found in AviationStack" });
    }

    // Step 2: Search OpenSky by callsign
    const callsign = flight.replace(" ", "").toUpperCase();
    const credentials = Buffer.from(
      `${process.env.OPENSKY_CLIENT_ID}:${process.env.OPENSKY_CLIENT_SECRET}`
    ).toString("base64");

    const osRes = await fetch(
      `https://opensky-network.org/api/states/all`,
      { headers: { Authorization: `Basic ${credentials}` } }
    );
    const osData = await osRes.json();

    if (!osData.states) {
      return res.status(404).json({ error: "No OpenSky data available" });
    }

    // Find aircraft by callsign
    const state = osData.states.find(s =>
      (s[1] || "").trim().toUpperCase() === callsign
    );

    if (!state) {
      return res.status(404).json({ error: "Aircraft not found in OpenSky airspace" });
    }

    return res.status(200).json({
      callsign:   state[1]?.trim(),
      longitude:  state[5],
      latitude:   state[6],
      altitudeFt: state[7] ? Math.round(state[7] * 3.281) : null,
      speedMph:   state[9] ? Math.round(state[9] * 2.237) : null,
      heading:    state[10],
      onGround:   state[8],
      icao24:     state[0],
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch position", detail: error.message });
  }
}