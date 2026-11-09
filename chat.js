/* =========================================================
   ClimateBuild AI — Site Assistant (floating chatbox)
   Works fully in the browser (no API key needed) and reads LIVE data from the
   dashboard: active site, simulator weather, risk scores, sensors, alerts.
   It can also DO things: switch site, run weather what-ifs, open tabs,
   export the PDF/CSV, sync live weather, change language.
   Languages: English / हिंदी / मराठी (follows the app language toggle,
   or switches automatically when you type in Devanagari).
   ========================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------
     Safe accessors to the dashboard state (script.js globals)
     --------------------------------------------------------- */
  const G = {
    weather: () => (typeof activeWeather !== "undefined" ? activeWeather : { temperature: 32, rainfall: 40, humidity: 70, windSpeed: 20, floodRisk: "Medium", landslideRisk: "Low" }),
    siteKey: () => (typeof currentSiteKey !== "undefined" ? currentSiteKey : "Pune"),
    sites: () => (typeof PROJECT_SITES !== "undefined" ? PROJECT_SITES : {}),
    site: () => G.sites()[G.siteKey()] || { name: "Site", dailyCost: 200000, coords: [18.52, 73.85] },
    acts: () => (typeof ACTIVITIES_DATA !== "undefined" ? ACTIVITIES_DATA : []),
    sensors: () => (typeof SENSORS_DATA !== "undefined" ? SENSORS_DATA : []),
    alerts: () => (typeof cachedAlerts !== "undefined" && Array.isArray(cachedAlerts) ? cachedAlerts : []),
    actRisk: (a) => (typeof calculateActivityRisk === "function" ? calculateActivityRisk(a, G.weather()) : 0),
    overall: () => (typeof calculateOverallSiteRisk === "function" ? calculateOverallSiteRisk(G.weather()) : 0),
    cat: (n) => (typeof getRiskCategory === "function" ? getRiskCategory(n) : { level: n >= 60 ? "HIGH" : n >= 35 ? "MEDIUM" : "LOW" }),
    lang: () => (typeof window.getLanguage === "function" ? window.getLanguage() : "en"),
  };

  /* ---------------------------------------------------------
     Small helpers
     --------------------------------------------------------- */
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = (t) =>
    esc(t)
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/\n/g, "<br>");
  const hasDevanagari = (s) => /[\u0900-\u097F]/.test(s);
  const MARATHI_HINTS = /(आहे|काय|कसे|किती|पाऊस|वारा|दाखव|सांग|धोका|उघड|हवामान|कामगार|आज)/;
  const lakhs = (n) => "₹ " + (n / 100000).toFixed(2) + " L";
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  let L = "en"; // language of the reply currently being built
  const pick = (o) => (o && (o[L] || o.en)) || "";

  function computeWbgt() {
    const w = G.weather();
    const t = Number(w.temperature), rh = Number(w.humidity);
    const tw =
      t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) + Math.atan(t + rh) - Math.atan(rh - 1.676331) +
      0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
    return +(0.7 * tw + 0.3 * t).toFixed(1);
  }

  function statusOf(score) {
    if (score >= 75) return { k: "STOP", icon: "🛑", t: { en: "STOP", hi: "रोकें", mr: "थांबवा" } };
    if (score >= 60) return { k: "RESTRICT", icon: "🟠", t: { en: "RESTRICT", hi: "सीमित करें", mr: "मर्यादित करा" } };
    if (score >= 35) return { k: "CAUTION", icon: "🟡", t: { en: "CAUTION", hi: "सावधानी", mr: "सावधगिरी" } };
    return { k: "GO", icon: "🟢", t: { en: "GO", hi: "जारी रखें", mr: "सुरू ठेवा" } };
  }

  function levelText(score) {
    const l = G.cat(score).level;
    const m = {
      CRITICAL: { en: "CRITICAL", hi: "अत्यंत गंभीर", mr: "अत्यंत गंभीर" },
      HIGH: { en: "HIGH", hi: "उच्च", mr: "उच्च" },
      MEDIUM: { en: "MODERATE", hi: "मध्यम", mr: "मध्यम" },
      LOW: { en: "LOW", hi: "कम", mr: "कमी" },
    };
    return pick(m[l] || m.LOW);
  }

  function rankedActivities() {
    return G.acts().map((a) => ({ a, s: G.actRisk(a) })).sort((x, y) => y.s - x.s);
  }

  /* ---------------------------------------------------------
     Navigation + actions on the real dashboard
     --------------------------------------------------------- */
  const VIEWS = [
    { id: "view-dashboard", re: /dashboard|home|overview|डैशबोर्ड|मुख्य/, n: { en: "Dashboard", hi: "डैशबोर्ड", mr: "डॅशबोर्ड" } },
    { id: "view-gis-map", re: /\bmap\b|gis|नक्शा|नकाशा|नक्शे|मैप/, n: { en: "GIS Risk Map", hi: "GIS जोखिम नक्शा", mr: "GIS धोका नकाशा" } },
    { id: "view-vision", re: /vision|cctv|camera|कैमरा|कॅमेरा/, n: { en: "AI Site Vision", hi: "AI साइट विज़न", mr: "AI साइट व्हिजन" } },
    { id: "view-climate", re: /climate|forecast|हवामान अंदाज|जलवायु/, n: { en: "Climate Intelligence", hi: "क्लाइमेट इंटेलिजेंस", mr: "क्लायमेट इंटेलिजन्स" } },
    { id: "view-sites", re: /sites?\b|portfolio|projects?\b|साइट्स|प्रोजेक्ट/, n: { en: "Project Sites", hi: "प्रोजेक्ट साइट्स", mr: "प्रोजेक्ट साइट्स" } },
    { id: "view-activities", re: /activit|matrix|गतिविधि|कामे/, n: { en: "Activity Risk Matrix", hi: "गतिविधि जोखिम मैट्रिक्स", mr: "कृती धोका मॅट्रिक्स" } },
    { id: "view-sensors", re: /sensor|iot|सेंसर|सेन्सर/, n: { en: "Site Monitoring IoT", hi: "साइट मॉनिटरिंग IoT", mr: "साइट मॉनिटरिंग IoT" } },
    { id: "view-safety", re: /safety|wbgt|heat|worker|सुरक्षा|सुरक्षित/, n: { en: "Worker Safety Index", hi: "श्रमिक सुरक्षा सूचकांक", mr: "कामगार सुरक्षा निर्देशांक" } },
    { id: "view-scheduling", re: /schedul|शेड्यूल|वेळापत्रक/, n: { en: "Smart Scheduling", hi: "स्मार्ट शेड्यूलिंग", mr: "स्मार्ट शेड्युलिंग" } },
    { id: "view-estimator", re: /estimator|cost|loss|खर्च|नुकसान|खर्च/, n: { en: "Delay & Cost Estimator", hi: "देरी और लागत अनुमान", mr: "विलंब व खर्च अंदाज" } },
    { id: "view-reports", re: /report|audit|alert|history|रिपोर्ट|अलर्ट/, n: { en: "Audit & Alert History", hi: "ऑडिट और अलर्ट इतिहास", mr: "ऑडिट व अलर्ट इतिहास" } },
    { id: "view-accounts", re: /account|profile|role|user|persona|खाता|प्रोफाइल/, n: { en: "User & Role Access", hi: "उपयोगकर्ता और भूमिका", mr: "वापरकर्ता व भूमिका" } },
  ];

  function gotoView(id) {
    const el = document.querySelector('.nav-item[data-view="' + id + '"]');
    if (!el) return false;
    el.click();
    // On mobile the sidebar is an overlay: close the chat panel so the page is visible
    if (window.innerWidth < 640) togglePanel(false);
    return true;
  }

  function switchSite(key) {
    if (typeof window.switchActiveSite === "function" && G.sites()[key]) {
      window.switchActiveSite(key);
      return true;
    }
    return false;
  }

  const SITE_WORDS = [
    { key: "Pune", re: /pune|पुणे/i },
    { key: "Mumbai", re: /mumbai|bombay|मुंबई|मुम्बई/i },
    { key: "Nashik", re: /nashik|nasik|नाशिक|नासिक/i },
    { key: "Aurangabad", re: /aurangabad|sambhajinagar|संभाजीनगर|औरंगाबाद/i },
  ];

  const ACT_WORDS = {
    excavation: /excavat|trench|\bdig\b|digging|khudai|खुदाई|उत्खनन/i,
    foundation: /foundation|piling|raft|neev|नींव|पाया/i,
    concrete: /concrete|pour|slab|cement|कंक्रीट|काँक्रीट/i,
    crane: /crane|rigging|hoist|lifting|क्रेन/i,
    roofing: /roof|cladding|छत|छप्पर/i,
    road: /\broad\b|paving|bitumen|asphalt|sadak|सड़क|रस्ता/i,
    steel: /steel|erection|scaffold|high.?altitude|स्टील/i,
    transport: /haul|transit|mixer|transport|truck|ट्रक|वाहतूक/i,
  };

  /* ---------------------------------------------------------
     Weather what-if parsing  ("simulate rain 120 wind 60")
     --------------------------------------------------------- */
  function parseWeatherChanges(t) {
    const ch = {};
    const num = (re) => {
      const m = t.match(re);
      return m ? Number(m[m.length - 1]) : null;
    };
    const rain = num(/(?:rain(?:fall)?|barish|बारिश|पाऊस|वर्षा)\D{0,14}?(\d{1,3})/i) ?? num(/(\d{1,3})\s*mm/i);
    const wind = num(/(?:wind|hawa|हवा|वारा)\D{0,14}?(\d{1,3})/i) ?? num(/(\d{1,3})\s*(?:km\/?h|kmph)/i);
    const temp = num(/(?:temp(?:erature)?|tapman|तापमान|तापमान)\D{0,14}?(\d{1,2})/i) ?? num(/(\d{2})\s*(?:°|deg|degree|celsius)/i);
    const hum = num(/(?:humidity|नमी|आर्द्रता|ओलावा)\D{0,14}?(\d{1,3})/i);
    if (rain !== null) ch.rainfall = clamp(rain, 0, 200);
    if (wind !== null) ch.windSpeed = clamp(wind, 0, 120);
    if (temp !== null) ch.temperature = clamp(temp, 10, 50);
    if (hum !== null) ch.humidity = clamp(hum, 10, 100);
    return Object.keys(ch).length ? ch : null;
  }

  const PRESETS = [
    { re: /heavy rain|storm|cyclone|downpour|cloudburst|तूफान|तूफ़ान|वादळ|मुसळधार|भारी बारिश/i, v: { rainfall: 120, windSpeed: 60, humidity: 95, temperature: 27 }, n: { en: "heavy storm", hi: "भारी तूफान", mr: "भीषण वादळ" } },
    { re: /heat ?wave|extreme heat|garmi|गर्मी|उष्णतेची लाट|लू/i, v: { rainfall: 0, windSpeed: 10, humidity: 55, temperature: 43 }, n: { en: "heatwave", hi: "लू / हीटवेव", mr: "उष्णतेची लाट" } },
    { re: /clear|sunny|dry weather|no rain|saaf|साफ|स्वच्छ|कोरडे/i, v: { rainfall: 0, windSpeed: 12, humidity: 50, temperature: 30 }, n: { en: "clear weather", hi: "साफ मौसम", mr: "स्वच्छ हवामान" } },
    { re: /drizzle|light rain|halki|हल्की|हलका/i, v: { rainfall: 20, windSpeed: 18, humidity: 75, temperature: 28 }, n: { en: "light rain", hi: "हल्की बारिश", mr: "हलका पाऊस" } },
    { re: /monsoon|मानसून/i, v: { rainfall: 75, windSpeed: 35, humidity: 90, temperature: 28 }, n: { en: "monsoon spell", hi: "मानसून", mr: "मान्सून" } },
  ];

  function applyWeather(vals) {
    const w = G.weather();
    Object.assign(w, vals);
    if (typeof updateSimulatorSliders === "function") updateSimulatorSliders();
    if (typeof refreshAllModules === "function") refreshAllModules();
    if (typeof drawRiskBuffer === "function" && typeof gisMap !== "undefined" && gisMap) drawRiskBuffer();
  }

  /* ---------------------------------------------------------
     The reply builders (each returns {text, chips?, actions?})
     --------------------------------------------------------- */
  const CHIP = {
    status: { l: { en: "📊 Current risk", hi: "📊 मौजूदा जोखिम", mr: "📊 सध्याचा धोका" }, q: "current risk status" },
    stop: { l: { en: "🛑 Which work to stop?", hi: "🛑 कौन सा काम रोकें?", mr: "🛑 कोणते काम थांबवू?" }, q: "which activities should stop" },
    heat: { l: { en: "🦺 Worker heat safety", hi: "🦺 श्रमिक गर्मी सुरक्षा", mr: "🦺 कामगार उष्णता सुरक्षा" }, q: "worker heat safety" },
    cost: { l: { en: "💰 Delay cost", hi: "💰 देरी का नुकसान", mr: "💰 विलंबाचे नुकसान" }, q: "delay and cost" },
    map: { l: { en: "🗺️ Open map", hi: "🗺️ नक्शा खोलें", mr: "🗺️ नकाशा उघडा" }, q: "open map" },
    storm: { l: { en: "⛈️ What if heavy storm?", hi: "⛈️ तूफान आए तो?", mr: "⛈️ वादळ आले तर?" }, q: "simulate heavy storm" },
    reset: { l: { en: "↩️ Reset weather", hi: "↩️ मौसम रीसेट", mr: "↩️ हवामान रीसेट" }, q: "reset weather" },
    sensors: { l: { en: "📡 Sensors", hi: "📡 सेंसर", mr: "📡 सेन्सर" }, q: "sensor status" },
    alerts: { l: { en: "🚨 Alerts", hi: "🚨 अलर्ट", mr: "🚨 अलर्ट" }, q: "active alerts" },
    schedule: { l: { en: "🗓️ Smart schedule", hi: "🗓️ स्मार्ट शेड्यूल", mr: "🗓️ स्मार्ट शेड्यूल" }, q: "suggest schedule" },
    live: { l: { en: "🌐 Sync live weather", hi: "🌐 लाइव मौसम", mr: "🌐 लाइव्ह हवामान" }, q: "sync live weather" },
    pdf: { l: { en: "📄 Export PDF", hi: "📄 PDF रिपोर्ट", mr: "📄 PDF अहवाल" }, q: "export pdf report" },
    weather: { l: { en: "🌦️ Weather now", hi: "🌦️ अभी का मौसम", mr: "🌦️ सध्याचे हवामान" }, q: "current weather" },
  };
  const chips = (...ks) => ks.map((k) => CHIP[k]);

  function heatLine() {
    const wbgt = computeWbgt();
    if (wbgt < 29) return "";
    return "\n" + pick({
      en: `🌡️ Heat-stress warning: WBGT **${wbgt}** — enforce shaded rest cycles (ask "worker heat safety").`,
      hi: `🌡️ गर्मी चेतावनी: WBGT **${wbgt}** — छाया में आराम चक्र लागू करें ("गर्मी सुरक्षा" पूछें)।`,
      mr: `🌡️ उष्णता इशारा: WBGT **${wbgt}** — सावलीत विश्रांती चक्र लागू करा ("उष्णता सुरक्षा" विचारा).`,
    });
  }

  function r_help() {
    return {
      text: pick({
        en: "I'm your **ClimateBuild Site Assistant**. I read the live dashboard and can also take actions. Try:\n• **Risk:** \"current risk\", \"which work should stop?\", \"is crane safe?\"\n• **People:** \"worker heat safety\"\n• **Money:** \"delay cost\"\n• **What-if:** \"simulate rain 120 wind 60\", \"what if heavy storm\"\n• **Sites:** \"switch to Mumbai\"\n• **Go to:** \"open map\", \"open sensors\"\n• **Do:** \"sync live weather\", \"export pdf\", \"Hindi\"",
        hi: "मैं आपका **ClimateBuild साइट असिस्टेंट** हूँ। मैं लाइव डैशबोर्ड पढ़ता हूँ और काम भी कर सकता हूँ। पूछें:\n• **जोखिम:** \"मौजूदा जोखिम\", \"कौन सा काम रोकें?\", \"क्रेन सुरक्षित है?\"\n• **श्रमिक:** \"गर्मी सुरक्षा\"\n• **खर्च:** \"देरी का नुकसान\"\n• **अगर-तो:** \"simulate rain 120 wind 60\", \"तूफान आए तो\"\n• **साइट:** \"Mumbai पर जाओ\"\n• **खोलें:** \"नक्शा खोलो\", \"सेंसर खोलो\"\n• **काम:** \"live weather sync\", \"pdf export\"",
        mr: "मी तुमचा **ClimateBuild साइट असिस्टंट** आहे. मी लाइव्ह डॅशबोर्ड वाचतो आणि कृतीही करतो. विचारा:\n• **धोका:** \"सध्याचा धोका\", \"कोणते काम थांबवू?\", \"क्रेन सुरक्षित आहे का?\"\n• **कामगार:** \"उष्णता सुरक्षा\"\n• **खर्च:** \"विलंबाचे नुकसान\"\n• **जर-तर:** \"simulate rain 120 wind 60\", \"वादळ आले तर\"\n• **साइट:** \"Mumbai वर जा\"\n• **उघडा:** \"नकाशा उघडा\"\n• **कृती:** \"live weather sync\", \"pdf export\"",
      }),
      chips: chips("status", "stop", "heat", "cost", "storm"),
    };
  }

  function r_greet() {
    const s = G.site(), score = G.overall();
    return {
      text: pick({
        en: `Hello! 👋 I'm monitoring **${s.name}**. Overall risk is **${score}/100 (${levelText(score)})**. What would you like to know?`,
        hi: `नमस्ते! 👋 मैं **${s.name}** की निगरानी कर रहा हूँ। कुल जोखिम **${score}/100 (${levelText(score)})** है। आप क्या जानना चाहेंगे?`,
        mr: `नमस्कार! 👋 मी **${s.name}** वर लक्ष ठेवतो आहे. एकूण धोका **${score}/100 (${levelText(score)})** आहे. तुम्हाला काय जाणून घ्यायचे आहे?`,
      }),
      chips: chips("status", "stop", "heat", "cost", "map"),
    };
  }

  function r_status() {
    const s = G.site(), w = G.weather(), score = G.overall();
    const top = rankedActivities().slice(0, 3);
    const delay = (score / 100) * 3.5;
    const loss = delay * (s.dailyCost || 0);
    const topTxt = top.map((x) => `• ${x.a.name} — **${x.s}%** ${statusOf(x.s).icon} ${pick(statusOf(x.s).t)}`).join("\n");
    const advice =
      score >= 75
        ? pick({ en: "Recommendation: suspend exposed outdoor work and move crews to safe zones.", hi: "सुझाव: खुले में चल रहा काम रोकें और श्रमिकों को सुरक्षित जगह ले जाएं।", mr: "सूचना: उघड्यावरील काम थांबवा आणि कामगारांना सुरक्षित जागी हलवा." })
        : score >= 60
        ? pick({ en: "Recommendation: restrict high-exposure tasks and add supervision.", hi: "सुझाव: ज्यादा जोखिम वाले काम सीमित करें और निगरानी बढ़ाएं।", mr: "सूचना: जास्त धोक्याची कामे मर्यादित करा आणि देखरेख वाढवा." })
        : score >= 35
        ? pick({ en: "Recommendation: proceed with caution and keep watching the forecast.", hi: "सुझाव: सावधानी से काम जारी रखें और पूर्वानुमान देखते रहें।", mr: "सूचना: सावधगिरीने काम सुरू ठेवा आणि अंदाजावर लक्ष ठेवा." })
        : pick({ en: "Recommendation: conditions are good — normal operations can continue.", hi: "सुझाव: स्थिति अच्छी है — सामान्य काम जारी रखें।", mr: "सूचना: परिस्थिती चांगली आहे — नेहमीप्रमाणे काम सुरू ठेवा." });
    return {
      text: pick({
        en: `**${s.name}** — overall risk **${score}/100 (${levelText(score)})**\n🌧️ ${w.rainfall} mm rain • 💨 ${w.windSpeed} km/h • 🌡️ ${w.temperature}°C • 💧 ${w.humidity}%\n⏳ Expected delay: **${delay.toFixed(1)} days** (≈ ${lakhs(loss)})\n\n**Most exposed work:**\n${topTxt}\n\n${advice}${heatLine()}`,
        hi: `**${s.name}** — कुल जोखिम **${score}/100 (${levelText(score)})**\n🌧️ ${w.rainfall} mm बारिश • 💨 ${w.windSpeed} km/h • 🌡️ ${w.temperature}°C • 💧 ${w.humidity}%\n⏳ संभावित देरी: **${delay.toFixed(1)} दिन** (≈ ${lakhs(loss)})\n\n**सबसे ज्यादा प्रभावित काम:**\n${topTxt}\n\n${advice}${heatLine()}`,
        mr: `**${s.name}** — एकूण धोका **${score}/100 (${levelText(score)})**\n🌧️ ${w.rainfall} mm पाऊस • 💨 ${w.windSpeed} km/h • 🌡️ ${w.temperature}°C • 💧 ${w.humidity}%\n⏳ अपेक्षित विलंब: **${delay.toFixed(1)} दिवस** (≈ ${lakhs(loss)})\n\n**सर्वाधिक प्रभावित कामे:**\n${topTxt}\n\n${advice}${heatLine()}`,
      }),
      chips: chips("stop", "heat", "cost", "storm", "map"),
    };
  }

  function r_activities() {
    const list = rankedActivities();
    const groups = { STOP: [], RESTRICT: [], CAUTION: [], GO: [] };
    list.forEach((x) => groups[statusOf(x.s).k].push(x));
    const line = (k) => {
      if (!groups[k].length) return "";
      const st = statusOf(k === "STOP" ? 90 : k === "RESTRICT" ? 65 : k === "CAUTION" ? 40 : 10);
      return `${st.icon} **${pick(st.t)}:** ` + groups[k].map((x) => `${x.a.name} (${x.s}%)`).join(", ");
    };
    const body = ["STOP", "RESTRICT", "CAUTION", "GO"].map(line).filter(Boolean).join("\n\n");
    return {
      text: pick({ en: `Work status for **${G.site().name}** right now:\n\n${body}`, hi: `**${G.site().name}** पर अभी कामों की स्थिति:\n\n${body}`, mr: `**${G.site().name}** वर सध्या कामांची स्थिती:\n\n${body}` }),
      chips: chips("status", "heat", "schedule", "storm"),
      actions: [{ l: { en: "Open Activity Matrix", hi: "मैट्रिक्स खोलें", mr: "मॅट्रिक्स उघडा" }, f: () => gotoView("view-activities") }],
    };
  }

  function r_oneActivity(id) {
    const a = G.acts().find((x) => x.id === id);
    if (!a) return r_activities();
    const s = G.actRisk(a), st = statusOf(s);
    return {
      text: pick({
        en: `**${a.name}** — risk **${s}%** ${st.icon} ${pick(st.t)}\nMain hazard: ${a.hazardDriver}\n**SOP:** ${a.sop}`,
        hi: `**${a.name}** — जोखिम **${s}%** ${st.icon} ${pick(st.t)}\nमुख्य खतरा: ${a.hazardDriver}\n**SOP:** ${a.sop}`,
        mr: `**${a.name}** — धोका **${s}%** ${st.icon} ${pick(st.t)}\nमुख्य धोका: ${a.hazardDriver}\n**SOP:** ${a.sop}`,
      }),
      chips: chips("stop", "status", "storm"),
    };
  }

  function r_heat() {
    const w = G.weather(), wbgt = computeWbgt();
    let lvl, tip;
    if (wbgt >= 32) {
      lvl = { en: "🔴 RED — extreme heat-stroke danger", hi: "🔴 लाल — हीट-स्ट्रोक का गंभीर खतरा", mr: "🔴 लाल — उष्माघाताचा गंभीर धोका" };
      tip = { en: "Stop heavy outdoor work. Mandatory shaded rest, ORS and water every 15 min.", hi: "भारी बाहरी काम रोकें। छाया में आराम, ORS और हर 15 मिनट पानी अनिवार्य।", mr: "जड बाह्य काम थांबवा. सावलीत विश्रांती, ORS आणि दर 15 मिनिटांनी पाणी बंधनकारक." };
    } else if (wbgt >= 29) {
      lvl = { en: "🟠 ORANGE — high heat risk", hi: "🟠 नारंगी — गर्मी का उच्च जोखिम", mr: "🟠 नारिंगी — उष्णतेचा उच्च धोका" };
      tip = { en: "30 min work / 30 min rest cycles, shaded rest area, drinking water every 20 min.", hi: "30 मिनट काम / 30 मिनट आराम, छायादार विश्राम स्थान, हर 20 मिनट पानी।", mr: "30 मिनिटे काम / 30 मिनिटे विश्रांती, सावलीची जागा, दर 20 मिनिटांनी पाणी." };
    } else if (wbgt >= 26) {
      lvl = { en: "🟡 YELLOW — moderate caution", hi: "🟡 पीला — सामान्य सावधानी", mr: "🟡 पिवळा — मध्यम सावधगिरी" };
      tip = { en: "Keep water available, watch new workers, short breaks every hour.", hi: "पानी उपलब्ध रखें, नए श्रमिकों पर नजर रखें, हर घंटे छोटा ब्रेक।", mr: "पाणी उपलब्ध ठेवा, नवीन कामगारांवर लक्ष ठेवा, दर तासाला छोटा ब्रेक." };
    } else {
      lvl = { en: "🟢 GREEN — safe conditions", hi: "🟢 हरा — सुरक्षित स्थिति", mr: "🟢 हिरवा — सुरक्षित परिस्थिती" };
      tip = { en: "Normal work. Keep standard hydration.", hi: "सामान्य काम। सामान्य रूप से पानी पीते रहें।", mr: "नेहमीप्रमाणे काम. नेहमीप्रमाणे पाणी प्यावे." };
    }
    const extra =
      w.windSpeed >= 40
        ? "\n" + pick({ en: "⚠️ Wind is also high — keep workers off elevated platforms and scaffolds.", hi: "⚠️ हवा भी तेज है — श्रमिकों को ऊँचे प्लेटफॉर्म/स्कैफोल्ड से दूर रखें।", mr: "⚠️ वाराही जोरदार आहे — कामगारांना उंच प्लॅटफॉर्म/स्कॅफोल्डपासून दूर ठेवा." })
        : w.rainfall >= 60
        ? "\n" + pick({ en: "⚠️ Heavy rain — watch for slips and electrical hazards.", hi: "⚠️ भारी बारिश — फिसलन और बिजली के खतरे से सावधान।", mr: "⚠️ जोरदार पाऊस — घसरण आणि विजेच्या धोक्यापासून सावध." })
        : "";
    return {
      text: pick({
        en: `**Worker heat safety (WBGT)**\n🌡️ ${w.temperature}°C • 💧 ${w.humidity}% → WBGT **${wbgt}**\n${pick(lvl)}\n${pick(tip)}${extra}`,
        hi: `**श्रमिक गर्मी सुरक्षा (WBGT)**\n🌡️ ${w.temperature}°C • 💧 ${w.humidity}% → WBGT **${wbgt}**\n${pick(lvl)}\n${pick(tip)}${extra}`,
        mr: `**कामगार उष्णता सुरक्षा (WBGT)**\n🌡️ ${w.temperature}°C • 💧 ${w.humidity}% → WBGT **${wbgt}**\n${pick(lvl)}\n${pick(tip)}${extra}`,
      }),
      chips: chips("status", "stop", "storm", "reset"),
      actions: [{ l: { en: "Open Worker Safety", hi: "श्रमिक सुरक्षा खोलें", mr: "कामगार सुरक्षा उघडा" }, f: () => gotoView("view-safety") }],
    };
  }

  function r_cost() {
    const s = G.site(), score = G.overall();
    const delay = (score / 100) * 3.5;
    const loss = delay * (s.dailyCost || 0);
    const worst = rankedActivities()[0];
    return {
      text: pick({
        en: `**Delay & cost estimate — ${s.name}**\n⏳ Expected delay: **${delay.toFixed(1)} days**\n💰 Estimated loss: **${lakhs(loss)}** (daily burn ${lakhs(s.dailyCost || 0)})\n${worst ? `Biggest driver: ${worst.a.name} (${worst.s}%).\n` : ""}Resequencing outdoor work into dry windows is the cheapest way to cut this.`,
        hi: `**देरी और लागत अनुमान — ${s.name}**\n⏳ संभावित देरी: **${delay.toFixed(1)} दिन**\n💰 अनुमानित नुकसान: **${lakhs(loss)}** (रोज़ का खर्च ${lakhs(s.dailyCost || 0)})\n${worst ? `सबसे बड़ा कारण: ${worst.a.name} (${worst.s}%)।\n` : ""}बाहरी काम को सूखे समय में बदलना नुकसान घटाने का सबसे सस्ता तरीका है।`,
        mr: `**विलंब व खर्च अंदाज — ${s.name}**\n⏳ अपेक्षित विलंब: **${delay.toFixed(1)} दिवस**\n💰 अंदाजित नुकसान: **${lakhs(loss)}** (दैनिक खर्च ${lakhs(s.dailyCost || 0)})\n${worst ? `सर्वात मोठे कारण: ${worst.a.name} (${worst.s}%).\n` : ""}बाह्य कामे कोरड्या वेळेत हलवणे हा नुकसान कमी करण्याचा स्वस्त मार्ग आहे.`,
      }),
      chips: chips("schedule", "storm", "pdf", "status"),
      actions: [{ l: { en: "Open Cost Estimator", hi: "लागत अनुमान खोलें", mr: "खर्च अंदाज उघडा" }, f: () => gotoView("view-estimator") }],
    };
  }

  function r_schedule() {
    const list = rankedActivities();
    const goNow = list.filter((x) => x.s < 35).map((x) => x.a.name);
    const careful = list.filter((x) => x.s >= 35 && x.s < 60).map((x) => x.a.name);
    const defer = list.filter((x) => x.s >= 60).map((x) => x.a.name);
    const parts = [];
    if (goNow.length) parts.push(`🟢 **${pick({ en: "Do now", hi: "अभी करें", mr: "आत्ता करा" })}:** ${goNow.join(", ")}`);
    if (careful.length) parts.push(`🟡 **${pick({ en: "With supervision", hi: "निगरानी के साथ", mr: "देखरेखीसह" })}:** ${careful.join(", ")}`);
    if (defer.length) parts.push(`🛑 **${pick({ en: "Move to a dry window", hi: "सूखे समय में टालें", mr: "कोरड्या वेळेत हलवा" })}:** ${defer.join(", ")}`);
    return {
      text: pick({
        en: "**Weather-aware schedule suggestion**\n" + parts.join("\n") + "\n\nTip: start with indoor / low-exposure tasks and keep heavy lifts and pours for the lowest-wind, no-rain hours.",
        hi: "**मौसम के अनुसार शेड्यूल सुझाव**\n" + parts.join("\n") + "\n\nसुझाव: पहले इनडोर/कम जोखिम वाले काम करें; भारी लिफ्ट और कंक्रीट कम हवा और बिना बारिश के समय के लिए रखें।",
        mr: "**हवामानानुसार वेळापत्रक सूचना**\n" + parts.join("\n") + "\n\nटीप: आधी इनडोअर/कमी धोक्याची कामे करा; जड उचल आणि काँक्रीट कमी वारा व पाऊस नसलेल्या वेळेसाठी ठेवा.",
      }),
      chips: chips("stop", "cost", "storm"),
      actions: [{ l: { en: "Open Smart Scheduling", hi: "स्मार्ट शेड्यूलिंग खोलें", mr: "स्मार्ट शेड्युलिंग उघडा" }, f: () => gotoView("view-scheduling") }],
    };
  }

  function r_weather() {
    const w = G.weather(), s = G.site();
    return {
      text: pick({
        en: `**Weather at ${s.name}** (simulator / synced values)\n🌧️ Rain: **${w.rainfall} mm**\n💨 Wind: **${w.windSpeed} km/h**\n🌡️ Temperature: **${w.temperature}°C**\n💧 Humidity: **${w.humidity}%**\n🌊 Flood risk: **${w.floodRisk}** • ⛰️ Landslide risk: **${w.landslideRisk}**`,
        hi: `**${s.name} का मौसम** (सिमुलेटर / सिंक किए मान)\n🌧️ बारिश: **${w.rainfall} mm**\n💨 हवा: **${w.windSpeed} km/h**\n🌡️ तापमान: **${w.temperature}°C**\n💧 नमी: **${w.humidity}%**\n🌊 बाढ़ जोखिम: **${w.floodRisk}** • ⛰️ भूस्खलन जोखिम: **${w.landslideRisk}**`,
        mr: `**${s.name} चे हवामान** (सिम्युलेटर / सिंक मूल्ये)\n🌧️ पाऊस: **${w.rainfall} mm**\n💨 वारा: **${w.windSpeed} km/h**\n🌡️ तापमान: **${w.temperature}°C**\n💧 आर्द्रता: **${w.humidity}%**\n🌊 पुराचा धोका: **${w.floodRisk}** • ⛰️ भूस्खलन धोका: **${w.landslideRisk}**`,
      }),
      chips: chips("live", "storm", "reset", "status"),
    };
  }

  function r_sensors() {
    const list = G.sensors();
    if (!list.length) return { text: pick({ en: "No sensor data available right now.", hi: "अभी कोई सेंसर डेटा उपलब्ध नहीं है।", mr: "सध्या सेन्सर डेटा उपलब्ध नाही." }) };
    const over = list.filter((x) => Number(x.value) >= Number(x.threshold));
    const rows = list.map((x) => {
      const bad = Number(x.value) >= Number(x.threshold);
      return `${bad ? "🔴" : "🟢"} ${x.id}: **${x.value} ${x.unit}** / ${x.threshold} ${x.unit} — ${x.location}`;
    }).join("\n");
    return {
      text: pick({
        en: `**IoT sensors:** ${over.length ? `⚠️ ${over.length} above threshold` : "✅ all within limits"}\n${rows}`,
        hi: `**IoT सेंसर:** ${over.length ? `⚠️ ${over.length} सीमा से ऊपर` : "✅ सब सीमा में"}\n${rows}`,
        mr: `**IoT सेन्सर:** ${over.length ? `⚠️ ${over.length} मर्यादेपेक्षा जास्त` : "✅ सर्व मर्यादेत"}\n${rows}`,
      }),
      chips: chips("alerts", "status", "stop"),
      actions: [{ l: { en: "Open Sensors", hi: "सेंसर खोलें", mr: "सेन्सर उघडा" }, f: () => gotoView("view-sensors") }],
    };
  }

  function r_alerts() {
    const all = G.alerts();
    if (!all.length) {
      return {
        text: pick({
          en: "I can't see any alerts yet. Open **Audit & Alert History** once so they load (the backend must be running).",
          hi: "अभी कोई अलर्ट नहीं दिख रहा। एक बार **ऑडिट और अलर्ट इतिहास** खोलें (बैकएंड चालू होना चाहिए)।",
          mr: "अजून एकही अलर्ट दिसत नाही. एकदा **ऑडिट व अलर्ट इतिहास** उघडा (बॅकएंड सुरू असणे आवश्यक)।",
        }),
        actions: [{ l: { en: "Open Alert History", hi: "अलर्ट इतिहास खोलें", mr: "अलर्ट इतिहास उघडा" }, f: () => gotoView("view-reports") }],
      };
    }
    const active = all.filter((a) => String(a.status).toUpperCase() === "ACTIVE");
    const show = (active.length ? active : all).slice(0, 4);
    const rows = show.map((a) => `• **${a.severity}** — ${a.category} (${a.site})\n  ${a.details}`).join("\n");
    return {
      text: pick({
        en: `**Alerts:** ${active.length} active out of ${all.length} total.\n${rows}`,
        hi: `**अलर्ट:** कुल ${all.length} में से ${active.length} सक्रिय।\n${rows}`,
        mr: `**अलर्ट:** एकूण ${all.length} पैकी ${active.length} सक्रिय.\n${rows}`,
      }),
      chips: chips("status", "sensors", "pdf"),
      actions: [{ l: { en: "Open Alert History", hi: "अलर्ट इतिहास खोलें", mr: "अलर्ट इतिहास उघडा" }, f: () => gotoView("view-reports") }],
    };
  }

  function r_simulate(vals, label) {
    const before = G.overall();
    applyWeather(vals);
    const after = G.overall();
    const diff = after - before;
    const arrow = diff > 0 ? "📈" : diff < 0 ? "📉" : "➡️";
    const names = { rainfall: "mm rain", windSpeed: "km/h wind", temperature: "°C", humidity: "% humidity" };
    const setTxt = Object.keys(vals).map((k) => `${vals[k]} ${names[k]}`).join(", ");
    const top = rankedActivities().slice(0, 3).map((x) => `• ${x.a.name} — ${x.s}% ${statusOf(x.s).icon}`).join("\n");
    return {
      text: pick({
        en: `✅ Scenario applied${label ? ` (**${label}**)` : ""}: ${setTxt}.\n${arrow} Overall risk **${before} → ${after}** (${levelText(after)}).\nMost exposed now:\n${top}\n\nThe dashboard and map have been updated.${heatLine()}`,
        hi: `✅ परिदृश्य लागू${label ? ` (**${label}**)` : ""}: ${setTxt}।\n${arrow} कुल जोखिम **${before} → ${after}** (${levelText(after)})।\nअब सबसे ज्यादा प्रभावित:\n${top}\n\nडैशबोर्ड और नक्शा अपडेट हो गए हैं।${heatLine()}`,
        mr: `✅ परिस्थिती लागू${label ? ` (**${label}**)` : ""}: ${setTxt}.\n${arrow} एकूण धोका **${before} → ${after}** (${levelText(after)}).\nआता सर्वाधिक प्रभावित:\n${top}\n\nडॅशबोर्ड आणि नकाशा अद्ययावत झाले.${heatLine()}`,
      }),
      chips: chips("stop", "heat", "cost", "reset"),
    };
  }

  function r_reset() {
    const s = G.site();
    applyWeather({ rainfall: s.baseRain, windSpeed: s.baseWind, temperature: s.baseTemp, humidity: s.baseHum });
    return {
      text: pick({
        en: `↩️ Weather reset to the default for **${s.name}**. Overall risk is now **${G.overall()}/100**.`,
        hi: `↩️ मौसम **${s.name}** के डिफ़ॉल्ट पर रीसेट। कुल जोखिम अब **${G.overall()}/100** है।`,
        mr: `↩️ हवामान **${s.name}** च्या डिफॉल्टवर रीसेट. एकूण धोका आता **${G.overall()}/100** आहे.`,
      }),
      chips: chips("status", "storm", "heat"),
    };
  }

  function r_switchSite(key) {
    const ok = switchSite(key);
    const s = G.sites()[key];
    if (!ok || !s) return null;
    return { name: s.name };
  }

  function r_live() {
    const s = G.site();
    if (typeof fetchLiveOpenMeteoWeather === "function") {
      fetchLiveOpenMeteoWeather(s.coords[0], s.coords[1]);
      return {
        text: pick({
          en: `🌐 Fetching live data from Open-Meteo for **${s.name}**… the dashboard updates when it arrives. Ask "current risk" in a few seconds.`,
          hi: `🌐 **${s.name}** के लिए Open-Meteo से लाइव डेटा ला रहा हूँ… आते ही डैशबोर्ड अपडेट होगा। कुछ सेकंड बाद "मौजूदा जोखिम" पूछें।`,
          mr: `🌐 **${s.name}** साठी Open-Meteo वरून लाइव्ह डेटा आणत आहे… येताच डॅशबोर्ड अद्ययावत होईल. काही सेकंदांनी "सध्याचा धोका" विचारा.`,
        }),
        chips: chips("status", "weather"),
      };
    }
    return { text: pick({ en: "Live weather sync is not available.", hi: "लाइव मौसम सिंक उपलब्ध नहीं है।", mr: "लाइव्ह हवामान सिंक उपलब्ध नाही." }) };
  }

  function r_export(kind) {
    try {
      if (kind === "csv" && typeof exportCsvAuditLog === "function") exportCsvAuditLog();
      else if (typeof exportPdfRiskReport === "function") exportPdfRiskReport();
      else throw new Error("no export");
      return {
        text: pick({
          en: kind === "csv" ? "📥 CSV audit log download started." : "📄 PDF risk report is being generated — check your downloads.",
          hi: kind === "csv" ? "📥 CSV ऑडिट लॉग डाउनलोड शुरू हो गया।" : "📄 PDF जोखिम रिपोर्ट बन रही है — डाउनलोड देखें।",
          mr: kind === "csv" ? "📥 CSV ऑडिट लॉग डाउनलोड सुरू झाले." : "📄 PDF धोका अहवाल तयार होत आहे — डाउनलोड तपासा.",
        }),
      };
    } catch (e) {
      return {
        text: pick({
          en: "⚠️ Could not create the export (the PDF library may not have loaded — check internet and try again).",
          hi: "⚠️ एक्सपोर्ट नहीं बन सका (PDF लाइब्रेरी लोड न हुई हो — इंटरनेट देखकर फिर कोशिश करें)।",
          mr: "⚠️ एक्सपोर्ट तयार झाले नाही (PDF लायब्ररी लोड झाली नसेल — इंटरनेट तपासून पुन्हा प्रयत्न करा)।",
        }),
      };
    }
  }

  function r_nav(view) {
    const ok = gotoView(view.id);
    return {
      text: ok
        ? pick({ en: `Opened **${pick(view.n)}** ✅`, hi: `**${pick(view.n)}** खोल दिया ✅`, mr: `**${pick(view.n)}** उघडले ✅` })
        : pick({ en: "I couldn't find that screen.", hi: "वह स्क्रीन नहीं मिली।", mr: "ती स्क्रीन सापडली नाही." }),
      chips: chips("status", "stop", "storm"),
    };
  }

  function r_language(code) {
    if (typeof window.setLanguage === "function") window.setLanguage(code);
    L = code;
    return {
      text: { en: "Language switched to **English** ✅", hi: "भाषा **हिंदी** में बदल दी ✅", mr: "भाषा **मराठी** मध्ये बदलली ✅" }[code],
      chips: chips("status", "stop", "heat"),
    };
  }

  function r_thanks() {
    return { text: pick({ en: "You're welcome! 🙌 Stay safe on site.", hi: "आपका स्वागत है! 🙌 साइट पर सुरक्षित रहें।", mr: "तुमचे स्वागत आहे! 🙌 साइटवर सुरक्षित रहा." }), chips: chips("status", "stop") };
  }

  function r_who() {
    return {
      text: pick({
        en: "I'm the **ClimateBuild AI Site Assistant** — a rule-based expert on this dashboard's weather-risk model. I read live values (risk, sensors, alerts) and can run what-ifs or open screens for you.",
        hi: "मैं **ClimateBuild AI साइट असिस्टेंट** हूँ — इस डैशबोर्ड के मौसम-जोखिम मॉडल का नियम-आधारित सहायक। मैं लाइव मान (जोखिम, सेंसर, अलर्ट) पढ़ता हूँ और what-if चला सकता/सकती हूँ।",
        mr: "मी **ClimateBuild AI साइट असिस्टंट** आहे — या डॅशबोर्डच्या हवामान-धोका मॉडेलचा नियम-आधारित सहाय्यक. मी लाइव्ह मूल्ये (धोका, सेन्सर, अलर्ट) वाचतो आणि what-if चालवू शकतो.",
      }),
      chips: chips("status", "stop", "heat"),
    };
  }

  function r_fallback() {
    return {
      text: pick({
        en: "I didn't fully get that 🤔 — I can answer about **risk, which work to stop, worker heat safety, delay cost, weather, sensors, alerts, schedule**, run **what-ifs** (\"simulate rain 120\") and **open screens** (\"open map\"). Pick one below or type \"help\".",
        hi: "यह मैं पूरी तरह समझ नहीं पाया 🤔 — मैं **जोखिम, कौन सा काम रोकें, श्रमिक गर्मी सुरक्षा, देरी की लागत, मौसम, सेंसर, अलर्ट, शेड्यूल** बता सकता हूँ, **what-if** चला सकता हूँ (\"simulate rain 120\") और **स्क्रीन खोल** सकता हूँ (\"नक्शा खोलो\")। नीचे से चुनें या \"help\" लिखें।",
        mr: "हे मला पूर्ण समजले नाही 🤔 — मी **धोका, कोणते काम थांबवू, कामगार उष्णता सुरक्षा, विलंब खर्च, हवामान, सेन्सर, अलर्ट, वेळापत्रक** सांगू शकतो, **what-if** चालवू शकतो (\"simulate rain 120\") आणि **स्क्रीन उघडू** शकतो (\"नकाशा उघडा\"). खालून निवडा किंवा \"help\" लिहा.",
      }),
      chips: chips("status", "stop", "heat", "cost", "storm"),
    };
  }

  /* ---------------------------------------------------------
     Intent router
     --------------------------------------------------------- */
  const ctx = { lastActivity: null };

  function understand(raw) {
    const t = raw.trim();
    const lt = t.toLowerCase();

    // reply language: Devanagari typed -> Hindi/Marathi, otherwise follow the app language
    const appLang = G.lang();
    if (hasDevanagari(t)) L = appLang === "mr" || MARATHI_HINTS.test(t) ? "mr" : "hi";
    else L = appLang;

    const prefix = [];
    const wp = (rep) => {
      if (prefix.length && rep && rep.text) rep.text = prefix.join("\n") + "\n\n" + rep.text;
      return rep;
    };

    // 1) language switch
    const wantsLang = /(language|bhasha|भाषा|बोलो|बोला|में बोल|मध्ये बोल|\bin\b|\bme\b|\bmein\b)/i.test(lt) || /^(hindi|marathi|english|हिंदी|हिन्दी|मराठी)$/i.test(lt);
    if (wantsLang) {
      if (/hindi|हिंदी|हिन्दी/.test(lt)) return r_language("hi");
      if (/marathi|मराठी/.test(lt)) return r_language("mr");
      if (/english|अंग्रेज|इंग्रजी/.test(lt)) return r_language("en");
    }

    // 2) help / identity / smalltalk
    if (/^(help|\?|menu|options)\b|what can you do|how to use|madad|मदद|सहायता|मदत|क्या कर सकते|काय करू शकता/.test(lt)) return r_help();
    if (/who are you|your name|kaun ho|tum kaun|तुम कौन|आप कौन|तू कोण|तुम्ही कोण/.test(lt)) return r_who();
    if (/\b(thanks?|thank you|thx|shukriya|dhanyavaad|dhanyavad)\b|धन्यवाद|शुक्रिया|आभार/.test(lt)) return r_thanks();

    if (/^(hi+|hello+|hey+|hola|yo|namaste|namaskar|good (morning|afternoon|evening)|नमस्ते|नमस्कार|हेलो|हॅलो|हाय)[\s!.,]*(bhai|bro|sir|dost|assistant|ai|bot)?[\s!.]*$/i.test(lt)) return r_greet();

    // 3) weather what-if / reset
    const nums = parseWeatherChanges(t);
    const whatIfWord = /simulat|what ?if|scenario|suppose|imagine|\bif\b|agar|अगर|जर|तो क्या|तर काय|set |change |badal|laga/i.test(lt);
    if (/\b(reset|default|normal|original|wapas)\b|रीसेट|पूर्ववत/.test(lt) && /weather|sim|mausam|मौसम|हवामान|slider|reset/.test(lt)) return r_reset();
    if (nums) return r_simulate(nums, "");
    if (whatIfWord) {
      for (const p of PRESETS) if (p.re.test(lt)) return r_simulate(p.v, pick(p.n));
    }

    // 4) site switch (and continue answering about the new site)
    for (const sw of SITE_WORDS) {
      if (sw.re.test(lt)) {
        const act = /switch|change|select|go to|goto|show|set|open|move|dikha|chalo|jao|badlo|बदल|चला|जाओ|जा |दिखा|दाखव|निवड/i.test(lt);
        const only = lt.replace(/[^a-z\u0900-\u097F ]/g, "").trim().split(/\s+/).length <= 2;
        const differs = G.siteKey() !== sw.key;
        if (differs && (act || only || true)) {
          const info = r_switchSite(sw.key);
          if (info) prefix.push(pick({ en: `📍 Switched to **${info.name}**.`, hi: `📍 **${info.name}** पर स्विच किया।`, mr: `📍 **${info.name}** वर स्विच केले.` }));
        } else if (!differs && only) {
          prefix.push(pick({ en: `📍 **${G.site().name}** is already the active site.`, hi: `📍 **${G.site().name}** पहले से सक्रिय साइट है।`, mr: `📍 **${G.site().name}** आधीच सक्रिय साइट आहे.` }));
        }
        if (act && /map|नक्शा|नकाशा/.test(lt)) { gotoView("view-gis-map"); }
        if (only || (act && !/risk|status|score|जोखिम|धोका/.test(lt))) {
          return wp(r_status());
        }
        break;
      }
    }

    // 6) navigation
    const navVerb = /\b(open|go to|goto|take me|navigate|visit|launch|kholo|khol|khul)\b|खोल|उघड|चला|जाओ|दिखाओ.*(नक्शा|मैप)|दाखव.*नकाशा|show.*\bmap\b|\bmap\b.*(show|dikha)/i.test(lt);
    if (navVerb) {
      for (const v of VIEWS) if (v.re.test(lt)) {
        return wp(r_nav(v));
      }
    }

    // 5) exports / live weather
    if (/\bcsv\b/.test(lt)) return r_export("csv");
    if (/pdf|export|download|रिपोर्ट|अहवाल|report/.test(lt) && !/delay|cost|loss/.test(lt)) return r_export("pdf");
    if (/live|real.?time|open.?meteo|sync|actual|abhi ka mausam|लाइव|रियल/.test(lt) && /weather|mausam|मौसम|हवामान|sync|data|fetch|live|लाइव/.test(lt)) return r_live();

    // 7) single activity questions (also follow-ups like "and crane?")
    for (const id in ACT_WORDS) {
      if (ACT_WORDS[id].test(lt)) { ctx.lastActivity = id; return wp(r_oneActivity(id)); }
    }

    // 8) topic intents
    if (/stop|halt|band|रोक|थांब|which (work|task|activit)|activit|kaam|काम|कामे|safe to|allowed|continue|chalu|जारी|सुरू/.test(lt) && !/worker|heat|wbgt/.test(lt)) return wp(r_activities());
    if (/heat|wbgt|hot\b|garmi|गर्मी|उष्ण|worker|labou?r|mazdoor|मजदूर|श्रमिक|कामगार|hydrat|rest|\bors\b|sunstroke|हीट/.test(lt)) return wp(r_heat());
    if (/cost|loss|delay|nuksan|नुकसान|खर्च|kharcha|paisa|पैसा|budget|expens|₹|rupee|देरी|विलंब|late|financ|roi/.test(lt)) return wp(r_cost());
    if (/schedul|resequenc|reschedul|plan|timeline|best time|window|shift|शेड्यूल|वेळापत्रक|योजना|कब करें|केव्हा/.test(lt)) return wp(r_schedule());
    if (/sensor|iot|piezo|anemomet|inclinomet|telemetry|सेंसर|सेन्सर/.test(lt)) return wp(r_sensors());
    if (/alert|warning|alarm|incident|siren|चेतावनी|अलर्ट|सूचना|इशारा/.test(lt)) return wp(r_alerts());
    if (/weather|mausam|मौसम|हवामान|rain|barish|बारिश|पाऊस|wind|hawa|हवा|वारा|temperature|temp\b|tapman|तापमान|humidity|नमी|आर्द्रता|flood|बाढ़|पूर|forecast|landslide/.test(lt)) return wp(r_weather());
    if (/risk|score|status|situation|overall|summary|how (is|are)|halat|haal|kaisa|kya|स्थिति|जोखिम|धोका|हाल|कैसा|कसे|dashboard|site|साइट/.test(lt) || prefix.length) {
      return wp(r_status());
    }
    if (/^(bye|goodbye|see you|alvida|चलता हूँ|टाटा)/.test(lt)) return { text: pick({ en: "Goodbye! Stay safe. 👷", hi: "अलविदा! सुरक्षित रहें। 👷", mr: "निरोप! सुरक्षित रहा. 👷" }) };

    return r_fallback();
  }

  /* ---------------------------------------------------------
     UI
     --------------------------------------------------------- */
  const LABELS = {
    title: { en: "Site Assistant", hi: "साइट असिस्टेंट", mr: "साइट असिस्टंट" },
    online: { en: "Online", hi: "ऑनलाइन", mr: "ऑनलाइन" },
    placeholder: { en: "Ask about risk, work, heat, cost…", hi: "जोखिम, काम, गर्मी, खर्च के बारे में पूछें…", mr: "धोका, काम, उष्णता, खर्च याबद्दल विचारा…" },
    send: { en: "Send", hi: "भेजें", mr: "पाठवा" },
    clear: { en: "Clear chat", hi: "चैट साफ करें", mr: "चॅट साफ करा" },
    close: { en: "Close", hi: "बंद करें", mr: "बंद करा" },
    mic: { en: "Speak", hi: "बोलें", mr: "बोला" },
    ask: { en: "Ask AI", hi: "AI से पूछें", mr: "AI ला विचारा" },
  };
  const lbl = (k) => LABELS[k][G.lang()] || LABELS[k].en;

  let root, fab, panel, list, input, chipRow, statusEl, sendBtn, micBtn;
  let isOpen = false;
  let busy = false;
  const STORE_KEY = "climatebuild_chat_v1";
  let history = [];

  function saveHistory() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(history.slice(-40))); } catch (e) {}
  }
  function loadHistory() {
    try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || "[]"); } catch (e) { return []; }
  }

  function build() {
    root = document.createElement("div");
    root.id = "cbChat";
    root.setAttribute("data-no-i18n", "");
    root.innerHTML =
      '<button id="cbChatFab" type="button" aria-label="Open chat assistant"><span class="cb-fab-ico">💬</span><span class="cb-fab-txt"></span><span class="cb-fab-dot" hidden></span></button>' +
      '<section id="cbChatPanel" role="dialog" aria-label="ClimateBuild Site Assistant" hidden>' +
      '  <header class="cb-head"><div class="cb-avatar">🏗️</div>' +
      '    <div class="cb-head-txt"><div class="cb-title"></div><div class="cb-status"><i></i><span></span></div></div>' +
      '    <button type="button" class="cb-icon-btn" id="cbClear" title="">🗑️</button>' +
      '    <button type="button" class="cb-icon-btn" id="cbClose" title="">✕</button></header>' +
      '  <div class="cb-msgs" id="cbMsgs" aria-live="polite"></div>' +
      '  <div class="cb-chips" id="cbChips"></div>' +
      '  <form class="cb-input" id="cbForm" autocomplete="off">' +
      '    <button type="button" class="cb-mic" id="cbMic" hidden>🎤</button>' +
      '    <input type="text" id="cbInput" maxlength="300" />' +
      '    <button type="submit" class="cb-send" id="cbSend" aria-label="Send">➤</button>' +
      "  </form>" +
      "</section>";
    document.body.appendChild(root);

    fab = root.querySelector("#cbChatFab");
    panel = root.querySelector("#cbChatPanel");
    list = root.querySelector("#cbMsgs");
    input = root.querySelector("#cbInput");
    chipRow = root.querySelector("#cbChips");
    statusEl = root.querySelector(".cb-status span");
    sendBtn = root.querySelector("#cbSend");
    micBtn = root.querySelector("#cbMic");

    fab.addEventListener("click", () => togglePanel());
    root.querySelector("#cbClose").addEventListener("click", () => togglePanel(false));
    root.querySelector("#cbClear").addEventListener("click", () => {
      history = [];
      saveHistory();
      list.innerHTML = "";
      welcome();
    });
    root.querySelector("#cbForm").addEventListener("submit", (e) => {
      e.preventDefault();
      send(input.value);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) togglePanel(false);
    });

    setupVoice();
    applyLabels();
    setInterval(applyLabels, 1500);

    const saved = loadHistory();
    if (saved.length) {
      saved.forEach((m) => addBubble(m.role, m.text, { silent: true }));
      history = saved;
      showChips(chips("status", "stop", "heat", "cost", "storm"));
    } else {
      welcome();
    }
  }

  function applyLabels() {
    if (!root) return;
    root.querySelector(".cb-title").textContent = lbl("title");
    statusEl.textContent = lbl("online") + " · " + G.site().name;
    input.placeholder = lbl("placeholder");
    root.querySelector("#cbClear").title = lbl("clear");
    root.querySelector("#cbClose").title = lbl("close");
    micBtn.title = lbl("mic");
    root.querySelector(".cb-fab-txt").textContent = lbl("ask");
  }

  function togglePanel(force) {
    isOpen = typeof force === "boolean" ? force : !isOpen;
    panel.hidden = !isOpen;
    fab.classList.toggle("open", isOpen);
    fab.querySelector(".cb-fab-dot").hidden = true;
    if (isOpen) {
      applyLabels();
      scrollDown();
      setTimeout(() => input.focus(), 50);
    }
  }

  function scrollDown() {
    list.scrollTop = list.scrollHeight;
  }

  function addBubble(role, text, opts) {
    const wrap = document.createElement("div");
    wrap.className = "cb-row " + role;
    const b = document.createElement("div");
    b.className = "cb-bubble";
    if (role === "user") b.textContent = text;
    else b.innerHTML = fmt(text);
    wrap.appendChild(b);
    if (opts && opts.actions && opts.actions.length) {
      const bar = document.createElement("div");
      bar.className = "cb-actions";
      opts.actions.forEach((a) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = pick(a.l);
        btn.addEventListener("click", a.f);
        bar.appendChild(btn);
      });
      wrap.appendChild(bar);
    }
    list.appendChild(wrap);
    scrollDown();
    return wrap;
  }

  function showChips(arr) {
    chipRow.innerHTML = "";
    (arr || []).slice(0, 6).forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cb-chip";
      b.textContent = c.l[G.lang()] || c.l.en;
      b.addEventListener("click", () => send(c.q, c.l[G.lang()] || c.l.en));
      chipRow.appendChild(b);
    });
  }

  function typing(on) {
    let t = list.querySelector(".cb-typing");
    if (on && !t) {
      t = document.createElement("div");
      t.className = "cb-row bot cb-typing";
      t.innerHTML = '<div class="cb-bubble"><span></span><span></span><span></span></div>';
      list.appendChild(t);
      scrollDown();
    } else if (!on && t) t.remove();
  }

  function welcome() {
    L = G.lang();
    const rep = r_greet();
    addBubble("bot", rep.text, rep);
    history.push({ role: "bot", text: rep.text });
    saveHistory();
    showChips(rep.chips);
  }

  function send(text, display) {
    text = String(text || "").trim();
    if (!text || busy) return;
    busy = true;
    input.value = "";
    addBubble("user", display || text);
    history.push({ role: "user", text: display || text });
    chipRow.innerHTML = "";
    typing(true);
    setTimeout(() => {
      let rep;
      try {
        rep = understand(text);
      } catch (err) {
        console.error("[chat]", err);
        L = G.lang();
        rep = { text: pick({ en: "⚠️ Something went wrong while reading the dashboard. Please try again.", hi: "⚠️ डैशबोर्ड पढ़ते समय गड़बड़ हुई। फिर कोशिश करें।", mr: "⚠️ डॅशबोर्ड वाचताना काहीतरी चुकले. पुन्हा प्रयत्न करा." }) };
      }
      typing(false);
      addBubble("bot", rep.text, rep);
      history.push({ role: "bot", text: rep.text });
      saveHistory();
      showChips(rep.chips || chips("status", "stop", "heat"));
      applyLabels();
      busy = false;
      input.focus();
    }, 380 + Math.random() * 280);
  }

  /* ---- Voice input (Chrome/Edge) ---- */
  function setupVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    micBtn.hidden = false;
    let rec = null, listening = false;
    micBtn.addEventListener("click", () => {
      if (listening && rec) { rec.stop(); return; }
      rec = new SR();
      const lg = G.lang();
      rec.lang = lg === "hi" ? "hi-IN" : lg === "mr" ? "mr-IN" : "en-IN";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => { listening = true; micBtn.classList.add("on"); };
      rec.onend = () => { listening = false; micBtn.classList.remove("on"); };
      rec.onerror = () => { listening = false; micBtn.classList.remove("on"); };
      rec.onresult = (e) => {
        const said = e.results[0][0].transcript;
        input.value = said;
        send(said);
      };
      try { rec.start(); } catch (e) {}
    });
  }

  /* Public hook (useful for demos): window.ClimateChat.ask("current risk") */
  window.ClimateChat = {
    open: () => togglePanel(true),
    close: () => togglePanel(false),
    ask: (q) => { togglePanel(true); send(q); },
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
