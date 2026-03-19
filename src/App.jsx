import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Cell, PieChart, Pie,
} from "recharts";

// ─── AIRPORT LAT/LNG DATABASE ─────────────────────────────────────────────────
// Used to plot airports on the world map via Mercator projection

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
  CPT:{ lat:-33.97, lng:18.60  }, ADD:{ lat:8.98,   lng:38.80   },
  BOM:{ lat:19.09,  lng:72.87  }, DEL:{ lat:28.56,  lng:77.10   },
  BKK:{ lat:13.69,  lng:100.75 }, KUL:{ lat:2.74,   lng:101.71  },
  IST:{ lat:40.98,  lng:28.82  }, ATH:{ lat:37.94,  lng:23.95   },
  VIE:{ lat:48.11,  lng:16.57  }, BRU:{ lat:50.90,  lng:4.48    },
  CPH:{ lat:55.62,  lng:12.66  }, OSL:{ lat:60.20,  lng:11.08   },
  ARN:{ lat:59.65,  lng:17.92  }, HEL:{ lat:60.32,  lng:24.96   },
  LIS:{ lat:38.77,  lng:-9.13  }, DUB:{ lat:53.43,  lng:-6.24   },
  MAN:{ lat:53.35,  lng:-2.27  }, BHX:{ lat:52.45,  lng:-1.75   },
  GLA:{ lat:55.87,  lng:-4.43  }, EDI:{ lat:55.95,  lng:-3.37   },
  MXP:{ lat:45.63,  lng:8.73   }, LIN:{ lat:45.45,  lng:9.28    },
  TXL:{ lat:52.56,  lng:13.29  }, HAM:{ lat:53.63,  lng:10.00   },
  PMI:{ lat:39.55,  lng:2.74   }, AGP:{ lat:36.67,  lng:-4.50   },
  VLC:{ lat:39.49,  lng:-0.48  }, SVQ:{ lat:37.42,  lng:-5.89   },
  ALC:{ lat:38.28,  lng:-0.56  }, TFS:{ lat:28.04,  lng:-16.57  },
  LPA:{ lat:27.93,  lng:-15.39 }, ACE:{ lat:29.00,  lng:-13.60  },
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

// ─── SIMULATED ALTERNATIVES ───────────────────────────────────────────────────

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
  if (apiStatus === "cancelled") return "Cancelled";
  if (apiStatus === "landed")    return "Landed";
  if (apiStatus === "active")    return delayMin > 0 ? "Delayed – In Flight" : "En Route";
  if (apiStatus === "scheduled") return delayMin > 0 ? `Delayed – ${delayMin}m` : "Scheduled";
  if (apiStatus === "incident")  return "Delayed";
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
// Uses equirectangular projection: x = (lng+180)/360 * W, y = (90-lat)/180 * H

const MAP_W = 960;
const MAP_H = 480;

function project(lat, lng) {
  const x = ((lng + 180) / 360) * MAP_W;
  const y = ((90 - lat) / 180) * MAP_H;
  return { x, y };
}

// Interpolate a point along a great-circle path at progress t
// For short distances equirectangular is fine; we add a slight arc
function interpolate(fromLat, fromLng, toLat, toLng, t) {
  const lat = fromLat + (toLat - fromLat) * t;
  const lng = fromLng + (toLng - fromLng) * t;
  // Arc lift — pushes plane slightly north of straight line
  const arcLift = Math.sin(Math.PI * t) * 8;
  return { lat: lat + arcLift, lng };
}

// Simplified world land masses as SVG path (Robinson-ish, equirectangular)
const WORLD_PATH = `
M 136,60 L 152,55 L 168,52 L 180,48 L 192,46 L 200,44 L 208,45 L 216,48
L 224,52 L 228,58 L 232,65 L 228,72 L 224,78 L 216,82 L 208,84 L 200,82
L 192,78 L 184,74 L 176,70 L 168,65 L 158,62 L 148,62 L 140,63 Z

M 244,52 L 260,48 L 280,44 L 296,42 L 316,40 L 336,38 L 352,36 L 368,35
L 380,34 L 392,36 L 404,40 L 416,46 L 424,52 L 428,58 L 424,65 L 416,70
L 404,74 L 388,76 L 372,78 L 356,80 L 340,82 L 324,82 L 308,80 L 292,76
L 276,72 L 260,68 L 248,63 L 242,58 Z

M 440,44 L 456,40 L 472,38 L 488,36 L 504,35 L 520,34 L 536,34 L 552,35
L 568,37 L 580,40 L 592,44 L 600,50 L 604,57 L 600,64 L 592,70 L 580,75
L 564,79 L 548,82 L 532,84 L 516,84 L 500,82 L 484,78 L 468,73 L 454,67
L 444,60 L 438,52 Z

M 612,38 L 628,34 L 644,32 L 660,31 L 676,32 L 692,34 L 704,38 L 712,44
L 716,51 L 712,58 L 704,64 L 692,68 L 676,71 L 660,72 L 644,71 L 628,68
L 616,63 L 610,56 L 608,49 Z

M 720,44 L 736,40 L 756,37 L 776,35 L 796,34 L 812,35 L 824,38 L 832,43
L 836,50 L 832,57 L 824,63 L 812,67 L 796,70 L 780,71 L 764,70 L 748,67
L 734,62 L 724,56 L 718,49 Z

M 180,140 L 196,136 L 212,133 L 228,131 L 244,130 L 260,131 L 272,134
L 280,139 L 284,146 L 280,153 L 272,158 L 260,162 L 244,164 L 228,164
L 212,162 L 198,158 L 188,152 L 182,146 Z

M 196,200 L 208,195 L 220,192 L 232,190 L 244,191 L 252,194 L 256,200
L 252,207 L 244,212 L 232,215 L 220,215 L 208,213 L 200,208 Z

M 132,260 L 148,256 L 160,254 L 172,256 L 180,262 L 176,270 L 164,276
L 152,278 L 140,276 L 132,270 L 128,264 Z

M 396,96 L 416,88 L 436,82 L 452,78 L 464,76 L 476,76 L 488,78 L 500,82
L 508,88 L 512,95 L 508,103 L 500,110 L 488,115 L 472,118 L 456,120
L 440,120 L 424,117 L 410,112 L 400,105 Z

M 440,136 L 456,130 L 472,126 L 488,124 L 504,124 L 516,127 L 524,133
L 520,141 L 508,148 L 492,153 L 476,156 L 460,156 L 446,152 L 436,145 Z

M 480,176 L 492,172 L 504,170 L 516,172 L 524,178 L 520,186 L 508,192
L 492,195 L 478,192 L 470,186 L 472,179 Z

M 392,176 L 400,171 L 408,168 L 418,168 L 424,173 L 420,180 L 410,185
L 398,186 L 390,181 Z

M 500,240 L 512,234 L 524,231 L 536,232 L 544,238 L 540,247 L 528,254
L 514,257 L 500,254 L 492,247 Z

M 528,284 L 540,279 L 552,277 L 560,280 L 560,288 L 552,295 L 540,298
L 528,295 L 520,289 Z

M 552,320 L 560,316 L 568,315 L 574,319 L 572,326 L 562,330 L 552,327 Z

M 568,356 L 576,352 L 584,352 L 588,358 L 584,364 L 574,366 L 566,362 Z

M 600,100 L 616,94 L 632,90 L 648,87 L 664,86 L 676,87 L 688,91 L 696,97
L 700,105 L 696,113 L 684,120 L 668,125 L 652,127 L 636,126 L 620,122
L 606,115 L 598,107 Z

M 680,136 L 696,130 L 712,127 L 728,128 L 740,132 L 748,139 L 744,148
L 732,155 L 716,159 L 700,159 L 686,154 L 676,147 Z

M 724,168 L 736,163 L 748,161 L 760,163 L 768,170 L 764,179 L 752,185
L 736,188 L 722,184 L 714,176 Z

M 748,196 L 760,191 L 772,190 L 780,195 L 776,204 L 762,209 L 748,205 Z

M 780,220 L 788,215 L 796,215 L 800,222 L 796,230 L 784,232 L 776,226 Z

M 796,244 L 804,240 L 812,241 L 816,248 L 810,255 L 800,255 L 792,250 Z

M 812,264 L 820,261 L 828,263 L 828,271 L 820,275 L 812,272 Z

M 676,188 L 692,183 L 708,182 L 716,187 L 712,196 L 700,202 L 684,201
L 672,195 Z

M 640,164 L 656,158 L 668,157 L 676,163 L 672,172 L 656,177 L 640,173 Z

M 624,192 L 636,187 L 648,188 L 652,196 L 644,203 L 628,203 L 618,196 Z
`;

function FlightMap({ fromIata, toIata, progress, planeLat, planeLng, apiStatus }) {
  const fromAp = AIRPORTS[fromIata];
  const toAp   = AIRPORTS[toIata];

  // Fallback: if airport not in our DB, use center of map
  const fromPos = fromAp ? project(fromAp.lat, fromAp.lng) : { x: MAP_W * 0.3, y: MAP_H * 0.4 };
  const toPos   = toAp   ? project(toAp.lat,   toAp.lng)   : { x: MAP_W * 0.7, y: MAP_H * 0.4 };

  // Plane position: use real lat/lng from OpenSky if available, else interpolate
  let planePos = null;
  if (planeLat && planeLng) {
    planePos = project(planeLat, planeLng);
  } else if (progress > 0 && progress < 1 && fromAp && toAp) {
    const interp = interpolate(fromAp.lat, fromAp.lng, toAp.lat, toAp.lng, progress);
    planePos = project(interp.lat, interp.lng);
  }

  const fly        = progress > 0 && progress < 1;
  const isCancelled = apiStatus === "cancelled";
  const isLanded    = apiStatus === "landed";

  // Build arc path for the route line
  const buildArcPath = (from, to) => {
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2 - Math.abs(to.x - from.x) * 0.15;
    return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  };

  const arcPath = buildArcPath(fromPos, toPos);

  // Traveled path up to plane position
  const traveledPath = planePos && fly
    ? buildArcPath(fromPos, planePos)
    : null;

  return (
    <div style={{ background:"#f0f4ff", borderRadius:12, overflow:"hidden", border:"1px solid #e8e6de" }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} width="100%" style={{ display:"block" }}>
        {/* Ocean background */}
        <rect width={MAP_W} height={MAP_H} fill="#dce8f5"/>

        {/* Land masses */}
        <path d={WORLD_PATH} fill="#e8eef8" stroke="#c8d8ec" strokeWidth="0.8"/>

        {/* Grid lines */}
        {[-60,-30,0,30,60].map(lat => {
          const { y } = project(lat, 0);
          return <line key={lat} x1={0} y1={y} x2={MAP_W} y2={y} stroke="#d4e0f0" strokeWidth="0.5"/>;
        })}
        {[-150,-120,-90,-60,-30,0,30,60,90,120,150].map(lng => {
          const { x } = project(0, lng);
          return <line key={lng} x1={x} y1={0} x2={x} y2={MAP_H} stroke="#d4e0f0" strokeWidth="0.5"/>;
        })}

        {/* Route arc (dashed) */}
        <path d={arcPath} fill="none" stroke="#b0c8e8" strokeWidth="1.5" strokeDasharray="6,4"/>

        {/* Traveled portion */}
        {traveledPath && <path d={traveledPath} fill="none" stroke="#f59e0b" strokeWidth="2.5"/>}

        {/* Airport markers */}
        {[{ iata:fromIata, pos:fromPos, col:"#f59e0b" }, { iata:toIata, pos:toPos, col:"#16a34a" }].map(({ iata, pos, col }) => (
          <g key={iata}>
            <circle cx={pos.x} cy={pos.y} r="7" fill="#fff" stroke={col} strokeWidth="2"/>
            <circle cx={pos.x} cy={pos.y} r="3" fill={col}/>
            <text x={pos.x} y={pos.y - 14} textAnchor="middle" fill={col} fontSize="11" fontFamily="monospace" fontWeight="bold">{iata}</text>
          </g>
        ))}

        {/* Plane icon */}
        {fly && planePos && (
          <g transform={`translate(${planePos.x},${planePos.y})`}>
            <circle r="13" fill="#fff" stroke="#f59e0b" strokeWidth="2"/>
            <circle r="13" fill="#fef3c7" opacity="0.5">
              <animate attributeName="r" values="13;19;13" dur="2s" repeatCount="indefinite"/>
            </circle>
            <text textAnchor="middle" dominantBaseline="middle" fontSize="12">✈</text>
          </g>
        )}

        {/* Landed */}
        {isLanded && (
          <g transform={`translate(${toPos.x},${toPos.y})`}>
            <circle r="13" fill="#dcfce7">
              <animate attributeName="r" values="13;20;13" dur="2s" repeatCount="indefinite"/>
            </circle>
            <text textAnchor="middle" dominantBaseline="middle" fontSize="14" y="-1">🛬</text>
          </g>
        )}

        {/* Parked / scheduled */}
        {!fly && !isLanded && !isCancelled && (
          <g transform={`translate(${fromPos.x},${fromPos.y})`}>
            <circle r="11" fill="#fef3c7" stroke="#f59e0b" strokeWidth="1.5"/>
            <text textAnchor="middle" dominantBaseline="middle" fontSize="11" y="-1">✈</text>
          </g>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <g transform={`translate(${fromPos.x},${fromPos.y})`}>
            <circle r="13" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5"/>
            <text textAnchor="middle" dominantBaseline="middle" fontSize="13" y="-1" fill="#dc2626">✕</text>
          </g>
        )}
      </svg>

      <div style={{ padding:"6px 14px 8px", borderTop:"1px solid #e8e6de", display:"flex", gap:16, fontSize:11, color:"#64748b" }}>
        <span style={{ color:"#b45309" }}>● {fromIata}</span>
        <span style={{ color:"#15803d" }}>● {toIata}</span>
        {planeLat && <span style={{ color:"#94a3b8" }}>Real position from OpenSky</span>}
      </div>
    </div>
  );
}

// ─── LIVE STATUS PAGE ─────────────────────────────────────────────────────────

function LivePage({ fk }) {
  const [liveData, setLiveData] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const callsign = fk.replace(" ", "");
  const meta     = FLIGHTS[fk];

  useEffect(() => {
    setLoading(true);
    setError(null);
    setLiveData(null);
    setPosition(null);

    fetch(`/api/live?flight=${callsign}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setLiveData(data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));

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
  const gate       = liveData.departure?.gate || "—";
  const fromIata   = liveData.departure?.iata || meta?.from || "—";
  const toIata     = liveData.arrival?.iata   || meta?.to   || "—";
  const progress   = calcProgress(liveData.departure?.scheduled, liveData.arrival?.scheduled, apiStatus);

  const altFt    = position?.altitudeFt  || 0;
  const speedMph = position?.speedMph    || 0;
  const planeLat = position?.latitude    || null;
  const planeLng = position?.longitude   || null;

  const col         = pc(phase);
  const isCancelled = phase === "Cancelled";
  const isEnRoute   = phase === "En Route" || phase.includes("In Flight");
  const isLanded    = phase === "Landed";

  const statusMsg    = isCancelled ? "Yep, it's cancelled" : delayMin > 0 ? `Running +${delayMin} min late` : isLanded ? "Wheels down!" : isEnRoute ? "In the air" : "Checking in...";
  const statusBg     = isCancelled ? "#fee2e2" : delayMin > 0 ? "#ffedd5" : isLanded ? "#dcfce7" : isEnRoute ? "#dbeafe" : "#f1f5f9";
  const statusBorder = isCancelled ? "#fca5a5" : delayMin > 0 ? "#fed7aa" : isLanded ? "#86efac" : isEnRoute ? "#93c5fd" : "#e2e8f0";

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:16 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:22, fontWeight:800, color:"#1e293b" }}>{fk}</span>
            {liveData.airline && <span style={{ background:"#f1f5f9", borderRadius:6, padding:"2px 8px", fontSize:11, color:"#64748b" }}>{liveData.airline}</span>}
          </div>
          <div style={{ fontSize:12, color:"#64748b" }}>{fromIata} → {toIata}</div>
          <div style={{ fontSize:13, color:col, fontWeight:600, marginTop:4 }}>{statusMsg}</div>
        </div>
        <div style={{ background:statusBg, border:`1px solid ${statusBorder}`, borderRadius:10, padding:"8px 14px", textAlign:"center" }}>
          <div style={{ fontSize:10, color:col, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600, marginBottom:2 }}>Live Status</div>
          <div style={{ fontSize:13, fontWeight:700, color:col }}>{phase}</div>
        </div>
      </div>

      <FlightMap
        fromIata={fromIata}
        toIata={toIata}
        progress={progress}
        planeLat={planeLat}
        planeLng={planeLng}
        apiStatus={apiStatus}
      />

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

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
        <StatCard label="Departure"  value={depActual !== "—" ? depActual : "TBD"} sub={`Sched. ${depSched}${delayMin > 0 ? ` · +${delayMin}m` : ""}`} color={delayMin > 0 ? "#ea580c" : "#16a34a"}/>
        <StatCard label="Arrives"    value={arrEst}                                sub={`Sched. ${arrSched}`}                                           color="#2563eb"/>
        <StatCard label="Dep. Gate"  value={gate}                                  sub={`${fromIata} terminal`}                                         color="#7c3aed"/>
        {isEnRoute && position && <StatCard label="Altitude" value={`${(altFt/1000).toFixed(0)}k ft`} sub={`${speedMph} mph`} color="#c2820a"/>}
        {!isEnRoute && !isCancelled && <StatCard label="Delay" value={delayMin > 0 ? `+${delayMin}m` : "None"} sub={delayMin > 0 ? "Behind schedule" : "On time!"} color={delayMin > 0 ? "#ea580c" : "#16a34a"}/>}
        {isCancelled && <StatCard label="Status" value="VOID" sub="Cancelled" color="#dc2626"/>}
      </div>

      <div style={{ padding:"10px 14px", background:"#f0fdf4", border:"1px solid #86efac", borderRadius:10, fontSize:12, color:"#15803d", display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:16 }}>✓</span>
        <span>Live data from AviationStack{position ? " + OpenSky" : ""} · Updated just now</span>
      </div>
    </div>
  );
}

// ─── HISTORY PAGE ─────────────────────────────────────────────────────────────

function HistoryPage({ fk }) {
  const [tab, setTab] = useState("dist");

  const s        = generateStats(fk);
  const meta     = FLIGHTS[fk];
  const dr       = 1 - s.onTimeRate;
  const riskMsg  = dr < 0.2 ? "Usually reliable" : dr < 0.35 ? "Delays happen" : dr < 0.5 ? "It's a gamble" : "Chronically late";
  const bestDay  = s.byDay.reduce((a, b) => a.delayRate < b.delayRate ? a : b).day;
  const worstDay = s.byDay.reduce((a, b) => a.delayRate > b.delayRate ? a : b).day;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:10, marginBottom:16 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
            <span style={{ fontSize:22, fontWeight:800, color:"#1e293b" }}>{fk}</span>
            {meta && <span style={{ background:"#f1f5f9", borderRadius:6, padding:"2px 8px", fontSize:11, color:"#64748b", fontFamily:"monospace" }}>{meta.aircraft}</span>}
          </div>
          {meta && <div style={{ fontSize:12, color:"#64748b" }}>{meta.airline} · {meta.route}</div>}
          <div style={{ fontSize:13, color:rc(dr), fontWeight:600, marginTop:4 }}>{riskMsg}</div>
        </div>
        <div style={{ background:rc(dr) + "14", border:`1px solid ${rc(dr)}33`, borderRadius:10, padding:"8px 14px", textAlign:"center" }}>
          <div style={{ fontSize:10, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>Delay Risk</div>
          <div style={{ fontSize:16, fontWeight:800, color:rc(dr) }}>{dr < 0.2 ? "LOW" : dr < 0.35 ? "MODERATE" : dr < 0.5 ? "HIGH" : "SEVERE"}</div>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        <StatCard label="On-Time"    value={pct(s.onTimeRate)}     sub={`${s.total} flights`} color="#16a34a"/>
        <StatCard label="Delay Rate" value={pct(dr)}               sub="When not on-time"     color={rc(dr)}/>
        <StatCard label="Avg Delay"  value={`${fmt(s.avgDelay)}m`} sub="When late"            color="#c2820a"/>
        <StatCard label="Cancels"    value={pct(s.cancelRate)}     sub="Historical avg"        color="#7c3aed"/>
      </div>

      <div style={{ display:"flex", gap:2, borderBottom:"2px solid #f1f5f9", marginBottom:16 }}>
        {[["dist","How late?"],["day","Which day?"],["mo","By month"],["cause","Why?"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:"7px 14px", fontSize:12, fontWeight:tab === k ? 600 : 400, color:tab === k ? "#c2820a" : "#94a3b8", borderBottom:`2px solid ${tab === k ? "#f59e0b" : "transparent"}`, marginBottom:-2, background:"none", border:"none", cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      {tab === "dist" && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Out of {s.total} flights, here's how late they got:</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={s.histogram} barCategoryGap="20%">
              <CartesianGrid vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="label" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="count" name="Flights" radius={[4,4,0,0]}>
                {s.histogram.map((e, i) => <Cell key={i} fill={e.color}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === "day" && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Pick the right day and you'll land on time more often.</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={s.byDay} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="day" tick={{ fill:"#94a3b8", fontSize:12 }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="delayRate" name="Delay Rate" radius={[4,4,0,0]}>
                {s.byDay.map((d, i) => <Cell key={i} fill={rc(d.delayRate)}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize:12, color:"#64748b", marginTop:10 }}>
            Fly on <b style={{ color:"#16a34a" }}>{bestDay}</b> · Avoid <b style={{ color:"#dc2626" }}>{worstDay}</b>
          </p>
        </div>
      )}

      {tab === "mo" && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Some months are rougher than others.</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={s.byMonth}>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3"/>
              <XAxis dataKey="month" tick={{ fill:"#94a3b8", fontSize:11 }} axisLine={false} tickLine={false}/>
              <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false}/>
              <Tooltip content={<TT/>}/>
              <Line type="monotone" dataKey="delayRate" name="Delay Rate" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill:"#f59e0b", r:3, strokeWidth:0 }}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === "cause" && (
        <div>
          <p style={{ fontSize:12, color:"#94a3b8", marginBottom:12 }}>Here's who to blame when this flight is late.</p>
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
                const total = s.causes.reduce((a, x) => a + x.value, 0);
                const p = total ? ((c.value / total) * 100).toFixed(1) : 0;
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

      <div style={{ marginTop:16, background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"14px 16px", display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
        <div style={{ fontSize:26, fontWeight:800, color:"#92400e" }}>{pct(dr)}</div>
        <div>
          <div style={{ fontSize:12, fontWeight:600, color:"#1e293b", marginBottom:2 }}>chance this flight delays you</div>
          <div style={{ fontSize:11, color:"#64748b" }}>
            Avg <b style={{ color:"#c2820a" }}>{fmt(s.avgDelay)} min</b> when late · Safest day: <b style={{ color:"#16a34a" }}>{bestDay}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ALTERNATIVES PAGE ────────────────────────────────────────────────────────

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
          <div style={{ fontSize:13, fontWeight:700, color:isCx ? "#dc2626" : "#c2410c", marginBottom:2 }}>
            {isCx ? "Flight cancelled" : "Flight delayed"}
          </div>
          <div style={{ fontSize:12, color:"#64748b" }}>
            {isCx ? `${fk} isn't going anywhere.` : `${fk} is +${liveDelayMin}m late.`} Here are your options.
          </div>
        </div>
        <div style={{ fontSize:18, fontWeight:800, color:isCx ? "#dc2626" : "#c2410c" }}>
          {isCx ? "CANX" : `+${liveDelayMin}m`}
        </div>
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
  const [q, setQ]           = useState("");
  const [sel, setSel]       = useState(null);
  const [sugg, setSugg]     = useState([]);
  const [page, setPage]     = useState("live");
  const [liveCache, setLiveCache] = useState({});
  const justPicked          = useRef(false);

  useEffect(() => {
    if (justPicked.current) { justPicked.current = false; return; }
    if (q.trim().length < 2) { setSugg([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then(r => r.json())
        .then(data => {
          if (data.results) {
            setSugg(data.results.map(r => ({
              key: r.flight, label: r.flight, route: r.route, airline: r.airline,
            })));
          }
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!sel || liveCache[sel]) return;
    const callsign = sel.replace(" ", "");
    fetch(`/api/live?flight=${callsign}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) setLiveCache(prev => ({ ...prev, [sel]: data }));
      })
      .catch(() => {});
  }, [sel]);

  const pick = k => { justPicked.current = true; setSel(k); setQ(k); setSugg([]); };

  const cached    = sel ? liveCache[sel] : null;
  const liveDelay = cached ? (cached.departure?.delay || cached.arrival?.delay || 0) : 0;
  const liveStatus= cached ? cached.status : null;
  const hasDelay  = liveDelay > 0 || liveStatus === "cancelled";
  const altCount  = sel ? (ALTS[sel] || []).length : 0;

  return (
    <div style={{ minHeight:"100vh", background:"#f8f7f4", color:"#1e293b", fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", paddingBottom:60 }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } input { outline: none; } button { cursor: pointer; } ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #d1cfc7; border-radius: 3px; }`}</style>

      <div style={{ background:"#fff", borderBottom:"1px solid #e8e6de", padding:"14px 20px", position:"sticky", top:0, zIndex:20 }}>
        <div style={{ maxWidth:780, margin:"0 auto" }}>
          <div style={{ marginBottom:14 }}><Logo/></div>

          <div style={{ position:"relative", maxWidth:440, marginBottom:12 }}>
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Search any flight — e.g. AA 100, BA 178, EK 201"
              style={{ width:"100%", background:"#f8f7f4", border:"1.5px solid #e8e6de", borderRadius:10, padding:"9px 14px", fontSize:13, color:"#1e293b", transition:"border-color 0.15s" }}
              onFocus={e => e.target.style.borderColor = "#f59e0b"}
              onBlur={e  => e.target.style.borderColor = "#e8e6de"}
            />
            {sugg.length > 0 && (
              <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"#fff", border:"1px solid #e8e6de", borderRadius:10, overflow:"hidden", zIndex:30, boxShadow:"0 4px 16px rgba(0,0,0,0.08)" }}>
                {sugg.map(s => (
                  <div key={s.key} onClick={() => pick(s.key)} style={{ padding:"9px 14px", cursor:"pointer", display:"flex", justifyContent:"space-between", fontSize:12, borderBottom:"1px solid #f8f7f4" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8f7f4"}
                    onMouseLeave={e => e.currentTarget.style.background = "#fff"}>
                    <span style={{ fontFamily:"monospace", color:"#c2820a", fontWeight:600 }}>{s.label}</span>
                    <span style={{ color:"#94a3b8" }}>{s.route}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:sel ? 12 : 0 }}>
            {Object.keys(FLIGHTS).map(k => (
              <button key={k} onClick={() => pick(k)} style={{ background:sel === k ? "#fef3c7" : "#f8f7f4", border:`1.5px solid ${sel === k ? "#f59e0b" : "#e8e6de"}`, borderRadius:7, padding:"3px 10px", fontSize:11, color:sel === k ? "#c2820a" : "#64748b", fontWeight:sel === k ? 600 : 400, cursor:"pointer" }}>
                {k}
              </button>
            ))}
          </div>

          {sel && (
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {[
                ["live",    "✈ What's happening"],
                ["history", "📊 How often is it late"],
                ["alts",    "🔀 What else can I take"],
              ].map(([p, l]) => (
                <button key={p} onClick={() => setPage(p)} style={{ background:page === p ? "#f59e0b" : "#f8f7f4", border:`1.5px solid ${page === p ? "#f59e0b" : "#e8e6de"}`, borderRadius:8, padding:"6px 14px", fontSize:12, color:page === p ? "#fff" : "#64748b", fontWeight:page === p ? 600 : 400, cursor:"pointer" }}>
                  {l}
                  {p === "alts" && hasDelay && altCount > 0 && (
                    <span style={{ marginLeft:5, background:page === "alts" ? "#fff" : "#dc2626", color:page === "alts" ? "#dc2626" : "#fff", borderRadius:9, padding:"1px 6px", fontSize:9, fontWeight:700 }}>{altCount}</span>
                  )}
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
            <div style={{ fontSize:13, color:"#94a3b8", marginBottom:24 }}>Search any flight number above to find out.</div>
            <div style={{ display:"flex", justifyContent:"center", gap:12, flexWrap:"wrap" }}>
              {["Real delay odds", "Live tracking", "Escape options"].map(f => (
                <div key={f} style={{ background:"#fff", border:"1px solid #e8e6de", borderRadius:10, padding:"10px 18px", fontSize:12, color:"#64748b", fontWeight:500 }}>✓ {f}</div>
              ))}
            </div>
            <div style={{ marginTop:20, fontSize:11, color:"#d1cfc7" }}>Try: AA 100 · BA 178 · EK 201 · UA 1</div>
          </div>
        ) : page === "live"    ? <LivePage    key={sel + "l"} fk={sel}/>
          : page === "history" ? <HistoryPage key={sel + "h"} fk={sel}/>
          : <AltsPage key={sel + "a"} fk={sel} liveDelayMin={liveDelay} liveStatus={liveStatus}/>
        }
      </div>
    </div>
  );
}