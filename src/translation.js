export const languages = [
  { code: "en", name: "English" }, { code: "hi", name: "Hindi" },
  { code: "pa", name: "Punjabi" }, { code: "es", name: "Spanish" },
  { code: "fr", name: "French" }, { code: "de", name: "German" },
  { code: "ar", name: "Arabic" }, { code: "zh", name: "Chinese" },
  { code: "ru", name: "Russian" }, { code: "ja", name: "Japanese" }
];

const labels = {
  en: { prefix: "Passport update", passport: "passport", official: "official portal", appointment: "appointment", renewal: "renewal", warning: "Warning" },
  hi: { prefix: "पासपोर्ट अपडेट", passport: "पासपोर्ट", official: "आधिकारिक पोर्टल", appointment: "अपॉइंटमेंट", renewal: "नवीनीकरण", warning: "चेतावनी" },
  pa: { prefix: "ਪਾਸਪੋਰਟ ਅਪਡੇਟ", passport: "ਪਾਸਪੋਰਟ", official: "ਸਰਕਾਰੀ ਪੋਰਟਲ", appointment: "ਅਪਾਇੰਟਮੈਂਟ", renewal: "ਨਵੀਨੀਕਰਨ", warning: "ਚੇਤਾਵਨੀ" },
  es: { prefix: "Actualización de pasaporte", passport: "pasaporte", official: "portal oficial", appointment: "cita", renewal: "renovación", warning: "Advertencia" },
  fr: { prefix: "Mise à jour du passeport", passport: "passeport", official: "portail officiel", appointment: "rendez-vous", renewal: "renouvellement", warning: "Avertissement" },
  de: { prefix: "Passaktualisierung", passport: "Reisepass", official: "offizielles Portal", appointment: "Termin", renewal: "Erneuerung", warning: "Warnung" },
  ar: { prefix: "تحديث جواز السفر", passport: "جواز السفر", official: "الموقع الرسمي", appointment: "موعد", renewal: "تجديد", warning: "تحذير" },
  zh: { prefix: "护照更新", passport: "护照", official: "官方门户", appointment: "预约", renewal: "续期", warning: "警告" },
  ru: { prefix: "Обновление паспорта", passport: "паспорт", official: "официальный портал", appointment: "запись", renewal: "продление", warning: "Предупреждение" },
  ja: { prefix: "パスポート情報", passport: "パスポート", official: "公式ポータル", appointment: "予約", renewal: "更新", warning: "警告" }
};

function glossaryTranslation(text, language) {
  const glossary = labels[language] || labels.en;
  let translated = text
    .replace(/passport/gi, glossary.passport)
    .replace(/official (portal|website)/gi, glossary.official)
    .replace(/appointment/gi, glossary.appointment)
    .replace(/renewal/gi, glossary.renewal)
    .replace(/warning/gi, glossary.warning);
  if (translated === text && language !== "en") translated = `${glossary.prefix}: ${text}`;
  return translated;
}

export async function translate(text, targetLanguage) {
  const target = languages.find((language) => language.code === targetLanguage);
  if (!target) throw new Error("Unsupported language");
  if (process.env.LIBRETRANSLATE_URL) {
    const response = await fetch(`${process.env.LIBRETRANSLATE_URL.replace(/\/$/, "")}/translate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        q: text, source: "auto", target: targetLanguage, format: "text",
        api_key: process.env.LIBRETRANSLATE_API_KEY || undefined
      })
    });
    if (response.ok) {
      const payload = await response.json();
      return { text: payload.translatedText, method: "LibreTranslate" };
    }
  }
  return { text: glossaryTranslation(text, targetLanguage), method: "Local glossary preview" };
}
