export default async function handler(req, res) {
  const { flight } = req.query;

  if (!flight) {
    return res.status(400).json({ error: "Flight number required" });
  }

  try {
    // Get today's date in YYYY-MM-DD format
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
      return res.status(404).json({ error: `Flight ${flight} not found` });
    }

    const data = await response.json();

    // AeroDataBox returns an array of flights
    const flights = Array.isArray(data) ? data : [data];
    if (!flights.length) {
      return res.status(404).json({ error: "No flight data found" });
    }

    const f = flights[0];

    // Map AeroDataBox response to our app's format
    const depScheduled  = f.departure?.scheduledTime?.local  || f.departure?.scheduledTime?.utc;
    const depActual     = f.departure?.actualTime?.local      || f.departure?.actualTime?.utc;
    const arrScheduled  = f.arrival?.scheduledTime?.local     || f.arrival?.scheduledTime?.utc;
    const arrEstimated  = f.arrival?.estimatedTime?.local     || f.arrival?.estimatedTime?.utc;
    const depDelay      = f.departure?.delay || 0;
    const arrDelay      = f.arrival?.delay   || 0;

    // Map AeroDataBox status to our display status
    const rawStatus = f.status || "Unknown";
    let status = "scheduled";
    if (rawStatus.toLowerCase().includes("landed"))    status = "landed";
    if (rawStatus.toLowerCase().includes("en route") ||
        rawStatus.toLowerCase().includes("airborne"))  status = "active";
    if (rawStatus.toLowerCase().includes("cancel"))    status = "cancelled";
    if (rawStatus.toLowerCase().includes("delay"))     status = "scheduled";

    return res.status(200).json({
      flight:   f.number || flight,
      airline:  f.airline?.name,
      status,
      rawStatus,
      departure: {
        airport:   f.departure?.airport?.name,
        iata:      f.departure?.airport?.iata,
        scheduled: depScheduled,
        actual:    depActual,
        delay:     depDelay,
        gate:      f.departure?.gate,
        terminal:  f.departure?.terminal,
      },
      arrival: {
        airport:   f.arrival?.airport?.name,
        iata:      f.arrival?.airport?.iata,
        scheduled: arrScheduled,
        estimated: arrEstimated,
        delay:     arrDelay,
        gate:      f.arrival?.gate,
        terminal:  f.arrival?.terminal,
      },
      aircraft: {
        model:        f.aircraft?.model,
        registration: f.aircraft?.reg,
      },
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch flight data", detail: error.message });
  }
}