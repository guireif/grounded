export default async function handler(req, res) {
  const { origin, dest, depTime } = req.query;

  if (!origin || !dest) {
    return res.status(400).json({ error: "origin and dest required" });
  }

  const headers = {
    "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
    "x-rapidapi-key":  process.env.AERODATABOX_KEY,
  };

  try {
    // Build time window: 3 hours before and after the departure time
    const base = depTime ? new Date(depTime) : new Date();
    const from = new Date(base.getTime() - 3 * 3600000);
    const to   = new Date(base.getTime() + 3 * 3600000);

    // Format as YYYY-MM-DDTHH:mm (local, no Z)
    const fmt = d => d.toISOString().slice(0, 16);

    const url = `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${origin}/${fmt(from)}/${fmt(to)}?direction=Dep&withLeg=true&withCancelled=false&withCodeshared=false&withLocation=false`;

    const r = await fetch(url, { headers });

    if (!r.ok) {
      const text = await r.text();
      return res.status(200).json({ error: "Could not fetch departures", detail: text.slice(0, 200) });
    }

    const data = await fetch(url, { headers }).then(r => r.json());
    const departures = data?.departures || data?.items || [];

    if (!departures.length) {
      return res.status(200).json({ error: "No departures found", alternatives: [] });
    }

    // Filter to flights going to the same destination
    const alts = departures
      .filter(f => {
        const arrIata = f.arrival?.airport?.iata || f.arrival?.iata || "";
        return arrIata.toUpperCase() === dest.toUpperCase();
      })
      .map(f => {
        const depSched = f.departure?.scheduledTime?.local || f.departure?.scheduled;
        const arrSched = f.arrival?.scheduledTime?.local   || f.arrival?.scheduled;
        const depDelay = f.departure?.delay || 0;
        const status   = f.status || "Scheduled";

        // Calculate duration in minutes
        let durationMin = null;
        if (depSched && arrSched) {
          durationMin = Math.round((new Date(arrSched) - new Date(depSched)) / 60000);
        }

        const fmtTime = iso => {
          if (!iso) return null;
          try { return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false }); }
          catch { return null; }
        };

        return {
          flight:      f.number || f.flightNumber,
          airline:     f.airline?.name || "Unknown",
          airlineIata: f.airline?.iata || "",
          status,
          depSched:    fmtTime(depSched),
          arrSched:    fmtTime(arrSched),
          depDelay,
          durationMin,
          terminal:    f.departure?.terminal || null,
          gate:        f.departure?.gate     || null,
          aircraft:    f.aircraft?.model     || null,
        };
      })
      .sort((a, b) => (a.depSched || "").localeCompare(b.depSched || ""));

    return res.status(200).json({ alternatives: alts, origin, dest });

  } catch (error) {
    return res.status(200).json({
      error:  "Failed to fetch alternatives",
      detail: error.message,
      alternatives: [],
    });
  }
}