export default async function handler(req, res) {
  const { registration, depIata, flight } = req.query;

  if (!registration && !flight) {
    return res.status(400).json({ error: "registration or flight required" });
  }

  const headers = {
    "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
    "x-rapidapi-key":  process.env.AERODATABOX_KEY,
  };

  const today     = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  try {
    // Strategy 1: Try flights by registration (may not be available on free tier)
    if (registration) {
      const reg = registration.replace(/[-\s]/g, "");
      let items = [];

      for (const date of [today, yesterday]) {
        try {
          const url = `https://aerodatabox.p.rapidapi.com/flights/reg/${reg}/${date}`;
          const r   = await fetch(url, { headers });
          if (r.ok && r.headers.get("content-length") !== "0") {
            const text = await r.text();
            if (text && text.trim().length > 0) {
              const data = JSON.parse(text);
              const flights = Array.isArray(data) ? data : (data.items || data.flights || []);
              items = [...items, ...flights];
            }
          }
        } catch (e) {
          // silently continue
        }
      }

      if (items.length > 0) {
        return res.status(200).json(buildResponse(items, depIata, registration));
      }
    }

    // Strategy 2: Use flight number to get today's flight and look up airport schedule
    // to find what flew in before this flight (the inbound leg)
    if (flight || depIata) {
      const flightNum = flight || "";
      let items = [];

      // Get today's and yesterday's flight to understand the rotation
      for (const date of [today, yesterday]) {
        try {
          const url = `https://aerodatabox.p.rapidapi.com/flights/number/${flightNum}/${date}`;
          const r   = await fetch(url, { headers });
          if (r.ok) {
            const text = await r.text();
            if (text && text.trim().length > 0) {
              const data = JSON.parse(text);
              const flights = Array.isArray(data) ? data : [data];
              items = [...items, ...flights.filter(f => f && f.departure)];
            }
          }
        } catch (e) {
          // silently continue
        }
      }

      if (items.length > 0) {
        return res.status(200).json(buildResponse(items, depIata, registration));
      }
    }

    // Strategy 3: Use airport arrivals to find what aircraft is at the gate
    if (depIata) {
      try {
        const now     = new Date();
        const fromUtc = new Date(now.getTime() - 3 * 3600000).toISOString().replace(/\.\d+Z$/, "");
        const toUtc   = now.toISOString().replace(/\.\d+Z$/, "");
        const url     = `https://aerodatabox.p.rapidapi.com/flights/airports/iata/${depIata}/${fromUtc}/${toUtc}?direction=Arr&withLeg=true&withCancelled=false&withLocation=false`;
        const r       = await fetch(url, { headers });
        if (r.ok) {
          const text = await r.text();
          if (text && text.trim().length > 0) {
            const data    = JSON.parse(text);
            const arrivals = data.arrivals || data.items || [];
            // Find flight that matches our aircraft registration
            const match = arrivals.find(f =>
              f.aircraft?.reg === registration ||
              f.aircraft?.registration === registration
            );
            if (match) {
              return res.status(200).json(buildResponse([match], depIata, registration));
            }
          }
        }
      } catch (e) {
        // silently continue
      }
    }

    return res.status(404).json({
      error: "Could not determine aircraft position",
      hint:  "Registration-based tracking may not be available on current API plan",
    });

  } catch (error) {
    return res.status(500).json({
      error:  "Failed to fetch aircraft position",
      detail: error.message,
    });
  }
}

function buildResponse(allFlights, depIata, registration) {
  // Sort by departure time
  allFlights.sort((a, b) =>
    new Date(getTime(a, "departure", "utc") || 0) -
    new Date(getTime(b, "departure", "utc") || 0)
  );

  // Find our flight index by departure airport
  const targetIdx = depIata
    ? allFlights.findIndex(f =>
        (getIata(f, "departure")).toUpperCase() === depIata.toUpperCase()
      )
    : -1;

  const ourIdx      = targetIdx >= 0 ? targetIdx : allFlights.length - 1;
  const inboundFlight = ourIdx > 0 ? allFlights[ourIdx - 1] : allFlights[0];
  const isOurFlight   = ourIdx === 0 || inboundFlight === allFlights[ourIdx];

  const rawStatus = (inboundFlight.status || "").toLowerCase().replace(/[\s_-]/g, "");
  let phase = "scheduled";
  if (rawStatus.includes("arrived") || rawStatus.includes("landed"))          phase = "landed";
  else if (rawStatus.includes("enroute") || rawStatus.includes("airborne") ||
           rawStatus.includes("departed") || rawStatus.includes("active"))     phase = "enroute";
  else if (rawStatus.includes("boarding"))                                      phase = "boarding";
  else if (rawStatus.includes("cancel"))                                        phase = "cancelled";
  else if (rawStatus.includes("delay"))                                         phase = "delayed";

  const fromIata = getIata(inboundFlight, "departure");
  const toIata   = getIata(inboundFlight, "arrival");
  const arrEst   = getTime(inboundFlight, "arrival", "local") || getTime(inboundFlight, "arrival", "utc");
  const fmtT     = iso => {
    if (!iso) return null;
    try { return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false }); }
    catch { return null; }
  };

  let urgency = "neutral";
  let message = "";

  if (phase === "landed") {
    urgency = "green";
    message = isOurFlight
      ? `Plane is on the ground at ${toIata} — turnaround underway`
      : `Plane just landed at ${toIata} from ${fromIata} — boarding soon`;
  } else if (phase === "enroute") {
    urgency = "yellow";
    const eta = fmtT(arrEst);
    message = isOurFlight
      ? `Your flight is airborne — landing at ${toIata}${eta ? ` at ${eta}` : ""}`
      : `Plane flying ${fromIata} → ${toIata}${eta ? `, lands ~${eta}` : ""}`;
  } else if (phase === "boarding") {
    urgency = "yellow";
    message = isOurFlight ? "Boarding now — head to the gate!" : `Plane is boarding at ${fromIata}`;
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

  return {
    registration,
    phase,
    urgency,
    message,
    isOurFlight,
    inbound: {
      flight:   inboundFlight.number || inboundFlight.flightNumber,
      status:   inboundFlight.status,
      from:     fromIata,
      fromName: getName(inboundFlight, "departure"),
      to:       toIata,
      toName:   getName(inboundFlight, "arrival"),
      depSched: getTime(inboundFlight, "departure", "local"),
      arrSched: getTime(inboundFlight, "arrival",   "local"),
      arrEst,
      depDelay: inboundFlight.departure?.delay || 0,
      arrDelay: inboundFlight.arrival?.delay   || 0,
    },
    allLegs: allFlights.map(f => ({
      flight:   f.number || f.flightNumber,
      status:   f.status,
      from:     getIata(f, "departure"),
      to:       getIata(f, "arrival"),
      depSched: getTime(f, "departure", "local"),
      arrSched: getTime(f, "arrival",   "local"),
    })),
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getIata(f, side) {
  return f?.[side]?.airport?.iata || f?.[side]?.iata || "?";
}

function getName(f, side) {
  return f?.[side]?.airport?.name || f?.[side]?.name || null;
}

function getTime(f, side, tz) {
  return f?.[side]?.scheduledTime?.[tz]  ||
         f?.[side]?.actualTime?.[tz]     ||
         f?.[side]?.estimatedTime?.[tz]  ||
         (tz === "local" ? f?.[side]?.scheduled : null) ||
         null;
}