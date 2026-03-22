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

    if (carrier) {
      let url = `${supabaseUrl}/rest/v1/flight_stats?carrier=eq.${carrier}&flight_num=eq.${flightNum}&select=*&limit=2000`;
      if (origin) url += `&origin=eq.${origin}`;
      if (dest)   url += `&dest=eq.${dest}`;
      const r = await fetch(url, { headers });
      rows = await r.json();
    }

    if (!rows || rows.length === 0) {
      let url = `${supabaseUrl}/rest/v1/flight_stats?flight_num=eq.${flightNum}&select=*&limit=2000`;
      if (origin) url += `&origin=eq.${origin}`;
      if (dest)   url += `&dest=eq.${dest}`;
      const r = await fetch(url, { headers });
      rows = await r.json();
      if (rows && rows.length > 0) usedCarrier = rows[0].carrier;
    }

    if (!rows || rows.length === 0) {
      const url = `${supabaseUrl}/rest/v1/flight_stats?flight_num=eq.${flightNum}&select=*&limit=2000`;
      const r = await fetch(url, { headers });
      rows = await r.json();
      if (rows && rows.length > 0) usedCarrier = rows[0].carrier;
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "No historical data found for this flight" });
    }

    const total     = rows.length;
    const cancelled = rows.filter(r => r.cancelled === 1).length;
    const flown     = rows.filter(r => r.cancelled !== 1);
    const n         = flown.length;

    const onTime  = flown.filter(r => (r.arr_delay || 0) <= 0);
    const d1_15   = flown.filter(r => (r.arr_delay || 0) > 0   && (r.arr_delay || 0) <= 15);
    const d15_30  = flown.filter(r => (r.arr_delay || 0) > 15  && (r.arr_delay || 0) <= 30);
    const d30_60  = flown.filter(r => (r.arr_delay || 0) > 30  && (r.arr_delay || 0) <= 60);
    const d60_120 = flown.filter(r => (r.arr_delay || 0) > 60  && (r.arr_delay || 0) <= 120);
    const d120p   = flown.filter(r => (r.arr_delay || 0) > 120);

    const histogram = [
      { label:"On time", count:onTime.length,  pct: n > 0 ? onTime.length/n  : 0, color:"#16a34a" },
      { label:"1–15m",   count:d1_15.length,   pct: n > 0 ? d1_15.length/n   : 0, color:"#65a30d" },
      { label:"15–30m",  count:d15_30.length,  pct: n > 0 ? d15_30.length/n  : 0, color:"#d97706" },
      { label:"30–60m",  count:d30_60.length,  pct: n > 0 ? d30_60.length/n  : 0, color:"#ea580c" },
      { label:"1–2hrs",  count:d60_120.length, pct: n > 0 ? d60_120.length/n : 0, color:"#dc2626" },
      { label:"2+hrs",   count:d120p.length,   pct: n > 0 ? d120p.length/n   : 0, color:"#9f1239" },
    ];

    // Weighted risk score — minor delays barely count
    const weightedScore = n > 0
      ? (d1_15.length*0.3 + d15_30.length*0.7 + d30_60.length*1.0 + d60_120.length*1.5 + d120p.length*2.0) / n
      : 0;

    const sigDelayed   = flown.filter(r => (r.arr_delay || 0) > 15);
    const sigDelayRate = n > 0 ? sigDelayed.length / n : 0;
    const delayed      = flown.filter(r => (r.arr_delay || 0) > 0);

    // Avg significant delay — capped at 180min to reduce outlier impact
    const avgSigDelay = sigDelayed.length > 0
      ? sigDelayed.map(r => Math.min(r.arr_delay || 0, 180)).reduce((s, v) => s + v, 0) / sigDelayed.length
      : 0;

    // Typical experience = median across ALL flights (on-time + delayed)
    // If most flights are on time, this will be 0 or negative (early)
    const allFlownSorted = flown.map(r => r.arr_delay || 0).sort((a, b) => a - b);
    const typicalDelay   = allFlownSorted.length > 0
      ? allFlownSorted[Math.floor(allFlownSorted.length / 2)]
      : 0;

    // Percentiles across all flights
    const p50 = allFlownSorted[Math.floor(allFlownSorted.length * 0.50)] || 0;
    const p80 = allFlownSorted[Math.floor(allFlownSorted.length * 0.80)] || 0;
    const p95 = allFlownSorted[Math.floor(allFlownSorted.length * 0.95)] || 0;

    // By weekday
    const dayNames = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    const byDay = dayNames.map((day, i) => {
      const dayRows    = flown.filter(r => r.day_of_week === i + 1);
      const dayDelayed = dayRows.filter(r => (r.arr_delay || 0) > 15);
      const dayAvg     = dayDelayed.length > 0
        ? dayDelayed.map(r => Math.min(r.arr_delay||0, 180)).reduce((s,v) => s+v, 0) / dayDelayed.length
        : 0;
      return {
        day,
        delayRate: dayRows.length > 0 ? dayDelayed.length / dayRows.length : 0,
        avgDelay:  Math.round(dayAvg),
        flights:   dayRows.length,
      };
    });

    // By month with daily breakdown
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const byMonth = monthNames.map((month, i) => {
      const mRows    = flown.filter(r => r.month === i + 1);
      const mDelayed = mRows.filter(r => (r.arr_delay || 0) > 15);
      const mAvg     = mDelayed.length > 0
        ? mDelayed.map(r => Math.min(r.arr_delay||0, 180)).reduce((s,v) => s+v, 0) / mDelayed.length
        : 0;
      const byDayInMonth = dayNames.map((day, di) => {
        const dRows    = mRows.filter(r => r.day_of_week === di + 1);
        const dDelayed = dRows.filter(r => (r.arr_delay || 0) > 15);
        const dAvg     = dDelayed.length > 0
          ? dDelayed.map(r => Math.min(r.arr_delay||0, 180)).reduce((s,v) => s+v, 0) / dDelayed.length
          : 0;
        return {
          day,
          delayRate: dRows.length > 0 ? dDelayed.length / dRows.length : 0,
          avgDelay:  Math.round(dAvg),
          flights:   dRows.length,
        };
      }).filter(d => d.flights > 0);
      return {
        month,
        delayRate: mRows.length > 0 ? mDelayed.length / mRows.length : 0,
        avgDelay:  Math.round(mAvg),
        flights:   mRows.length,
        byDay:     byDayInMonth,
      };
    });

    // Probability distribution — every 15 min from -30 to 180
    const distribution = [];
    for (let start = -30; start <= 165; start += 15) {
      const end   = start + 15;
      const label = start < 0 ? `${Math.abs(start)}m early` : start === 0 ? "On time" : `+${start}m`;
      const count = flown.filter(r => { const d = r.arr_delay || 0; return d >= start && d < end; }).length;
      distribution.push({ label, start, end, count, pct: n > 0 ? count/n : 0 });
    }

    // Recent trend — last 60 flights sorted by month then day_of_week
    const sorted = [...flown].sort((a, b) => {
      if (a.year  !== b.year)  return a.year  - b.year;
      if (a.month !== b.month) return a.month - b.month;
      return a.day_of_week - b.day_of_week;
    });
    const recentN  = Math.min(60, sorted.length);
    const trendRaw = sorted.slice(-recentN);
    const trend = trendRaw.map((r, i) => {
      const delay  = Math.round(r.arr_delay || 0);
      const window = trendRaw.slice(Math.max(0, i-4), i+5);
      const avg    = window.reduce((s, x) => s + (x.arr_delay||0), 0) / window.length;
      return {
        idx:        i + 1,
        delay,
        rollingAvg: Math.round(avg),
        month:      monthNames[(r.month||1)-1],
        day:        dayNames[(r.day_of_week||1)-1],
      };
    });

    // Causes
    const causes = [
      { name:"Late Aircraft", value: delayed.filter(r => (r.late_aircraft_delay||0) > 0).length, color:"#ea580c" },
      { name:"Carrier",       value: delayed.filter(r => (r.carrier_delay||0)       > 0).length, color:"#dc2626" },
      { name:"NAS/ATC",       value: delayed.filter(r => (r.nas_delay||0)           > 0).length, color:"#d97706" },
      { name:"Weather",       value: delayed.filter(r => (r.weather_delay||0)       > 0).length, color:"#2563eb" },
      { name:"Security",      value: delayed.filter(r => (r.security_delay||0)      > 0).length, color:"#7c3aed" },
    ].filter(c => c.value > 0);

    const carrierNote = usedCarrier && carrier && usedCarrier !== carrier
      ? ` · Operated by ${usedCarrier} (not ${carrier})` : "";

    return res.status(200).json({
      total,
      flown:          n,
      onTimeRate:     n > 0 ? onTime.length / n : 0,
      anyDelayRate:   n > 0 ? delayed.length / n : 0,
      sigDelayRate,
      cancelRate:     total > 0 ? cancelled / total : 0,
      typicalDelay:   Math.round(typicalDelay),
      avgSigDelay:    Math.round(avgSigDelay),
      weightedScore,
      p50, p80, p95,
      histogram,
      byDay,
      byMonth,
      distribution,
      trend,
      causes,
      actualCarrier:  usedCarrier,
      dataNote: `BTS On-Time Performance data · Nov 2025${carrierNote}`,
    });

  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch history", detail: error.message });
  }
}