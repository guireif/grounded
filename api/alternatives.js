export default async function handler(req, res) {
  const { from, to } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: "from and to airports required" });
  }

  try {
    const response = await fetch(
      `http://api.aviationstack.com/v1/flights?access_key=${process.env.AVIATIONSTACK_KEY}&dep_iata=${from}&arr_iata=${to}&flight_status=scheduled&limit=6`
    );
    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      return res.status(404).json({ error: "No alternatives found" });
    }

    const alternatives = data.data.map((f) => ({
      flight:   f.flight?.iata,
      airline:  f.airline?.name,
      dep:      f.departure?.scheduled?.slice(11, 16),
      arr:      f.arrival?.scheduled?.slice(11, 16),
      depDelay: f.departure?.delay || 0,
      arrDelay: f.arrival?.delay || 0,
      status:   f.flight_status,
    }));

    return res.status(200).json({ alternatives });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch alternatives" });
  }
}
