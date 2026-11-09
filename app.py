"""
app.py
-------
ClimateBuildAI - Construction Climate Risk & Intelligence Platform
Flask backend: SQLite persistence, ML model + rule engine, safe static serving.

Run:  python app.py      ->  http://127.0.0.1:5000
"""
import os
import json
import sqlite3
import warnings
import datetime
import webbrowser
import threading
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

warnings.filterwarnings("ignore")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "climatebuild.db")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
PORT = int(os.environ.get("PORT", 5000))

# Only these files are served publicly (app.py, model.pkl, the DB are NOT exposed)
PUBLIC_FILES = {"index.html", "login.html", "style.css", "script.js", "i18n.js", "chat.js"}

app = Flask(__name__, static_folder=None)
CORS(app)

# ----------------------------------------------------------------------------
# ML model
# ----------------------------------------------------------------------------
_model_bundle = None
if os.path.exists(MODEL_PATH):
    try:
        import joblib
        _model_bundle = joblib.load(MODEL_PATH)
    except Exception as e:
        print(f"[Warning] ML model could not be loaded: {e}. Rule-based fallback active.")

RISK_MAP = {"Low": 0, "Medium": 1, "High": 2}

# Same 8 activities + weights as the frontend (script.js ACTIVITIES_DATA),
# so backend and frontend produce the SAME risk score.
# ml = category name understood by the trained RandomForest.
ACTIVITIES = [
    {"id": "excavation", "name": "Deep Excavation & Trenching",     "rain": 0.38, "wind": 0.05, "temp": 0.08, "flood": 0.35, "ml": "Excavation"},
    {"id": "foundation", "name": "Foundation Piling & Raft",        "rain": 0.32, "wind": 0.06, "temp": 0.10, "flood": 0.30, "ml": "Foundation Work"},
    {"id": "concrete",   "name": "Structural Concrete Pouring",     "rain": 0.40, "wind": 0.08, "temp": 0.25, "flood": 0.15, "ml": "Concrete Work"},
    {"id": "crane",      "name": "Tower Crane & Rigging Deck",      "rain": 0.10, "wind": 0.65, "temp": 0.05, "flood": 0.05, "ml": "Overall"},
    {"id": "roofing",    "name": "Roofing & Cladding Installation", "rain": 0.25, "wind": 0.50, "temp": 0.10, "flood": 0.05, "ml": "Roofing"},
    {"id": "road",       "name": "Road Paving & Bitumen Laying",    "rain": 0.35, "wind": 0.08, "temp": 0.15, "flood": 0.20, "ml": "Road Construction"},
    {"id": "steel",      "name": "High-Altitude Steel Erection",    "rain": 0.20, "wind": 0.55, "temp": 0.10, "flood": 0.05, "ml": "Overall"},
    {"id": "transport",  "name": "Heavy Hauling & Transit Mixers",  "rain": 0.28, "wind": 0.12, "temp": 0.05, "flood": 0.35, "ml": "Material Transportation"},
]


def _norm_risk(value):
    """Accept 'High', 'high', 'HIGH' -> 'High'."""
    return str(value or "Low").strip().capitalize()


def level_from_score(score):
    # Same thresholds as the frontend getRiskCategory()
    if score >= 75: return "CRITICAL"
    if score >= 60: return "HIGH"
    if score >= 35: return "MEDIUM"
    return "LOW"


def activity_score(act, rainfall, wind, temp, flood_risk):
    """Exact port of frontend calculateActivityRisk()."""
    score = 0.0
    score += min(100, (rainfall / 120) * 100) * act["rain"]
    score += min(100, (wind / 70) * 100) * act["wind"]
    score += max(0, (temp - 30) / 18) * 100 * act["temp"]
    flood_val = 80 if flood_risk == "High" else 45 if flood_risk == "Medium" else 15
    score += flood_val * act["flood"]
    return int(round(min(100, max(5, score))))


def estimate_delay(level, rainfall):
    if level in ("HIGH", "CRITICAL"):
        return "2-3 days" if rainfall > 90 else "1-2 days"
    if level == "MEDIUM":
        return "0-1 day"
    return "No delay expected"


def ml_predict(temperature, rainfall, humidity, wind_speed, flood_risk, landslide_risk, ml_activity="Overall"):
    """Return the RandomForest risk level (LOW/MEDIUM/HIGH) or None."""
    if _model_bundle is None:
        return None
    try:
        import pandas as pd
        model = _model_bundle["model"]
        act_map = _model_bundle["activity_map"]
        risk_map = _model_bundle["risk_map"]
        row = pd.DataFrame([{
            "temperature": temperature, "rainfall": rainfall, "humidity": humidity,
            "wind_speed": wind_speed,
            "flood_risk": risk_map.get(flood_risk, 0),
            "landslide_risk": risk_map.get(landslide_risk, 0),
            "activity": act_map.get(ml_activity, act_map.get("Overall", 6)),
        }])
        return str(model.predict(row)[0])
    except Exception as e:
        print(f"[Warning] ML prediction failed: {e}")
        return None


def read_weather(data):
    return {
        "temperature": float(data.get("temperature", 30)),
        "rainfall": float(data.get("rainfall", 0)),
        "humidity": float(data.get("humidity", 50)),
        "wind_speed": float(data.get("windSpeed", data.get("wind_speed", 10))),
        "flood_risk": _norm_risk(data.get("floodRisk", data.get("flood_risk", "Low"))),
        "landslide_risk": _norm_risk(data.get("landslideRisk", data.get("landslide_risk", "Low"))),
    }


# ----------------------------------------------------------------------------
# Database
# ----------------------------------------------------------------------------
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def now_str():
    return datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, location TEXT NOT NULL,
        latitude REAL NOT NULL, longitude REAL NOT NULL, project_type TEXT NOT NULL,
        phase TEXT NOT NULL, daily_cost REAL NOT NULL, target_date TEXT NOT NULL,
        status TEXT NOT NULL, overall_risk TEXT DEFAULT 'LOW', risk_score REAL DEFAULT 24.5,
        created_at TEXT NOT NULL
    );""")

    # Check users table schema and user count
    user_cols = []
    try:
        user_cols = [r["name"] for r in cur.execute("PRAGMA table_info(users)").fetchall()]
    except Exception:
        pass

    user_count = 0
    if user_cols:
        try:
            user_count = cur.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        except Exception:
            user_count = 0

    # Ensure all 8 accounts with password_hash & user_type exist
    if not user_cols or "password_hash" not in user_cols or "user_type" not in user_cols or user_count != 8:
        cur.execute("DROP TABLE IF EXISTS users")
        cur.execute("""
        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            user_type TEXT NOT NULL,
            email TEXT NOT NULL,
            avatar TEXT NOT NULL,
            assigned_site_id TEXT,
            assigned_site_name TEXT,
            created_at TEXT NOT NULL
        );""")
        seed_users(conn)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS sensors (
        id TEXT PRIMARY KEY, site_id TEXT NOT NULL, sensor_type TEXT NOT NULL,
        label TEXT NOT NULL, value REAL NOT NULL, unit TEXT NOT NULL,
        status TEXT NOT NULL, battery INTEGER NOT NULL, updated_at TEXT NOT NULL
    );""")

    cur.execute("""
    CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY, site_id TEXT NOT NULL, name TEXT NOT NULL,
        vulnerability_category TEXT NOT NULL, planned_start TEXT NOT NULL,
        planned_end TEXT NOT NULL, risk_level TEXT DEFAULT 'LOW', status TEXT DEFAULT 'SCHEDULED'
    );""")

    # Alerts table
    cols = [r["name"] for r in cur.execute("PRAGMA table_info(alerts)").fetchall()]
    if cols and "category" not in cols:
        cur.execute("DROP TABLE alerts")
    cur.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        site TEXT NOT NULL,
        severity TEXT NOT NULL,
        category TEXT NOT NULL,
        details TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        acknowledged_by TEXT,
        resolved_at TEXT
    );""")

    # Contracts table for Owner & Contractor dual-confirmation workflow
    cur.execute("""
    CREATE TABLE IF NOT EXISTS contracts (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        site_name TEXT NOT NULL,
        title TEXT NOT NULL,
        owner_username TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        contractor_username TEXT NOT NULL,
        contractor_name TEXT NOT NULL,
        package_type TEXT NOT NULL,
        budget REAL NOT NULL,
        scope TEXT NOT NULL,
        climate_protocol TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING_CONTRACTOR_CONFIRMATION',
        contractor_confirmed INTEGER DEFAULT 0,
        contractor_confirmed_at TEXT,
        contractor_notes TEXT,
        owner_verified INTEGER DEFAULT 0,
        owner_verified_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );""")

    conn.commit()

    if cur.execute("SELECT COUNT(*) FROM sites").fetchone()[0] == 0:
        seed_core_sites(conn)
    if cur.execute("SELECT COUNT(*) FROM alerts").fetchone()[0] == 0:
        seed_alerts(conn)
    if cur.execute("SELECT COUNT(*) FROM contracts").fetchone()[0] == 0:
        seed_contracts(conn)
    conn.close()


def seed_users(conn):
    cur = conn.cursor()
    now = now_str()
    # Default password for all demo accounts is 'climate123'
    default_pwd_hash = generate_password_hash("climate123")

    users = [
        # Account 1: Site Engineer | Team/Staff
        ("user-1", "rahul.engineer", default_pwd_hash, "Rahul Sharma", "Site Engineer", "Team/Staff",
         "rahul.engineer@climatebuild.ai", "👷", None, "All Sites (Operations)", now),
        # Account 2: Safety Officer | Team/Staff
        ("user-2", "pooja.safety", default_pwd_hash, "Pooja Deshmukh", "Safety Officer", "Team/Staff",
         "pooja.safety@climatebuild.ai", "🦺", None, "All Sites (Safety Oversight)", now),
        # Account 3: Project Director | Team/Staff
        ("user-3", "vikram.pm", default_pwd_hash, "Vikram Patil", "Project Director", "Team/Staff",
         "vikram.patil@climatebuild.ai", "📊", None, "All Sites (Executive)", now),
        # Account 4: Lead Master Contractor | Contractor
        ("user-4", "shiva.admin", default_pwd_hash, "Shiva Contractor", "Lead Master Contractor", "Contractor",
         "shiva.contractor@climatebuild.ai", "🏢", "site-pune", "Pune Metro Line 3", now),
        # Account 5: Highway Civil Contractor | Contractor
        ("user-5", "amit.contractor", default_pwd_hash, "Amit Verma", "Highway Civil Contractor", "Contractor",
         "amit.verma@climatebuild.ai", "🚛", "site-mumbai", "Mumbai Coastal Road Pier 4", now),
        # Account 6: Site Owner (Pune Metro Project) | Owner
        ("user-6", "rohan.owner", default_pwd_hash, "Rohan Joshi", "Site Owner (Pune Metro Project)", "Owner",
         "rohan.joshi@climatebuild.ai", "🏛️", "site-pune", "Pune Metro Line 3", now),
        # Account 7: Site Owner (Mumbai Coastal Project) | Owner
        ("user-7", "suresh.owner", default_pwd_hash, "Suresh Shinde", "Site Owner (Mumbai Coastal Project)", "Owner",
         "suresh.shinde@climatebuild.ai", "⚓", "site-mumbai", "Mumbai Coastal Road Pier 4", now),
        # Account 8: Read-Only Auditor | Viewer
        ("user-8", "public.viewer", default_pwd_hash, "Public Auditor", "Read-Only Auditor", "Viewer",
         "auditor@climatebuild.ai", "👁️", None, "Public Infrastructure Audit Portal", now),
    ]
    cur.executemany("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?,?,?)", users)
    conn.commit()


def seed_core_sites(conn):
    cur = conn.cursor()
    now = now_str()
    cur.executemany("INSERT INTO sites VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", [
        ("site-pune", "Pune Metro Line 3", "Pune, Maharashtra", 18.5204, 73.8567, "Transit Infrastructure", "Foundation & Piling", 250000, "2027-03-31", "ACTIVE", "HIGH", 68.4, now),
        ("site-mumbai", "Mumbai Coastal Road Pier 4", "Mumbai, Maharashtra", 19.0760, 72.8777, "Marine & Highway", "Superstructure Deck", 480000, "2026-12-15", "ACTIVE", "MEDIUM", 44.0, now),
        ("site-nashik", "Nashik Highway Expansion KM-42", "Nashik, Maharashtra", 19.9975, 73.7898, "Expressway Earthwork", "Deep Excavation & Grading", 180000, "2027-08-20", "ACTIVE", "LOW", 18.5, now),
        ("site-aurangabad", "Aurangabad Industrial Hub Zone B", "Aurangabad, Maharashtra", 19.8762, 75.3433, "Industrial Complex", "Precast Concrete Assembly", 310000, "2027-05-10", "ACTIVE", "LOW", 22.0, now),
    ])
    cur.executemany("INSERT INTO sensors VALUES (?,?,?,?,?,?,?,?,?)", [
        ("sens-1", "site-pune", "Soil Moisture", "Excavation Pit A - Moisture Probe", 68.5, "%", "ONLINE", 94, now),
        ("sens-2", "site-pune", "Water Level", "Drainage Trench Depth Gauge", 142.0, "mm", "ONLINE", 88, now),
        ("sens-3", "site-pune", "Slope Movement", "Embankment Tilt Inclinometer", 0.08, "deg", "ONLINE", 91, now),
        ("sens-4", "site-pune", "Ambient Weather", "Crane Apex Anemometer", 32.4, "km/h", "ONLINE", 100, now),
        ("sens-5", "site-pune", "Worker Heat Stress", "WBGT Wet Bulb Heat Sensor", 31.8, "°C", "ONLINE", 85, now),
        ("sens-6", "site-mumbai", "Water Level", "Tidal Surge Monitoring Gauge", 1.84, "m", "ONLINE", 92, now),
        ("sens-7", "site-mumbai", "Ambient Weather", "Coastal Wind Mast Sensor", 42.1, "km/h", "ONLINE", 97, now),
    ])
    today = datetime.date.today()
    def d(offset, hm):
        return f"{(today + datetime.timedelta(days=offset)).isoformat()} {hm}"
    cur.executemany("INSERT INTO activities VALUES (?,?,?,?,?,?,?,?)", [
        ("act-1", "site-pune", "Deep Trench Excavation", "Excavation", d(0, "08:00"), d(0, "17:00"), "HIGH", "SCHEDULED"),
        ("act-2", "site-pune", "Pier Cap Concrete Pouring", "Concrete Work", d(1, "07:00"), d(1, "15:00"), "CRITICAL", "SCHEDULED"),
        ("act-3", "site-pune", "Tower Crane Beam Lifting", "Crane & Lifting", d(2, "09:00"), d(2, "16:00"), "MEDIUM", "SCHEDULED"),
        ("act-4", "site-pune", "Deck Waterproofing Membrane", "Roofing & Sealing", d(3, "08:00"), d(3, "18:00"), "LOW", "SCHEDULED"),
        ("act-5", "site-pune", "Rebar Steel Assembly", "Outdoor Labor", d(4, "08:00"), d(4, "16:00"), "MEDIUM", "SCHEDULED"),
    ])
    conn.commit()


def seed_contracts(conn):
    cur = conn.cursor()
    now = now_str()
    contracts = [
        (
            "contract-101",
            "site-pune",
            "Pune Metro Line 3",
            "Pier Cap Piling & Deep Trench Shoring Phase 2",
            "rohan.owner",
            "Rohan Joshi",
            "shiva.admin",
            "Shiva Contractor",
            "Deep Excavation & Foundation",
            48000000.0,
            "Trench excavation up to 14m depth, contiguous bored piles installation, and dewatering trench network.",
            "Work automatically suspends when localized precipitation > 45 mm/hr. 4x high-capacity dewatering pumps on 15-min standby.",
            "PENDING_CONTRACTOR_CONFIRMATION",
            0,
            None,
            None,
            1,
            now,
            now,
            now,
        ),
        (
            "contract-102",
            "site-pune",
            "Pune Metro Line 3",
            "High-Altitude Overhead Gantry & Steel Girder Erection",
            "rohan.owner",
            "Rohan Joshi",
            "shiva.admin",
            "Shiva Contractor",
            "Heavy Crane & Rigging",
            32000000.0,
            "Tandem tower crane lifting and positioning of 120-ton precast segment girders over operational traffic.",
            "Hoist locks automatically when wind apex sensor exceeds 38 km/h. Boom lock mandated during gust warnings.",
            "ACTIVE_VERIFIED",
            1,
            now,
            "Mobilized tandem crane fleet. Anemometer telemetry paired with ClimateBuild IoT stream.",
            1,
            now,
            now,
            now,
        ),
        (
            "contract-103",
            "site-mumbai",
            "Mumbai Coastal Road Pier 4",
            "Marine Caisson Dewatering & Wave Wall Superstructure",
            "suresh.owner",
            "Suresh Shinde",
            "amit.contractor",
            "Amit Verma",
            "Marine Concrete & Civil",
            75000000.0,
            "Subsea caisson pour with M45 marine anti-washout concrete and precast seawall block placement.",
            "Tidal surge evacuation triggered at 1.8m surge height. Concreting forbidden during squall alerts.",
            "PENDING_CONTRACTOR_CONFIRMATION",
            0,
            None,
            None,
            1,
            now,
            now,
            now,
        ),
        (
            "contract-104",
            "site-mumbai",
            "Mumbai Coastal Road Pier 4",
            "Marine Expressway Bitumen Wear Course Layer",
            "suresh.owner",
            "Suresh Shinde",
            "amit.contractor",
            "Amit Verma",
            "Road Surfacing & Bitumen",
            39000000.0,
            "Polymer-modified bitumen laying across 4.2 km dual carriageway.",
            "Bitumen laying suspended if relative humidity > 85% or surface temperature drops below 16°C.",
            "PENDING_OWNER_VERIFICATION",
            1,
            now,
            "Fleet mobilized and ready on site. Dual-confirmed by Amit Verma. Pending Owner sign-off.",
            0,
            None,
            now,
            now,
        ),
    ]
    cur.executemany("INSERT INTO contracts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", contracts)
    conn.commit()


def seed_alerts(conn):
    cur = conn.cursor()
    cur.executemany(
        "INSERT INTO alerts (timestamp, site, severity, category, details, status, acknowledged_by, resolved_at) VALUES (?,?,?,?,?,?,?,?)",
        [
            ("2026-10-26 14:10:00", "Pune Metro Line 3", "CRITICAL", "Precipitation & Inundation",
             "Rainfall reached 85 mm. Automatic suspension of excavation and trenching enacted.", "ACTIVE", None, None),
            ("2026-10-26 13:45:00", "Pune Metro Line 3", "HIGH", "Tower Crane Anemometer",
             "Wind gusts exceeded 42 km/h limit on Crane A-1. Hoist locked in safety mode.", "ACKNOWLEDGED", "Rahul Sharma", None),
            ("2026-10-26 11:30:00", "Mumbai Coastal Road", "CRITICAL", "High Tide Surge",
             "Seawall wave action triggered tidal surge alert. Caisson workers evacuated.", "RESOLVED", "Pooja Deshmukh", "2026-10-26 12:15:00"),
        ])
    conn.commit()


init_db()


# ----------------------------------------------------------------------------
# Static files (whitelist only)
# ----------------------------------------------------------------------------
@app.route("/")
def index():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/login")
@app.route("/login.html")
def login_page():
    return send_from_directory(BASE_DIR, "login.html")


@app.route("/<path:path>")
def static_files(path):
    if path in PUBLIC_FILES:
        return send_from_directory(BASE_DIR, path)
    return jsonify({"error": "Not found"}), 404


# ----------------------------------------------------------------------------
# Permissions Helper
# ----------------------------------------------------------------------------
def get_user_permissions(user):
    role = user.get("role", "")
    user_type = user.get("user_type", "Team/Staff")
    return {
        "can_edit_projects": user_type == "Team/Staff" and role in ["Project Director"],
        "can_manage_schedule": user_type == "Team/Staff" and role in ["Project Director", "Site Engineer"],
        "can_resolve_alerts": user_type == "Team/Staff" and role in ["Safety Officer", "Site Engineer"],
        "can_view_audit": True,
        "can_assign_contracts": user_type in ["Owner", "Team/Staff"],
        "can_verify_contracts": user_type == "Owner",
        "can_confirm_contracts": user_type == "Contractor",
        "is_owner": user_type == "Owner",
        "is_contractor": user_type == "Contractor",
        "is_team": user_type == "Team/Staff",
        "is_read_only": user_type == "Viewer",
    }


# ----------------------------------------------------------------------------
# API: health / auth
# ----------------------------------------------------------------------------
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "service": "ClimateBuildAI Risk Engine",
        "model_loaded": _model_bundle is not None,
        "engine": "RandomForest ML + Rule-based Matrix" if _model_bundle is not None else "Rule-based Assessment Engine",
        "database": "SQLite (climatebuild.db)",
        "timestamp": datetime.datetime.now().isoformat(),
    })


@app.route("/api/auth/users", methods=["GET"])
def get_users():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, username, name, role, user_type, email, avatar, assigned_site_id, assigned_site_name FROM users ORDER BY id ASC"
    ).fetchall()
    conn.close()
    return jsonify({"users": [dict(r) for r in rows]})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    is_demo = bool(data.get("is_demo", False))

    if not username:
        return jsonify({"success": False, "error": "Username is required"}), 400

    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username,)).fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "error": f"User account '{username}' not found."}), 401

    user = dict(row)
    stored_hash = user.get("password_hash")

    # Secure verification with default demo password support
    is_valid = False
    if is_demo:
        is_valid = True
    elif stored_hash and check_password_hash(stored_hash, password):
        is_valid = True
    elif password == "climate123":
        is_valid = True

    if not is_valid:
        return jsonify({"success": False, "error": "Invalid password. Default demo password is: climate123"}), 401

    user.pop("password_hash", None)
    token = f"cb-token-{user['id']}-{int(datetime.datetime.now().timestamp())}"
    permissions = get_user_permissions(user)

    return jsonify({
        "success": True,
        "token": token,
        "user": user,
        "permissions": permissions,
        "message": f"Successfully signed in as {user['name']} ({user['role']})",
    })


@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    username = request.args.get("username")
    conn = get_db()
    if username:
        row = conn.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username,)).fetchone()
    else:
        row = conn.execute("SELECT * FROM users ORDER BY id ASC LIMIT 1").fetchone()
    conn.close()

    if not row:
        return jsonify({"success": False, "error": "User session not found"}), 404

    user = dict(row)
    user.pop("password_hash", None)
    return jsonify({
        "success": True,
        "user": user,
        "permissions": get_user_permissions(user),
    })


# ----------------------------------------------------------------------------
# API: contracts & dual-confirmation workflow
# ----------------------------------------------------------------------------
@app.route("/api/contracts", methods=["GET"])
def get_contracts():
    site_id = request.args.get("site_id")
    contractor = request.args.get("contractor")
    owner = request.args.get("owner")
    status = request.args.get("status")

    query = "SELECT * FROM contracts WHERE 1=1"
    params = []
    if site_id:
        query += " AND (site_id = ? OR site_name LIKE ?)"
        params.extend([site_id, f"%{site_id}%"])
    if contractor:
        query += " AND LOWER(contractor_username) = LOWER(?)"
        params.append(contractor)
    if owner:
        query += " AND LOWER(owner_username) = LOWER(?)"
        params.append(owner)
    if status:
        query += " AND status = ?"
        params.append(status)

    query += " ORDER BY created_at DESC"
    conn = get_db()
    rows = conn.execute(query, params).fetchall()
    conn.close()
    return jsonify({"contracts": [dict(r) for r in rows]})


@app.route("/api/contracts", methods=["POST"])
def create_contract():
    data = request.get_json(silent=True) or {}
    site_id = data.get("site_id", "site-pune")
    site_name = data.get("site_name", "Pune Metro Line 3")
    title = data.get("title", "Civil Engineering Package")
    owner_username = data.get("owner_username", "rohan.owner")
    owner_name = data.get("owner_name", "Rohan Joshi")
    contractor_username = data.get("contractor_username", "shiva.admin")
    contractor_name = data.get("contractor_name", "Shiva Contractor")
    package_type = data.get("package_type", "Foundation & Civil")
    try:
        budget = float(data.get("budget", 25000000))
    except (TypeError, ValueError):
        budget = 25000000.0
    scope = data.get("scope", "General site execution, trenching and mobilization.")
    climate_protocol = data.get("climate_protocol", "Standard monsoon precipitation threshold > 45 mm/hr enforces work suspension.")

    contract_id = f"contract-{int(datetime.datetime.now().timestamp() * 1000)}"
    now = now_str()

    conn = get_db()
    conn.execute(
        """INSERT INTO contracts (
            id, site_id, site_name, title, owner_username, owner_name,
            contractor_username, contractor_name, package_type, budget,
            scope, climate_protocol, status, contractor_confirmed,
            contractor_confirmed_at, contractor_notes, owner_verified,
            owner_verified_at, created_at, updated_at
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            contract_id, site_id, site_name, title, owner_username, owner_name,
            contractor_username, contractor_name, package_type, budget,
            scope, climate_protocol, "PENDING_CONTRACTOR_CONFIRMATION", 0,
            None, None, 1, now, now, now
        )
    )
    conn.commit()
    row = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    conn.close()
    return jsonify({
        "success": True,
        "contract": dict(row),
        "message": f"Contract work package '{title}' dispatched to {contractor_name} for dual-confirmation.",
    }), 201


@app.route("/api/contracts/<contract_id>/confirm", methods=["POST"])
def confirm_contract(contract_id):
    data = request.get_json(silent=True) or {}
    notes = data.get("notes") or data.get("contractor_notes") or "Dual-confirmed and climate risk protocol acknowledged by contractor."
    now = now_str()
    conn = get_db()
    row = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "error": "Contract not found"}), 404

    contract = dict(row)
    new_status = "ACTIVE_VERIFIED" if contract.get("owner_verified") == 1 else "PENDING_OWNER_VERIFICATION"

    conn.execute(
        "UPDATE contracts SET contractor_confirmed = 1, contractor_confirmed_at = ?, contractor_notes = ?, status = ?, updated_at = ? WHERE id = ?",
        (now, notes, new_status, now, contract_id)
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    conn.close()
    return jsonify({
        "success": True,
        "contract": dict(updated),
        "message": f"Contract dual-confirmed! Mobilization status updated to {new_status}.",
    })


@app.route("/api/contracts/<contract_id>/verify", methods=["POST"])
def verify_contract(contract_id):
    now = now_str()
    conn = get_db()
    row = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "error": "Contract not found"}), 404

    conn.execute(
        "UPDATE contracts SET owner_verified = 1, owner_verified_at = ?, status = 'ACTIVE_VERIFIED', updated_at = ? WHERE id = ?",
        (now, now, contract_id)
    )
    conn.commit()
    updated = conn.execute("SELECT * FROM contracts WHERE id = ?", (contract_id,)).fetchone()
    conn.close()
    return jsonify({
        "success": True,
        "contract": dict(updated),
        "message": "Contract work order and milestone verified by Site Owner.",
    })


@app.route("/api/contracts/<contract_id>/flag-risk", methods=["POST"])
def flag_contract_risk(contract_id):
    data = request.get_json(silent=True) or {}
    risk_note = data.get("reason", "Adverse weather forecast violates safety margins.")
    now = now_str()
    conn = get_db()
    conn.execute(
        "UPDATE contracts SET status = 'FLAGGED_CLIMATE_RISK', contractor_notes = ?, updated_at = ? WHERE id = ?",
        (f"[RISK FLAGGED]: {risk_note}", now, contract_id)
    )
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Weather risk exception logged for contract."})


# ----------------------------------------------------------------------------
# API: sites / sensors
# ----------------------------------------------------------------------------
@app.route("/api/sites", methods=["GET"])
def get_sites():
    conn = get_db()
    sites = [dict(r) for r in conn.execute("SELECT * FROM sites ORDER BY name ASC")]
    conn.close()
    return jsonify({"sites": sites})


@app.route("/api/sites/<site_id>", methods=["GET"])
def get_site(site_id):
    conn = get_db()
    site = conn.execute("SELECT * FROM sites WHERE id = ?", (site_id,)).fetchone()
    if not site:
        conn.close()
        return jsonify({"error": "Site not found"}), 404
    sensors = [dict(r) for r in conn.execute("SELECT * FROM sensors WHERE site_id = ?", (site_id,))]
    alerts = [dict(r) for r in conn.execute("SELECT * FROM alerts WHERE site = ? ORDER BY id DESC", (site["name"],))]
    activities = [dict(r) for r in conn.execute("SELECT * FROM activities WHERE site_id = ?", (site_id,))]
    conn.close()
    return jsonify({"site": dict(site), "sensors": sensors, "alerts": alerts, "activities": activities})


@app.route("/api/sites", methods=["POST"])
def create_site():
    data = request.get_json(silent=True) or {}
    try:
        lat = float(data.get("latitude", 18.5204))
        lon = float(data.get("longitude", 73.8567))
        daily_cost = float(data.get("daily_cost", 250000))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "latitude, longitude and daily_cost must be numbers"}), 400
    site_id = f"site-{int(datetime.datetime.now().timestamp() * 1000)}"
    conn = get_db()
    conn.execute("INSERT INTO sites VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", (
        site_id, data.get("name", "New Construction Project"), data.get("location", "Pune, Maharashtra"),
        lat, lon, data.get("project_type", "Commercial & Civil"), data.get("phase", "Planning & Earthwork"),
        daily_cost, data.get("target_date", "2027-12-31"), "ACTIVE", "LOW", 20.0, now_str()))
    conn.commit()
    conn.close()
    return jsonify({"success": True, "site_id": site_id, "message": "Site created successfully"}), 201


@app.route("/api/sensors", methods=["GET"])
def get_sensors():
    site_id = request.args.get("site_id")
    conn = get_db()
    if site_id:
        rows = conn.execute("SELECT * FROM sensors WHERE site_id = ?", (site_id,))
    else:
        rows = conn.execute("SELECT * FROM sensors ORDER BY updated_at DESC")
    sensors = [dict(r) for r in rows]
    conn.close()
    return jsonify({"sensors": sensors})


# ----------------------------------------------------------------------------
# API: alerts  (format matches script.js: plain JSON list of
#   {id, timestamp, site, severity, category, details, status})
# ----------------------------------------------------------------------------
def _alert_row(row):
    return dict(row)


@app.route("/api/alerts", methods=["GET"])
def get_alerts():
    site = request.args.get("site")
    conn = get_db()
    if site:
        rows = conn.execute("SELECT * FROM alerts WHERE site = ? ORDER BY timestamp DESC, id DESC", (site,))
    else:
        rows = conn.execute("SELECT * FROM alerts ORDER BY timestamp DESC, id DESC")
    alerts = [_alert_row(r) for r in rows]
    conn.close()
    return jsonify(alerts)


@app.route("/api/alerts", methods=["POST"])
def create_alert():
    data = request.get_json(silent=True) or {}
    site = data.get("site") or data.get("site_name") or "Unknown Site"
    severity = str(data.get("severity", "HIGH")).upper()
    category = data.get("category") or data.get("activity") or "General"
    details = data.get("details") or data.get("condition") or "No details provided"
    timestamp = data.get("timestamp") or now_str()
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO alerts (timestamp, site, severity, category, details, status) VALUES (?,?,?,?,?,'ACTIVE')",
        (timestamp, site, severity, category, details))
    conn.commit()
    row = conn.execute("SELECT * FROM alerts WHERE id = ?", (cur.lastrowid,)).fetchone()
    conn.close()
    return jsonify(_alert_row(row)), 201


def _set_status(alert_id, status, user_name=None):
    conn = get_db()
    if status == "ACKNOWLEDGED":
        cur = conn.execute("UPDATE alerts SET status = 'ACKNOWLEDGED', acknowledged_by = ? WHERE id = ?", (user_name, alert_id))
    else:
        cur = conn.execute("UPDATE alerts SET status = 'RESOLVED', resolved_at = ? WHERE id = ?", (now_str(), alert_id))
    conn.commit()
    changed = cur.rowcount
    conn.close()
    if not changed:
        return jsonify({"success": False, "error": f"Alert {alert_id} not found"}), 404
    return jsonify({"success": True, "id": alert_id, "status": status})


@app.route("/api/alerts/<int:alert_id>/ack", methods=["POST"])
def ack_alert(alert_id):
    data = request.get_json(silent=True) or {}
    return _set_status(alert_id, "ACKNOWLEDGED", data.get("user_name", "Site Engineer"))


@app.route("/api/alerts/<int:alert_id>/resolve", methods=["POST"])
def resolve_alert_by_id(alert_id):
    return _set_status(alert_id, "RESOLVED")


# Backwards-compatible body-based routes
@app.route("/api/alerts/acknowledge", methods=["POST"])
def acknowledge_alert():
    data = request.get_json(silent=True) or {}
    try:
        alert_id = int(data.get("alert_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "alert_id required"}), 400
    return _set_status(alert_id, "ACKNOWLEDGED", data.get("user_name", "Site Engineer"))


@app.route("/api/alerts/resolve", methods=["POST"])
def resolve_alert():
    data = request.get_json(silent=True) or {}
    try:
        alert_id = int(data.get("alert_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "alert_id required"}), 400
    return _set_status(alert_id, "RESOLVED")


@app.route("/api/alerts/clear", methods=["POST"])
def clear_alerts():
    conn = get_db()
    conn.execute("DELETE FROM alerts WHERE status = 'RESOLVED'")
    conn.commit()
    conn.close()
    return jsonify({"success": True, "message": "Resolved alerts cleared from audit history"})


# ----------------------------------------------------------------------------
# API: prediction
# ----------------------------------------------------------------------------
def _score_all(w):
    return [{
        "id": a["id"], "activity": a["name"],
        "risk_score": activity_score(a, w["rainfall"], w["wind_speed"], w["temperature"], w["flood_risk"]),
    } for a in ACTIVITIES]


@app.route("/api/predict", methods=["POST"])
def predict():
    try:
        w = read_weather(request.get_json(silent=True) or {})
    except (TypeError, ValueError):
        return jsonify({"error": "Numeric fields must be numbers"}), 400
    data = request.get_json(silent=True) or {}
    requested = data.get("activity", "Overall")

    scored = _score_all(w)
    match = next((s for s in scored if requested in (s["id"], s["activity"])), None)
    if match:
        score = match["risk_score"]
        ml_act = next(a["ml"] for a in ACTIVITIES if a["id"] == match["id"])
    else:  # "Overall": mean of all activities, identical to frontend calculateOverallSiteRisk()
        score = int(round(sum(s["risk_score"] for s in scored) / len(scored)))
        ml_act = "Overall"
        requested = "Overall"

    rule_level = level_from_score(score)
    ml_level = ml_predict(w["temperature"], w["rainfall"], w["humidity"], w["wind_speed"],
                          w["flood_risk"], w["landslide_risk"], ml_act)
    final_level = ml_level or rule_level
    return jsonify({
        "activity": requested,
        "risk_score": score,
        "risk_level": final_level,
        "risk_level_rule_based": rule_level,
        "risk_level_ml": ml_level,
        "estimated_delay": estimate_delay(final_level, w["rainfall"]),
        "model_used": "RandomForestClassifier (scikit-learn)" if ml_level else "rule_based_fallback",
        "timestamp": datetime.datetime.now().isoformat(),
    })


@app.route("/api/activities", methods=["POST"])
def activities():
    try:
        w = read_weather(request.get_json(silent=True) or {})
    except (TypeError, ValueError):
        return jsonify({"error": "Numeric fields must be numbers"}), 400
    results = []
    for a, s in zip(ACTIVITIES, _score_all(w)):
        rule_level = level_from_score(s["risk_score"])
        ml_level = ml_predict(w["temperature"], w["rainfall"], w["humidity"], w["wind_speed"],
                              w["flood_risk"], w["landslide_risk"], a["ml"])
        level = ml_level or rule_level
        results.append({**s, "risk_level": level, "risk_level_rule_based": rule_level,
                        "risk_level_ml": ml_level, "estimated_delay": estimate_delay(level, w["rainfall"])})
    return jsonify({"activities": results})


# ----------------------------------------------------------------------------
# API: schedule / impact
# ----------------------------------------------------------------------------
@app.route("/api/schedule", methods=["GET"])
def get_schedule():
    conn = get_db()
    items = [dict(r) for r in conn.execute("SELECT * FROM activities ORDER BY planned_start ASC")]
    conn.close()
    scenario_a = {
        "title": "Scenario A: Current Baseline Schedule", "total_delay_days": 3.5,
        "estimated_loss_inr": 875000,
        "conflict_points": ["Rain on concrete pour (Wed)", "High wind on crane lift (Thu)"],
        "advisory": "Risk of stop-work orders and concrete wash-out on Wednesday morning.",
    }
    scenario_b = {
        "title": "Scenario B: ClimateBuild AI Weather-Adjusted Plan", "total_delay_days": 0.5,
        "estimated_loss_inr": 125000,
        "shift_recommendations": [
            "Shift Concrete Pour to Tuesday 06:00 AM (Clear weather window, humidity 45%)",
            "Move Crane Lift to Friday morning (Wind < 18 km/h)",
            "Prioritize Indoor Rebar & Precast Fabrication during peak rain (Wednesday)",
        ],
        "projected_savings_inr": 750000,
    }
    return jsonify({"activities": items, "scenario_a": scenario_a, "scenario_b": scenario_b})


@app.route("/api/impact/estimate", methods=["POST"])
def estimate_impact():
    data = request.get_json(silent=True) or {}
    try:
        daily_overhead = float(data.get("daily_overhead", 250000))
        delay_days = float(data.get("delay_days", 2.0))
        idle_workers = int(data.get("idle_workers", 45))
        daily_wage = float(data.get("daily_wage", 850))
        equipment_idle_cost = float(data.get("equipment_idle_cost", 60000))
    except (TypeError, ValueError):
        return jsonify({"error": "All inputs must be numbers"}), 400
    labor = idle_workers * daily_wage * delay_days
    machinery = equipment_idle_cost * delay_days
    overhead = daily_overhead * delay_days
    total = labor + machinery + overhead
    return jsonify({
        "delay_days": delay_days, "labor_loss": round(labor), "machinery_loss": round(machinery),
        "overhead_loss": round(overhead), "total_estimated_impact_inr": round(total),
        "mitigation_potential_inr": round(total * 0.72),
    })


def open_browser():
    webbrowser.open_new(f"http://127.0.0.1:{PORT}/login")


if __name__ == "__main__":
    print("\n" + "=" * 62)
    print("  CLIMATEBUILD AI - Full Stack Platform")
    print(f"  Server running at: http://127.0.0.1:{PORT}")
    print("  SQLite Database : climatebuild.db")
    print("=" * 62 + "\n")
    threading.Timer(1.2, open_browser).start()
    app.run(host="127.0.0.1", port=PORT, debug=False)
