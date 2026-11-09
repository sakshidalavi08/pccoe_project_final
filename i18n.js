/**
 * i18n.js - Lightweight Multilingual Translation Support for ClimateBuildAI
 * Supports: English (en), Hindi (hi), Marathi (mr)
 */

(function () {
  const LANGUAGES = ["English", "हिंदी", "मराठी"];
  let currentLangIndex = 0;

  const DICTIONARY = {
    English: {
      dashboard: "Core Intelligence Dashboard",
      sync_weather: "Sync Weather",
      export_report: "Export Report",
      switch_user: "Switch User",
    },
    हिंदी: {
      dashboard: "जलवायु जोखिम डैशबोर्ड",
      sync_weather: "मौसम सिंक करें",
      export_report: "रिपोर्ट निर्यात करें",
      switch_user: "उपयोगकर्ता बदलें",
    },
    मराठी: {
      dashboard: "हवामान जोखीम डॅशबोर्ड",
      sync_weather: "हवामान सिंक करा",
      export_report: "अहवाल निर्यात करा",
      switch_user: "वापरकर्ता बदला",
    },
  };

  window.cycleLanguage = function () {
    currentLangIndex = (currentLangIndex + 1) % LANGUAGES.length;
    const lang = LANGUAGES[currentLangIndex];
    const label = document.getElementById("langLabel");
    if (label) {
      label.textContent = lang === "English" ? "English / हिंदी" : lang;
    }
    return lang;
  };

  window.getTranslation = function (key) {
    const lang = LANGUAGES[currentLangIndex];
    return (DICTIONARY[lang] && DICTIONARY[lang][key]) || key;
  };
})();
