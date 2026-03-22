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

    // Try 2: just flight number + route
    if (!rows || rows.length === 0) {
      let url = `${supabaseUrl}/rest/v1/flight_stats?flight_num=eq.${flightNum}&select=*&limit=2000`;
      if (origin) url += `&origin=eq.${origin}`;
      if (dest)   url += `&dest=eq.${dest}`;
      const r = await fetch(url, { headers });
      rows = await r.json();
      if (rows && rows.length > 0) usedCarrier = rows[0].carrier;
    }

    // Try 3: just flight number, no route filter
    if (!rows || rows.length === 0) {
      const url = `${supabaseUrl}/rest/v1/flight_stats?flight_num=eq.${flightNum}&select=*&limit=2000`;
      const r = await fetch(url, { headers });
      rows = await r.json();
      if (rows && rows.length > 0) usedCarrier = rows[0].carrier;
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No historical data found for this flight" });
    }

    const total      = rows.length;
    const cancelled  = rows.filter(r => r.cancelled === 1).length;
    const flown      = rows.filter(r => r.cancelled !== 1);
    const n          = flown.length;

    // ── Delay buckets ──────────────────────────────────────────────────────
    const onTime  = flown.filter(r => (r.arr_delay || 0) <= 0);
    const d1_15   = flown.filter(r => (r.arr_delay || 0) > 0  && (r.arr_delay || 0) <= 15);
    const d15_30  = flown.filter(r => (r.arr_delay || 0) > 15 && (r.arr_delay || 0) <= 30);
    const d30_60  = flown.filter(r => (r.arr_delay || 0) > 30 && (r.arr_delay || 0) <= 60);
    const d60_120 = flown.filter(r => (r.arr_delay || 0) > 60 && (r.arr_delay || 0) <= 120);
    const d120p   = flown.filter(r => (r.arr_delay || 0) > 120);

    const histogram = [
      { label:"On time",  count:onTime.length,  pct: n > 0 ? onTime.length/n  : 0, color:"#16a34a" },
      { label:"1–15m",    count:d1_15.length,   pct: n > 0 ? d1_15.length/n   : 0, color:"#65a30d" },
      { label:"15–30m",   count:d15_30.length,  pct: n > 0 ? d15_30.length/n  : 0, color:"#d97706" },
      { label:"30–60m",   count:d30_60.length,  pct: n > 0 ? d30_60.length/n  : 0, color:"#ea580c" },
      { label:"1–2hrs",   count:d60_120.length, pct: n > 0 ? d60_120.length/n : 0, color:"#dc2626" },
      { label:"2+hrs",    count:d120p.length,   pct: n > 0 ? d120p.length/n   : 0, color:"#9f1239" },
    ];

    // ── Weighted delay score (excludes minor 1-15m delays) ─────────────────
    // Weights: 1-15m = 0.3, 15-30m = 0.7, 30-60m = 1.0, 60-120m = 1.5, 120m+ = 2.0
    const weightedDelays = n > 0
      ? (d1_15.length * 0.3 + d15_30.length * 0.7 + d30_60.length * 1.0 + d60_120.length * 1.5 + d120p.length * 2.0) / n
      : 0;

    // Significant delay = more than 15 min
    const sigDelayed     = flown.filter(r => (r.arr_delay || 0) > 15);
    const sigDelayRate   = n > 0 ? sigDelayed.length / n : 0;

    // ── Average delays ─────────────────────────────────────────────────────
    const delayed = flown.filter(r => (r.arr_delay || 0) > 0);
    const avgDelay = delayed.length > 0
      ? delayed.reduce((s, r) => s + (r.arr_delay || 0), 0) / delayed.length
      : 0;

    const avgSigDelay = sigDelayed.length > 0
      ? sigDelayed.reduce((s, r) => s + (r.arr_delay || 0), 0) / sigDelayed.length
      : 0;

    // ── Percentile confidence ──────────────────────────────────────────────
    const delays = flown.map(r => r.arr_delay || 0).sort((a, b) => a - b);
    const p50 = delays[Math.floor(delays.length * 0.50)] || 0;
    const p80 = delays[Math.floor(delays.length * 0.80)] || 0;
    const p95 = delays[Math.floor(delays.length * 0.95)] || 0;

    // ── By day of week ─────────────────────────────────────────────────────
    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const byDay = dayNames.map((day, i) => {
      const dayRows    = flown.filter(r => r.day_of_week === i + 1);
      const dayDelayed = dayRows.filter(r => (r.arr_delay || 0) > 15);
      const dayAvg     = dayDelayed.length > 0
        ? dayDelayed.reduce((s, r) => s + (r.arr_delay || 0), 0) / dayDelayed.length
        : 0;
      return {
        day,
        delayRate:  dayRows.length > 0 ? dayDelayed.length / dayRows.length : 0,
        avgDelay:   Math.round(dayAvg),
        flights:    dayRows.length,
      };
    });

    // ── By month ───────────────────────────────────────────────────────────
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const byMonth = monthNames.map((month, i) => {
      const mRows    = flown.filter(r => r.month === i + 1);
      const mDelayed = mRows.filter(r => (r.arr_delay || 0) > 15);
      const mAvg     = mDelayed.length > 0
        ? mDelayed.reduce((s, r) => s + (r.arr_delay || 0), 0) / mDelayed.length
        : 0;
      return {
        month,
        delayRate: mRows.length > 0 ? mDelayed.length / mRows.length : 0,
        avgDelay:  Math.round(mAvg),
        flights:   mRows.length,
      };
    });

    // ── Probability distribution curve ─────────────────────────────────────
    // Bins: every 15 min from -30 to 180
    const bins = [];
    for (let start = -30; start <= 165; start += 15) {
      const end   = start + 15;
      const label = start < 0 ? `${Math.abs(start)}m early` : start === 0 ? "On time" : `+${start}m`;
      const count = flown.filter(r => {
        const d = r.arr_delay || 0;
        return d >= start && d < end;
      }).length;
      bins.push({ label, start, end, count, pct: n > 0 ? count / n : 0 });
    }

    // ── Delay causes ───────────────────────────────────────────────────────
    const causes = [
      { name:"Late Aircraft", value: delayed.filter(r => (r.late_aircraft_delay || 0) > 0).length, color:"#ea580c" },
      { name:"Carrier",       value: delayed.filter(r => (r.carrier_delay       || 0) > 0).length, color:"#dc2626" },
      { name:"NAS/ATC",       value: delayed.filter(r => (r.nas_delay           || 0) > 0).length, color:"#d97706" },
      { name:"Weather",       value: delayed.filter(r => (r.weather_delay       || 0) > 0).length, color:"#2563eb" },
      { name:"Security",      value: delayed.filter(r => (r.security_delay      || 0) > 0).length, color:"#7c3aed" },
    ].filter(c => c.value > 0);

    const carrierNote = usedCarrier && carrier && usedCarrier !== carrier
      ? ` · Operated by ${usedCarrier} (not ${carrier})`
      : "";

    return res.status(200).json({
      total,
      flown:          n,
      onTimeRate:     n > 0 ? onTime.length / n : 0,
      anyDelayRate:   n > 0 ? delayed.length / n : 0,
      sigDelayRate,                        // >15min delay rate
      cancelRate:     total > 0 ? cancelled / total : 0,
      avgDelay:       Math.round(avgDelay),
      avgSigDelay:    Math.round(avgSigDelay),
      weightedScore:  weightedDelays,      // 0–2 scale
      p50, p80, p95,                       // percentiles in minutes
      histogram,
      byDay,
      byMonth,
      distribution:   bins,
      causes,
      actualCarrier:  usedCarrier,
      dataNote: `BTS On-Time Performance data · Nov 2025${carrierNote}`,
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch history", detail: error.message });
  }
}