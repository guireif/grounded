export default async function handler(req, res) {
  const { carrier, flightNum, origin, dest } = req.query;

  if (!flightNum) {
    return res.status(400).json({ error: "flightNum required" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const headers = {
    "apikey":        supabaseKey,
    "Authorization": `Bearer ${supabaseKey}`,
    "Content-Type":  "application/json",
  };

  try {
    let rows = [];
    let usedCarrier = carrier;

    // Try 1: exact carrier + flight number + route
    if (carrier) {
      let url = `${supabaseUrl}/rest/v1/flight_stats?carrier=eq.${carrier}&flight_num=eq.${flightNum}&select=*&limit=2000`;
      if (origin) url += `&origin=eq.${origin}`;
      if (dest)   url += `&dest=eq.${dest}`;
      const r = await fetch(url, { headers });
      rows = await r.json();
    }

    // Try 2: just flight number (catches regional/codeshare flights)
    if (!rows || rows.length === 0) {
      let url = `${supabaseUrl}/rest/v1/flight_stats?flight_num=eq.${flightNum}&select=*&limit=2000`;
      if (origin) url += `&origin=eq.${origin}`;
      if (dest)   url += `&dest=eq.${dest}`;
      const r = await fetch(url, { headers });
      rows = await r.json();
      // Note the actual carrier found
      if (rows && rows.length > 0) {
        usedCarrier = rows[0].carrier;
      }
    }

    // Try 3: just flight number, no route filter
    if (!rows || rows.length === 0) {
      const url = `${supabaseUrl}/rest/v1/flight_stats?flight_num=eq.${flightNum}&select=*&limit=2000`;
      const r = await fetch(url, { headers });
      rows = await r.json();
      if (rows && rows.length > 0) {
        usedCarrier = rows[0].carrier;
      }
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No historical data found for this flight" });
    }

    const total     = rows.length;
    const cancelled = rows.filter(r => r.cancelled === 1).length;
    const flown     = rows.filter(r => r.cancelled !== 1);
    const delayed   = flown.filter(r => r.arr_delay > 0);
    const onTime    = flown.filter(r => r.arr_delay <= 0);

    const avgDelay = delayed.length > 0
      ? delayed.reduce((sum, r) => sum + (r.arr_delay || 0), 0) / delayed.length
      : 0;

    const histogram = [
      { label:"On time", count: onTime.length,                                                        color:"#16a34a" },
      { label:"1–15m",   count: flown.filter(r => r.arr_delay > 0   && r.arr_delay <= 15).length,   color:"#65a30d" },
      { label:"15–30m",  count: flown.filter(r => r.arr_delay > 15  && r.arr_delay <= 30).length,   color:"#d97706" },
      { label:"30–60m",  count: flown.filter(r => r.arr_delay > 30  && r.arr_delay <= 60).length,   color:"#ea580c" },
      { label:"1–2hrs",  count: flown.filter(r => r.arr_delay > 60  && r.arr_delay <= 120).length,  color:"#dc2626" },
      { label:"2+hrs",   count: flown.filter(r => r.arr_delay > 120).length,                        color:"#9f1239" },
    ];

    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const byDay = dayNames.map((day, i) => {
      const dayRows  = flown.filter(r => r.day_of_week === i + 1);
      const dayDelay = dayRows.filter(r => r.arr_delay > 0);
      return { day, delayRate: dayRows.length > 0 ? dayDelay.length / dayRows.length : 0 };
    });

    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const byMonth = monthNames.map((month, i) => {
      const mRows  = flown.filter(r => r.month === i + 1);
      const mDelay = mRows.filter(r => r.arr_delay > 0);
      return { month, delayRate: mRows.length > 0 ? mDelay.length / mRows.length : 0 };
    });

    const causes = [
      { name:"Late Aircraft", value: delayed.filter(r => (r.late_aircraft_delay || 0) > 0).length, color:"#ea580c" },
      { name:"Carrier",       value: delayed.filter(r => (r.carrier_delay       || 0) > 0).length, color:"#dc2626" },
      { name:"NAS/ATC",       value: delayed.filter(r => (r.nas_delay           || 0) > 0).length, color:"#d97706" },
      { name:"Weather",       value: delayed.filter(r => (r.weather_delay       || 0) > 0).length, color:"#2563eb" },
      { name:"Security",      value: delayed.filter(r => (r.security_delay      || 0) > 0).length, color:"#7c3aed" },
    ].filter(c => c.value > 0);

    // Note if we had to use a different carrier
    const carrierNote = usedCarrier && carrier && usedCarrier !== carrier
      ? ` · Operated by ${usedCarrier} (not ${carrier})`
      : "";

    return res.status(200).json({
      total,
      onTimeRate:  flown.length > 0 ? onTime.length / flown.length : 0,
      delayRate:   flown.length > 0 ? delayed.length / flown.length : 0,
      cancelRate:  total > 0 ? cancelled / total : 0,
      avgDelay:    Math.round(avgDelay),
      histogram,
      byDay,
      byMonth,
      causes,
      actualCarrier: usedCarrier,
      dataNote: `BTS On-Time Performance data · Nov 2025${carrierNote}`,
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch history", detail: error.message });
  }
}