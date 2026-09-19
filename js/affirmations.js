/** @typedef {{ lang: string, text: string, dir: string }} AffirmationItem */

export const AFFIRMATIONS = [
  {
    lang: "English",
    text: "You are the first light I want every morning.",
    dir: "ltr",
  },
  {
    lang: "Farsi",
    text: "تو اولین نوری هستی که هر صبح می‌خواهم.",
    dir: "rtl",
  },
  {
    lang: "French",
    text: "Tu es la première lumière que je désire chaque matin.",
    dir: "ltr",
  },
  {
    lang: "Spanish",
    text: "Eres la primera luz que deseo cada mañana.",
    dir: "ltr",
  },
  {
    lang: "English",
    text: "Waking beside you is my favorite beginning.",
    dir: "ltr",
  },
  {
    lang: "Farsi",
    text: "بیدار شدن کنار تو، زیباترین آغاز من است.",
    dir: "rtl",
  },
  {
    lang: "French",
    text: "Me réveiller près de toi est mon plus beau commencement.",
    dir: "ltr",
  },
  {
    lang: "Spanish",
    text: "Despertar a tu lado es mi comienzo favorito.",
    dir: "ltr",
  },
];

export const INTERACTION_AFFIRMATIONS = [
  {
    lang: "English",
    text: "My heart chooses you again with every sunrise.",
    dir: "ltr",
  },
  {
    lang: "Farsi",
    text: "قلب من با هر طلوع دوباره تو را برمی‌گزیند.",
    dir: "rtl",
  },
  {
    lang: "French",
    text: "Mon cœur te choisit encore à chaque lever du soleil.",
    dir: "ltr",
  },
  {
    lang: "Spanish",
    text: "Mi corazón te elige de nuevo con cada amanecer.",
    dir: "ltr",
  },
  {
    lang: "English",
    text: "You are my calm before the world begins.",
    dir: "ltr",
  },
  {
    lang: "Farsi",
    text: "تو آرامش من هستی پیش از آغاز جهان.",
    dir: "rtl",
  },
  {
    lang: "French",
    text: "Tu es mon calme avant que le monde commence.",
    dir: "ltr",
  },
  {
    lang: "Spanish",
    text: "Eres mi calma antes de que empiece el mundo.",
    dir: "ltr",
  },
  {
    lang: "English",
    text: "Loving you is the prayer I never skip.",
    dir: "ltr",
  },
  {
    lang: "Farsi",
    text: "دوست داشتنت دعایی است که هرگز از یاد نمی‌برم.",
    dir: "rtl",
  },
  {
    lang: "French",
    text: "T'aimer est la prière que je ne manque jamais.",
    dir: "ltr",
  },
  {
    lang: "Spanish",
    text: "Amarte es la oración que nunca omito.",
    dir: "ltr",
  },
];

const LANGUAGE_ORDER = ["English", "Farsi", "French", "Spanish"];

const LANG_TO_BCP47 = {
  English: "en",
  Farsi: "fa",
  French: "fr",
  Spanish: "es",
};

/** @type {Record<string, number>} */
const interactionVariantByLang = {
  English: 0,
  Farsi: 0,
  French: 0,
  Spanish: 0,
};

let languageTurn = 0;

/** Next affirmation — rotates English → Farsi → French → Spanish on each call. */
export function advanceInteractionAffirmation() {
  const lang = LANGUAGE_ORDER[languageTurn];
  languageTurn = (languageTurn + 1) % LANGUAGE_ORDER.length;

  const pool = INTERACTION_AFFIRMATIONS.filter((a) => a.lang === lang);
  if (!pool.length) {
    return INTERACTION_AFFIRMATIONS[0];
  }

  const idx = interactionVariantByLang[lang] % pool.length;
  interactionVariantByLang[lang] = idx + 1;
  return pool[idx];
}

/**
 * @param {(item: AffirmationItem) => void} onShow
 * @param {number} intervalMs
 */
export function startAffirmationCycle(onShow, intervalMs = 7000) {
  let languageIndex = 0;
  const showNext = () => {
    const lang = LANGUAGE_ORDER[languageIndex];
    languageIndex = (languageIndex + 1) % LANGUAGE_ORDER.length;
    const pool = AFFIRMATIONS.filter((a) => a.lang === lang);
    const pick = pool[Math.floor(Math.random() * pool.length)] ?? AFFIRMATIONS[0];
    onShow(pick);
  };
  showNext();
  const id = setInterval(showNext, intervalMs);
  return () => clearInterval(id);
}

/** @param {HTMLElement | null} quoteEl @param {HTMLElement | null} langEl @param {AffirmationItem} item */
export function renderAffirmation(quoteEl, langEl, item) {
  if (!quoteEl || !langEl) return;
  quoteEl.textContent = item.text;
  quoteEl.lang = LANG_TO_BCP47[item.lang] ?? "en";
  quoteEl.dir = item.dir;
  langEl.textContent = item.lang;
}
