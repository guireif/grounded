export default async function handler(req, res) {
  const { flight, depIata } = req.query;

  if (!flight) {
    return res.status(400).json({ error: "flight number required" });
  }

  const headers = {
    "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
    "x-rapidapi-key":  process.env.AERODATABOX_KEY,
  };

  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  try {
    // Fetch today and yesterday to find inbound leg
    let allFlights = [];

    for (const date of [yesterday, today]) {
      try {
        const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flight}/${date}`;
        const r   = await fetch(url, { headers });
        if (!r.ok) continue;
        const text = await r.text();
        if (!text || text.trim().length === 0) continue;
        const data = JSON.parse(text);
        const items = Array.isArray(data) ? data : [data];
        allFlights = [...allFlights, ...items.filter(f => f && f.departure)];
      } catch { continue; }
    }

    if (!allFlights.length) {
      return res.status(200).json({ error: "No flight data found" });
    }

    // Sort chronologically
    allFlights.sort((a, b) => {
      const ta = new Date(a.departure?.scheduledTime?.utc || a.departure?.scheduled || 0);
      const tb = new Date(b.departure?.scheduledTime?.utc || b.departure?.scheduled || 0);
      return ta - tb;
    });

    const now = new Date();

    // Find the most relevant flight:
    // 1. If depIata given, match by departure airport
    // 2. Otherwise find the flight closest to now (in progress or most recently departed)
    let ourIdx = -1;

    if (depIata) {
      ourIdx = allFlights.findIndex(f =>
        (f.departure?.airport?.iata || f.departure?.iata || "").toUpperCase() === depIata.toUpperCase()
      );
    }

    if (ourIdx === -1) {
      // Find flight currently in progress or most recently relevant
      const active = allFlights.findIndex(f => {
        const s = (f.status || "").toLowerCase().replace(/[\s_-]/g, "");
        return s.includes("enroute") || s.includes("airborne") || s.includes("boarding") || s.includes("departed");
      });
      if (active >= 0) {
        ourIdx = active;
      } else {
        // Pick the flight whose departure is closest to now (past or future)
        ourIdx = allFlights.reduce((best, f, i) => {
          const depTime = new Date(f.departure?.scheduledTime?.utc || f.departure?.scheduled || 0);
          const bestTime = new Date(allFlights[best]?.departure?.scheduledTime?.utc || allFlights[best]?.departure?.scheduled || 0);
          return Math.abs(depTime - now) < Math.abs(bestTime - now) ? i : best;
        }, 0);
      }
    }

    const currentFlight = allFlights[ourIdx];
    const inboundFlight = ourIdx > 0 ? allFlights[ourIdx - 1] : null;

    // Map status helper
    const mapPhase = status => {
      const s = (status || "").toLowerCase().replace(/[\s_-]/g, "");
      if (s.includes("arrived") || s.includes("landed"))                        return "landed";
      if (s.includes("enroute") || s.includes("airborne") ||
          s.includes("departed") || s.includes("active"))                       return "enroute";
      if (s.includes("boarding"))                                                return "boarding";
      if (s.includes("cancel"))                                                  return "cancelled";
      if (s.includes("delay"))                                                   return "delayed";
      return "scheduled";
    };

    const fmtTime = iso => {
      if (!iso) return null;
      try { return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false }); }
      catch { return null; }
    };

    const getIata = (f, side) => f?.[side]?.airport?.iata || f?.[side]?.iata || "?";
    const getName = (f, side) => f?.[side]?.airport?.name || f?.[side]?.name || null;
    const getT    = (f, side, tz) =>
      f?.[side]?.scheduledTime?.[tz]  ||
      f?.[side]?.actualTime?.[tz]     ||
      f?.[side]?.estimatedTime?.[tz]  ||
      (tz === "local" ? f?.[side]?.scheduled : null) || null;

    // Build response based on current flight phase
    const currentPhase = mapPhase(currentFlight.status);
    const currentFrom  = getIata(currentFlight, "departure");
    const currentTo    = getIata(currentFlight, "arrival");
    const arrEst       = getT(currentFlight, "arrival", "local") || getT(currentFlight, "arrival", "utc");

    let phase, urgency, message;

    if (currentPhase === "enroute") {
      // Flight is in the air right now
      phase   = "enroute";
      urgency = "blue";
      message = `Your flight is in the air — ${currentFrom} → ${currentTo}, landing ${fmtTime(arrEst) || "soon"}`;
    } else if (currentPhase === "landed") {
      phase   = "landed";
      urgency = "green";
      message = `Plane has landed at ${currentTo} — turnaround underway, boarding soon`;
    } else if (currentPhase === "boarding") {
      phase   = "boarding";
      urgency = "yellow";
      message = "Boarding now — head to the gate!";
    } else if (inboundFlight) {
      // Our flight hasn't started yet — show where the plane is coming from
      const inPhase = mapPhase(inboundFlight.status);
      const inFrom  = getIata(inboundFlight, "departure");
      const inTo    = getIata(inboundFlight, "arrival");
      const inArr   = getT(inboundFlight, "arrival", "local") || getT(inboundFlight, "arrival", "utc");

      if (inPhase === "landed") {
        phase   = "landed";
        urgency = "green";
        message = `Plane has landed at ${inTo} from ${inFrom} — preparing for your flight`;
      } else if (inPhase === "enroute") {
        phase   = "enroute";
        urgency = "yellow";
        message = `Your plane is flying ${inFrom} → ${inTo}, arrives ~${fmtTime(inArr) || "soon"} before your flight`;
      } else if (inPhase === "delayed") {
        phase   = "delayed";
        urgency = "red";
        message = `Inbound plane is delayed at ${inFrom} — expect a late departure`;
      } else {
        phase   = "scheduled";
        urgency = "neutral";
        const depT = fmtTime(getT(inboundFlight, "departure", "local"));
        message = `Plane departs ${inFrom} at ${depT || "TBD"} before your flight`;
      }
    } else {
      // No inbound data — just report current flight status
      phase   = currentPhase;
      urgency = "neutral";
      const depT = fmtTime(getT(currentFlight, "departure", "local"));
      message = `Flight scheduled to depart ${currentFrom} at ${depT || "TBD"}`;
    }

    return res.status(200).json({
      phase,
      urgency,
      message,
      current: {
        flight:   currentFlight.number,
        status:   currentFlight.status,
        from:     currentFrom,
        fromName: getName(currentFlight, "departure"),
        to:       currentTo,
        toName:   getName(currentFlight, "arrival"),
        depSched: getT(currentFlight, "departure", "local"),
        arrSched: getT(currentFlight, "arrival",   "local"),
        arrEst,
        depDelay: currentFlight.departure?.delay || 0,
        arrDelay: currentFlight.arrival?.delay   || 0,
      },
      inbound: inboundFlight ? {
        flight:   inboundFlight.number,
        status:   inboundFlight.status,
        from:     getIata(inboundFlight, "departure"),
        fromName: getName(inboundFlight, "departure"),
        to:       getIata(inboundFlight, "arrival"),
        toName:   getName(inboundFlight, "arrival"),
        depSched: getT(inboundFlight, "departure", "local"),
        arrSched: getT(inboundFlight, "arrival",   "local"),
        arrEst:   getT(inboundFlight, "arrival", "local") || getT(inboundFlight, "arrival", "utc"),
        depDelay: inboundFlight.departure?.delay || 0,
        arrDelay: inboundFlight.arrival?.delay   || 0,
      } : null,
      allLegs: allFlights.map(f => ({
        flight:   f.number,
        status:   f.status,
        from:     getIata(f, "departure"),
        to:       getIata(f, "arrival"),
        depSched: getT(f, "departure", "local"),
        arrSched: getT(f, "arrival",   "local"),
      })),
    });

  } catch (error) {
    return res.status(500).json({
      error:  "Failed to fetch aircraft position",
      detail: error.message,
    });
  }
}