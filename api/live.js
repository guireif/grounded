export default async function handler(req, res) {
  const { flight } = req.query;

  if (!flight) {
    return res.status(400).json({ error: "Flight number required" });
  }

  try {
    const today = new Date().toISOString().split("T")[0];

    const response = await fetch(
      `https://aerodatabox.p.rapidapi.com/flights/number/${flight}/${today}`,
      {
        headers: {
          "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
          "x-rapidapi-key":  process.env.AERODATABOX_KEY,
        },
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(404).json({ error: `Flight ${flight} not found`, detail: errText });
    }

    const data = await response.json();
    const flights = Array.isArray(data) ? data : [data];

    if (!flights.length) {
      return res.status(404).json({ error: "No flight data found" });
    }

    const f = flights[0];

    // ── Map status ──────────────────────────────────────────────────────────
    // AeroDataBox rawStatus can be: "Arrived", "En Route", "Departed",
    // "Boarding", "Scheduled", "Cancelled", "Delayed", "Unknown"
    const raw = (f.status || "").toLowerCase().replace(/[\s_-]/g, "");
    let status = "scheduled";
    if (raw.includes("arrived") || raw.includes("landed"))         status = "landed";
    else if (raw.includes("enroute") || raw.includes("airborne") ||
             raw.includes("departed") || raw.includes("active"))   status = "active";
    else if (raw.includes("cancel"))                                status = "cancelled";
    else if (raw.includes("delay"))                                 status = "delayed";
    else if (raw.includes("boarding"))                              status = "boarding";

    // ── Times ───────────────────────────────────────────────────────────────
    // AeroDataBox format: "2026-03-21 19:30-04:00" — parse to ISO
    const parseADBTime = t => {
      if (!t) return null;
      // Already ISO or close enough for Date parsing
      try { return new Date(t).toISOString(); } catch { return null; }
    };

    const depScheduled = parseADBTime(f.departure?.scheduledTime?.local  || f.departure?.scheduledTime?.utc  || f.departure?.scheduled);
    const depActual    = parseADBTime(f.departure?.actualTime?.local      || f.departure?.actualTime?.utc);
    const arrScheduled = parseADBTime(f.arrival?.scheduledTime?.local     || f.arrival?.scheduledTime?.utc    || f.arrival?.scheduled);
    const arrEstimated = parseADBTime(f.arrival?.estimatedTime?.local     || f.arrival?.estimatedTime?.utc    || f.arrival?.estimated);

    const depDelay = f.departure?.delay || 0;
    const arrDelay = f.arrival?.delay   || 0;

    return res.status(200).json({
      flight:   f.number || flight,
      airline:  f.airline?.name,
      status,
      rawStatus: f.status,
      departure: {
        airport:   f.departure?.airport?.name   || f.departure?.airport,
        iata:      f.departure?.airport?.iata   || f.departure?.iata,
        scheduled: depScheduled,
        actual:    depActual,
        delay:     depDelay,
        gate:      f.departure?.gate            || null,
        terminal:  f.departure?.terminal        || null,
      },
      arrival: {
        airport:   f.arrival?.airport?.name     || f.arrival?.airport,
        iata:      f.arrival?.airport?.iata     || f.arrival?.iata,
        scheduled: arrScheduled,
        estimated: arrEstimated,
        delay:     arrDelay,
        gate:      f.arrival?.gate              || null,
        terminal:  f.arrival?.terminal          || null,
      },
      aircraft: {
        model:        f.aircraft?.model,
        registration: f.aircraft?.reg || f.aircraft?.registration,
      },
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch flight data", detail: error.message });
  }
}