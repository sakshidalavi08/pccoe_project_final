/* =========================================================
   ClimateBuild AI — Enterprise Construction Risk & Intelligence Engine
   Full-Stack Architecture: Leaflet GIS, Multi-Tab Router, Computer Vision HUD,
   IoT Sensors, WBGT Worker Safety, SQLite Persistence, and RandomForest ML.
   ========================================================= */

// Backend Endpoints
const API_BASE = window.location.protocol === "file:" ? "http://127.0.0.1:5000" : "";
const API_PREDICT = `${API_BASE}/api/predict`;
const API_ALERTS = `${API_BASE}/api/alerts`;
const API_SENSORS = `${API_BASE}/api/sensors`;
const API_SITES = `${API_BASE}/api/sites`;

// Multi-Site Geo Coordinates & Metadata
const PROJECT_SITES = {
  Pune: {
    id: 1,
    name: "Pune Metro Line 3",
    location: "Pune, Maharashtra",
    coords: [18.5204, 73.8567],
    budget: 24500000000,
    dailyCost: 250000,
    manager: "Rahul Sharma (Site Engineer)",
    workers: 142,
    elevation: "560 m (River Catchment)",
    exposure: "HIGH (SW Monsoon Front)",
    baseRain: 85,
    baseWind: 42,
    baseTemp: 34,
    baseHum: 85,
  },
  Mumbai: {
    id: 2,
    name: "Mumbai Coastal Road",
    location: "Mumbai, Maharashtra",
    coords: [18.9750, 72.8258],
    budget: 127210000000,
    dailyCost: 950000,
    manager: "Sanjay Kulkarni (Chief Eng)",
    workers: 320,
    elevation: "8 m (High Tide Coastal Surge)",
    exposure: "CRITICAL (Arabian Sea Squall)",
    baseRain: 110,
    baseWind: 55,
    baseTemp: 31,
    baseHum: 92,
  },
  Nashik: {
    id: 3,
    name: "Nashik Highway Extension",
    location: "Nashik, Maharashtra",
    coords: [19.9975, 73.7898],
    budget: 11800000000,
    dailyCost: 180000,
    manager: "Anand Joshi (Deputy Eng)",
    workers: 95,
    elevation: "600 m (Plateau Incline)",
    exposure: "MODERATE (Valley Inundation)",
    baseRain: 45,
    baseWind: 26,
    baseTemp: 32,
    baseHum: 70,
  },
  Aurangabad: {
    id: 4,
    name: "Aurangabad Industrial Hub",
    location: "Aurangabad, Maharashtra",
    coords: [19.8762, 75.3433],
    budget: 8900000000,
    dailyCost: 140000,
    manager: "Pooja Deshmukh (Safety Head)",
    workers: 78,
    elevation: "580 m (Arid Plain)",
    exposure: "HIGH (Extreme Heat Hazard)",
    baseRain: 15,
    baseWind: 22,
    baseTemp: 41,
    baseHum: 45,
  },
};

// 8 Construction Activities with Specific Vulnerability Thresholds
const ACTIVITIES_DATA = [
  {
    id: "excavation",
    name: "Deep Excavation & Trenching",
    hazardDriver: "Rainfall > 40 mm / Soil Saturation",
    rainWeight: 0.38,
    windWeight: 0.05,
    tempWeight: 0.08,
    floodSensitivity: 0.35,
    sop: "Deploy sump pumps, line trench walls with geo-textile, cease dig if water exceeds 10cm.",
  },
  {
    id: "foundation",
    name: "Foundation Piling & Raft",
    hazardDriver: "Soil Pore Pressure > 45 kPa / Flash Flood",
    rainWeight: 0.32,
    windWeight: 0.06,
    tempWeight: 0.10,
    floodSensitivity: 0.30,
    sop: "Cover open rebar cages, stabilize embankment slopes, test concrete slurry density.",
  },
  {
    id: "concrete",
    name: "Structural Concrete Pouring",
    hazardDriver: "Rainfall > 15 mm / Temp > 38°C",
    rainWeight: 0.40,
    windWeight: 0.08,
    tempWeight: 0.25,
    floodSensitivity: 0.15,
    sop: "Use ice-water batching if temp > 36°C; suspend open slab pours under active precipitation.",
  },
  {
    id: "crane",
    name: "Tower Crane & Rigging Deck",
    hazardDriver: "Sustained Wind > 38 km/h / Peak Gusts",
    rainWeight: 0.10,
    windWeight: 0.65,
    tempWeight: 0.05,
    floodSensitivity: 0.05,
    sop: "Lock crane in free-slew weather-vane mode if wind > 38 km/h; drop jib hoist load to deck.",
  },
  {
    id: "roofing",
    name: "Roofing & Cladding Installation",
    hazardDriver: "Wind > 28 km/h / Wet Steel Slippage",
    rainWeight: 0.25,
    windWeight: 0.50,
    tempWeight: 0.10,
    floodSensitivity: 0.05,
    sop: "Mandatory double-lanyard 100% tie-off; tether all unanchored metal deck sheets.",
  },
  {
    id: "road",
    name: "Road Paving & Bitumen Laying",
    hazardDriver: "Rainfall > 10 mm / Base Moisture",
    rainWeight: 0.35,
    windWeight: 0.08,
    tempWeight: 0.15,
    floodSensitivity: 0.20,
    sop: "Subgrade must be completely dry before asphalt compaction; seal newly rolled layers.",
  },
  {
    id: "steel",
    name: "High-Altitude Steel Erection",
    hazardDriver: "Wind > 35 km/h / Lightning Hazard",
    rainWeight: 0.20,
    windWeight: 0.55,
    tempWeight: 0.10,
    floodSensitivity: 0.05,
    sop: "Halt high-elevation truss bolting if thunder heard or anemometer exceeds 35 km/h.",
  },
  {
    id: "transport",
    name: "Heavy Hauling & Transit Mixers",
    hazardDriver: "Road Inundation / Mud Slickness",
    rainWeight: 0.28,
    windWeight: 0.12,
    tempWeight: 0.05,
    floodSensitivity: 0.35,
    sop: "Re-route cement transit mixers along elevated bypass; avoid unpaved access roads.",
  },
];

// 5 Industrial IoT Geotechnical Sensors
let SENSORS_DATA = [
  {
    id: "PZ-104",
    name: "Piezometer PZ-104 (Soil Pore Pressure)",
    unit: "kPa",
    value: 48.2,
    threshold: 60.0,
    status: "NORMAL",
    battery: "94%",
    location: "Excavation Pit North Slope",
  },
  {
    id: "WL-02",
    name: "Ultrasonic Water Level WL-02",
    unit: "m",
    value: 0.82,
    threshold: 1.20,
    status: "CAUTION",
    battery: "88%",
    location: "Catchment Storm Drainage Sump",
  },
  {
    id: "WS-09",
    name: "Ultrasonic Anemometer WS-09",
    unit: "km/h",
    value: 42.0,
    threshold: 38.0,
    status: "ALERT",
    battery: "99% (Solar)",
    location: "Tower Crane A-1 Jib Tip",
  },
  {
    id: "SL-11",
    name: "MEMS Inclinometer SL-11 (Slope Tilt)",
    unit: "deg",
    value: 0.42,
    threshold: 2.00,
    status: "NORMAL",
    battery: "91%",
    location: "East Embankment Retaining Wall",
  },
  {
    id: "TC-03",
    name: "Maturity Temp Probe TC-03 (Curing)",
    unit: "°C",
    value: 36.4,
    threshold: 55.0,
    status: "NORMAL",
    battery: "96%",
    location: "Pier Foundation 4 Core",
  },
];

// State Variables
let currentSiteKey = "Pune";
let currentLang = "en";
let currentView = "view-dashboard";
let gisMap = null;
let gisMarkerGroup = null;
let gisRiskCircle = null;
let currentTileLayer = null;
let isThermalMode = false;
let showAiBoxes = true;
let isSimulating = false;

// Active Simulated Weather Parameters
let activeWeather = {
  temperature: 34,
  rainfall: 85,
  humidity: 85,
  windSpeed: 42,
  floodRisk: "High",
  landslideRisk: "Medium",
};

/* =========================================================
   1. MULTI-TAB ROUTER & NAVIGATION
   ========================================================= */
function initNavigation() {
  const navItems = document.querySelectorAll(".nav-item[data-view]");
  const viewSections = document.querySelectorAll(".view-section");
  const breadcrumbActive = document.getElementById("breadcrumbActive");
  const breadcrumbSection = document.getElementById("breadcrumbSection");
  const sidebar = document.getElementById("appSidebar");
  const toggleBtn = document.getElementById("sidebarToggleBtn");

  function switchView(viewId) {
    currentView = viewId;

    // Toggle active class on sidebar items
    navItems.forEach((item) => {
      if (item.dataset.view === viewId) {
        item.classList.add("active");
        const sectionTitle = item.closest("nav")
          ? item.previousElementSibling?.textContent || "Operations"
          : "Operations";
        if (breadcrumbSection) breadcrumbSection.textContent = sectionTitle;
        if (breadcrumbActive) {
          const label = item.querySelector(".nav-text")?.textContent || "View";
          breadcrumbActive.textContent = label;
        }
      } else {
        item.classList.remove("active");
      }
    });

    // Toggle view sections
    viewSections.forEach((section) => {
      if (section.id === viewId) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });

    // Close mobile sidebar if open
    if (sidebar) sidebar.classList.remove("mobile-open");

    // Special handlers for specific views
    if (viewId === "view-gis-map") {
      setTimeout(() => {
        if (!gisMap) initGisMap();
        else {
          gisMap.invalidateSize();
          updateGisMapView();
        }
      }, 80);
      setTimeout(() => { if (gisMap) gisMap.invalidateSize(); }, 300);
    }

    if (viewId === "view-vision") {
      updateCctvWeatherOverlay();
    }
  }

  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  // Mobile sidebar toggle
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // Quick link button on dashboard
  const viewAllBtn = document.getElementById("viewAllActivitiesBtn");
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", (e) => {
      e.preventDefault();
      switchView("view-activities");
    });
  }

  // Hero launch buttons
  const launchBtn = document.getElementById("launchBtn");
  const quickDemoBtn = document.getElementById("quickDemoBtn");
  if (launchBtn) {
    launchBtn.addEventListener("click", () => {
      document.getElementById("heroPage").style.display = "none";
      document.getElementById("mainAppContainer").style.display = "flex";
      switchView("view-dashboard");
    });
  }
  if (quickDemoBtn) {
    quickDemoBtn.addEventListener("click", () => {
      document.getElementById("heroPage").style.display = "none";
      document.getElementById("mainAppContainer").style.display = "flex";
      switchView("view-gis-map");
    });
  }
}

/* =========================================================
   2. GEOSPATIAL GIS MAP (LEAFLET WITH ROBUST OPENSTREETMAP)
   ========================================================= */

/* ---- Tile providers with automatic fallback (works if one provider blocks/fails) ---- */
const TILE_PROVIDERS = {
  osm: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    opts: { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" },
  },
  topo: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    opts: { maxZoom: 17, subdomains: "abc", attribution: "&copy; OpenStreetMap, SRTM | &copy; OpenTopoMap" },
  },
  hot: {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    opts: { maxZoom: 19, subdomains: "abc", attribution: "&copy; OpenStreetMap contributors, Humanitarian OSM Team" },
  },
  carto: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    opts: { maxZoom: 19, subdomains: "abcd", attribution: "&copy; OpenStreetMap contributors &copy; CARTO" },
  },
  esri: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    opts: { maxZoom: 19, attribution: "Tiles &copy; Esri" },
  },
};
const TILE_CHAIN = ["osm", "carto", "esri", "hot"]; // tried in this order if a provider fails

function showMapNotice(text) {
  const panel = document.querySelector(".map-panel");
  if (!panel) return;
  let n = document.getElementById("mapTileNotice");
  if (!n) {
    n = document.createElement("div");
    n.id = "mapTileNotice";
    n.setAttribute("data-no-i18n", "");
    n.style.cssText =
      "position:absolute;left:12px;bottom:48px;z-index:900;background:rgba(255,255,255,.95);border:1px solid #D1D5DB;border-radius:6px;padding:6px 10px;font-size:12px;color:#374151;box-shadow:0 1px 4px rgba(0,0,0,.15)";
    panel.appendChild(n);
  }
  n.textContent = text;
  n.style.display = text ? "block" : "none";
}

// Creates a tile layer. If the provider keeps failing, it automatically switches to the next one in TILE_CHAIN.
function makeTileLayer(kind, tried = []) {
  const p = TILE_PROVIDERS[kind] || TILE_PROVIDERS.osm;
  const layer = L.tileLayer(p.url, { ...p.opts, crossOrigin: false });
  const triedNow = tried.concat(kind);
  let errors = 0;
  let switched = false;
  layer.on("tileload", () => {
    errors = 0;
    showMapNotice("");
  });
  layer.on("tileerror", () => {
    errors += 1;
    if (errors < 3 || switched || !gisMap || !gisMap.hasLayer(layer)) return;
    switched = true;
    const next = TILE_CHAIN.find((k) => !triedNow.includes(k));
    if (!next) {
      showMapNotice("⚠️ Map tiles could not load (check internet). Site pins and risk zones still work.");
      return;
    }
    showMapNotice("Map provider busy - switching to " + next.toUpperCase() + "…");
    gisMap.removeLayer(layer);
    currentTileLayer = makeTileLayer(next, triedNow).addTo(gisMap);
  });
  return layer;
}

/* ---- Leaflet may still be downloading (CDN) when the map tab opens: wait for it instead of failing ---- */
function renderMapMessage(html) {
  const c = document.getElementById("gisMap");
  if (!c) return;
  c.innerHTML =
    '<div data-no-i18n style="height:100%;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;color:#374151;font-size:14px;line-height:1.6;">' +
    html + "</div>";
}

function whenLeafletReady(cb, tries = 0) {
  if (typeof L !== "undefined" && L.map) return cb();
  if (window.__leafletFailed || tries > 80) {
    renderMapMessage(
      "⚠️ Map library (Leaflet) could not load.<br>Check your internet / VPN / firewall, then press retry.<br><br>" +
      '<button class="topbar-btn primary" onclick="window.retryGisMap()">🔄 Retry map</button>'
    );
    return;
  }
  renderMapMessage("🗺️ Loading map…");
  setTimeout(() => whenLeafletReady(cb, tries + 1), 250);
}

window.retryGisMap = function () {
  window.__leafletFailed = false;
  if (typeof window.__loadLeaflet === "function") window.__loadLeaflet();
  gisMap = null;
  initGisMap();
};

document.addEventListener("leaflet-ready", () => {
  if (currentView === "view-gis-map" && !gisMap) initGisMap();
});

let gisMapInitializing = false;

function initGisMap() {
  const mapContainer = document.getElementById("gisMap");
  if (!mapContainer || gisMap || gisMapInitializing) return;
  gisMapInitializing = true;

  whenLeafletReady(() => {
    gisMapInitializing = false;
    if (gisMap) return;
    mapContainer.innerHTML = ""; // remove "Loading…" text

    const site = PROJECT_SITES[currentSiteKey];
    gisMap = L.map("gisMap", {
      scrollWheelZoom: false, // enabled after the user clicks the map (so page scroll is not hijacked)
      zoomControl: true,
    }).setView(site.coords, 11);

    gisMap.on("click", () => gisMap.scrollWheelZoom.enable());
    gisMap.on("mouseout", () => gisMap.scrollWheelZoom.disable());

    // Default Standard OpenStreetMap layer (auto-falls back to CARTO / Esri if blocked)
    currentTileLayer = makeTileLayer("osm").addTo(gisMap);

    gisMarkerGroup = L.layerGroup().addTo(gisMap);
    renderGisSitePins();
    drawRiskBuffer();

    // Keep the map correctly sized (sidebar toggle, window resize, hidden-tab init)
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(() => gisMap && gisMap.invalidateSize()).observe(mapContainer);
    }
    setTimeout(() => gisMap && gisMap.invalidateSize(), 150);
    setTimeout(() => gisMap && gisMap.invalidateSize(), 600);

    // Layer switcher dropdown
    const layerSelect = document.getElementById("mapTileLayerSelect");
    if (layerSelect && !layerSelect.dataset.bound) {
      layerSelect.dataset.bound = "1";
      layerSelect.addEventListener("change", (e) => {
        if (!gisMap) return;
        if (currentTileLayer) gisMap.removeLayer(currentTileLayer);
        currentTileLayer = makeTileLayer(e.target.value).addTo(gisMap);
      });
    }

    // Toggle risk buffer checkbox
    const toggleBuffer = document.getElementById("toggleRiskBuffer");
    if (toggleBuffer && !toggleBuffer.dataset.bound) {
      toggleBuffer.dataset.bound = "1";
      toggleBuffer.addEventListener("change", (e) => {
        if (!gisRiskCircle || !gisMap) return;
        if (e.target.checked) gisRiskCircle.addTo(gisMap);
        else gisMap.removeLayer(gisRiskCircle);
      });
    }

    // Quick center buttons
    const bind = (id, fn) => {
      const el = document.getElementById(id);
      if (el && !el.dataset.bound) { el.dataset.bound = "1"; el.addEventListener("click", fn); }
    };
    bind("mapCenterPune", () => window.switchActiveSite("Pune"));
    bind("mapCenterMumbai", () => window.switchActiveSite("Mumbai"));
    bind("mapCenterNashik", () => window.switchActiveSite("Nashik"));
    bind("mapCenterAurangabad", () => window.switchActiveSite("Aurangabad"));
    bind("mapShowAll", () => {
      const pts = Object.values(PROJECT_SITES).map((s) => s.coords);
      gisMap.fitBounds(pts, { padding: [60, 60], maxZoom: 9 });
    });
  });
}

function renderGisSitePins() {
  if (!gisMarkerGroup) return;
  gisMarkerGroup.clearLayers();

  Object.keys(PROJECT_SITES).forEach((key) => {
    const s = PROJECT_SITES[key];
    const isCurrent = key === currentSiteKey;

    // Custom HTML pin icon
    const pinClass = isCurrent ? "custom-site-pin high" : "custom-site-pin";
    const customIcon = L.divIcon({
      className: "custom-div-icon",
      html: `<div class="${pinClass}">${key === "Pune" ? "P3" : key === "Mumbai" ? "CR" : key === "Nashik" ? "NH" : key === "Aurangabad" ? "AH" : String(s.name || "?").split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase()}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    const marker = L.marker(s.coords, { icon: customIcon });
    marker.bindPopup(`
      <div style="font-family:'Inter',sans-serif; min-width:180px;">
        <b style="color:#24364B; font-size:14px;">${s.name}</b>
        <div style="font-size:11.5px; color:#5A6A80; margin:3px 0;">${s.location}</div>
        <div style="font-family:'IBM Plex Mono',monospace; font-size:11px; margin-top:6px; padding:4px 6px; background:#F0F2F5; border-radius:4px;">
          Rain: <b>${s.baseRain} mm</b> • Wind: <b>${s.baseWind} km/h</b>
        </div>
        <button onclick="window.switchActiveSite('${key}')" style="margin-top:8px; width:100%; padding:5px; background:#24364B; color:#FFFFFF; border:none; border-radius:4px; font-size:11.5px; font-weight:600; cursor:pointer;">Set as Active Site</button>
      </div>
    `);

    marker.addTo(gisMarkerGroup);
  });
}

function drawRiskBuffer() {
  if (!gisMap) return;
  const site = PROJECT_SITES[currentSiteKey];
  if (gisRiskCircle) gisMap.removeLayer(gisRiskCircle);

  // Radius and color scale with rainfall and overall hazard
  let color = "#2E7D32";
  let radius = 3500;
  if (activeWeather.rainfall >= 70 || activeWeather.windSpeed >= 40) {
    color = "#B91C1C";
    radius = 7200;
  } else if (activeWeather.rainfall >= 35 || activeWeather.windSpeed >= 25) {
    color = "#D97706";
    radius = 5200;
  }

  gisRiskCircle = L.circle(site.coords, {
    radius: radius,
    color: color,
    fillColor: color,
    fillOpacity: 0.16,
    weight: 2,
    dashArray: "6, 6",
  }).addTo(gisMap);

  // Update GIS telemetry card
  const coordsLabel = document.getElementById("mapSiteCoords");
  const radiusLabel = document.getElementById("mapSiteRadius");
  const exposureLabel = document.getElementById("mapSiteExposure");
  if (coordsLabel) coordsLabel.textContent = `${site.coords[0].toFixed(4)}° N, ${site.coords[1].toFixed(4)}° E`;
  if (radiusLabel) radiusLabel.textContent = `${(radius / 1000).toFixed(1)} km Active Perimeter`;
  if (exposureLabel) exposureLabel.textContent = site.exposure;
}

function updateGisMapView() {
  if (!gisMap) return;
  const site = PROJECT_SITES[currentSiteKey];
  gisMap.setView(site.coords, 11);
  renderGisSitePins();
  drawRiskBuffer();
}

// Global hook for popup buttons
window.switchActiveSite = function (siteKey) {
  if (!PROJECT_SITES[siteKey]) return;
  currentSiteKey = siteKey;
  const site = PROJECT_SITES[siteKey];

  // Sync Global Site Dropdown
  const select = document.getElementById("globalSiteSelect");
  if (select) select.value = siteKey;

  // Sync active site weather
  activeWeather.rainfall = site.baseRain;
  activeWeather.windSpeed = site.baseWind;
  activeWeather.temperature = site.baseTemp;
  activeWeather.humidity = site.baseHum;

  // Update simulator sliders
  updateSimulatorSliders();

  // Refresh entire application
  refreshAllModules();

  if (gisMap) updateGisMapView();
};

/* =========================================================
   3. AI SITE VISION & CCTV MONITOR (WEATHER CANVAS & AI BOXES)
   ========================================================= */
let rainParticles = [];
for (let i = 0; i < 110; i++) {
  rainParticles.push({
    x: Math.random() * 800,
    y: Math.random() * 450,
    len: Math.random() * 18 + 12,
    speed: Math.random() * 8 + 14,
  });
}

function initCctvStation() {
  const canvas = document.getElementById("cctvWeatherCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  function drawWeatherOverlay() {
    ctx.clearRect(0, 0, 800, 450);

    // Dynamic Rain Rendering
    if (activeWeather.rainfall > 5) {
      const dropCount = Math.min(110, Math.round((activeWeather.rainfall / 150) * 110));
      const windAngle = (activeWeather.windSpeed / 80) * 16;
      ctx.strokeStyle = isThermalMode ? "rgba(255, 200, 100, 0.7)" : "rgba(186, 230, 253, 0.75)";
      ctx.lineWidth = activeWeather.rainfall > 60 ? 2.2 : 1.2;
      ctx.beginPath();

      for (let i = 0; i < dropCount; i++) {
        const p = rainParticles[i];
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + windAngle, p.y + p.len);
        p.y += p.speed;
        p.x += windAngle * 0.35;
        if (p.y > 450) {
          p.y = -20;
          p.x = Math.random() * 800;
        }
      }
      ctx.stroke();
    }

    // Thermal Haze / Extreme Heat Overlay
    if (activeWeather.temperature >= 38) {
      ctx.fillStyle = isThermalMode ? "rgba(255, 80, 0, 0.12)" : "rgba(245, 158, 11, 0.08)";
      ctx.fillRect(0, 0, 800, 450);
    }

    requestAnimationFrame(drawWeatherOverlay);
  }
  drawWeatherOverlay();

  // Camera channel buttons
  const camBtns = document.querySelectorAll(".cam-btn[data-cam]");
  const camTitle = document.getElementById("cctvCamTitle");
  camBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      camBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (camTitle) camTitle.textContent = btn.dataset.name;
    });
  });

  // Thermal mode toggle
  const thermalBtn = document.getElementById("toggleThermalBtn");
  const viewport = document.getElementById("cctvViewport");
  if (thermalBtn && viewport) {
    thermalBtn.addEventListener("click", () => {
      isThermalMode = !isThermalMode;
      if (isThermalMode) {
        viewport.style.filter = "hue-rotate(180deg) saturate(2.2) contrast(1.2)";
        thermalBtn.classList.add("active");
        thermalBtn.textContent = "🌈 Optical Color Mode";
      } else {
        viewport.style.filter = "none";
        thermalBtn.classList.remove("active");
        thermalBtn.textContent = "🌡️ Thermal IR Mode";
      }
    });
  }

  // Toggle AI Bounding Boxes
  const aiBoxBtn = document.getElementById("toggleAiBoxesBtn");
  const bboxes = document.querySelectorAll(".cctv-bbox");
  if (aiBoxBtn) {
    aiBoxBtn.addEventListener("click", () => {
      showAiBoxes = !showAiBoxes;
      bboxes.forEach((b) => (b.style.display = showAiBoxes ? "block" : "none"));
      aiBoxBtn.classList.toggle("active", showAiBoxes);
    });
  }

  // Snapshot capture button
  const snapBtn = document.getElementById("captureCamSnapshotBtn");
  if (snapBtn) {
    snapBtn.addEventListener("click", () => {
      alert("📷 CCTV AI Vision snapshot captured with telemetry watermark.\nSaved to local site audit vault.");
    });
  }
}

function updateCctvWeatherOverlay() {
  const craneBbox = document.getElementById("bboxCrane");
  const drainageBbox = document.getElementById("bboxDrainage");

  if (craneBbox) {
    if (activeWeather.windSpeed >= 38) {
      craneBbox.className = "cctv-bbox alert";
      craneBbox.querySelector(".cctv-bbox-tag").textContent = `CRANE A-1: WIND SWAY ${activeWeather.windSpeed} KM/H [SUSPEND]`;
    } else {
      craneBbox.className = "cctv-bbox";
      craneBbox.querySelector(".cctv-bbox-tag").textContent = `CRANE A-1: WIND SAFE (${activeWeather.windSpeed} KM/H)`;
    }
  }

  if (drainageBbox) {
    if (activeWeather.rainfall >= 50) {
      drainageBbox.className = "cctv-bbox alert";
      drainageBbox.querySelector(".cctv-bbox-tag").textContent = `PIT DRAINAGE: WATER ACCUMULATION ${Math.round(activeWeather.rainfall / 6)} CM`;
    } else {
      drainageBbox.className = "cctv-bbox";
      drainageBbox.querySelector(".cctv-bbox-tag").textContent = "PIT DRAINAGE: NORMAL SUMP DRAIN";
    }
  }
}

/* =========================================================
   4. RISK ENGINE & MACHINE LEARNING INTEGRATION
   ========================================================= */
function calculateActivityRisk(activity, weather) {
  let score = 0;
  // Weather drivers
  score += Math.min(100, (weather.rainfall / 120) * 100) * activity.rainWeight;
  score += Math.min(100, (weather.windSpeed / 70) * 100) * activity.windWeight;
  score += Math.max(0, (weather.temperature - 30) / 18) * 100 * activity.tempWeight;
  score += (weather.floodRisk === "High" ? 80 : weather.floodRisk === "Medium" ? 45 : 15) * activity.floodSensitivity;

  return Math.round(Math.min(100, Math.max(5, score)));
}

function calculateOverallSiteRisk(weather) {
  let sum = 0;
  ACTIVITIES_DATA.forEach((act) => {
    sum += calculateActivityRisk(act, weather);
  });
  return Math.round(sum / ACTIVITIES_DATA.length);
}

function getRiskCategory(score) {
  if (score >= 75) return { level: "CRITICAL", badgeClass: "CRITICAL", text: "CRITICAL RISK", color: "var(--risk-critical)" };
  if (score >= 60) return { level: "HIGH", badgeClass: "HIGH", text: "HIGH RISK", color: "var(--risk-high)" };
  if (score >= 35) return { level: "MEDIUM", badgeClass: "MEDIUM", text: "MODERATE CAUTION", color: "var(--risk-medium)" };
  return { level: "LOW", badgeClass: "LOW", text: "LOW RISK / SAFE", color: "var(--risk-low)" };
}

async function callPythonBackendML(weather, siteName) {
  try {
    const res = await fetch(API_PREDICT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        temperature: weather.temperature,
        rainfall: weather.rainfall,
        humidity: weather.humidity,
        windSpeed: weather.windSpeed,
        floodRisk: weather.floodRisk,
        landslideRisk: weather.landslideRisk,
        site: siteName,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (err) {
    // Graceful fallback to client-side rule model
  }
  return null;
}

/* =========================================================
   5. REFRESH & RENDER ALL 12 MODULES
   ========================================================= */
// Flood / landslide hazard follows rainfall (before this, they stayed "High"/"Medium" even at 0 mm rain)
function syncHazardLevels() {
  const r = Number(activeWeather.rainfall) || 0;
  activeWeather.floodRisk = r >= 70 ? "High" : r >= 35 ? "Medium" : "Low";
  activeWeather.landslideRisk = r >= 100 ? "High" : r >= 60 ? "Medium" : "Low";
}

async function refreshAllModules() {
  syncHazardLevels();
  const site = PROJECT_SITES[currentSiteKey];
  const siteNameEl = document.getElementById("activeSiteNameLabel");
  if (siteNameEl) siteNameEl.textContent = site.name;

  // 1. Calculate overall score (client + backend check)
  let overallScore = calculateOverallSiteRisk(activeWeather);
  const backendRes = await callPythonBackendML(activeWeather, site.name);
  if (backendRes && backendRes.risk_score !== undefined) {
    overallScore = backendRes.risk_score;
  }
  const riskInfo = getRiskCategory(overallScore);

  // 2. Update Dashboard Metrics
  const dashScore = document.getElementById("dashRiskScore");
  const dashBadge = document.getElementById("dashRiskBadge");
  const dashWeather = document.getElementById("dashWeatherHeadline");
  const dashWeatherSub = document.getElementById("dashWeatherSub");
  const dashCostLoss = document.getElementById("dashCostLoss");
  const dashDelayDays = document.getElementById("dashDelayDays");
  const dashAtRiskCount = document.getElementById("dashAtRiskCount");

  if (dashScore) dashScore.innerHTML = `${overallScore} <small style="font-size:13px; color:var(--text-muted);">/100</small>`;
  if (dashBadge) {
    dashBadge.className = `risk-tag ${riskInfo.badgeClass}`;
    dashBadge.textContent = riskInfo.text;
  }

  // Weather description headline
  let weatherText = "Clear & Dry ☀️";
  if (activeWeather.rainfall >= 60) weatherText = "Heavy Storm 🌧️";
  else if (activeWeather.rainfall >= 20) weatherText = "Moderate Rain 🌦️";
  else if (activeWeather.temperature >= 38) weatherText = "Extreme Heatwave 🔥";
  else if (activeWeather.windSpeed >= 40) weatherText = "High Gale Wind 💨";

  if (dashWeather) dashWeather.textContent = weatherText;
  if (dashWeatherSub) dashWeatherSub.textContent = `${activeWeather.rainfall} mm rain • ${activeWeather.temperature}°C • ${activeWeather.windSpeed} km/h`;

  // Delay & cost calculation
  let delay = (overallScore / 100) * 3.5;
  let delayDaysFormatted = delay.toFixed(1);
  let totalLoss = Math.round(delay * site.dailyCost);
  let lossFormatted = (totalLoss / 100000).toFixed(2);

  if (dashDelayDays) dashDelayDays.textContent = `Expected delay: ${delayDaysFormatted} days`;
  if (dashCostLoss) dashCostLoss.textContent = `₹ ${lossFormatted} L`;

  // 3. Render 7-Day Chart
  render7DayTrendChart(overallScore);

  // 4. Render Activities Tables (Dashboard Top 4 + Full Tab 8)
  renderActivitiesTables();

  // 5. Render Multi-Site Cards
  renderSiteCards();

  // 6. Render Climate Intelligence Station & Hourly Forecast
  renderClimateStation();

  // 7. Render IoT Sensors
  renderSensorsGrid();

  // 8. Render Worker Safety WBGT Index
  renderWorkerSafety();

  // 9. Render Smart Scheduling Comparison
  renderSmartScheduling(delayDaysFormatted, totalLoss);

  // 10. Render Delay & Cost Estimator
  renderCostEstimator();

  // 11. Render Audit Alerts History from SQLite
  loadAuditAlertsFromDatabase();

  // 12. Update CCTV HUD
  updateCctvWeatherOverlay();

  // Update Global Banner if Critical
  const banner = document.getElementById("globalAlertBanner");
  const bannerText = document.getElementById("globalAlertText");
  if (banner && bannerText) {
    if (overallScore >= 70) {
      banner.style.display = "flex";
      bannerText.textContent = `CRITICAL WEATHER ALERT: Active risk score ${overallScore}/100. High precipitation (${activeWeather.rainfall} mm) and wind gusts (${activeWeather.windSpeed} km/h) require immediate work suspension.`;
    } else {
      banner.style.display = "none";
    }
  }

  // Timestamp
  const timeEl = document.getElementById("lastSyncTimestamp");
  if (timeEl) timeEl.textContent = `Last synced: ${new Date().toLocaleTimeString("en-IN")}`;
}

/* =========================================================
   6. 7-DAY FORECAST RISK TREND CHART
   ========================================================= */
function render7DayTrendChart(baseScore) {
  const container = document.getElementById("weekChart");
  if (!container) return;
  container.innerHTML = "";

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const multiplier = [1.0, 0.85, 1.15, 0.45, 0.25, 0.30, 0.40];

  days.forEach((day, idx) => {
    const score = Math.round(Math.min(100, Math.max(10, baseScore * multiplier[idx])));
    const risk = getRiskCategory(score);

    const col = document.createElement("div");
    col.className = "bar-col";
    col.innerHTML = `
      <div class="bar-val">${score}</div>
      <div class="bar" style="height:${Math.max(12, score)}%; background:${risk.color};"></div>
      <div class="bar-day">${day}</div>
    `;
    container.appendChild(col);
  });
}

/* =========================================================
   7. ACTIVITIES TABLES (DASHBOARD PREVIEW & FULL MATRIX)
   ========================================================= */
function renderActivitiesTables() {
  const dashTbody = document.getElementById("dashActivitiesTableBody");
  const fullTbody = document.getElementById("fullActivityTableBody");
  if (!dashTbody && !fullTbody) return;

  const activitiesWithScores = ACTIVITIES_DATA.map((act) => {
    const score = calculateActivityRisk(act, activeWeather);
    const risk = getRiskCategory(score);
    const delay = score >= 70 ? "1.5 - 2 Days" : score >= 40 ? "0.5 - 1 Day" : "Normal / None";
    return { ...act, score, risk, delay };
  }).sort((a, b) => b.score - a.score);

  // Update at-risk count on dashboard
  const atRiskCount = activitiesWithScores.filter((a) => a.score >= 50).length;
  const atRiskEl = document.getElementById("dashAtRiskCount");
  if (atRiskEl) atRiskEl.innerHTML = `${atRiskCount} <small style="font-size:13px; color:var(--text-muted);">/ 8</small>`;

  // Dashboard preview (top 4 critical activities)
  if (dashTbody) {
    dashTbody.innerHTML = "";
    activitiesWithScores.slice(0, 4).forEach((act) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${act.name}</b></td>
        <td style="font-family:var(--font-mono); font-size:12px; color:var(--text-secondary);">${act.hazardDriver}</td>
        <td><span class="risk-tag ${act.risk.badgeClass}">${act.risk.text} (${act.score}/100)</span></td>
        <td style="font-family:var(--font-mono); font-weight:600;">${act.delay}</td>
        <td style="font-size:12px; color:var(--text-secondary);">${act.sop}</td>
      `;
      dashTbody.appendChild(tr);
    });
  }

  // Full Activity Risk Matrix Table (Tab 6)
  if (fullTbody) {
    fullTbody.innerHTML = "";
    activitiesWithScores.forEach((act) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${act.name}</b></td>
        <td style="font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">${act.hazardDriver}</td>
        <td style="font-family:var(--font-mono); font-size:12px;">Rain: ${activeWeather.rainfall}mm | Wind: ${activeWeather.windSpeed}km/h</td>
        <td><span class="risk-tag ${act.risk.badgeClass}">${act.risk.text} (${act.score}/100)</span></td>
        <td style="font-family:var(--font-mono); font-weight:600; color:${act.score >= 60 ? "var(--risk-critical)" : "var(--primary)"};">${act.delay}</td>
        <td style="font-size:12px; color:var(--text-secondary); max-width:280px;">${act.sop}</td>
        <td><button class="topbar-btn" onclick="alert('SOP Checklist for ${act.name} acknowledged and dispatched to site radio channel.')" style="padding:4px 8px; font-size:11px;">Enforce SOP</button></td>
      `;
      fullTbody.appendChild(tr);
    });
  }
}

/* =========================================================
   8. PROJECT PORTFOLIO SITES
   ========================================================= */
function renderSiteCards() {
  const grid = document.getElementById("sitesCardGrid");
  if (!grid) return;
  grid.innerHTML = "";

  Object.keys(PROJECT_SITES).forEach((key) => {
    const s = PROJECT_SITES[key];
    const isCurrent = key === currentSiteKey;
    const score = isCurrent ? calculateOverallSiteRisk(activeWeather) : calculateOverallSiteRisk({
      rainfall: s.baseRain,
      windSpeed: s.baseWind,
      temperature: s.baseTemp,
      humidity: s.baseHum,
      floodRisk: "Medium",
    });
    const risk = getRiskCategory(score);
    const budgetCr = (s.budget / 10000000).toFixed(0);

    const card = document.createElement("div");
    card.className = isCurrent ? "site-card active-site" : "site-card";
    card.innerHTML = `
      <div>
        <div class="site-card-header">
          <div>
            <h3 class="site-card-title">${s.name}</h3>
            <div class="site-card-location">📍 ${s.location} • ${s.elevation}</div>
          </div>
          <span class="risk-tag ${risk.badgeClass}">${risk.text}</span>
        </div>
        <div style="margin-top:14px; display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; font-family:var(--font-mono); font-size:11.5px; background:var(--bg-subtle); padding:10px; border-radius:var(--radius-sm);">
          <div>
            <span style="color:var(--text-muted); display:block;">CAPEX:</span>
            <b>₹ ${budgetCr} Cr</b>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block;">CREW:</span>
            <b>${s.workers} Workers</b>
          </div>
          <div>
            <span style="color:var(--text-muted); display:block;">WEATHER:</span>
            <b>${s.baseRain} mm / ${s.baseWind} kph</b>
          </div>
        </div>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:12px;">
        <span style="font-size:12px; color:var(--text-muted);">👤 ${s.manager}</span>
        <button class="topbar-btn ${isCurrent ? "primary" : ""}" onclick="window.switchActiveSite('${key}')">
          ${isCurrent ? "✓ Active Site" : "Switch to Site"}
        </button>
      </div>
    `;
    grid.appendChild(card);
  });
}

/* =========================================================
   9. CLIMATE INTELLIGENCE & HOURLY FORECAST
   ========================================================= */
function renderClimateStation() {
  const tempEl = document.getElementById("climTemp");
  const rainEl = document.getElementById("climRain");
  const humEl = document.getElementById("climHum");
  const windEl = document.getElementById("climWind");
  if (tempEl) tempEl.textContent = `${activeWeather.temperature.toFixed(1)} °C`;
  if (rainEl) rainEl.textContent = `${activeWeather.rainfall.toFixed(1)} mm`;
  if (humEl) humEl.textContent = `${activeWeather.humidity} %`;
  if (windEl) windEl.textContent = `${activeWeather.windSpeed} km/h`;

  // 24h Hourly Forecast Strip
  const strip = document.getElementById("hourlyForecastStrip");
  if (!strip) return;
  strip.innerHTML = "";

  const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00", "22:00"];
  hours.forEach((hr, i) => {
    const rain = Math.max(0, Math.round(activeWeather.rainfall * (1 - i * 0.12)));
    const temp = Math.round(activeWeather.temperature + (i > 3 ? -3 : 2));
    const pill = document.createElement("div");
    pill.className = "hourly-pill";
    pill.innerHTML = `
      <span class="hourly-time">${hr}</span>
      <span style="font-size:16px;">${rain > 40 ? "🌧️" : rain > 10 ? "🌦️" : "⛅"}</span>
      <span class="hourly-temp">${temp}°C</span>
      <span class="hourly-rain">${rain} mm</span>
    `;
    strip.appendChild(pill);
  });

  // Maharashtra Regional Grid
  const regTbody = document.getElementById("regionalClimateTableBody");
  if (!regTbody) return;
  regTbody.innerHTML = "";
  Object.keys(PROJECT_SITES).forEach((key) => {
    const s = PROJECT_SITES[key];
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><b>${s.location}</b></td>
      <td>${s.baseRain >= 80 ? "Heavy Monsoonal Squall" : s.baseRain >= 30 ? "Scattered Showers" : "Clear Skies"}</td>
      <td style="font-family:var(--font-mono);">${s.baseRain} mm</td>
      <td style="font-family:var(--font-mono);">${s.baseWind} km/h</td>
      <td><span class="risk-tag ${s.baseRain >= 80 ? "HIGH" : s.baseRain >= 40 ? "MEDIUM" : "LOW"}">${s.exposure}</span></td>
      <td><span class="risk-tag ${s.baseRain >= 80 ? "CRITICAL" : s.baseRain >= 40 ? "MEDIUM" : "LOW"}">${s.baseRain >= 80 ? "HIGH RISK" : "NORMAL"}</span></td>
    `;
    regTbody.appendChild(tr);
  });
}

async function fetchLiveOpenMeteoWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&hourly=temperature_2m,precipitation&timezone=auto`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      const curr = data.current;
      activeWeather.temperature = curr.temperature_2m || 32;
      activeWeather.humidity = curr.relative_humidity_2m || 80;
      activeWeather.rainfall = (curr.precipitation || 0) * 10 || 45;
      activeWeather.windSpeed = curr.wind_speed_10m || 24;
      updateSimulatorSliders();
      refreshAllModules();
      alert(`🌐 Live meteorological data successfully synced from Open-Meteo for ${PROJECT_SITES[currentSiteKey].name}!`);
    }
  } catch (err) {
    alert("⚠️ Could not reach live weather server. Continuing with industrial simulation model.");
  }
}

/* =========================================================
   10. IOT SENSOR NETWORK & TELEMETRY
   ========================================================= */
function renderSensorsGrid() {
  const grid = document.getElementById("sensorsGrid");
  if (!grid) return;
  grid.innerHTML = "";

  SENSORS_DATA.forEach((sens) => {
    const isAlert = sens.value >= sens.threshold;
    const card = document.createElement("div");
    card.className = isAlert ? "sensor-card danger" : "sensor-card";
    card.innerHTML = `
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="sensor-name">${sens.name}</span>
          <span class="risk-tag ${isAlert ? "CRITICAL" : "LOW"}">${isAlert ? "EXCEEDED" : "NORMAL"}</span>
        </div>
        <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">📍 ${sens.location}</div>
        <div style="margin:14px 0;">
          <span class="sensor-val" style="color:${isAlert ? "var(--risk-critical)" : "var(--primary)"};">${sens.value} <small style="font-size:14px;">${sens.unit}</small></span>
        </div>
      </div>
      <div class="sensor-meta">
        <span>Safe Limit: &lt; ${sens.threshold} ${sens.unit}</span>
        <span>Battery: ${sens.battery}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function triggerSensorTest() {
  const pz = SENSORS_DATA.find((s) => s.id === "PZ-104");
  if (pz) {
    pz.value = 68.5; // Exceeds 60 kPa threshold
    renderSensorsGrid();
    alert("⚡ High Soil Pore Pressure Event Injected! Piezometer PZ-104 exceeded 60 kPa.\nTriggered automatic retaining wall stabilization protocol.");
    // Persist alert in SQLite
    postNewAlertToDatabase({
      site: PROJECT_SITES[currentSiteKey].name,
      severity: "CRITICAL",
      category: "Geotechnical Sensor",
      details: "Piezometer PZ-104 exceeded critical pore water pressure threshold (68.5 kPa). Risk of trench wall slope failure.",
    });
  }
}

/* =========================================================
   11. WORKER SAFETY & HEAT STRESS (WBGT)
   ========================================================= */
function renderWorkerSafety() {
  // Simplified outdoor WBGT estimate = 0.7 * WetBulb + 0.2 * Globe + 0.1 * DryBulb
  const t = activeWeather.temperature;
  const rh = activeWeather.humidity;
  // Approximated natural wet bulb
  const tw = t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) + Math.atan(t + rh) - Math.atan(rh - 1.676331) + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
  const wbgt = (0.7 * tw + 0.3 * t).toFixed(1);

  const numEl = document.getElementById("wbgtNumber");
  const headlineEl = document.getElementById("wbgtHeadline");
  const ambientEl = document.getElementById("wbgtAmbient");
  const humEl = document.getElementById("wbgtHum");

  if (numEl) numEl.textContent = wbgt;
  if (ambientEl) ambientEl.textContent = `${t.toFixed(1)} °C`;
  if (humEl) humEl.textContent = `${rh} %`;

  if (headlineEl) {
    if (wbgt >= 32) {
      headlineEl.textContent = "RED: EXTREME HEAT STROKE DANGER";
      headlineEl.style.color = "var(--risk-critical)";
    } else if (wbgt >= 29) {
      headlineEl.textContent = "ORANGE: HIGH HEAT RISK (30 MIN WORK/REST)";
      headlineEl.style.color = "var(--risk-high)";
    } else if (wbgt >= 26) {
      headlineEl.textContent = "YELLOW: MODERATE HEAT CAUTION";
      headlineEl.style.color = "var(--risk-medium)";
    } else {
      headlineEl.textContent = "GREEN: SAFE WORK CONDITIONS";
      headlineEl.style.color = "var(--risk-low)";
    }
  }
}

function broadcastWorkerSafetyAudio() {
  alert("📢 On-Site PA Tannoy Broadcast Activated!\n\n[EN] 'High heat index active. Mandatory 30-minute shaded rest and ORS hydration.'\n[HI] 'उच्च तापमान चेतावनी: सभी श्रमिक छाया में विश्राम करें और पानी पिएं।'\n[MR] 'उष्णतेचा इशारा: सर्व कामगारांसाठी विश्रांती आणि पाणी पिणे बंधनकारक.'");
}

/* =========================================================
   12. SMART SCHEDULING & WHAT-IF RESEQUENCING
   ========================================================= */
function renderSmartScheduling(delayDays, totalLoss) {
  // Scenario metrics update automatically in view
}

function commitOptimizedSchedule() {
  alert("✅ Weather-Aware Optimized Schedule committed to Project ERP (SAP / Primavera P6)!\nRescheduled concrete pour to Thursday dry window.\nEstimated capital loss prevented: ₹ 7,50,000.");
  postNewAlertToDatabase({
    site: PROJECT_SITES[currentSiteKey].name,
    severity: "LOW",
    category: "Schedule Optimization",
    details: "Project Director committed AI Weather-Rescheduled sequence. Prevented 3.0 days idle time.",
  });
}

/* =========================================================
   13. DELAY & COST IMPACT ESTIMATOR
   ========================================================= */
function renderCostEstimator() {
  const dailyRate = Number(document.getElementById("costDailyInput")?.value || 250000);
  const fleetRate = Number(document.getElementById("costFleetInput")?.value || 120000);
  const subRate = Number(document.getElementById("costSubInput")?.value || 80000);
  const days = Number(document.getElementById("costDaysInput")?.value || 2.5);

  const overheadLoss = Math.round(dailyRate * days);
  const fleetLoss = Math.round(fleetRate * days);
  const subLoss = Math.round(subRate * days);
  const totalLoss = overheadLoss + fleetLoss + subLoss;
  const savings = Math.round(totalLoss * 0.8);

  document.getElementById("costDailyVal") && (document.getElementById("costDailyVal").textContent = `₹ ${dailyRate.toLocaleString("en-IN")}`);
  document.getElementById("costFleetVal") && (document.getElementById("costFleetVal").textContent = `₹ ${fleetRate.toLocaleString("en-IN")}`);
  document.getElementById("costSubVal") && (document.getElementById("costSubVal").textContent = `₹ ${subRate.toLocaleString("en-IN")}`);
  document.getElementById("costDaysVal") && (document.getElementById("costDaysVal").textContent = `${days} Days`);

  document.getElementById("totalCostLossDisplay") && (document.getElementById("totalCostLossDisplay").textContent = `₹ ${totalLoss.toLocaleString("en-IN")}`);
  document.getElementById("lossOverheadVal") && (document.getElementById("lossOverheadVal").textContent = `₹ ${overheadLoss.toLocaleString("en-IN")}`);
  document.getElementById("lossFleetVal") && (document.getElementById("lossFleetVal").textContent = `₹ ${fleetLoss.toLocaleString("en-IN")}`);
  document.getElementById("lossSubVal") && (document.getElementById("lossSubVal").textContent = `₹ ${subLoss.toLocaleString("en-IN")}`);
  document.getElementById("savingsRoiVal") && (document.getElementById("savingsRoiVal").textContent = `₹ ${savings.toLocaleString("en-IN")}`);
}

/* =========================================================
   14. AUDIT & ALERT HISTORY (SQLITE DATABASE PERSISTENCE)
   ========================================================= */
function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

let cachedAlerts = [];

async function loadAuditAlertsFromDatabase() {
  const tbody = document.getElementById("auditAlertsTableBody");
  if (!tbody) return;

  try {
    const res = await fetch(API_ALERTS);
    if (!res.ok) throw new Error("Local DB offline");
    const payload = await res.json();
    cachedAlerts = Array.isArray(payload) ? payload : payload.alerts;
    if (!Array.isArray(cachedAlerts)) throw new Error("Unexpected alerts format");
    localStorage.setItem("climatebuild_offline_alerts", JSON.stringify(cachedAlerts));
  } catch (e) {
    // Fallback to local storage
    const saved = localStorage.getItem("climatebuild_offline_alerts");
    if (saved) cachedAlerts = JSON.parse(saved);
    else {
      cachedAlerts = [
        {
          id: 1,
          timestamp: "2026-10-26 14:10:00",
          site: "Pune Metro Line 3",
          severity: "CRITICAL",
          category: "Precipitation & Inundation",
          details: "Rainfall reached 85 mm. Automatic suspension of excavation and trenching enacted.",
          status: "ACTIVE",
        },
        {
          id: 2,
          timestamp: "2026-10-26 13:45:00",
          site: "Pune Metro Line 3",
          severity: "HIGH",
          category: "Tower Crane Anemometer",
          details: "Wind gusts exceeded 42 km/h limit on Crane A-1. Hoist locked in safety mode.",
          status: "ACKNOWLEDGED",
        },
        {
          id: 3,
          timestamp: "2026-10-26 11:30:00",
          site: "Mumbai Coastal Road",
          severity: "CRITICAL",
          category: "High Tide Surge",
          details: "Seawall wave action triggered tidal surge alert. Caisson workers evacuated.",
          status: "RESOLVED",
        },
      ];
    }
  }

  // Update badge count
  const badge = document.getElementById("sidebarAlertBadge");
  const activeCount = cachedAlerts.filter((a) => a.status === "ACTIVE").length;
  if (badge) badge.textContent = activeCount;

  // Render Table
  tbody.innerHTML = "";
  cachedAlerts.forEach((alert) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:var(--font-mono); font-size:12px;">#${alert.id}</td>
      <td style="font-family:var(--font-mono); font-size:11.5px; color:var(--text-muted);">${escapeHtml(alert.timestamp)}</td>
      <td><b>${escapeHtml(alert.site)}</b></td>
      <td><span class="risk-tag ${alert.severity === "CRITICAL" ? "CRITICAL" : alert.severity === "HIGH" ? "HIGH" : "MEDIUM"}">${alert.severity}</span></td>
      <td style="font-size:12.5px;">${escapeHtml(alert.category)}</td>
      <td style="font-size:12px; color:var(--text-secondary); max-width:320px;">${escapeHtml(alert.details)}</td>
      <td>
        <span class="risk-tag ${alert.status === "RESOLVED" ? "LOW" : alert.status === "ACKNOWLEDGED" ? "MEDIUM" : "CRITICAL"}">
          ${alert.status}
        </span>
      </td>
      <td>
        ${
          alert.status === "ACTIVE"
            ? `<button class="topbar-btn" onclick="window.acknowledgeAlert('${alert.id}')" style="padding:3px 8px; font-size:11px;">✓ Ack</button>`
            : alert.status === "ACKNOWLEDGED"
            ? `<button class="topbar-btn primary" onclick="window.resolveAlert('${alert.id}')" style="padding:3px 8px; font-size:11px;">✓ Resolve</button>`
            : `<span style="font-size:11px; color:var(--text-muted);">Resolved</span>`
        }
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.acknowledgeAlert = async function (id) {
  try {
    await fetch(`${API_ALERTS}/${id}/ack`, { method: "POST" });
  } catch (e) {}
  const target = cachedAlerts.find((a) => String(a.id) === String(id));
  if (target) target.status = "ACKNOWLEDGED";
  localStorage.setItem("climatebuild_offline_alerts", JSON.stringify(cachedAlerts));
  loadAuditAlertsFromDatabase();
};

window.resolveAlert = async function (id) {
  try {
    await fetch(`${API_ALERTS}/${id}/resolve`, { method: "POST" });
  } catch (e) {}
  const target = cachedAlerts.find((a) => String(a.id) === String(id));
  if (target) target.status = "RESOLVED";
  localStorage.setItem("climatebuild_offline_alerts", JSON.stringify(cachedAlerts));
  loadAuditAlertsFromDatabase();
};

async function postNewAlertToDatabase(alertObj) {
  let newAlert = {
    id: Date.now(),
    timestamp: new Date().toISOString().replace("T", " ").substring(0, 19),
    status: "ACTIVE",
    ...alertObj,
  };
  try {
    const res = await fetch(API_ALERTS, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAlert),
    });
    if (res.ok) newAlert = await res.json(); // real id from the database
  } catch (e) {}
  cachedAlerts.unshift(newAlert);
  localStorage.setItem("climatebuild_offline_alerts", JSON.stringify(cachedAlerts));
  loadAuditAlertsFromDatabase();
}

/* =========================================================
   15. PDF REPORT GENERATOR & CSV EXPORT
   ========================================================= */
function exportPdfRiskReport() {
  if (typeof window.jspdf === "undefined" && typeof jsPDF === "undefined") {
    window.print();
    return;
  }
  const { jsPDF } = window.jspdf || window;
  const doc = new jsPDF();
  const site = PROJECT_SITES[currentSiteKey];
  const score = calculateOverallSiteRisk(activeWeather);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CLIMATEBUILD AI — CERTIFIED RISK ASSESSMENT REPORT", 14, 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Project Site: ${site.name}`, 14, 30);
  doc.text(`Location: ${site.location} (${site.coords.join(", ")})`, 14, 36);
  doc.text(`Generated At: ${new Date().toLocaleString("en-IN")}`, 14, 42);
  doc.text(`Active Engineer: ${document.getElementById("topbarUserName")?.textContent || "Rahul Sharma"}`, 14, 48);

  doc.setLineWidth(0.5);
  doc.line(14, 52, 196, 52);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Overall Climate Risk Index: ${score} / 100 [${getRiskCategory(score).level}]`, 14, 62);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Precipitation Forecast: ${activeWeather.rainfall} mm (Heavy Inundation Hazard)`, 14, 70);
  doc.text(`Peak Wind Speeds: ${activeWeather.windSpeed} km/h (Crane Hoist Limit Exceeded)`, 14, 76);
  doc.text(`Ambient Temperature & Heat Index: ${activeWeather.temperature} °C / Humidity ${activeWeather.humidity}%`, 14, 82);
  doc.text(`Projected Milestone Delay: ${((score / 100) * 3.5).toFixed(1)} Days`, 14, 88);
  doc.text(`Estimated Financial Loss Exposure: ₹ ${(((score / 100) * 3.5 * site.dailyCost) / 100000).toFixed(2)} Lakhs`, 14, 94);

  doc.setFont("helvetica", "bold");
  doc.text("Enforced Activity SOP Mitigation Directives:", 14, 108);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let y = 116;
  ACTIVITIES_DATA.slice(0, 5).forEach((act) => {
    doc.text(`• ${act.name}: ${act.sop}`, 16, y);
    y += 10;
  });

  doc.text("This document is an authenticated audit certification produced by the ClimateBuild AI Platform.", 14, 270);
  doc.save(`ClimateBuild_Report_${site.name.replace(/\s+/g, "_")}.pdf`);
}

function exportCsvAuditLog() {
  let csv = "ID,Timestamp,Site,Severity,Category,Details,Status\n";
  cachedAlerts.forEach((a) => {
    csv += `"${a.id}","${a.timestamp}","${a.site}","${a.severity}","${a.category}","${String(a.details || "").replace(/"/g, '""')}","${a.status}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ClimateBuild_Alert_Audit_${Date.now()}.csv`;
  a.click();
}

/* =========================================================
   16. SIMULATOR SLIDERS & USER PERSONAS
   ========================================================= */
function initSimulatorControls() {
  const rainSlider = document.getElementById("simRain");
  const windSlider = document.getElementById("simWind");
  const tempSlider = document.getElementById("simTemp");
  const humSlider = document.getElementById("simHum");

  function onSliderChange() {
    activeWeather.rainfall = Number(rainSlider.value);
    activeWeather.windSpeed = Number(windSlider.value);
    activeWeather.temperature = Number(tempSlider.value);
    activeWeather.humidity = Number(humSlider.value);

    document.getElementById("simRainVal").textContent = `${activeWeather.rainfall} mm`;
    document.getElementById("simWindVal").textContent = `${activeWeather.windSpeed} km/h`;
    document.getElementById("simTempVal").textContent = `${activeWeather.temperature} °C`;
    document.getElementById("simHumVal").textContent = `${activeWeather.humidity} %`;

    refreshAllModules();
    if (gisMap) drawRiskBuffer();
  }

  [rainSlider, windSlider, tempSlider, humSlider].forEach((s) => {
    s?.addEventListener("input", onSliderChange);
  });

  document.getElementById("resetSimBtn")?.addEventListener("click", () => {
    const site = PROJECT_SITES[currentSiteKey];
    activeWeather.rainfall = site.baseRain;
    activeWeather.windSpeed = site.baseWind;
    activeWeather.temperature = site.baseTemp;
    activeWeather.humidity = site.baseHum;
    updateSimulatorSliders();
    refreshAllModules();
    if (gisMap) drawRiskBuffer();
  });
}

function updateSimulatorSliders() {
  const rainSlider = document.getElementById("simRain");
  const windSlider = document.getElementById("simWind");
  const tempSlider = document.getElementById("simTemp");
  const humSlider = document.getElementById("simHum");

  if (rainSlider) rainSlider.value = activeWeather.rainfall;
  if (windSlider) windSlider.value = activeWeather.windSpeed;
  if (tempSlider) tempSlider.value = activeWeather.temperature;
  if (humSlider) humSlider.value = activeWeather.humidity;

  document.getElementById("simRainVal") && (document.getElementById("simRainVal").textContent = `${activeWeather.rainfall} mm`);
  document.getElementById("simWindVal") && (document.getElementById("simWindVal").textContent = `${activeWeather.windSpeed} km/h`);
  document.getElementById("simTempVal") && (document.getElementById("simTempVal").textContent = `${activeWeather.temperature} °C`);
  document.getElementById("simHumVal") && (document.getElementById("simHumVal").textContent = `${activeWeather.humidity} %`);
}

/* =========================================================
   16. SIMULATOR SLIDERS & USER PERSONAS / RBAC WORKFLOW
   ========================================================= */
const KNOWN_ACCOUNTS = {
  "rahul.engineer": {
    id: "user-1", username: "rahul.engineer", name: "Rahul Sharma", role: "Site Engineer",
    user_type: "Team/Staff", email: "rahul.engineer@climatebuild.ai", avatar: "👷",
    assigned_site_id: null, assigned_site_name: "All Project Sites (Operations)"
  },
  "pooja.safety": {
    id: "user-2", username: "pooja.safety", name: "Pooja Deshmukh", role: "Safety Officer",
    user_type: "Team/Staff", email: "pooja.safety@climatebuild.ai", avatar: "🦺",
    assigned_site_id: null, assigned_site_name: "All Project Sites (Safety Oversight)"
  },
  "vikram.pm": {
    id: "user-3", username: "vikram.pm", name: "Vikram Patil", role: "Project Director",
    user_type: "Team/Staff", email: "vikram.patil@climatebuild.ai", avatar: "📊",
    assigned_site_id: null, assigned_site_name: "All Project Sites (Executive Oversight)"
  },
  "shiva.admin": {
    id: "user-4", username: "shiva.admin", name: "Shiva Contractor", role: "Lead Master Contractor",
    user_type: "Contractor", email: "shiva.contractor@climatebuild.ai", avatar: "🏢",
    assigned_site_id: "site-pune", assigned_site_name: "Pune Metro Line 3"
  },
  "amit.contractor": {
    id: "user-5", username: "amit.contractor", name: "Amit Verma", role: "Highway Civil Contractor",
    user_type: "Contractor", email: "amit.verma@climatebuild.ai", avatar: "🚛",
    assigned_site_id: "site-mumbai", assigned_site_name: "Mumbai Coastal Road Pier 4"
  },
  "rohan.owner": {
    id: "user-6", username: "rohan.owner", name: "Rohan Joshi", role: "Site Owner (Pune Metro Project)",
    user_type: "Owner", email: "rohan.joshi@climatebuild.ai", avatar: "🏛️",
    assigned_site_id: "site-pune", assigned_site_name: "Pune Metro Line 3"
  },
  "suresh.owner": {
    id: "user-7", username: "suresh.owner", name: "Suresh Shinde", role: "Site Owner (Mumbai Coastal Project)",
    user_type: "Owner", email: "suresh.shinde@climatebuild.ai", avatar: "⚓",
    assigned_site_id: "site-mumbai", assigned_site_name: "Mumbai Coastal Road Pier 4"
  },
  "public.viewer": {
    id: "user-8", username: "public.viewer", name: "Public Auditor", role: "Read-Only Auditor",
    user_type: "Viewer", email: "auditor@climatebuild.ai", avatar: "👁️",
    assigned_site_id: null, assigned_site_name: "Public Infrastructure Audit Portal"
  }
};

let currentUser = null;
let currentPermissions = {};
let currentContracts = [];
let pendingConfirmContractId = null;

// Modal Tab Switcher
window.switchModalTab = function (tab) {
  const quickSec = document.getElementById("modalQuickSection");
  const credsSec = document.getElementById("modalCredsSection");
  const quickBtn = document.getElementById("modalTabQuickBtn");
  const credsBtn = document.getElementById("modalTabCredsBtn");
  if (tab === "creds") {
    quickSec.style.display = "none";
    credsSec.style.display = "block";
    quickBtn.classList.remove("active");
    credsBtn.classList.add("active");
  } else {
    quickSec.style.display = "block";
    credsSec.style.display = "none";
    quickBtn.classList.add("active");
    credsBtn.classList.remove("active");
  }
};

// Global Logout Action
window.logoutUser = function () {
  localStorage.removeItem("climatebuild_token");
  localStorage.removeItem("climatebuild_user");
  localStorage.removeItem("climatebuild_permissions");
  localStorage.removeItem("climatebuild_persona");
  window.location.replace("login.html");
};

window.quickModalLogin = async function (username) {
  const success = await loginUser(username, "climate123", true);
  if (success) {
    document.getElementById("loginModal")?.classList.remove("open");
  }
};

window.submitModalCredentials = async function () {
  const u = document.getElementById("modalUsernameInput").value.trim();
  const p = document.getElementById("modalPasswordInput").value;
  const errBox = document.getElementById("modalLoginError");
  if (!u) {
    errBox.textContent = "Please enter a username.";
    errBox.style.display = "block";
    return;
  }
  const success = await loginUser(u, p, false);
  if (success) {
    errBox.style.display = "none";
    document.getElementById("loginModal")?.classList.remove("open");
  } else {
    errBox.textContent = "Invalid username or password. Default is: climate123";
    errBox.style.display = "block";
  }
};

window.switchUserPersona = async function (username) {
  const success = await loginUser(username, "climate123", true);
  if (success) {
    document.getElementById("loginModal")?.classList.remove("open");
  }
};

// Main Login function
async function loginUser(username, password = "climate123", isDemo = false) {
  const normUser = (username || "").trim().toLowerCase();
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: normUser, password, is_demo: isDemo }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      currentUser = data.user;
      currentPermissions = data.permissions || {};
      localStorage.setItem("climatebuild_token", data.token);
      localStorage.setItem("climatebuild_user", JSON.stringify(currentUser));
      localStorage.setItem("climatebuild_permissions", JSON.stringify(currentPermissions));
      localStorage.setItem("climatebuild_persona", JSON.stringify({
        name: currentUser.name,
        role: currentUser.role,
        avatar: currentUser.avatar,
      }));

      applyRoleCustomizations(currentUser);
      updateModalActiveProfile();
      await loadContractsLedger();
      return true;
    }
  } catch (err) {
    console.warn("API login failed, checking local accounts cache:", err);
    if (KNOWN_ACCOUNTS[normUser]) {
      if (isDemo || password === "climate123") {
        currentUser = KNOWN_ACCOUNTS[normUser];
        currentPermissions = {
          is_owner: currentUser.user_type === "Owner",
          is_contractor: currentUser.user_type === "Contractor",
          is_team: currentUser.user_type === "Team/Staff",
          is_read_only: currentUser.user_type === "Viewer",
          can_assign_contracts: currentUser.user_type === "Owner" || currentUser.user_type === "Team/Staff",
          can_verify_contracts: currentUser.user_type === "Owner",
          can_confirm_contracts: currentUser.user_type === "Contractor",
        };
        localStorage.setItem("climatebuild_token", `cb-token-${currentUser.id}-${Date.now()}`);
        localStorage.setItem("climatebuild_user", JSON.stringify(currentUser));
        localStorage.setItem("climatebuild_permissions", JSON.stringify(currentPermissions));
        localStorage.setItem("climatebuild_persona", JSON.stringify({
          name: currentUser.name,
          role: currentUser.role,
          avatar: currentUser.avatar,
        }));
        applyRoleCustomizations(currentUser);
        updateModalActiveProfile();
        return true;
      }
    }
  }
  return false;
}

// Update Active Profile in the Switch Modal
function updateModalActiveProfile() {
  if (!currentUser) return;
  const mAvatar = document.getElementById("modalProfileAvatar");
  const mName = document.getElementById("modalProfileName");
  const mRole = document.getElementById("modalProfileRole");
  const mTypeBadge = document.getElementById("modalProfileTypeBadge");
  const mUser = document.getElementById("modalProfileUsername");
  const mEmail = document.getElementById("modalProfileEmail");
  const mJuris = document.getElementById("modalProfileJurisdiction");

  if (mAvatar) mAvatar.textContent = currentUser.avatar || "👤";
  if (mName) mName.textContent = currentUser.name || "Operator";
  if (mRole) mRole.textContent = currentUser.role || "Operator Role";
  if (mUser) mUser.textContent = `@${currentUser.username || "operator"}`;
  if (mEmail) mEmail.textContent = currentUser.email || `${currentUser.username}@climatebuild.ai`;
  if (mJuris) mJuris.textContent = `📍 Jurisdiction: ${currentUser.assigned_site_name || "All Project Sites"}`;

  if (mTypeBadge) {
    mTypeBadge.className = "persona-tag";
    if (currentUser.user_type === "Owner") {
      mTypeBadge.classList.add("tag-owner");
      mTypeBadge.textContent = "Owner";
    } else if (currentUser.user_type === "Contractor") {
      mTypeBadge.classList.add("tag-contractor");
      mTypeBadge.textContent = "Contractor";
    } else if (currentUser.user_type === "Viewer") {
      mTypeBadge.classList.add("tag-viewer");
      mTypeBadge.textContent = "Auditor";
    } else {
      mTypeBadge.classList.add("tag-team");
      mTypeBadge.textContent = "Team / Staff";
    }
  }
}

// Role-Based UI Customization & Permissions Enforcement
function applyRoleCustomizations(user) {
  if (!user) return;

  // 1. Update Topbar Widget
  const nameEl = document.getElementById("topbarUserName");
  const roleEl = document.getElementById("topbarUserRole");
  const avatarEl = document.getElementById("topbarAvatar");
  const typeEl = document.getElementById("topbarUserType");
  const diagSession = document.getElementById("diagSessionName");

  if (nameEl) nameEl.textContent = user.name;
  if (roleEl) roleEl.textContent = user.role;
  if (avatarEl) avatarEl.textContent = user.avatar;
  if (diagSession) diagSession.textContent = `${user.name} (${user.role} — ${user.user_type})`;

  if (typeEl) {
    typeEl.className = "user-meta-type";
    if (user.user_type === "Owner") {
      typeEl.classList.add("type-owner");
      typeEl.textContent = "OWNER";
    } else if (user.user_type === "Contractor") {
      typeEl.classList.add("type-contractor");
      typeEl.textContent = "CONTRACTOR";
    } else if (user.user_type === "Viewer") {
      typeEl.classList.add("type-viewer");
      typeEl.textContent = "AUDITOR";
    } else {
      typeEl.classList.add("type-team");
      typeEl.textContent = "TEAM";
    }
  }

  // 2. Persona Box Highlight in Accounts View
  document.querySelectorAll(".persona-box[data-username]").forEach((b) => {
    b.classList.toggle("active", b.dataset.username === user.username);
    const ind = b.querySelector(".persona-status-indicator");
    if (ind) {
      if (b.dataset.username === user.username) {
        ind.textContent = "● ACTIVE PROFILE";
        ind.style.color = "var(--accent)";
      } else {
        ind.textContent = "Click to Sign In";
        ind.style.color = "var(--text-muted)";
      }
    }
  });

  // 3. Site selector constraints based on User Role & Jurisdiction
  const siteSelect = document.getElementById("globalSiteSelect");
  const openAssignBtn = document.getElementById("openAssignContractBtn");

  if (user.user_type === "Owner") {
    // Site Owners are tied to their specific construction project
    if (user.username === "rohan.owner") {
      window.switchActiveSite("Pune");
      if (siteSelect) {
        siteSelect.value = "Pune";
        siteSelect.title = "Site Owner Jurisdiction: Pune Metro Line 3";
      }
    } else if (user.username === "suresh.owner") {
      window.switchActiveSite("Mumbai");
      if (siteSelect) {
        siteSelect.value = "Mumbai";
        siteSelect.title = "Site Owner Jurisdiction: Mumbai Coastal Road";
      }
    }
    if (openAssignBtn) openAssignBtn.style.display = "inline-flex";
    renderOwnerWorkflow(user);
  } else if (user.user_type === "Contractor") {
    // Contractors see their dual-confirmation dispatch desk
    if (openAssignBtn) openAssignBtn.style.display = "none";
    if (siteSelect) siteSelect.title = "Contractor Fleet Overview across Assigned Sites";
    renderContractorWorkflow(user);
  } else if (user.user_type === "Viewer") {
    // Read-only auditor
    if (openAssignBtn) openAssignBtn.style.display = "none";
    if (siteSelect) siteSelect.title = "Public Auditor (Read-Only Mode)";
    renderAuditorWorkflow(user);
  } else {
    // Team/Staff (Engineers/Directors) have full oversight across all sites
    if (openAssignBtn) openAssignBtn.style.display = "inline-flex";
    if (siteSelect) siteSelect.title = "Full Multi-Site Engineering Oversight";
    renderTeamWorkflow(user);
  }
}

// Workflow Renderers
function renderOwnerWorkflow(user) {
  const container = document.getElementById("roleWorkflowContainer");
  if (!container) return;

  const siteName = user.username === "rohan.owner" ? "Pune Metro Line 3" : "Mumbai Coastal Road Pier 4";
  const siteKey = user.username === "rohan.owner" ? "Pune" : "Mumbai";
  const siteData = PROJECT_SITES[siteKey] || {};

  container.innerHTML = `
    <div class="workflow-card owner-border">
      <div class="workflow-header">
        <div class="workflow-title-wrap">
          <h3><span>🏛️</span> Site Owner Project Jurisdiction — ${siteName}</h3>
          <p>Welcome, ${user.name}. You hold primary capital jurisdiction. Review active contractor dual-confirmations, verify completed work orders, and release milestone funding.</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="workflow-action-btn amber" onclick="openAssignContractModal()">+ Assign Work Package</button>
          <button class="workflow-action-btn secondary" onclick="loadContractsLedger()">🔄 Sync Ledger</button>
        </div>
      </div>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-top:8px;">
        <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:6px; padding:12px;">
          <span style="font-size:11px; color:var(--text-muted); font-weight:600;">APPROVED CAPITAL BUDGET</span>
          <b style="display:block; font-size:16px; color:var(--primary); font-family:var(--font-mono); margin-top:4px;">₹ ${(siteData.budget / 10000000).toFixed(1)} Cr</b>
        </div>
        <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:6px; padding:12px;">
          <span style="font-size:11px; color:var(--text-muted); font-weight:600;">ACTIVE WEATHER RISK SCORE</span>
          <b style="display:block; font-size:16px; color:var(--risk-high); font-family:var(--font-mono); margin-top:4px;">${siteData.baseRain > 60 ? "HIGH RISK (68.4)" : "MODERATE (34.0)"}</b>
        </div>
        <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:6px; padding:12px;">
          <span style="font-size:11px; color:var(--text-muted); font-weight:600;">DAILY SITE COST BURN</span>
          <b style="display:block; font-size:16px; color:var(--text-primary); font-family:var(--font-mono); margin-top:4px;">₹ ${(siteData.dailyCost || 250000).toLocaleString("en-IN")}/day</b>
        </div>
        <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:6px; padding:12px;">
          <span style="font-size:11px; color:var(--text-muted); font-weight:600;">CONTRACTOR DISPATCH STATUS</span>
          <b style="display:block; font-size:14px; color:var(--accent); font-family:var(--font-mono); margin-top:4px;" id="ownerPendingCountBadge">Telemetry Active</b>
        </div>
      </div>
    </div>
  `;
}

function renderContractorWorkflow(user) {
  const container = document.getElementById("roleWorkflowContainer");
  if (!container) return;

  // Filter contracts for this contractor
  const assigned = currentContracts.filter((c) => c.contractor_username?.toLowerCase() === user.username.toLowerCase());
  const pending = assigned.filter((c) => c.status === "PENDING_CONTRACTOR_CONFIRMATION" || c.contractor_confirmed === 0);

  let cardsHtml = "";
  if (assigned.length === 0) {
    cardsHtml = `<div style="padding:16px; color:var(--text-muted); font-size:13px;">No contract work packages currently assigned to ${user.name}.</div>`;
  } else {
    cardsHtml = assigned.map((c) => {
      const isPending = c.status === "PENDING_CONTRACTOR_CONFIRMATION" || c.contractor_confirmed === 0;
      return `
        <div class="contract-req-box ${isPending ? "pending-urgent" : ""}">
          <div class="contract-req-top">
            <div>
              <div class="contract-req-title">${c.title}</div>
              <div class="contract-req-site">📍 ${c.site_name} | Package: <strong>${c.package_type}</strong></div>
            </div>
            <span class="status-pill ${isPending ? "pending" : "verified"}">
              ${isPending ? "⚠️ PENDING DUAL-CONFIRM" : "✓ DUAL-CONFIRMED"}
            </span>
          </div>
          <p style="font-size:12px; color:var(--text-secondary); margin:6px 0;">${c.scope}</p>
          <div class="contract-protocol-box">
            <strong>⚠️ Weather Risk Protocol:</strong> ${c.climate_protocol}
          </div>
          <div class="contract-req-bottom">
            <span class="contract-budget-tag">₹ ${(c.budget / 10000000).toFixed(2)} Cr</span>
            ${
              isPending
                ? `<button class="workflow-action-btn" onclick="promptDualConfirm('${c.id}')">⚡ Dual-Confirm Contract</button>`
                : `<span style="font-size:11px; color:var(--risk-low); font-weight:600;">✓ Mobilized on Site</span>`
            }
          </div>
        </div>
      `;
    }).join("");
  }

  container.innerHTML = `
    <div class="workflow-card contractor-border">
      <div class="workflow-header">
        <div class="workflow-title-wrap">
          <h3><span>🏢</span> Contractor Dual-Confirmation Dispatch Desk — ${user.name}</h3>
          <p>You are logged in as <strong>${user.role}</strong>. Review weather-risk contingency clauses and dual-confirm active project work packages before mobilizing heavy fleets and labor.</p>
        </div>
        <button class="workflow-action-btn secondary" onclick="loadContractsLedger()">🔄 Sync Requests</button>
      </div>
      ${
        pending.length > 0
          ? `<div style="background:#FEF3C7; border:1px solid #FDE68A; color:#92400E; padding:10px 14px; border-radius:6px; font-size:12.5px; font-weight:600; margin-bottom:12px;">
              ⚠️ Action Required: You have ${pending.length} contract package(s) awaiting your dual-confirmation and weather contingency sign-off.
            </div>`
          : `<div style="background:#ECFDF5; border:1px solid #A7F3D0; color:#065F46; padding:10px 14px; border-radius:6px; font-size:12.5px; font-weight:600; margin-bottom:12px;">
              ✓ All assigned work packages are dual-confirmed and compliance synchronized.
            </div>`
      }
      <div class="contractor-requests-grid">
        ${cardsHtml}
      </div>
    </div>
  `;
}

function renderAuditorWorkflow(user) {
  const container = document.getElementById("roleWorkflowContainer");
  if (!container) return;
  container.innerHTML = `
    <div class="workflow-card auditor-border">
      <div class="workflow-header">
        <div class="workflow-title-wrap">
          <h3><span>👁️</span> Public Infrastructure Audit &amp; Transparency Console</h3>
          <p>Read-Only Auditor Mode active. You have full transparency access to environmental telemetry, contract dual-confirmation trails, and climate delay cost analyses across all public projects.</p>
        </div>
        <span class="status-pill" style="background:#E2E8F0; color:#334155;">AUDIT COMPLIANCE VALIDATED</span>
      </div>
    </div>
  `;
}

function renderTeamWorkflow(user) {
  const container = document.getElementById("roleWorkflowContainer");
  if (!container) return;
  container.innerHTML = `
    <div class="workflow-card" style="border-left:5px solid var(--accent);">
      <div class="workflow-header">
        <div class="workflow-title-wrap">
          <h3><span>👷</span> Operations Command Console — ${user.name} (${user.role})</h3>
          <p>Full engineering jurisdiction across Pune, Mumbai, Nashik, and Aurangabad sites. Live sensor telemetry, delay mitigation schedules, and contractor dispatch active.</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="workflow-action-btn secondary" onclick="loadContractsLedger()">📑 Contracts Ledger</button>
        </div>
      </div>
    </div>
  `;
}

// -------------------------------------------------------------
// Contracts API & Dual-Confirmation Management
// -------------------------------------------------------------
async function loadContractsLedger() {
  try {
    const res = await fetch("/api/contracts");
    const data = await res.json();
    if (res.ok && data.contracts) {
      currentContracts = data.contracts;
      renderContractsTable(currentContracts);

      // Refresh role workflow if active
      if (currentUser.user_type === "Contractor") {
        renderContractorWorkflow(currentUser);
      } else if (currentUser.user_type === "Owner") {
        renderOwnerWorkflow(currentUser);
      }
    }
  } catch (err) {
    console.error("Failed to load contracts:", err);
  }
}

function renderContractsTable(contracts) {
  const tbody = document.getElementById("allContractsTableBody");
  if (!tbody) return;

  if (contracts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:18px; color:var(--text-muted);">No contract packages found in database.</td></tr>`;
    return;
  }

  tbody.innerHTML = contracts.map((c) => {
    let statusClass = "pending";
    let statusLabel = "PENDING CONTRACTOR";
    if (c.status === "ACTIVE_VERIFIED") {
      statusClass = "verified";
      statusLabel = "VERIFIED & ACTIVE";
    } else if (c.status === "PENDING_OWNER_VERIFICATION") {
      statusClass = "owner-verify";
      statusLabel = "PENDING OWNER SIGN-OFF";
    } else if (c.status === "FLAGGED_CLIMATE_RISK") {
      statusClass = "flagged";
      statusLabel = "RISK FLAGGED";
    }

    // Action button depends on who is viewing
    let actionBtn = `<span style="color:var(--text-muted); font-size:11px;">Oversight</span>`;
    const isOwnerOfSite = currentUser.user_type === "Owner" && (c.owner_username?.toLowerCase() === currentUser.username?.toLowerCase() || currentUser.username.includes("owner"));
    const isContractorOfSite = currentUser.user_type === "Contractor" && c.contractor_username?.toLowerCase() === currentUser.username?.toLowerCase();

    if (isContractorOfSite && (c.status === "PENDING_CONTRACTOR_CONFIRMATION" || c.contractor_confirmed === 0)) {
      actionBtn = `<button class="workflow-action-btn" style="padding:4px 8px; font-size:11px;" onclick="promptDualConfirm('${c.id}')">⚡ Dual-Confirm</button>`;
    } else if (isOwnerOfSite && c.status === "PENDING_OWNER_VERIFICATION") {
      actionBtn = `<button class="workflow-action-btn amber" style="padding:4px 8px; font-size:11px;" onclick="verifyContract('${c.id}')">✓ Verify Work Order</button>`;
    } else if (c.status === "ACTIVE_VERIFIED") {
      actionBtn = `<span style="color:var(--risk-low); font-weight:600; font-size:11px;">✓ Authorized</span>`;
    }

    return `
      <tr>
        <td>
          <b style="color:var(--primary);">${c.title}</b>
          <div style="font-size:11px; color:var(--text-muted); font-family:var(--font-mono);">${c.id} • ${c.package_type}</div>
        </td>
        <td><strong>${c.site_name}</strong></td>
        <td>
          <div>🏢 ${c.contractor_name}</div>
          <div style="font-size:10.5px; color:var(--text-muted);">${c.contractor_username}</div>
        </td>
        <td>
          <div>🏛️ ${c.owner_name}</div>
          <div style="font-size:10.5px; color:var(--text-muted);">${c.owner_username}</div>
        </td>
        <td><b style="font-family:var(--font-mono); color:var(--primary);">₹ ${(c.budget / 10000000).toFixed(2)} Cr</b></td>
        <td style="max-width:240px; font-size:11.5px; color:var(--text-secondary);">${c.climate_protocol}</td>
        <td><span class="status-pill ${statusClass}">${statusLabel}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join("");
}

// Prompt Contractor Dual-Confirmation Modal
window.promptDualConfirm = function (contractId) {
  pendingConfirmContractId = contractId;
  const contract = currentContracts.find((c) => c.id === contractId);
  if (!contract) return;

  const detailBox = document.getElementById("dualConfirmDetails");
  if (detailBox) {
    detailBox.innerHTML = `
      <div style="background:var(--bg-app); border:1px solid var(--border); border-radius:6px; padding:12px; font-size:12.5px;">
        <div style="font-size:14px; font-weight:700; color:var(--primary); margin-bottom:4px;">${contract.title}</div>
        <div style="color:var(--text-secondary); margin-bottom:6px;">📍 Site: <strong>${contract.site_name}</strong> | Category: <strong>${contract.package_type}</strong></div>
        <div style="margin-bottom:6px;">Approved Value: <strong style="font-family:var(--font-mono); color:var(--primary);">₹ ${(contract.budget / 10000000).toFixed(2)} Cr</strong></div>
        <div style="background:#FFFBEB; border:1px solid #FDE68A; padding:8px 10px; border-radius:4px; margin-top:8px; font-size:11.5px; color:#92400E;">
          <strong>⚠️ Climate Contingency Clause:</strong> ${contract.climate_protocol}
        </div>
      </div>
    `;
  }
  document.getElementById("dualConfirmModal")?.classList.add("open");
};

window.closeDualConfirmModal = function () {
  pendingConfirmContractId = null;
  document.getElementById("dualConfirmModal")?.classList.remove("open");
};

window.executeDualConfirmation = async function () {
  if (!pendingConfirmContractId) return;
  const notes = document.getElementById("dualConfirmNotes")?.value || "Contract dual-confirmed with equipment checklist verified.";
  const btn = document.getElementById("executeConfirmBtn");
  if (btn) btn.textContent = "Confirming...";

  try {
    const res = await fetch(`/api/contracts/${pendingConfirmContractId}/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`⚡ Success: ${data.message}`);
      window.closeDualConfirmModal();
      await loadContractsLedger();
    } else {
      alert(data.error || "Failed to confirm contract.");
    }
  } catch (err) {
    console.error("Confirm contract error:", err);
    alert("Connection error confirming contract.");
  } finally {
    if (btn) btn.textContent = "Dual-Confirm & Mobilize Fleet";
  }
};

window.verifyContract = async function (contractId) {
  if (!confirm("Verify this completed dual-confirmation and authorize milestone work order?")) return;
  try {
    const res = await fetch(`/api/contracts/${contractId}/verify`, { method: "POST" });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`🏛️ Verified: ${data.message}`);
      await loadContractsLedger();
    }
  } catch (err) {
    console.error("Verify contract error:", err);
  }
};

window.openAssignContractModal = function () {
  // Pre-set site if Owner
  const siteSelect = document.getElementById("assignSiteSelect");
  if (siteSelect) {
    if (currentUser.username === "rohan.owner") {
      siteSelect.value = "site-pune";
    } else if (currentUser.username === "suresh.owner") {
      siteSelect.value = "site-mumbai";
    }
  }
  document.getElementById("assignContractModal")?.classList.add("open");
};

window.closeAssignContractModal = function () {
  document.getElementById("assignContractModal")?.classList.remove("open");
};

window.submitNewContract = async function () {
  const siteSelect = document.getElementById("assignSiteSelect");
  const site_id = siteSelect?.value || "site-pune";
  const site_name = siteSelect?.selectedOptions[0]?.dataset.name || "Pune Metro Line 3";

  const contractorSelect = document.getElementById("assignContractorSelect");
  const contractor_username = contractorSelect?.value || "shiva.admin";
  const contractor_name = contractorSelect?.selectedOptions[0]?.dataset.name || "Shiva Contractor";

  const title = document.getElementById("assignTitleInput")?.value.trim() || "Structural Civil Package";
  const package_type = document.getElementById("assignPackageType")?.value || "Deep Excavation & Foundation";
  const budget = Number(document.getElementById("assignBudgetInput")?.value || 25000000);
  const scope = document.getElementById("assignScopeInput")?.value || "Site excavation and execution.";
  const climate_protocol = document.getElementById("assignProtocolInput")?.value || "Standard rain/wind suspension protocol enforced.";

  const btn = document.getElementById("submitAssignContractBtn");
  if (btn) btn.textContent = "Dispatching...";

  try {
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        site_id,
        site_name,
        title,
        owner_username: currentUser.username,
        owner_name: currentUser.name,
        contractor_username,
        contractor_name,
        package_type,
        budget,
        scope,
        climate_protocol,
      }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`🏛️ Work package dispatched! ${data.message}`);
      window.closeAssignContractModal();
      await loadContractsLedger();
    } else {
      alert(data.error || "Failed to create contract.");
    }
  } catch (err) {
    console.error("Assign contract error:", err);
  } finally {
    if (btn) btn.textContent = "Dispatch Contract to Contractor";
  }
};

function initUserPersonas() {
  const profileWidget = document.getElementById("userProfileBtn");
  const loginModal = document.getElementById("loginModal");
  const closeLoginBtn = document.getElementById("closeLoginModalBtn");
  const cancelLoginBtn = document.getElementById("cancelLoginModalBtn");

  // Open modal on Profile widget click
  profileWidget?.addEventListener("click", () => {
    updateModalActiveProfile();
    loginModal?.classList.add("open");
  });

  // Close modal triggers
  closeLoginBtn?.addEventListener("click", () => loginModal?.classList.remove("open"));
  cancelLoginBtn?.addEventListener("click", () => loginModal?.classList.remove("open"));

  // Check and restore saved session from localStorage
  try {
    const savedUser = JSON.parse(localStorage.getItem("climatebuild_user"));
    if (savedUser && savedUser.username) {
      currentUser = savedUser;
      currentPermissions = JSON.parse(localStorage.getItem("climatebuild_permissions") || "{}");
    } else {
      window.location.replace("login.html");
      return;
    }
  } catch (e) {
    window.location.replace("login.html");
    return;
  }

  applyRoleCustomizations(currentUser);
  updateModalActiveProfile();
  loadContractsLedger();
}

/* =========================================================
   17. INITIALIZATION LIFECYCLE
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // 1. User Authentication & Session Check (MUST RUN FIRST)
  initUserPersonas();

  // 2. Navigation & App Shell
  initNavigation();

  // 3. Global Site Selector in Topbar
  const siteSelect = document.getElementById("globalSiteSelect");
  if (siteSelect) {
    siteSelect.addEventListener("change", (e) => {
      window.switchActiveSite(e.target.value);
    });
  }

  // 4. Live Weather Fetch Button
  document.getElementById("liveWeatherBtn")?.addEventListener("click", () => {
    const site = PROJECT_SITES[currentSiteKey];
    fetchLiveOpenMeteoWeather(site.coords[0], site.coords[1]);
  });
  document.getElementById("climateRefreshBtn")?.addEventListener("click", () => {
    const site = PROJECT_SITES[currentSiteKey];
    fetchLiveOpenMeteoWeather(site.coords[0], site.coords[1]);
  });

  // 5. Export Buttons
  document.getElementById("exportPdfBtn")?.addEventListener("click", exportPdfRiskReport);
  document.getElementById("exportCsvBtn")?.addEventListener("click", exportCsvAuditLog);

  // 6. IoT Sensor Test Event
  document.getElementById("triggerSensorTestBtn")?.addEventListener("click", triggerSensorTest);

  // 7. Worker Safety Siren / Tannoy
  document.getElementById("broadcastSafetyAudioBtn")?.addEventListener("click", broadcastWorkerSafetyAudio);

  // 8. Commit Smart Schedule
  document.getElementById("applyOptimizedScheduleBtn")?.addEventListener("click", commitOptimizedSchedule);

  // 9. Financial Estimator Sliders
  ["costDailyInput", "costFleetInput", "costSubInput", "costDaysInput"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", renderCostEstimator);
  });

  // 10. Simulator Controls
  initSimulatorControls();

  // 11. AI CCTV Station
  initCctvStation();

  // 12. New Site Modal
  const openSiteModalBtn = document.getElementById("openNewSiteModalBtn");
  const siteModal = document.getElementById("newSiteModal");
  const closeSiteModalBtn = document.getElementById("closeSiteModalBtn");
  const cancelSiteModalBtn = document.getElementById("cancelSiteModalBtn");
  const saveSiteBtn = document.getElementById("saveNewSiteBtn");

  if (openSiteModalBtn && siteModal) {
    openSiteModalBtn.addEventListener("click", () => siteModal.classList.add("open"));
  }
  closeSiteModalBtn?.addEventListener("click", () => siteModal.classList.remove("open"));
  cancelSiteModalBtn?.addEventListener("click", () => siteModal.classList.remove("open"));

  saveSiteBtn?.addEventListener("click", () => {
    const name = document.getElementById("newSiteName").value.trim() || "Nagpur Metro Phase 2";
    const loc = document.getElementById("newSiteLocation").value.trim() || "Nagpur, Maharashtra";
    const lat = Number(document.getElementById("newSiteLat").value || 21.1458);
    const lng = Number(document.getElementById("newSiteLng").value || 79.0882);
    const budget = Number(document.getElementById("newSiteBudget").value || 3500000000);

    const newKey = "Site_" + Date.now();
    PROJECT_SITES[newKey] = {
      id: Object.keys(PROJECT_SITES).length + 1,
      name,
      location: loc,
      coords: [lat, lng],
      budget,
      dailyCost: 200000,
      manager: "Rahul Sharma (Assigned)",
      workers: 85,
      elevation: "310 m (Inland Plain)",
      exposure: "MODERATE (Thunderstorm Line)",
      baseRain: 50,
      baseWind: 30,
      baseTemp: 35,
      baseHum: 65,
    };

    // Add to dropdown
    const opt = document.createElement("option");
    opt.value = newKey;
    opt.textContent = name;
    siteSelect?.appendChild(opt);

    siteModal.classList.remove("open");
    window.switchActiveSite(newKey);
    alert(`🏗️ Successfully registered new construction project site: ${name}`);
  });

  // Dismiss global banner
  document.getElementById("dismissAlertBtn")?.addEventListener("click", () => {
    document.getElementById("globalAlertBanner").style.display = "none";
  });

  // Language toggle
  document.getElementById("langToggleBtn")?.addEventListener("click", () => {
    // Real translation: English -> हिंदी -> मराठी (see i18n.js)
    if (typeof window.cycleLanguage === "function") currentLang = window.cycleLanguage();
  });

  // Initial Full Render
  refreshAllModules();
});
