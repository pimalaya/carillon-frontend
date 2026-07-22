import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";

/** The languages shipped in the bundle. Add a locale JSON + an entry here. */
export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** localStorage key the chosen language is remembered under. */
export const LANGUAGE_STORAGE_KEY = "carillon.lang";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((language) => language.code),
    // React already escapes on render — double-escaping mangles interpolated
    // values (e.g. an ampersand in an email), so turn it off here.
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
  });

// Keep the document language in sync so the browser (and assistive tech) sees
// the active locale.
const syncHtmlLang = (language: string) => {
  document.documentElement.lang = language;
};
syncHtmlLang(i18n.resolvedLanguage ?? "en");
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
