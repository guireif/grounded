export default async function handler(req, res) {
    const { q } = req.query;
  
    if (!q || q.trim().length < 2) {
      return res.status(400).json({ error: "Query too short" });
    }
  
    try {
      const query = q.replace(" ", "").toUpperCase();
  
      const response = await fetch(
        `http://api.aviationstack.com/v1/flights?access_key=${process.env.AVIATIONSTACK_KEY}&flight_iata=${query}&limit=10`
      );
      const data = await response.json();
  
      if (!data.data || data.data.length === 0) {
        return res.status(200).json({ results: [] });
      }
  
      // Deduplicate by flight number only — keep first occurrence
      const seen = new Set();
      const results = [];
  
      for (const f of data.data) {
        const iata = f.flight?.iata;
  
        // Must have a full flight number (e.g. AA925, not just AA)
        if (!iata || iata.length < 3) continue;
  
        // Must have both airports
        if (!f.departure?.iata || !f.arrival?.iata) continue;
  
        // Skip duplicates
        if (seen.has(iata)) continue;
        seen.add(iata);
  
        results.push({
          flight:  iata,
          airline: f.airline?.name || "",
          from:    f.departure.iata,
          to:      f.arrival.iata,
          route:   `${f.departure.iata} → ${f.arrival.iata}`,
          status:  f.flight_status,
        });
  
        if (results.length >= 5) break;
      }
  
      return res.status(200).json({ results });
  
    } catch (error) {
      return res.status(500).json({ error: "Search failed", detail: error.message });
    }
  }