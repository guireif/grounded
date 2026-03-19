export default async function handler(req, res) {
  const { flight } = req.query;

  if (!flight) {
    return res.status(400).json({ error: "Flight number required" });
  }

  try {
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${process.env.AVIATIONSTACK_KEY}&flight_iata=${flight}&limit=1`
    );
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.status(404).json({ error: "Flight not found" });
    }

    const f = data.data[0];

    return res.status(200).json({
      flight:      f.flight?.iata,
      airline:     f.airline?.name,
      status:      f.flight_status,
      departure: {
        airport:    f.departure?.airport,
        iata:       f.departure?.iata,
        scheduled:  f.departure?.scheduled,
        actual:     f.departure?.actual,
        delay:      f.departure?.delay,
        gate:       f.departure?.gate,
      },
      arrival: {
        airport:    f.arrival?.airport,
        iata:       f.arrival?.iata,
        scheduled:  f.arrival?.scheduled,
        estimated:  f.arrival?.estimated,
        delay:      f.arrival?.delay,
        gate:       f.arrival?.gate,
      },
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch flight data" });
  }
}
