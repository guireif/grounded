import pandas as pd
from supabase import create_client
import math

# ─── CONFIG ───────────────────────────────────────────────────────────────────

SUPABASE_URL = "https://zhbtblfjaJponvpafxau.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpoYnRibGZqYWpwb252cGFmeGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMTM4MTAsImV4cCI6MjA4OTU4OTgxMH0.2TZWp6j3smJNd-P9NXQglUkuG7DWRhc2jrfyFeW7B_s"

# ─── ADD ALL YOUR CSV FILES HERE ──────────────────────────────────────────────
# Uncomment each line as you download the files

CSV_FILES = [
    "/Users/guireif/Downloads/T_ONTIME_REPORTING.csv",      # November 2025
    "/Users/guireif/Downloads/T_ONTIME_REPORTING 2.csv",  # October 2025
    "/Users/guireif/Downloads/T_ONTIME_REPORTING 3.csv",  # September 2025
    "/Users/guireif/Downloads/T_ONTIME_REPORTING 4.csv",  # August 2025
]

# ─── HELPERS ──────────────────────────────────────────────────────────────────

def clean(val):
    if isinstance(val, float) and math.isnan(val):
        return None
    return val

def process_csv(path):
    print(f"\nLoading {path}...")
    df = pd.read_csv(path, low_memory=False)
    print(f"  Loaded {len(df):,} rows")

    df = df.rename(columns={
        "YEAR":                "year",
        "MONTH":               "month",
        "DAY_OF_WEEK":         "day_of_week",
        "OP_UNIQUE_CARRIER":   "carrier",
        "OP_CARRIER_FL_NUM":   "flight_num",
        "ORIGIN":              "origin",
        "DEST":                "dest",
        "DEP_DELAY":           "dep_delay",
        "ARR_DELAY":           "arr_delay",
        "CANCELLED":           "cancelled",
        "CARRIER_DELAY":       "carrier_delay",
        "WEATHER_DELAY":       "weather_delay",
        "NAS_DELAY":           "nas_delay",
        "SECURITY_DELAY":      "security_delay",
        "LATE_AIRCRAFT_DELAY": "late_aircraft_delay",
    })

    cols = ["year","month","day_of_week","carrier","flight_num","origin","dest",
            "dep_delay","arr_delay","cancelled","carrier_delay","weather_delay",
            "nas_delay","security_delay","late_aircraft_delay"]
    df = df[cols]
    df["flight_num"] = df["flight_num"].fillna(0).astype(int).astype(str)

    records = []
    for row in df.itertuples(index=False):
        records.append({
            "year":                clean(row.year),
            "month":               clean(row.month),
            "day_of_week":         clean(row.day_of_week),
            "carrier":             clean(row.carrier),
            "flight_num":          clean(row.flight_num),
            "origin":              clean(row.origin),
            "dest":                clean(row.dest),
            "dep_delay":           clean(row.dep_delay),
            "arr_delay":           clean(row.arr_delay),
            "cancelled":           int(row.cancelled) if row.cancelled == row.cancelled else 0,
            "carrier_delay":       clean(row.carrier_delay),
            "weather_delay":       clean(row.weather_delay),
            "nas_delay":           clean(row.nas_delay),
            "security_delay":      clean(row.security_delay),
            "late_aircraft_delay": clean(row.late_aircraft_delay),
        })

    print(f"  Prepared {len(records):,} records")
    return records

# ─── UPLOAD ───────────────────────────────────────────────────────────────────

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
BATCH_SIZE = 500
grand_total = 0

for csv_path in CSV_FILES:
    records = process_csv(csv_path)
    total    = len(records)
    uploaded = 0

    print(f"  Uploading in batches of {BATCH_SIZE}...")
    for i in range(0, total, BATCH_SIZE):
        batch = records[i:i + BATCH_SIZE]
        try:
            supabase.table("flight_stats").upsert(batch).execute()
            uploaded += len(batch)
            pct = (uploaded / total) * 100
            print(f"  {uploaded:,} / {total:,} ({pct:.1f}%)")
        except Exception as e:
            print(f"  Error at batch {i}: {e}")

    grand_total += uploaded
    print(f"  ✓ Done with {csv_path.split('/')[-1]} — {uploaded:,} rows")

print(f"\n✅ All done! {grand_total:,} total rows uploaded.")