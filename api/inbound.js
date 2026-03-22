export default async function handler(req, res) {
  const { registration, depIata, depTime } = req.query;

  if (!registration) {
    return res.status(400).json({ error: "Aircraft registration required" });
  }

  try {
    const today     = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const headers = {
      "x-rapidapi-host": "aerodatabox.p.rapidapi.com",
      "x-rapidapi-key":  process.env.AERODATABOX_KEY,
    };

    // Fetch all flights for this aircraft today (and yesterday for early morning flights)
    const [todayRes, yestRes] = await Promise.all([
      fetch(`https://aerodatabox.p.rapidapi.com/flights/reg/${registration}/${today}`, { headers }),
      fetch(`https://aerodatabox.p.rapidapi.com/flights/reg/${registration}/${yesterday}`, { headers }),
    ]);

    const todayData = todayRes.ok ? await todayRes.json() : { items: [] };
    const yestData  = yestRes.ok  ? await yestRes.json()  : { items: [] };

    const allFlights = [
      ...(yestData.items  || []),
      ...(todayData.items || []),
    ].filter(f => f && f.departure);

    if (!allFlights.length) {
      return res.status(404).json({ error: "No flights found for this aircraft today" });
    }

    // Sort by scheduled departure time
    allFlights.sort((a, b) =>
      new Date(a.departure.scheduledTime?.utc || 0) - new Date(b.departure.scheduledTime?.utc || 0)
    );

    // Find the index of our target flight (by departure airport)
    const targetIdx = depIata
      ? allFlights.findIndex(f => f.departure?.airport?.iata === depIata)
      : allFlights.length - 1;

    const inboundFlight = targetIdx > 0
      ? allFlights[targetIdx - 1]
      : allFlights[targetIdx]; // If first flight of day, show current flight itself

    const targetFlight = allFlights[targetIdx] || allFlights[allFlights.length - 1];

    if (!inboundFlight) {
      return res.status(404).json({ error: "No inbound flight found" });
    }

    // Map inbound status to human-readable message
    const rawStatus = (inboundFlight.status || "").toLowerCase();
    let phase = "unknown";
    let message = "";
    let urgency = "neutral"; // green / yellow / red

    const fromAirport = inboundFlight.departure?.airport?.iata || "?";
    const toAirport   = inboundFlight.arrival?.airport?.iata   || "?";
    const isOurFlight = inboundFlight === targetFlight;

    if (rawStatus.includes("arrived") || rawStatus.includes("landed")) {
      phase   = "landed";
      urgency = "green";
      message = isOurFlight
        ? `Plane is on the ground at ${toAirport} — boarding soon`
        : `Plane just landed at ${toAirport} from ${fromAirport} — turnaround underway`;
    } else if (rawStatus.includes("en route") || rawStatus.includes("airborne") || rawStatus.includes("departed")) {
      phase   = "enroute";
      urgency = "yellow";
      const arrEst = inboundFlight.arrival?.estimatedTime?.local || inboundFlight.arrival?.scheduledTime?.local;
      const eta    = arrEst ? new Date(arrEst).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false }) : "?";
      message = isOurFlight
        ? `Your flight is in the air — arrives ${toAirport} at ${eta}`
        : `Your plane is flying ${fromAirport} → ${toAirport}, lands ~${eta}`;
    } else if (rawStatus.includes("boarding")) {
      phase   = "boarding";
      urgency = "yellow";
      message = isOurFlight
        ? "Boarding now — head to the gate!"
        : `Plane is boarding at ${fromAirport} — expect it soon`;
    } else if (rawStatus.includes("cancel")) {
      phase   = "cancelled";
      urgency = "red";
      message = "Inbound flight was cancelled — your flight may be affected";
    } else if (rawStatus.includes("delay")) {
      phase   = "delayed";
      urgency = "red";
      message = `Plane is delayed at ${fromAirport} — expect a late arrival`;
    } else if (rawStatus.includes("scheduled") || rawStatus.includes("unknown")) {
      phase   = "scheduled";
      urgency = "neutral";
      const depSched = inboundFlight.departure?.scheduledTime?.local;
      const depTime2  = depSched ? new Date(depSched).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false }) : "?";
      message = isOurFlight
        ? `Flight scheduled — plane departs at ${depTime2}`
        : `Plane scheduled to depart ${fromAirport} at ${depTime2}`;
    } else {
      message = `Plane last seen at ${fromAirport}`;
    }

    return res.status(200).json({
      registration,
      phase,
      urgency,
      message,
      isOurFlight,
      inbound: {
        flight:       inboundFlight.number,
        status:       inboundFlight.status,
        from:         inboundFlight.departure?.airport?.iata,
        fromName:     inboundFlight.departure?.airport?.name,
        to:           inboundFlight.arrival?.airport?.iata,
        toName:       inboundFlight.arrival?.airport?.name,
        depSched:     inboundFlight.departure?.scheduledTime?.local,
        depActual:    inboundFlight.departure?.actualTime?.local,
        arrSched:     inboundFlight.arrival?.scheduledTime?.local,
        arrEst:       inboundFlight.arrival?.estimatedTime?.local,
        depDelay:     inboundFlight.departure?.delay || 0,
        arrDelay:     inboundFlight.arrival?.delay   || 0,
      },
      allLegs: allFlights.map(f => ({
        flight:    f.number,
        status:    f.status,
        from:      f.departure?.airport?.iata,
        to:        f.arrival?.airport?.iata,
        depSched:  f.departure?.scheduledTime?.local,
        arrSched:  f.arrival?.scheduledTime?.local,
      })),
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch aircraft position", detail: error.message });
  }
}
