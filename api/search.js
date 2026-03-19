export default async function handler(req, res) {
    const { q } = req.query;
  
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Query too short" });
    }
  
    try {
      const query = q.replace(" ", "").toUpperCase();
  
      const response = await fetch(
        `http://api.aviationstack.com/v1/flights?access_key=${process.env.AVIATIONSTACK_KEY}&flight_iata=${query}&limit=5`
      );
      const data = await response.json();
  
      if (!data.data || data.data.length === 0) {
        return res.status(200).json({ results: [] });
      }
  
      const results = data.data.map(f => ({
        flight:   f.flight?.iata,
        airline:  f.airline?.name,
        from:     f.departure?.iata,
        to:       f.arrival?.iata,
        route:    `${f.departure?.iata} → ${f.arrival?.iata}`,
        status:   f.flight_status,
      })).filter(f => f.flight && f.from && f.to);
  
      return res.status(200).json({ results });
  
    } catch (error) {
      return res.status(500).json({ error: "Search failed", detail: error.message });
    }
  }