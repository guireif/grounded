export default async function handler(req, res) {
  const { registration, depIata } = req.query;

  if (!registration) {
    return res.status(400).json({ error: "Aircraft registration required" });
  }

  try {
    const headers = {
      "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
      "x-rapidapi-key":  process.env.AERODATABOX_KEY,
    };

    // AeroDataBox uses local date — get today and yesterday in UTC
    const now       = new Date();
    const today     = now.toISOString().split("T")[0];
    const yesterday = new Date(now - 86400000).toISOString().split("T")[0];

    // Clean registration — remove dashes/spaces
    const reg = registration.replace(/[-\s]/g, "");

    // Try today first, then yesterday (for early morning flights)
    // Correct endpoint: /flights/reg/{reg}/{localDate}
    const urls = [
      `https://aerodatabox.p.rapidapi.com/flights/reg/${reg}/${today}`,
      `https://aerodatabox.p.rapidapi.com/flights/reg/${reg}/${yesterday}`,
    ];

    let allFlights = [];
    const debugInfo = [];

    for (const url of urls) {
      const r = await fetch(url, { headers });
      const status = r.status;
      debugInfo.push({ url, status });

      if (r.ok) {
        const data = await r.json();
        // AeroDataBox returns { items: [...] } or just an array
        const items = Array.isArray(data) ? data : (data.items || data.flights || []);
        allFlights = [...allFlights, ...items];
      }
    }

    if (!allFlights.length) {
      return res.status(404).json({
        error: "No flights found for this aircraft today",
        debug: debugInfo,
        registration: reg,
      });
    }

    // Sort by scheduled departure
    allFlights.sort((a, b) =>
      new Date(a.departure?.scheduledTime?.utc || a.departure?.scheduled || 0) -
      new Date(b.departure?.scheduledTime?.utc || b.departure?.scheduled || 0)
    );

    // Find index of our departure (by airport)
    const targetIdx = depIata
      ? allFlights.findIndex(f =>
          (f.departure?.airport?.iata || f.departure?.iata || "").toUpperCase() === depIata.toUpperCase()
        )
      : -1;

    const ourFlightIdx  = targetIdx >= 0 ? targetIdx : allFlights.length - 1;
    const inboundFlight = ourFlightIdx > 0 ? allFlights[ourFlightIdx - 1] : allFlights[0];
    const isOurFlight   = ourFlightIdx === 0;

    // Helper to extract airport IATA regardless of response shape
    const getIata = (leg, side) => leg?.[side]?.airport?.iata || leg?.[side]?.iata || "?";
    const getName = (leg, side) => leg?.[side]?.airport?.name || leg?.[side]?.name || null;
    const getTime = (leg, side, field) =>
      leg?.[side]?.scheduledTime?.[field] ||
      leg?.[side]?.actualTime?.[field]    ||
      leg?.[side]?.estimatedTime?.[field] ||
      leg?.[side]?.scheduled              ||
      null;

    // Map status
    const rawStatus = (inboundFlight.status || "").toLowerCase();
    let phase = "scheduled";
    if (rawStatus.includes("arrived") || rawStatus.includes("landed"))            phase = "landed";
    else if (rawStatus.includes("en route") || rawStatus.includes("airborne") ||
             rawStatus.includes("departed"))                                       phase = "enroute";
    else if (rawStatus.includes("boarding"))                                       phase = "boarding";
    else if (rawStatus.includes("cancel"))                                         phase = "cancelled";
    else if (rawStatus.includes("delay"))                                          phase = "delayed";

    const fromIata = getIata(inboundFlight, "departure");
    const toIata   = getIata(inboundFlight, "arrival");
    const arrEst   = getTime(inboundFlight, "arrival", "local") || getTime(inboundFlight, "arrival", "utc");

    const fmtT = iso => {
      if (!iso) return null;
      try { return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false }); }
      catch { return null; }
    };

    // Build human-readable message
    let urgency = "neutral";
    let message = "";

    if (phase === "landed") {
      urgency = "green";
      message = isOurFlight
        ? `Plane is on the ground at ${toIata} — turnaround underway`
        : `Plane just landed at ${toIata} from ${fromIata} — boarding should start soon`;
    } else if (phase === "enroute") {
      urgency = "yellow";
      const eta = fmtT(arrEst);
      message = isOurFlight
        ? `Your flight is airborne — landing at ${toIata}${eta ? ` at ${eta}` : ""}`
        : `Your plane is flying ${fromIata} → ${toIata}${eta ? `, lands ~${eta}` : ""}`;
    } else if (phase === "boarding") {
      urgency = "yellow";
      message = isOurFlight
        ? "Boarding now — head to the gate!"
        : `Plane is boarding at ${fromIata} — on its way soon`;
    } else if (phase === "cancelled") {
      urgency = "red";
      message = "Inbound flight was cancelled — your departure may be affected";
    } else if (phase === "delayed") {
      urgency = "red";
      message = `Plane is delayed at ${fromIata} — expect a late arrival`;
    } else {
      urgency = "neutral";
      const depT = fmtT(getTime(inboundFlight, "departure", "local"));
      message = isOurFlight
        ? `Flight scheduled${depT ? ` — departs at ${depT}` : ""}`
        : `Plane scheduled to depart ${fromIata}${depT ? ` at ${depT}` : ""}`;
    }

    return res.status(200).json({
      registration: reg,
      phase,
      urgency,
      message,
      isOurFlight,
      inbound: {
        flight:    inboundFlight.number || inboundFlight.flightNumber,
        status:    inboundFlight.status,
        from:      fromIata,
        fromName:  getName(inboundFlight, "departure"),
        to:        toIata,
        toName:    getName(inboundFlight, "arrival"),
        depSched:  getTime(inboundFlight, "departure", "local"),
        arrSched:  getTime(inboundFlight, "arrival",   "local"),
        arrEst:    arrEst,
        depDelay:  inboundFlight.departure?.delay || 0,
        arrDelay:  inboundFlight.arrival?.delay   || 0,
      },
      allLegs: allFlights.map(f => ({
        flight:   f.number || f.flightNumber,
        status:   f.status,
        from:     getIata(f, "departure"),
        to:       getIata(f, "arrival"),
        depSched: getTime(f, "departure", "local"),
        arrSched: getTime(f, "arrival",   "local"),
      })),
    });

  } catch (error) {
    return res.status(500).json({
      error:  "Failed to fetch aircraft position",
      detail: error.message,
    });
  }
}