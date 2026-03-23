import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie, ComposedChart,
} from "recharts";

// ─── AIRPORT LAT/LNG DATABASE ─────────────────────────────────────────────────

const AIRPORTS = {
  JFK:{ lat:40.64,  lng:-73.78 }, LAX:{ lat:33.94,  lng:-118.41 },
  ATL:{ lat:33.64,  lng:-84.43 }, EWR:{ lat:40.69,  lng:-74.17  },
  SFO:{ lat:37.62,  lng:-122.38}, DAL:{ lat:32.85,  lng:-96.85  },
  HOU:{ lat:29.65,  lng:-95.28 }, BOS:{ lat:42.36,  lng:-71.01  },
  MCO:{ lat:28.43,  lng:-81.31 }, SEA:{ lat:47.45,  lng:-122.31 },
  DEN:{ lat:39.86,  lng:-104.67}, LAS:{ lat:36.08,  lng:-115.15 },
  FLL:{ lat:26.07,  lng:-80.15 }, ORD:{ lat:41.98,  lng:-87.91  },
  DFW:{ lat:32.90,  lng:-97.04 }, PHX:{ lat:33.44,  lng:-112.01 },
  MIA:{ lat:25.80,  lng:-80.29 }, LGA:{ lat:40.78,  lng:-73.87  },
  MDW:{ lat:41.79,  lng:-87.75 }, LHR:{ lat:51.48,  lng:-0.45   },
  CDG:{ lat:49.01,  lng:2.55   }, AMS:{ lat:52.31,  lng:4.76    },
  FRA:{ lat:50.03,  lng:8.57   }, MAD:{ lat:40.47,  lng:-3.57   },
  BCN:{ lat:41.30,  lng:2.08   }, FCO:{ lat:41.80,  lng:12.24   },
  MUC:{ lat:48.35,  lng:11.79  }, ZRH:{ lat:47.46,  lng:8.55    },
  DXB:{ lat:25.25,  lng:55.36  }, DOH:{ lat:25.27,  lng:51.61   },
  SIN:{ lat:1.36,   lng:103.99 }, HKG:{ lat:22.31,  lng:113.91  },
  NRT:{ lat:35.77,  lng:140.39 }, ICN:{ lat:37.46,  lng:126.44  },
  PEK:{ lat:40.08,  lng:116.58 }, PVG:{ lat:31.14,  lng:121.81  },
  SYD:{ lat:-33.95, lng:151.18 }, MEL:{ lat:-37.67, lng:144.84  },
  GRU:{ lat:-23.43, lng:-46.47 }, EZE:{ lat:-34.82, lng:-58.54  },
  BOG:{ lat:4.70,   lng:-74.14 }, SCL:{ lat:-33.39, lng:-70.79  },
  LIM:{ lat:-12.02, lng:-77.11 }, MEX:{ lat:19.44,  lng:-99.07  },
  CUN:{ lat:21.04,  lng:-86.87 }, YYZ:{ lat:43.68,  lng:-79.63  },
  YVR:{ lat:49.19,  lng:-123.18}, NBO:{ lat:-1.32,  lng:36.93   },
  JNB:{ lat:-26.14, lng:28.24  }, CAI:{ lat:30.12,  lng:31.41   },
  BOM:{ lat:19.09,  lng:72.87  }, DEL:{ lat:28.56,  lng:77.10   },
  BKK:{ lat:13.69,  lng:100.75 }, KUL:{ lat:2.74,   lng:101.71  },
  IST:{ lat:40.98,  lng:28.82  }, ATH:{ lat:37.94,  lng:23.95   },
  LIS:{ lat:38.77,  lng:-9.13  }, DUB:{ lat:53.43,  lng:-6.24   },
};

// ─── STATIC FLIGHT METADATA ───────────────────────────────────────────────────

const FLIGHTS = {
  "AA 100": { route:"JFK → LAX", from:"JFK", to:"LAX", airline:"American Airlines", aircraft:"B777", fromCity:"New York",       toCity:"Los Angeles" },
  "DL 400": { route:"ATL → JFK", from:"ATL", to:"JFK", airline:"Delta Air Lines",   aircraft:"A321", fromCity:"Atlanta",         toCity:"New York" },
  "UA 1":   { route:"EWR → SFO", from:"EWR", to:"SFO", airline:"United Airlines",   aircraft:"B757", fromCity:"Newark",          toCity:"San Francisco" },
  "SW 100": { route:"DAL → HOU", from:"DAL", to:"HOU", airline:"Southwest Airlines", aircraft:"B737", fromCity:"Dallas",         toCity:"Houston" },
  "B6 615": { route:"BOS → MCO", from:"BOS", to:"MCO", airline:"JetBlue Airways",   aircraft:"A320", fromCity:"Boston",          toCity:"Orlando" },
  "AS 7":   { route:"SEA → LAX", from:"SEA", to:"LAX", airline:"Alaska Airlines",   aircraft:"B737", fromCity:"Seattle",         toCity:"Los Angeles" },
  "F9 501": { route:"DEN → LAS", from:"DEN", to:"LAS", airline:"Frontier Airlines", aircraft:"A319", fromCity:"Denver",          toCity:"Las Vegas" },
  "NK 1":   { route:"FLL → ORD", from:"FLL", to:"ORD", airline:"Spirit Airlines",   aircraft:"A320", fromCity:"Fort Lauderdale", toCity:"Chicago" },
};

// ─── ALTERNATIVES ─────────────────────────────────────────────────────────────

const ALTS = {
  "AA 100": [
    { id:1, type:"direct",  badge:"Fastest",       airline:"Delta Air Lines",    flight:"DL 2400", from:"JFK", to:"LAX", via:null,  dep:"09:30", arr:"13:00", stops:0, price:312, seats:4,  onTimeRate:0.81 },
    { id:2, type:"direct",  badge:"Best Value",    airline:"JetBlue Airways",    flight:"B6 402",  from:"JFK", to:"LAX", via:null,  dep:"10:15", arr:"13:55", stops:0, price:189, seats:11, onTimeRate:0.74 },
    { id:3, type:"connect", badge:null,            airline:"United Airlines",    flight:"UA 530",  from:"JFK", to:"LAX", via:"ORD", dep:"09:00", arr:"14:20", stops:1, price:148, seats:3,  onTimeRate:0.68 },
    { id:4, type:"nearby",  badge:"Nearby Airport",airline:"United Airlines",    flight:"UA 1",    from:"EWR", to:"LAX", via:null,  dep:"08:45", arr:"12:10", stops:0, price:278, seats:6,  onTimeRate:0.77, altAirport:"EWR", altAirportName:"Newark" },
  ],
  "UA 1": [
    { id:1, type:"direct",  badge:"Fastest",       airline:"Alaska Airlines",    flight:"AS 20",  from:"EWR", to:"SFO", via:null,  dep:"08:30", arr:"12:05", stops:0, price:295, seats:5,  onTimeRate:0.83 },
    { id:2, type:"direct",  badge:"Best Value",    airline:"JetBlue Airways",    flight:"B6 915", from:"EWR", to:"SFO", via:null,  dep:"09:50", arr:"13:30", stops:0, price:212, seats:9,  onTimeRate:0.76 },
    { id:3, type:"connect", badge:null,            airline:"Delta Air Lines",    flight:"DL 770", from:"EWR", to:"SFO", via:"ATL", dep:"08:10", arr:"14:45", stops:1, price:167, seats:4,  onTimeRate:0.70 },
    { id:4, type:"nearby",  badge:"Nearby Airport",airline:"American Airlines",  flight:"AA 22",  from:"JFK", to:"SFO", via:null,  dep:"08:00", arr:"11:38", stops:0, price:341, seats:2,  onTimeRate:0.79, altAirport:"JFK", altAirportName:"JFK" },
  ],
  "AS 7": [
    { id:1, type:"direct",  badge:"Fastest",    airline:"United Airlines",    flight:"UA 407",  from:"SEA", to:"LAX", via:null,  dep:"12:00", arr:"14:35", stops:0, price:189, seats:7,  onTimeRate:0.80 },
    { id:2, type:"direct",  badge:"Best Value", airline:"Southwest Airlines", flight:"SW 3302", from:"SEA", to:"LAX", via:null,  dep:"13:10", arr:"15:55", stops:0, price:99,  seats:22, onTimeRate:0.72 },
  ],
  "NK 1": [
    { id:1, type:"direct",  badge:"Fastest",       airline:"American Airlines",  flight:"AA 2450", from:"FLL", to:"ORD", via:null,  dep:"16:00", arr:"18:25", stops:0, price:287, seats:3,  onTimeRate:0.78 },
    { id:2, type:"direct",  badge:"Best Value",    airline:"Southwest Airlines", flight:"SW 2211", from:"FLL", to:"ORD", via:null,  dep:"17:15", arr:"19:40", stops:0, price:149, seats:14, onTimeRate:0.74 },
    { id:3, type:"nearby",  badge:"Nearby Airport",airline:"American Airlines",  flight:"AA 2100", from:"MIA", to:"ORD", via:null,  dep:"16:20", arr:"18:40", stops:0, price:265, seats:9,  onTimeRate:0.80, altAirport:"MIA", altAirportName:"Miami" },
  ],
  "SW 100": [
    { id:1, type:"direct", badge:"Fastest",    airline:"American Airlines", flight:"AA 3300", from:"DAL", to:"HOU", via:null, dep:"10:30", arr:"11:45", stops:0, price:129, seats:6,  onTimeRate:0.82 },
    { id:2, type:"direct", badge:"Best Value", airline:"United Airlines",   flight:"UA 4420", from:"DAL", to:"HOU", via:null, dep:"11:00", arr:"12:10", stops:0, price:89,  seats:12, onTimeRate:0.77 },
  ],
  "B6 615": [
    { id:1, type:"direct", badge:"Best Value", airline:"Southwest Airlines", flight:"SW 1822", from:"BOS", to:"MCO", via:null, dep:"07:30", arr:"11:10", stops:0, price:112, seats:17, onTimeRate:0.75 },
    { id:2, type:"direct", badge:"Fastest",    airline:"American Airlines",  flight:"AA 612",  from:"BOS", to:"MCO", via:null, dep:"08:00", arr:"11:42", stops:0, price:198, seats:5,  onTimeRate:0.80 },
  ],
  "DL 400": [],
  "F9 501": [],
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const pct = v => `${(v * 100).toFixed(1)}%`;
const fmt = v => v.toFixed(0);
const rc  = r => r < 0.2 ? "#16a34a" : r < 0.35 ? "#d97706" : r < 0.5 ? "#ea580c" : "#dc2626";
const pc  = ph =>
  ph.includes("Cancelled") ? "#dc2626" :
  ph.includes("Delayed")   ? "#ea580c" :
  ph === "Landed"          ? "#16a34a" :
  ph === "En Route"        ? "#2563eb" :
  ph === "Boarding"        ? "#7c3aed" : "#64748b";

function mapStatus(apiStatus, delayMin) {
  if (!apiStatus) return "Unknown";
  const s = apiStatus.toLowerCase().replace(/[\s_-]/g, "");
  if (s === "cancelled" || s === "canceled")         return "Cancelled";
  if (s === "landed" || s === "arrived")              return "Landed";
  if (s === "enroute" || s === "active" ||
      s === "airborne" || s === "departed" ||
      s === "approaching")                            return delayMin > 0 ? "Delayed – In Flight" : "En Route";
  if (s === "boarding")                               return "Boarding";
  if (s === "scheduled" || s === "unknown")          return delayMin > 0 ? `Delayed – ${delayMin}m` : "Scheduled";
  if (s === "incident" || s === "delayed")           return "Delayed";
  return apiStatus.charAt(0).toUpperCase() + apiStatus.slice(1);
}

function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", hour12:false }); }
  catch { return "—"; }
}

function calcProgress(depScheduled, arrScheduled, status) {
  if (status === "landed")  return 1;
  if (status !== "active")  return 0;
  try {
    const now  = Date.now();
    const dep  = new Date(depScheduled).getTime();
    const arr  = new Date(arrScheduled).getTime();
    return Math.min(Math.max((now - dep) / (arr - dep), 0.02), 0.98);
  } catch { return 0; }
}

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function generateStats(k) {
  const r = seededRand(k.split("").reduce((a, c) => a + c.charCodeAt(0), 0));
  const onTimeRate = 0.45 + r() * 0.45;
  const avgDelay   = 8 + r() * 45;
  const cancelRate = r() * 0.04;
  const total  = 200 + Math.floor(r() * 300);
  const onTime = Math.floor(total * onTimeRate);
  const rem    = total - onTime;
  const b1 = Math.floor(rem * (0.2  + r() * 0.15));
  const b2 = Math.floor(rem * (0.2  + r() * 0.12));
  const b3 = Math.floor(rem * (0.18 + r() * 0.10));
  const b4 = Math.floor(rem * (0.12 + r() * 0.08));
  const histogram = [
    { label:"On time", count:onTime,                        color:"#16a34a" },
    { label:"1–15m",   count:b1,                            color:"#65a30d" },
    { label:"15–30m",  count:b2,                            color:"#d97706" },
    { label:"30–60m",  count:b3,                            color:"#ea580c" },
    { label:"1–2hrs",  count:b4,                            color:"#dc2626" },
    { label:"2+hrs",   count:Math.max(0,rem-b1-b2-b3-b4),  color:"#9f1239" },
  ];
  const byDay = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => ({
    day: d, delayRate: Math.max(0, (1 - onTimeRate) + (r() - 0.5) * 0.25),
  }));
  const byMonth = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => ({
    month: m, delayRate: Math.max(0, (1 - onTimeRate) + (r() - 0.5) * 0.3),
  }));
  const ct = total - onTime;
  const c1 = Math.floor(r() * ct * 0.35);
  const c2 = Math.floor(r() * ct * 0.3);
  const c3 = Math.floor(r() * ct * 0.2);
  const c4 = Math.floor(r() * ct * 0.1);
  const causes = [
    { name:"Late Aircraft", value:Math.max(0, c1),              color:"#ea580c" },
    { name:"Carrier",       value:Math.max(0, c2),              color:"#dc2626" },
    { name:"NAS/ATC",       value:Math.max(0, c3),              color:"#d97706" },
    { name:"Weather",       value:Math.max(0, c4),              color:"#2563eb" },
    { name:"Security",      value:Math.max(0, ct-c1-c2-c3-c4),  color:"#7c3aed" },
  ].filter(c => c.value > 0);
  return { onTimeRate, avgDelay, cancelRate, total, histogram, byDay, byMonth, causes };
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

const TT = ({ active, payload, label }) =>
  active && payload?.length ? (
    <div style={{ background:"#fff", border:"1px solid #e8e6de", padding:"8px 12px", borderRadius:8, fontSize:12, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ color:"#94a3b8", marginBottom:3, fontSize:11 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color || "#c2820a", fontWeight:500 }}>
          {p.name}: {typeof p.value === "number" && p.value < 1.5 ? pct(p.value) : fmt(p.value)}
        </div>
      ))}
    </div>
  ) : null;

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ background:"#fff", border:"1px solid #e8e6de", borderRadius:12, padding:"14px 16px", flex:1, minWidth:90 }}>
      <div style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color:color || "#1e293b", lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#94a3b8", marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function Logo() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
      <div style={{ width:32, height:32, borderRadius:10, background:"#f59e0b", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:"#fff" }}>✈</div>
      <div>
        <div style={{ fontSize:18, fontWeight:900, letterSpacing:"-0.03em", color:"#1e293b" }}>
          grounded<span style={{ color:"#f59e0b" }}>.</span>
        </div>
        <div style={{ fontSize:9, color:"#94a3b8", letterSpacing:"0.1em", textTransform:"uppercase" }}>
          the app airlines wish didn't exist
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", gap:14 }}>
      <div style={{ width:32, height:32, border:"3px solid #f1f5f9", borderTop:"3px solid #f59e0b", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
      <div style={{ fontSize:13, color:"#94a3b8" }}>Checking flight status...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── WORLD MAP ────────────────────────────────────────────────────────────────

const MAP_W = 960;
const MAP_H = 500;

// Equirectangular projection
function project(lat, lng) {
  const x = ((lng + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return [x, y];
}

// Convert GeoJSON geometry to SVG path string
function geoToPath(geometry) {
  if (!geometry) return "";
  const ringToD = (ring) =>
    ring.map(([lng, lat], i) => {
      const [x, y] = project(lat, lng);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join("") + "Z";

  if (geometry.type === "Polygon") {
    return geometry.coordinates.map(ringToD).join(" ");
  } else if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.flatMap(poly => poly.map(ringToD)).join(" ");
  }
  return "";
}

// Build arc path between two SVG points
function arcPath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2 - Math.abs(x2 - x1) * 0.12;
  return `M${x1},${y1} Q${mx},${my} ${x2},${y2}`;
}

// Interpolate position along arc at progress t
function interpArc(lat1, lng1, lat2, lng2, t) {
  const lat = lat1 + (lat2 - lat1) * t;
  const lng = lng1 + (lng2 - lng1) * t;
  const lift = Math.sin(Math.PI * t) * 6; // slight arc
  return [lat + lift, lng];
}

function FlightMap({ fromIata, toIata, progress, planeLat, planeLng, apiStatus }) {
  const [countryPaths, setCountryPaths] = useState([]);
  const [mapLoaded, setMapLoaded]       = useState(false);

  // Load real world country data from CDN
  useEffect(() => {
    Promise.all([
      import("https://cdn.jsdelivr.net/npm/topojson-client@3/+esm"),
      fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json").then(r => r.json()),
    ]).then(([topojson, world]) => {
      const countries = topojson.feature(world, world.objects.countries);
      const paths = countries.features.map(f => ({
        id:   f.id,
        d:    geoToPath(f.geometry),
      })).filter(p => p.d);
      setCountryPaths(paths);
      setMapLoaded(true);
    }).catch(() => setMapLoaded(true)); // fail silently, still show flight path
  }, []);

  const fromAp  = AIRPORTS[fromIata];
  const toAp    = AIRPORTS[toIata];
  const fromXY  = fromAp ? project(fromAp.lat, fromAp.lng) : [MAP_W * 0.3, MAP_H * 0.45];
  const toXY    = toAp   ? project(toAp.lat,   toAp.lng)   : [MAP_W * 0.7, MAP_H * 0.45];

  // Plane position from OpenSky or interpolated
  let planeXY = null;
  if (planeLat && planeLng) {
    planeXY = project(planeLat, planeLng);
  } else if (progress > 0 && progress < 1 && fromAp && toAp) {
    const [ilat, ilng] = interpArc(fromAp.lat, fromAp.lng, toAp.lat, toAp.lng, progress);
    planeXY = project(ilat, ilng);
  }

  const fly         = progress > 0 && progress < 1;
  const isCancelled = apiStatus === "cancelled";
  const isLanded    = apiStatus === "landed";

  const routeArc    = arcPath(fromXY[0], fromXY[1], toXY[0], toXY[1]);
  const traveledArc = planeXY && fly
    ? arcPath(fromXY[0], fromXY[1], planeXY[0], planeXY[1])
    : null;

  return (
    <div style={{ background:"#e8f0f8", borderRadius:12, overflow:"hidden", border:"1px solid #dce8f0" }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{ display:"block" }}>

        {/* Ocean */}
        <rect width={MAP_W} height={MAP_H} fill="#dceaf5"/>

        {/* Country fills */}
        {countryPaths.map(c => (
          <path key={c.id} d={c.d} fill="#edf2f9" stroke="#c8d8ec" strokeWidth="0.5"/>
        ))}

        {/* Loading skeleton */}
        {!mapLoaded && (
          <text x={MAP_W/2} y={MAP_H/2} textAnchor="middle" fill="#b0c8e0" fontSize="14">Loading map...</text>
        )}

        {/* Latitude lines */}
        {[-60,-30,0,30,60].map(lat => {
          const [,y] = project(lat, 0);
          return <line key={lat} x1={0} y1={y} x2={MAP_W} y2={y} stroke="#d0e0ee" strokeWidth="0.5" strokeDasharray="4,4"/>;
        })}

        {/* Route arc (dashed) */}
        <path d={routeArc} fill="none" stroke="#a8c4e0" strokeWidth="1.5" strokeDasharray="6,4"/>

        {/* Traveled portion (solid amber) */}
        {traveledArc && <path d={traveledArc} fill="none" stroke="#f59e0b" strokeWidth="2.5"/>}

        {/* Airport markers */}
        {[{ iata:fromIata, xy:fromXY, col:"#f59e0b" }, { iata:toIata, xy:toXY, col:"#16a34a" }].map(({ iata, xy, col }) => (
          <g key={iata}>
            <circle cx={xy[0]} cy={xy[1]} r="7" fill="#fff" stroke={col} strokeWidth="2.5"/>
            <circle cx={xy[0]} cy={xy[1]} r="3" fill={col}/>
            <text x={xy[0]} y={xy[1] - 14} textAnchor="middle" fill={col} fontSize="11" fontFamily="monospace" fontWeight="bold"
              style={{ textShadow:"0 1px 3px rgba(255,255,255,0.8)" }}>
              {iata}
            </text>
          </g>
        ))}

        {/* Plane in flight */}
        {fly && planeXY && (
          <g transform={`translate(${planeXY[0]},${planeXY[1]})`}>
            <circle r="14" fill="#fff" stroke="#f59e0b" strokeWidth="2"/>
            <circle r="14" fill="#fef3c7" opacity="0.4">
              <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite"/>
            </circle>
            <text textAnchor="middle" dominantBaseline="middle" fontSize="13">✈</text>
          </g>
        )}

        {/* Landed */}
        {isLanded && (
          <g transform={`translate(${toXY[0]},${toXY[1]})`}>
            <circle r="14" fill="#dcfce7">
              <animate attributeName="r" values="14;20;14" dur="2s" repeatCount="indefinite"/>
            </circle>
            <text textAnchor="middle" dominantBaseline="middle" fontSize="14" y="-1">🛬</text>
          </g>
        )}

        {/* Parked / scheduled */}
        {!fly && !isLanded && !isCancelled && (
          <g transform={`translate(${fromXY[0]},${fromXY[1]})`}>
            <circle r="11" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5"/>
            <text textAnchor="middle" dominantBaseline="middle" fontSize="11">✈</text>
          </g>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <g transform={`translate(${fromXY[0]},${fromXY[1]})`}>
            <circle r="13" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5"/>
            <text textAnchor="middle" dominantBaseline="middle" fontSize="13" fill="#dc2626">✕</text>
          </g>
        )}
      </svg>

      <div style={{ padding:"6px 14px 8px", borderTop:"1px solid #dce8f0", display:"flex", gap:16, fontSize:11, color:"#64748b", background:"#f0f6fc" }}>
        <span style={{ color:"#b45309" }}>● {fromIata}</span>
        <span style={{ color:"#15803d" }}>● {toIata}</span>
        {planeLat && <span style={{ color:"#2563eb" }}>📡 Live position from OpenSky</span>}
      </div>
    </div>
  );
}

// ─── LIVE STATUS PAGE ─────────────────────────────────────────────────────────

function LivePage({ fk }) {
  const [liveData, setLiveData]   = useState(null);
  const [position, setPosition]   = useState(null);
  const [inbound,  setInbound]    = useState(null);
  const [loading,  setLoading]    = useState(true);
  const [error,    setError]      = useState(null);

  const callsign = fk.replace(" ", "");
  const meta     = FLIGHTS[fk];

  useEffect(() => {
    setLoading(true);
    setError(null);
    setLiveData(null);
    setPosition(null);
    setInbound(null);

    // Fetch live status first
    fetch(`/api/aircraft?flight=${callsign}`) // v2
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setLiveData(data);
        // Always fetch inbound aircraft info using flight number
        fetch(`/api/aircraft?flight=${callsign}`)
          .then(r => r.json())
          .then(ib => {
            if (!ib.error) setInbound(ib);
            else console.warn("Inbound error:", ib.error);
          })
          .catch(e => console.warn("Inbound fetch failed:", e));
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

    // Fetch OpenSky position (non-blocking)
    fetch(`/api/position?flight=${callsign}`)
      .then(r => r.json())
      .then(data => { if (!data.error) setPosition(data); })
      .catch(() => {});
  }, [fk]);

  if (loading) return <Spinner/>;
  if (error) return (
    <div style={{ textAlign:"center", padding:"50px 20px" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>🔍</div>
      <div style={{ fontSize:14, color:"#dc2626", fontWeight:600, marginBottom:6 }}>Couldn't find this flight</div>
      <div style={{ fontSize:12, color:"#94a3b8" }}>{error}</div>
    </div>
  );

  const apiStatus  = liveData.status;
  const depDelay   = liveData.departure?.delay || 0;
  const arrDelay   = liveData.arrival?.delay   || 0;
  const delayMin   = depDelay || arrDelay || 0;
  const phase      = mapStatus(apiStatus, delayMin);
  const depActual  = fmtTime(liveData.departure?.actual)    || "—";
  const depSched   = fmtTime(liveData.departure?.scheduled) || "—";
  const arrEst     = fmtTime(liveData.arrival?.estimated || liveData.arrival?.scheduled) || "—";
  const arrSched   = fmtTime(liveData.arrival?.scheduled)   || "—";
  const gate       = liveData.departure?.gate || liveData.departure?.terminal || "—";
  const fromIata   = liveData.departure?.iata || meta?.from || "—";
  const toIata     = liveData.arrival?.iata   || meta?.to   || "—";
  const progress   = calcProgress(liveData.departure?.scheduled, liveData.arrival?.scheduled, apiStatus);
  const altFt      = position?.altitudeFt || 0;
  const speedMph   = position?.speedMph   || 0;
  const planeLat   = position?.latitude   || null;
  const planeLng   = position?.longitude  || null;

  const col         = pc(phase);
  const isCancelled = phase === "Cancelled";
  const isEnRoute   = phase === "En Route" || phase.includes("In Flight");
  const isLanded    = phase === "Landed";
  const statusMsg   = isCancelled ? "Yep, it's cancelled" : delayMin > 0 ? `Running +${delayMin} min late` : isLanded ? "Wheels down!" : isEnRoute ? "In the air" : "Checking in...";
  const statusBg    = isCancelled ? "#fee2e2" : delayMin > 0 ? "#ffedd5" : isLanded ? "#dcfce7" : isEnRoute ? "#dbeafe" : "#f1f5f9";
  const statusBdr   = isCancelled ? "#fca5a5" : delayMin > 0 ? "#fed7aa" : isLanded ? "#86efac" : isEnRoute ? "#93c5fd" : "#e2e8f0";

  // Inbound urgency colors
  const urgencyColors = {
    green:   { bg:"#f0fdf4", border:"#86efac", text:"#15803d" },
    yellow:  { bg:"#fffbeb", border:"#fde68a", text:"#92400e" },
    blue:    { bg:"#eff6ff", border:"#93c5fd", text:"#1d4ed8" },
    red:     { bg:"#fef2f2", border:"#fca5a5", text:"#dc2626" },
    neutral: { bg:"#f8f7f4", border:"#e8e6de", text:"#64748b" },
  };
  const uc = inbound ? (urgencyColors[inbound.urgency] || urgencyColors.neutral) : null;

  // Phase icons
  const phaseIcon = {
    landed:    "🛬",
    enroute:   "✈️",
    boarding:  "🚶",
    delayed:   "⏳",
    cancelled: "❌",
    scheduled: "🕐",
    unknown:   "❓",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:16 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:22, fontWeight:800, color:"#1e293b" }}>{fk}</span>
            {liveData.airline && <span style={{ background:"#f1f5f9", borderRadius:6, padding:"2px 8px", fontSize:11, color:"#64748b" }}>{liveData.airline}</span>}
            {liveData.aircraft?.registration && <span style={{ background:"#f1f5f9", borderRadius:6, padding:"2px 8px", fontSize:11, color:"#94a3b8", fontFamily:"monospace" }}>{liveData.aircraft.registration}</span>}
          </div>
          <div style={{ fontSize:12, color:"#64748b" }}>{fromIata} → {toIata}</div>
          <div style={{ fontSize:13, color:col, fontWeight:600, marginTop:4 }}>{statusMsg}</div>
        </div>
        <div style={{ background:statusBg, border:`1px solid ${statusBdr}`, borderRadius:10, padding:"8px 14px", textAlign:"center" }}>
          <div style={{ fontSize:10, color:col, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:2 }}>Live Status</div>
          <div style={{ fontSize:13, fontWeight:700, color:col }}>{phase}</div>
        </div>
      </div>

      {/* Map */}
      <FlightMap fromIata={fromIata} toIata={toIata} progress={progress} planeLat={planeLat} planeLng={planeLng} apiStatus={apiStatus}/>

      {/* Progress bar */}
      {!isCancelled && (
        <div style={{ margin:"14px 0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#94a3b8", marginBottom:5 }}>
            <span>{fromIata}</span>
            <span style={{ fontWeight:600, color:"#64748b" }}>{Math.round(progress * 100)}% complete</span>
            <span>{toIata}</span>
          </div>
          <div style={{ height:6, background:"#e8e6de", borderRadius:3, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${progress * 100}%`, background:"linear-gradient(90deg,#f59e0b,#fbbf24)", borderRadius:3, position:"relative" }}>
              {isEnRoute && <div style={{ position:"absolute", right:-1, top:-3, width:12, height:12, borderRadius:"50%", background:"#f59e0b", border:"2px solid #fff" }}/>}
            </div>
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        <StatCard label="Departure"  value={depActual !== "—" ? depActual : "TBD"} sub={`Sched. ${depSched}${delayMin > 0 ? ` · +${delayMin}m` : ""}`} color={delayMin > 0 ? "#ea580c" : "#16a34a"}/>
        <StatCard label="Arrives"    value={arrEst}  sub={`Sched. ${arrSched}`}    color="#2563eb"/>
        <StatCard label="Dep. Gate"  value={gate}    sub={`${fromIata} terminal`}  color="#7c3aed"/>
        {isEnRoute && position && <StatCard label="Altitude" value={`${(altFt/1000).toFixed(0)}k ft`} sub={`${speedMph} mph`} color="#c2820a"/>}
        {!isEnRoute && !isCancelled && <StatCard label="Delay" value={delayMin > 0 ? `+${delayMin}m` : "None"} sub={delayMin > 0 ? "Behind schedule" : "On time!"} color={delayMin > 0 ? "#ea580c" : "#16a34a"}/>}
        {isCancelled && <StatCard label="Status" value="VOID" sub="Cancelled" color="#dc2626"/>}
      </div>

      {/* ── Inbound Aircraft Panel ── */}
      {inbound && (
        <div style={{ background:uc.bg, border:`1px solid ${uc.border}`, borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:8, marginBottom:10 }}>
            <div>
              <div style={{ fontSize:11, color:uc.text, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>
                Where is your plane right now?
              </div>
              <div style={{ fontSize:14, color:"#1e293b", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
                <span>{phaseIcon[inbound.phase] || "✈️"}</span>
                <span>{inbound.message}</span>
              </div>
            </div>
            {inbound.current?.flight && (
              <div style={{ background:"#fff", border:`1px solid ${uc.border}`, borderRadius:8, padding:"6px 10px", textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#94a3b8", marginBottom:2 }}>Inbound flight</div>
                <div style={{ fontSize:13, fontWeight:700, color:"#1e293b", fontFamily:"monospace" }}>{inbound.current.flight}</div>
              </div>
            )}
          </div>

          {/* Inbound route details */}
          {inbound.current && (
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <div style={{ background:"#fff", borderRadius:8, padding:"8px 12px", flex:1, minWidth:100, textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#94a3b8", marginBottom:2 }}>From</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#1e293b", fontFamily:"monospace" }}>{inbound.current.from}</div>
                {inbound.current.fromName && <div style={{ fontSize:10, color:"#94a3b8" }}>{inbound.current.fromName}</div>}
              </div>
              <div style={{ fontSize:18, color:"#94a3b8" }}>→</div>
              <div style={{ background:"#fff", borderRadius:8, padding:"8px 12px", flex:1, minWidth:100, textAlign:"center" }}>
                <div style={{ fontSize:10, color:"#94a3b8", marginBottom:2 }}>To</div>
                <div style={{ fontSize:16, fontWeight:800, color:"#1e293b", fontFamily:"monospace" }}>{inbound.current.to}</div>
                {inbound.current.toName && <div style={{ fontSize:10, color:"#94a3b8" }}>{inbound.current.toName}</div>}
              </div>
              {(inbound.current.arrEst || inbound.current.arrSched) && (
                <div style={{ background:"#fff", borderRadius:8, padding:"8px 12px", flex:1, minWidth:100, textAlign:"center" }}>
                  <div style={{ fontSize:10, color:"#94a3b8", marginBottom:2 }}>Landing</div>
                  <div style={{ fontSize:16, fontWeight:800, color:uc.text }}>
                    {fmtTime(inbound.current.arrEst || inbound.current.arrSched)}
                  </div>
                  {inbound.current.arrDelay > 0 && (
                    <div style={{ fontSize:10, color:"#ea580c" }}>+{inbound.current.arrDelay}m delay</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Full day schedule for this aircraft */}
          {inbound.allLegs && inbound.allLegs.length > 1 && (
            <div style={{ marginTop:12, paddingTop:10, borderTop:`1px solid ${uc.border}` }}>
              <div style={{ fontSize:11, color:"#94a3b8", marginBottom:8 }}>Aircraft schedule today</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                {inbound.allLegs.map((leg, i) => {
                  const isCurrentLeg = leg.from === inbound.current?.from && leg.to === inbound.inbound?.to;
                  const isOurLeg     = leg.to === fromIata;
                  return (
                    <div key={i} style={{
                      display:"flex", alignItems:"center", gap:8, padding:"6px 8px",
                      background: isOurLeg ? "#fff" : isCurrentLeg ? uc.bg : "transparent",
                      borderRadius:6,
                      border: isOurLeg ? `1px solid ${uc.border}` : "1px solid transparent",
                      fontSize:12,
                    }}>
                      <span style={{ fontFamily:"monospace", color:"#94a3b8", fontSize:10, minWidth:50 }}>
                        {fmtTime(leg.depSched) || "—"}
                      </span>
                      <span style={{ fontFamily:"monospace", fontWeight:600, color:"#1e293b" }}>
                        {leg.from} → {leg.to}
                      </span>
                      <span style={{ fontSize:10, color:"#94a3b8", marginLeft:"auto" }}>
                        {leg.flight}
                      </span>
                      {isCurrentLeg && <span style={{ fontSize:10, color:uc.text, fontWeight:600 }}>← now</span>}
                      {isOurLeg     && <span style={{ fontSize:10, color:"#f59e0b", fontWeight:600 }}>← your flight</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data source badge */}
      <div style={{ padding:"10px 14px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, fontSize:12, color:"#15803d", display:"flex", alignItems:"center", gap:8 }}>
        <span>✓</span>
        <span>Live data from AeroDataBox{position ? " + OpenSky" : ""}{inbound ? " + Aircraft tracker" : ""} · Updated just now</span>
      </div>
    </div>
  );
}


// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────

function HistoryPage({ fk }) {
  const [tab, setTab]         = useState("dist");
  const [selMonth, setSelMonth] = useState(null);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const meta = FLIGHTS[fk];

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelMonth(null);
    const match     = fk.trim().match(/^([A-Z]{2,3})\s*(\d+)$/);
    const carrier   = match ? match[1] : fk.replace(/\d/g, "");
    const flightNum = match ? match[2] : fk.replace(/\D/g, "");
    let url = `/api/history?carrier=${carrier}&flightNum=${flightNum}`;
    if (meta?.from) url += `&origin=${meta.from}`;
    if (meta?.to)   url += `&dest=${meta.to}`;
    fetch(url)
      .then(r => r.json())
      .then(data => { if (data.error) throw new Error(data.error); setStats(data); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [fk]);

  if (loading) return <Spinner/>;
  if (error) return (
    <div style={{ textAlign:"center", padding:"50px 20px" }}>
      <div style={{ fontSize:36, marginBottom:10 }}>🔍</div>
      <div style={{ fontSize:14, color:"#dc2626", fontWeight:600, marginBottom:6 }}>No historical data found</div>
      <div style={{ fontSize:12, color:"#94a3b8" }}>{error}</div>
    </div>
  );

  const s = stats;

  // Risk based on weighted score (ignores minor 1-15m delays)
  const ws = s.weightedScore;
  const riskLevel = ws < 0.08 ? "LOW" : ws < 0.18 ? "MODERATE" : ws < 0.30 ? "HIGH" : "SEVERE";
  const riskColor = ws < 0.08 ? "#16a34a" : ws < 0.18 ? "#d97706" : ws < 0.30 ? "#ea580c" : "#dc2626";
  const riskMsg   = ws < 0.08 ? "Usually on time" : ws < 0.18 ? "Minor delays possible" : ws < 0.30 ? "Significant delays likely" : "Chronically delayed";

  const bestDay  = s.byDay.reduce((a, b) => a.delayRate < b.delayRate ? a : b).day;
  const worstDay = s.byDay.reduce((a, b) => a.delayRate > b.delayRate ? a : b).day;

  const fmtPct = v => `${(v * 100).toFixed(1)}%`;
  const fmtMin = v => `${Math.round(v)}m`;

  const DualTT = ({ active, payload, label }) => active && payload?.length ? (
    <div style={{ background:"#fff", border:"1px solid #e8e6de", padding:"8px 12px", borderRadius:8, fontSize:12, boxShadow:"0 2px 8px rgba(0,0,0,0.08)" }}>
      <div style={{ color:"#94a3b8", marginBottom:4, fontWeight:600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color:p.color || "#c2820a", marginBottom:2 }}>
          {p.name}: {p.name === "Delay Rate" ? fmtPct(p.value) : `${p.value}m avg`}
        </div>
      ))}
    </div>
  ) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:16 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:22, fontWeight:800, color:"#1e293b" }}>{fk}</span>
            {meta && <span style={{ background:"#f1f5f9", borderRadius:6, padding:"2px 8px", fontSize:11, color:"#64748b", fontFamily:"monospace" }}>{meta.aircraft}</span>}
          </div>
          {meta && <div style={{ fontSize:12, color:"#64748b" }}>{meta.airline} · {meta.route}</div>}
          <div style={{ fontSize:13, color:riskColor, fontWeight:600, marginTop:4 }}>{riskMsg}</div>
        </div>
        <div style={{ background:riskColor + "14", border:`1px solid ${riskColor}33`, borderRadius:10, padding:"8px 14px", textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Delay Risk</div>
          <div style={{ fontSize:16, fontWeight:800, color:riskColor }}>{riskLevel}</div>
          <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>excl. minor delays</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        <StatCard label="On-Time"      value={fmtPct(s.onTimeRate)}    sub={`${s.total} flights`}           color="#16a34a"/>
        <StatCard label=">15min delay" value={fmtPct(s.sigDelayRate)}  sub="Significant delays"             color={riskColor}/>
        <StatCard label="Typical exp." value={s.typicalDelay <= 0 ? "On time" : `+${s.typicalDelay}m`} sub={s.typicalDelay <= 0 ? "median passenger" : `when late: avg ${fmtMin(s.avgSigDelay)}`} color={s.typicalDelay <= 0 ? "#16a34a" : s.typicalDelay <= 15 ? "#d97706" : "#ea580c"}/>
        <StatCard label="Cancels"      value={fmtPct(s.cancelRate)}    sub="Historical avg"                 color="#7c3aed"/>
      </div>

      {/* Confidence box */}
      <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"14px 16px", marginBottom:16 }}>
        <div style={{ fontSize:11, color:"#92400e", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Delay Confidence</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {[
            { label:"50% of flights", value: s.p50 <= 0 ? "On time" : `+${s.p50}m`, color:"#16a34a" },
            { label:"80% of flights", value: s.p80 <= 0 ? "On time" : `+${s.p80}m`, color:"#d97706" },
            { label:"95% of flights", value: s.p95 <= 0 ? "On time" : `+${s.p95}m`, color:"#dc2626" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ flex:1, minWidth:90, background:"#fff", border:"1px solid #fde68a", borderRadius:8, padding:"10px 12px", textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#94a3b8", marginBottom:4 }}>{label}</div>
              <div style={{ fontSize:18, fontWeight:800, color }}>{value}</div>
              <div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>or better</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize:11, color:"#92400e", marginTop:10 }}>
          Typical experience: <b>{s.typicalDelay <= 0 ? "on time or early" : `+${s.typicalDelay}m`}</b> · When it does delay: avg <b>+{s.avgSigDelay}m</b>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:2, borderBottom:"2px solid #f1f5f9", marginBottom:16, overflowX:"auto" }}>
        {[["dist","Distribution"],["prob","Probability"],["day","By Weekday"],["mo","By Month"],["trend","Trend"],["cause","Why?"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:"7px 12px", fontSize:12, fontWeight:tab === k ? 600 : 400, color:tab === k ? "#c2820a" : "#94a3b8", borderBottom:`2px solid ${tab === k ? "#f59e0b" : "transparent"}`, marginBottom:-2, background:"none", border:"none", cursor:"pointer", whiteSpace:"nowrap" }}>{l}</button>
        ))}
      </div>

      {/* Distribution */}
      {tab === "dist" && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Out of {s.flown} flights, here is how late they got:</p>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={s.histogram} barCategoryGap="15%">
              <CartesianGrid vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="label" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v) => [`${(v*100).toFixed(1)}%`, "Share"]} contentStyle={{ background:"#fff", border:"1px solid #e8e6de", borderRadius:8, fontSize:11 }}/>
              <Bar dataKey="pct" name="Share" radius={[4,4,0,0]}>
                {s.histogram.map((e, i) => <Cell key={i} fill={e.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize:11, color:"#94a3b8", marginTop:8 }}>
            Minor delays (1-15m): <b style={{ color:"#65a30d" }}>{fmtPct(s.histogram[1]?.pct || 0)}</b> of flights — not counted in risk score
          </p>
        </div>
      )}

      {/* Probability distribution */}
      {tab === "prob" && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Probability of arriving at each delay level. Earlier peak = better flight.</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.distribution} barCategoryGap="5%">
              <CartesianGrid vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="label" tick={{ fill:"#94a3b8", fontSize:9 }} axisLine={false} tickLine={false} interval={1}/>
              <YAxis tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip formatter={(v) => [`${(v*100).toFixed(1)}%`, "Probability"]} contentStyle={{ background:"#fff", border:"1px solid #e8e6de", borderRadius:8, fontSize:11 }}/>
              <Bar dataKey="pct" name="Probability" radius={[3,3,0,0]}>
                {s.distribution.map((d, i) => (
                  <Cell key={i} fill={d.start < 0 ? "#2563eb" : d.start === 0 ? "#16a34a" : d.start <= 15 ? "#65a30d" : d.start <= 30 ? "#d97706" : d.start <= 60 ? "#ea580c" : "#dc2626"}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:8, marginTop:10, flexWrap:"wrap" }}>
            {[["#2563eb","Early"],["#16a34a","On time"],["#65a30d","1-15m"],["#d97706","15-30m"],["#ea580c","30-60m"],["#dc2626","60m+"]].map(([c, l]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#64748b" }}>
                <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
                {l}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By weekday */}
      {tab === "day" && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Delay frequency and average delay by day of week (delays over 15 min only).</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={s.byDay} barCategoryGap="20%" barGap={4}>
              <CartesianGrid vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="day" tick={{ fill:"#94a3b8", fontSize:12 }} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="left"  tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}m`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<DualTT/>}/>
              <Bar yAxisId="left"  dataKey="delayRate" name="Delay Rate" radius={[4,4,0,0]}>
                {s.byDay.map((d, i) => <Cell key={i} fill={rc(d.delayRate)}/>)}
              </Bar>
              <Bar yAxisId="right" dataKey="avgDelay"  name="Avg Delay"  radius={[4,4,0,0]} fill="#fbbf24" opacity={0.7}/>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize:12, color:"#64748b", marginTop:10 }}>
            Best day: <b style={{ color:"#16a34a" }}>{bestDay}</b> · Worst day: <b style={{ color:"#dc2626" }}>{worstDay}</b>
          </p>
          <div style={{ display:"flex", gap:16, marginTop:4, fontSize:11, color:"#64748b" }}>
            <span style={{ color:"#b45309" }}>■ Delay frequency (%)</span>
            <span style={{ color:"#d97706" }}>■ Avg delay (min)</span>
          </div>
        </div>
      )}

      {/* By month — click to drill into daily breakdown */}
      {tab === "mo" && (() => {
        const months = s.byMonth.filter(m => m.flights > 0);
        const active = selMonth ? months.find(m => m.month === selMonth) : null;
        return (
          <div>
            <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>
              {active ? `${active.month} — breakdown by day of week` : "Click a month bar to see daily breakdown"}
            </p>
            {!active ? (
              <div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={months} barCategoryGap="20%" barGap={4}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="month" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="left"  tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}m`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<DualTT/>}/>
                    <Bar yAxisId="left"  dataKey="delayRate" name="Delay Rate" radius={[4,4,0,0]} onClick={d => setSelMonth(d.month)} style={{ cursor:"pointer" }}>
                      {months.map((m, i) => <Cell key={i} fill={rc(m.delayRate)}/>)}
                    </Bar>
                    <Bar yAxisId="right" dataKey="avgDelay"  name="Avg Delay"  radius={[4,4,0,0]} fill="#fbbf24" opacity={0.7} onClick={d => setSelMonth(d.month)} style={{ cursor:"pointer" }}/>
                  </BarChart>
                </ResponsiveContainer>
                <p style={{ fontSize:11, color:"#94a3b8", marginTop:8 }}>Click a bar to drill into that month</p>
                <div style={{ display:"flex", gap:16, marginTop:4, fontSize:11, color:"#64748b" }}>
                  <span style={{ color:"#b45309" }}>■ Delay frequency (%)</span>
                  <span style={{ color:"#d97706" }}>■ Avg delay (min)</span>
                </div>
              </div>
            ) : (
              <div>
                <button onClick={() => setSelMonth(null)} style={{ fontSize:11, color:"#2563eb", background:"none", border:"none", cursor:"pointer", marginBottom:10, padding:0 }}>← Back to all months</button>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={active.byDay} barCategoryGap="20%" barGap={4}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="day" tick={{ fill:"#94a3b8", fontSize:12 }} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="left"  tickFormatter={v => `${(v*100).toFixed(0)}%`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <YAxis yAxisId="right" orientation="right" tickFormatter={v => `${v}m`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
                    <Tooltip content={<DualTT/>}/>
                    <Bar yAxisId="left"  dataKey="delayRate" name="Delay Rate" radius={[4,4,0,0]}>
                      {active.byDay.map((d, i) => <Cell key={i} fill={rc(d.delayRate)}/>)}
                    </Bar>
                    <Bar yAxisId="right" dataKey="avgDelay"  name="Avg Delay"  radius={[4,4,0,0]} fill="#fbbf24" opacity={0.7}/>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display:"flex", gap:16, marginTop:8, fontSize:11, color:"#64748b" }}>
                  <span style={{ color:"#b45309" }}>■ Delay frequency (%)</span>
                  <span style={{ color:"#d97706" }}>■ Avg delay (min)</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Trend */}
      {tab === "trend" && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>
            Last {s.trend.length} departures — bars show delay per flight, dashed line is rolling average.
          </p>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={s.trend} barCategoryGap="10%">
              <CartesianGrid vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="idx" tick={false} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => `${v}m`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip
                content={({ active, payload }) => active && payload?.length ? (
                  <div style={{ background:"#fff", border:"1px solid #e8e6de", padding:"8px 12px", borderRadius:8, fontSize:11 }}>
                    <div style={{ color:"#94a3b8", marginBottom:3 }}>{payload[0]?.payload?.day}, {payload[0]?.payload?.month}</div>
                    <div style={{ color: (payload[0]?.payload?.delay||0) > 30 ? "#dc2626" : (payload[0]?.payload?.delay||0) > 15 ? "#ea580c" : (payload[0]?.payload?.delay||0) > 0 ? "#d97706" : "#16a34a", fontWeight:600 }}>
                      {(payload[0]?.payload?.delay||0) <= 0 ? `${Math.abs(payload[0]?.payload?.delay||0)}m early` : `+${payload[0]?.payload?.delay}m`}
                    </div>
                    <div style={{ color:"#64748b", marginTop:2 }}>Rolling avg: {payload[1]?.value}m</div>
                  </div>
                ) : null}
              />
              <Bar dataKey="delay" name="Delay" radius={[3,3,0,0]}>
                {s.trend.map((t, i) => (
                  <Cell key={i} fill={t.delay > 30 ? "#dc2626" : t.delay > 15 ? "#ea580c" : t.delay > 0 ? "#d97706" : t.delay > -10 ? "#16a34a" : "#2563eb"}/>
                ))}
              </Bar>
              <Line type="monotone" dataKey="rollingAvg" name="Rolling avg" stroke="#94a3b8" strokeWidth={2} dot={false} strokeDasharray="4 2"/>
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", gap:10, marginTop:10, flexWrap:"wrap" }}>
            {[["#2563eb","Early"],["#16a34a","On time"],["#d97706","1-15m"],["#ea580c","15-30m"],["#dc2626","30m+"]].map(([c,l]) => (
              <div key={l} style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"#64748b" }}>
                <div style={{ width:10, height:10, borderRadius:2, background:c }}/>
                {l}
              </div>
            ))}
          </div>
          <p style={{ fontSize:11, color:"#94a3b8", marginTop:8 }}>
            BTS data has no exact dates — flights sorted by month then day of week as approximation.
          </p>
        </div>
      )}

      {/* Causes */}
      {tab === "cause" && s.causes.length > 0 && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Here is who to blame when this flight is significantly late.</p>
          <div style={{ display:"flex", gap:16, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{ width:180, height:180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={s.causes} dataKey="value" innerRadius={44} outerRadius={78} paddingAngle={3}>
                    {s.causes.map((c, i) => <Cell key={i} fill={c.color}/>)}
                  </Pie>
                  <Tooltip formatter={v => [`${v} flights`, ""]} contentStyle={{ background:"#fff", border:"1px solid #e8e6de", borderRadius:8, fontSize:11 }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ flex:1, minWidth:140 }}>
              {s.causes.map((c, i) => {
                const tot = s.causes.reduce((a, x) => a + x.value, 0);
                const p   = tot ? ((c.value / tot) * 100).toFixed(1) : 0;
                return (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:3 }}>
                      <span style={{ color:"#374151" }}>{c.name}</span>
                      <span style={{ color:c.color, fontWeight:600 }}>{p}%</span>
                    </div>
                    <div style={{ height:5, background:"#f1f5f9", borderRadius:3, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p}%`, background:c.color, borderRadius:3 }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Data note */}
      <div style={{ marginTop:16, padding:"8px 12px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:8, fontSize:11, color:"#15803d" }}>
        ✓ {s.dataNote}
      </div>
    </div>
  );
}


const BADGE_STYLES = {
  "Fastest":       { bg:"#f0fdf4", bc:"#86efac", c:"#15803d" },
  "Best Value":    { bg:"#fffbeb", bc:"#fde68a", c:"#92400e" },
  "Nearby Airport":{ bg:"#eff6ff", bc:"#93c5fd", c:"#1d4ed8" },
};
const TC = { direct:"#22c55e", connect:"#facc15", nearby:"#60a5fa" };
const TL = { direct:"Nonstop",  connect:"1 Stop",  nearby:"Alt. Airport" };
const ai     = a => a.split(" ").filter(w => !["Air","Airlines","Airways"].includes(w)).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const acolor = a => { const h = a.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 360; return `hsl(${h},55%,88%)`; };
const atcolor= a => { const h = a.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 360; return `hsl(${h},55%,30%)`; };

function AltsPage({ fk, liveDelayMin, liveStatus }) {
  const meta  = FLIGHTS[fk];
  const alts  = ALTS[fk] || [];
  const [filter, setFilter] = useState("all");
  const isDelayed = liveDelayMin > 0 || liveStatus === "cancelled";
  const isCx      = liveStatus === "cancelled";
  const filtered  = filter === "all" ? alts : alts.filter(a => a.type === filter);
  const tc = t => alts.filter(a => a.type === t).length;

  if (!isDelayed && alts.length === 0) return (
    <div style={{ textAlign:"center", padding:"50px 20px" }}>
      <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
      <div style={{ fontSize:14, color:"#64748b" }}>Flight's on time — no need to switch!</div>
    </div>
  );
  if (alts.length === 0) return (
    <div style={{ textAlign:"center", padding:"50px 20px" }}>
      <div style={{ fontSize:36, marginBottom:10 }}>🔍</div>
      <div style={{ fontSize:13, color:"#94a3b8" }}>No alternatives found for this route.</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom:14, padding:"12px 14px", background:isCx ? "#fef2f2" : "#fff7ed", border:`1px solid ${isCx ? "#fca5a5" : "#fed7aa"}`, borderRadius:12, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:isCx ? "#dc2626" : "#c2410c", marginBottom:2 }}>{isCx ? "Flight cancelled" : "Flight delayed"}</div>
          <div style={{ fontSize:12, color:"#64748b" }}>{isCx ? `${fk} isn't going anywhere.` : `${fk} is +${liveDelayMin}m late.`} Here are your options.</div>
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:isCx ? "#dc2626" : "#c2410c" }}>{isCx ? "CANX" : `+${liveDelayMin}m`}</div>
      </div>

      <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        {[
          { key:"all",     label:`All (${alts.length})` },
          { key:"direct",  label:`Nonstop (${tc("direct")})` },
          { key:"connect", label:`1 Stop (${tc("connect")})` },
          { key:"nearby",  label:`Alt. Airport (${tc("nearby")})` },
        ].filter(f => f.key === "all" || tc(f.key) > 0).map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{ background:filter === f.key ? "#f59e0b" : "#fff", border:`1px solid ${filter === f.key ? "#f59e0b" : "#e8e6de"}`, borderRadius:20, padding:"4px 12px", fontSize:11, color:filter === f.key ? "#fff" : "#64748b", fontWeight:filter === f.key ? 600 : 400, cursor:"pointer" }}>{f.label}</button>
        ))}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtered.map(alt => {
          const depH = meta ? parseInt(meta.dep || "8") : 8;
          const depM = meta ? parseInt((meta.dep || "8:00").split(":")[1] || "0") : 0;
          const [dh, dm] = alt.dep.split(":").map(Number);
          const diff = (dh * 60 + dm) - (depH * 60 + depM);
          const ds   = diff === 0 ? "Same time" : diff > 0 ? `+${diff}m later` : `${Math.abs(diff)}m earlier`;
          const bs   = alt.badge ? BADGE_STYLES[alt.badge] : null;
          const sc   = alt.seats <= 3 ? "#dc2626" : alt.seats <= 8 ? "#ea580c" : "#16a34a";
          return (
            <div key={alt.id} style={{ background:"#fff", border:"1px solid #e8e6de", borderRadius:12, padding:"14px 16px", position:"relative" }}>
              {bs && <div style={{ position:"absolute", top:12, right:14, background:bs.bg, border:`1px solid ${bs.bc}`, borderRadius:20, padding:"2px 10px", fontSize:10, color:bs.c, fontWeight:600 }}>{alt.badge}</div>}
              {alt.type === "nearby" && <div style={{ marginBottom:8, padding:"4px 8px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:6, fontSize:11, color:"#1d4ed8", display:"inline-block" }}>Departs from {alt.altAirportName} ({alt.altAirport})</div>}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
                <div style={{ display:"flex", gap:10, alignItems:"center", minWidth:130 }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:acolor(alt.airline), display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:atcolor(alt.airline), flexShrink:0 }}>{ai(alt.airline)}</div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#1e293b" }}>{alt.airline}</div>
                    <div style={{ fontSize:11, color:"#94a3b8", fontFamily:"monospace" }}>{alt.flight}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, justifyContent:"center", minWidth:160 }}>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:"#1e293b" }}>{alt.dep}</div>
                    <div style={{ fontSize:10, color:"#94a3b8" }}>{alt.from}</div>
                  </div>
                  <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                    <span style={{ fontSize:10, color:alt.stops === 0 ? "#16a34a" : "#d97706", fontWeight:600, background:alt.stops === 0 ? "#f0fdf4" : "#fffbeb", padding:"1px 6px", borderRadius:10 }}>{alt.stops === 0 ? "Nonstop" : "1 Stop"}</span>
                    <div style={{ width:"100%", height:1, background:"#e8e6de" }}/>
                    {alt.via && <div style={{ fontSize:10, color:"#94a3b8" }}>via {alt.via}</div>}
                  </div>
                  <div style={{ textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:"#1e293b" }}>{alt.arr}</div>
                    <div style={{ fontSize:10, color:"#94a3b8" }}>{alt.to}</div>
                  </div>
                </div>
                <div style={{ textAlign:"right", minWidth:80 }}>
                  <div style={{ fontSize:21, fontWeight:800, color:"#c2820a" }}>${alt.price}</div>
                  <div style={{ fontSize:10, color:"#94a3b8", marginBottom:5 }}>per person</div>
                  <div style={{ fontSize:10, color:"#64748b", marginBottom:3 }}>Seats: <b style={{ color:sc }}>{alt.seats}</b></div>
                  <div style={{ height:3, background:"#f1f5f9", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(alt.seats / 20, 1) * 100}%`, background:sc, borderRadius:2 }}/>
                  </div>
                </div>
              </div>
              <div style={{ marginTop:10, paddingTop:9, borderTop:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", fontSize:11, color:"#94a3b8" }}>
                <span>On-time: <b style={{ color:rc(1 - alt.onTimeRate) }}>{pct(alt.onTimeRate)}</b></span>
                <span style={{ color:diff < 0 ? "#16a34a" : diff > 30 ? "#ea580c" : "#94a3b8" }}>{ds}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [q, setQ]     = useState("");
  const [sel, setSel] = useState(null);
  const [page, setPage] = useState("live");

  // Format input: max 2 letters then max 4 digits, no spaces
  const handleInput = e => {
    const raw     = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const letters = raw.match(/^[A-Z]{0,2}/)?.[0] || "";
    const digits  = raw.slice(letters.length).replace(/[^0-9]/g, "").slice(0, 4);
    setQ(letters + digits);
  };

  // Submit on Enter or Search button — only fires ONE API call
  const submit = () => { if (q.length >= 3) { setSel(q); setPage("live"); } };
  const handleKeyDown = e => { if (e.key === "Enter") submit(); };

  // Quick-pick buttons strip the space from "AA 100" → "AA100"
  const pick = k => { const c = k.replace(" ", ""); setQ(c); setSel(c); setPage("live"); };

  // Match sel ("AA100") back to ALTS keys ("AA 100")
  const altsKey  = sel ? Object.keys(ALTS).find(k => k.replace(" ","") === sel) || sel : null;
  const altCount = altsKey ? (ALTS[altsKey] || []).length : 0;
  const hasDelay = false; // updated by LivePage via liveStatus

  return (
    <div style={{ minHeight:"100vh", background:"#f8f7f4", color:"#1e293b", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", paddingBottom:60 }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } input { outline: none; } button { cursor: pointer; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #d1cfc7; border-radius: 3px; }`}</style>

      <div style={{ background:"#fff", borderBottom:"1px solid #e8e6de", padding:"14px 20px", position:"sticky", top:0, zIndex:20 }}>
        <div style={{ maxWidth:780, margin:"0 auto" }}>
          <div style={{ marginBottom:14 }}><Logo/></div>

          {/* Search bar — no API calls until Enter/Search */}
          <div style={{ display:"flex", gap:8, maxWidth:480, marginBottom:12 }}>
            <input
              value={q}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="e.g. AA100, BA178, EK201"
              maxLength={6}
              style={{ flex:1, background:"#f8f7f4", border:"1.5px solid #e8e6de", borderRadius:10, padding:"9px 14px", fontSize:13, color:"#1e293b", transition:"border-color 0.15s", fontFamily:"monospace" }}
              onFocus={e => e.target.style.borderColor = "#f59e0b"}
              onBlur={e  => e.target.style.borderColor = "#e8e6de"}
            />
            <button onClick={submit} style={{ background:"#f59e0b", border:"none", borderRadius:10, padding:"9px 18px", fontSize:13, fontWeight:600, color:"#fff", cursor:"pointer" }}>
              Search
            </button>
          </div>

          {/* Quick picks */}
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:sel ? 12 : 0 }}>
            {Object.keys(FLIGHTS).map(k => {
              const clean = k.replace(" ","");
              return (
                <button key={k} onClick={() => pick(k)} style={{ background:sel === clean ? "#fef3c7" : "#f8f7f4", border:`1.5px solid ${sel === clean ? "#f59e0b" : "#e8e6de"}`, borderRadius:7, padding:"3px 10px", fontSize:11, color:sel === clean ? "#c2820a" : "#64748b", fontWeight:sel === clean ? 600 : 400, cursor:"pointer" }}>
                  {k}
                </button>
              );
            })}
          </div>

          {/* Nav tabs */}
          {sel && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[
                ["live",    "✈ What's happening"],
                ["history", "📊 How often is it late"],
                ["alts",    "🔀 What else can I take"],
              ].map(([p, l]) => (
                <button key={p} onClick={() => setPage(p)} style={{ background:page === p ? "#f59e0b" : "#f8f7f4", border:`1.5px solid ${page === p ? "#f59e0b" : "#e8e6de"}`, borderRadius:8, padding:"6px 14px", fontSize:12, color:page === p ? "#fff" : "#64748b", fontWeight:page === p ? 600 : 400, cursor:"pointer" }}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth:780, margin:"0 auto", padding:"20px 20px" }}>
        {!sel ? (
          <div style={{ textAlign:"center", marginTop:60 }}>
            <div style={{ width:64, height:64, borderRadius:20, background:"#fef3c7", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 16px" }}>✈</div>
            <div style={{ fontSize:20, fontWeight:700, color:"#1e293b", marginBottom:8 }}>Is your flight actually leaving?</div>
            <div style={{ fontSize:13, color:"#94a3b8", marginBottom:24 }}>Type a flight number and press Enter or Search.</div>
            <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
              {["Real delay odds", "Live tracking", "Escape options"].map(f => (
                <div key={f} style={{ background:"#fff", border:"1px solid #e8e6de", borderRadius:10, padding:"10px 18px", fontSize:12, color:"#64748b", fontWeight:500 }}>✓ {f}</div>
              ))}
            </div>
            <div style={{ marginTop:20, fontSize:11, color:"#d1cfc7" }}>Try: AA100 · BA178 · EK201 · UA1</div>
          </div>
        ) : page === "live"    ? <LivePage    key={sel + "l"} fk={sel}/>
          : page === "history" ? <HistoryPage key={sel + "h"} fk={sel}/>
          : <AltsPage key={sel + "a"} fk={sel} liveDelayMin={0} liveStatus={null}/>
        }
      </div>
    </div>
  );
}// Sun Mar 22 21:42:56 EDT 2026
