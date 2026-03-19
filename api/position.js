export default async function handler(req, res) {
  const { callsign } = req.query;

  if (!callsign) {
    return res.status(400).json({ error: "Callsign required" });
  }

  try {
    const credentials = Buffer.from(
      `${process.env.OPENSKY_CLIENT_ID}:${process.env.OPENSKY_CLIENT_SECRET}`
    ).toString("base64");

    const response = await fetch(
      `https://opensky-network.org/api/states/all?time=0&extended=1`,
      {
        headers: {
          Authorization: `Basic ${credentials}`,
        },
      }
    );

    const data = await response.json();

    if (!data.states) {
      return res.status(404).json({ error: "No flight data available" });
    }

    // Find the flight by callsign (column 1 in the states array)
    const flight = data.states.find(
      (s) => s[1]?.trim().toUpperCase() === callsign.toUpperCase()
    );

    if (!flight) {
      return res.status(404).json({ error: "Flight not found in airspace" });
    }

    return res.status(200).json({
      callsign:  flight[1]?.trim(),
      longitude: flight[5],
      latitude:  flight[6],
      altitude:  flight[7],   // meters
      speed:     flight[9],   // m/s
      heading:   flight[10],
      onGround:  flight[8],
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch position data" });
  }
}
