export default async function handler(req, res) {
  const { flight, registration } = req.query;

  if (!flight && !registration) {
    return res.status(400).json({ error: "flight or registration required" });
  }

  const headers = {
    "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
    "x-rapidapi-key":  process.env.AERODATABOX_KEY,
  };

  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const getIata = (f, side) =>
    f?.[side]?.airport?.iata || f?.[side]?.iata || "?";
  const getName = (f, side) =>
    f?.[side]?.airport?.name || f?.[side]?.name || null;
  const getT = (f, side, tz) =>
    f?.[side]?.scheduledTime?.[tz]  ||
    f?.[side]?.revisedTime?.[tz]    ||
    f?.[side]?.actualTime?.[tz]     ||
    f?.[side]?.estimatedTime?.[tz]  ||
    null;

  const fmtTime = iso => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false }); }
    catch { return null; }
  };

  const mapPhase = status => {
    const s = (status || "").toLowerCase().replace(/[\s_-]/g, "");
    if (s.includes("arrived") || s.includes("landed"))                        return "landed";
    if (s.includes("enroute") || s.includes("airborne") ||
        s.includes("departed") || s.includes("active") ||
        s.includes("approaching"))                                             return "enroute";
    if (s.includes("boarding"))                                                return "boarding";
    if (s.includes("cancel"))                                                  return "cancelled";
    if (s.includes("delay"))                                                   return "delayed";
    return "scheduled";
  };

  try {
    let allFlights = [];

    // Strategy 1: Search by registration (best — shows all legs regardless of flight number)
    if (registration) {
      const reg = registration.replace(/[-\s]/g, "");
      for (const date of [yesterday, today]) {
        try {
          const url = `https://aerodatabox.p.rapidapi.com/flights/reg/${reg}/${date}`;
          const r   = await fetch(url, { headers });
          if (!r.ok) continue;
          const text = await r.text();
          if (!text || !text.trim()) continue;
          const data = JSON.parse(text);
          const items = Array.isArray(data) ? data : [data];
          allFlights = [...allFlights, ...items.filter(f => f?.departure)];
        } catch { continue; }
      }
    }

    // Strategy 2: Fall back to flight number search
    if (!allFlights.length && flight) {
      for (const date of [yesterday, today]) {
        try {
          const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flight}/${date}`;
          const r   = await fetch(url, { headers });
          if (!r.ok) continue;
          const text = await r.text();
          if (!text || !text.trim()) continue;
          const data = JSON.parse(text);
          const items = Array.isArray(data) ? data : [data];
          allFlights = [...allFlights, ...items.filter(f => f?.departure)];
        } catch { continue; }
      }
    }

    if (!allFlights.length) {
      return res.status(200).json({ error: "No flight data found" });
    }

    // Sort chronologically
    allFlights.sort((a, b) =>
      new Date(getT(a, "departure", "utc") || 0) -
      new Date(getT(b, "departure", "utc") || 0)
    );

    const now = new Date();

    // Find our target flight (the one matching the requested flight number)
    let ourIdx = -1;
    if (flight) {
      const clean = flight.replace(/\s/g, "").toUpperCase();
      ourIdx = allFlights.findIndex(f => {
        const num = (f.number || f.flightNumber || "").replace(/\s/g, "").toUpperCase();
        return num === clean;
      });
    }

    // If not found by flight number, pick the one closest to now (upcoming or active)
    if (ourIdx === -1) {
      const active = allFlights.findIndex(f => {
        const s = mapPhase(f.status);
        return s === "enroute" || s === "boarding";
      });
      ourIdx = active >= 0 ? active : allFlights.reduce((best, f, i) => {
        const dt = Math.abs(new Date(getT(f, "departure", "utc") || 0) - now);
        const db = Math.abs(new Date(getT(allFlights[best], "departure", "utc") || 0) - now);
        return dt < db ? i : best;
      }, 0);
    }

    const ourFlight     = allFlights[ourIdx];
    const inboundFlight = ourIdx > 0 ? allFlights[ourIdx - 1] : null;

    // Build message based on inbound + our flight status
    const ourPhase = mapPhase(ourFlight?.status);
    let phase, urgency, message;

    if (ourPhase === "enroute") {
      phase   = "enroute";
      urgency = "blue";
      const eta = fmtTime(getT(ourFlight, "arrival", "local"));
      message = `Your flight is airborne — landing at ${getIata(ourFlight, "arrival")}${eta ? ` at ${eta}` : ""}`;
    } else if (ourPhase === "landed" && !inboundFlight) {
      // Our flight itself has landed (no more legs)
      phase   = "landed";
      urgency = "green";
      message = `Flight has arrived at ${getIata(ourFlight, "arrival")}`;
    } else if (ourPhase === "boarding") {
      phase   = "boarding";
      urgency = "yellow";
      message = "Boarding now — head to the gate!";
    } else if (inboundFlight) {
      const inPhase = mapPhase(inboundFlight.status);
      const inFrom  = getIata(inboundFlight, "departure");
      const inTo    = getIata(inboundFlight, "arrival");
      const inArr   = fmtTime(getT(inboundFlight, "arrival", "local"));

      if (inPhase === "enroute") {
        phase   = "enroute";
        urgency = "yellow";
        message = `Your plane is flying ${inFrom} → ${inTo}${inArr ? `, lands ~${inArr}` : ""} before your flight`;
      } else if (inPhase === "landed") {
        phase   = "landed";
        urgency = "green";
        message = `Your plane is at ${inTo} (arrived from ${inFrom}) — ready for your departure`;
      } else if (inPhase === "delayed") {
        phase   = "delayed";
        urgency = "red";
        message = `Your plane is delayed at ${inFrom} — expect a late departure`;
      } else {
        phase   = "scheduled";
        urgency = "neutral";
        const depT = fmtTime(getT(inboundFlight, "departure", "local"));
        message = `Your plane departs ${inFrom}${depT ? ` at ${depT}` : ""} before your flight`;
      }
    } else {
      phase   = ourPhase;
      urgency = "neutral";
      const depT = fmtTime(getT(ourFlight, "departure", "local"));
      message = `Flight scheduled to depart ${getIata(ourFlight, "departure")}${depT ? ` at ${depT}` : ""}`;
    }

    return res.status(200).json({
      phase,
      urgency,
      message,
      current: {
        flight:   ourFlight.number || ourFlight.flightNumber,
        status:   ourFlight.status,
        from:     getIata(ourFlight, "departure"),
        fromName: getName(ourFlight, "departure"),
        to:       getIata(ourFlight, "arrival"),
        toName:   getName(ourFlight, "arrival"),
        depSched: getT(ourFlight, "departure", "local"),
        arrSched: getT(ourFlight, "arrival",   "local"),
        arrEst:   getT(ourFlight, "arrival",   "local"),
        depDelay: ourFlight.departure?.delay || 0,
        arrDelay: ourFlight.arrival?.delay   || 0,
      },
      inbound: inboundFlight ? {
        flight:   inboundFlight.number || inboundFlight.flightNumber,
        status:   inboundFlight.status,
        from:     getIata(inboundFlight, "departure"),
        fromName: getName(inboundFlight, "departure"),
        to:       getIata(inboundFlight, "arrival"),
        toName:   getName(inboundFlight, "arrival"),
        depSched: getT(inboundFlight, "departure", "local"),
        arrSched: getT(inboundFlight, "arrival",   "local"),
        arrEst:   getT(inboundFlight, "arrival",   "local"),
        depDelay: inboundFlight.departure?.delay || 0,
        arrDelay: inboundFlight.arrival?.delay   || 0,
      } : null,
      allLegs: allFlights.map(f => ({
        flight:   f.number || f.flightNumber,
        status:   f.status,
        from:     getIata(f, "departure"),
        to:       getIata(f, "arrival"),
        depSched: getT(f, "departure", "local"),
        arrSched: getT(f, "arrival",   "local"),
      })),
    });

  } catch (error) {
    return res.status(200).json({
      error:  "Failed to fetch aircraft data",
      detail: error.message,
    });
  }
}