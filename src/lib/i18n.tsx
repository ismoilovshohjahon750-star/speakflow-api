import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Lang = "en" | "uz";

const dict = {
  en: {
    "brand.tag": "AI for everyone",
    "nav.signin": "Sign in",
    "nav.getstarted": "Get started",
    "nav.chat": "Chat",
    "nav.profile": "Profile",
    "nav.pricing": "Pricing",
    "nav.signout": "Sign out",
    "land.headline": "One AI for everything.",
    "land.sub": "Chat, voice, images, code — Nova does it all in a single calm interface.",
    "land.cta": "Start free with 250 credits",
    "land.feat1.t": "Multimodal chat",
    "land.feat1.d": "Text, photos, audio, files and live camera — all in one thread.",
    "land.feat2.t": "Speak & listen",
    "land.feat2.d": "Talk to Nova with your voice. Hear answers read back naturally.",
    "land.feat3.t": "Create images",
    "land.feat3.d": "Generate stunning visuals with a single sentence.",
    "land.feat4.t": "Built for code",
    "land.feat4.d": "Beautiful syntax highlighting for every language.",
    "auth.title": "Welcome to Nova",
    "auth.sub": "Sign in to get 250 free credits.",
    "auth.google": "Continue with Google",
    "auth.or": "or with email",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.signin": "Sign in",
    "auth.signup": "Create account",
    "auth.toggle.signup": "New to Nova? Create an account",
    "auth.toggle.signin": "Already have an account? Sign in",
    "chat.placeholder": "Ask Nova anything…",
    "chat.send": "Send",
    "chat.new": "New chat",
    "chat.empty.t": "How can I help you today?",
    "chat.empty.s": "Type, talk, or share an image to begin.",
    "chat.mode.text": "Chat",
    "chat.mode.image": "Image",
    "chat.tts": "Read aloud",
    "chat.recording": "Recording… tap to stop",
    "profile.title": "Your profile",
    "profile.name": "Display name",
    "profile.save": "Save",
    "profile.avatar": "Change photo",
    "profile.credits": "Credits",
    "profile.plan": "Current plan",
    "profile.upgrade": "Upgrade",
    "pricing.title": "Simple credit packs",
    "pricing.sub": "Pay once. Use anytime. No subscriptions.",
    "pricing.buy": "Buy credits",
    "lang.label": "Language",
    "credits.low": "Out of credits. Upgrade to keep chatting.",
  },
  uz: {
    "brand.tag": "Hamma uchun AI",
    "nav.signin": "Kirish",
    "nav.getstarted": "Boshlash",
    "nav.chat": "Chat",
    "nav.profile": "Profil",
    "nav.pricing": "Narxlar",
    "nav.signout": "Chiqish",
    "land.headline": "Hamma narsa uchun bitta AI.",
    "land.sub": "Chat, ovoz, rasm, kod — Nova bularning hammasini bitta tinch interfeysda bajaradi.",
    "land.cta": "250 bepul kredit bilan boshlash",
    "land.feat1.t": "Multimodal chat",
    "land.feat1.d": "Matn, rasm, audio, fayl va kamera — barchasi bitta suhbatda.",
    "land.feat2.t": "Gapir va eshit",
    "land.feat2.d": "Nova bilan ovozda gaplashing. Javoblarni tabiiy ovozda eshiting.",
    "land.feat3.t": "Rasm yarating",
    "land.feat3.d": "Bitta gap bilan ajoyib tasvirlar yarating.",
    "land.feat4.t": "Dasturchilar uchun",
    "land.feat4.d": "Har bir til uchun chiroyli sintaksis ajratish.",
    "auth.title": "Nova'ga xush kelibsiz",
    "auth.sub": "Kirib 250 ta bepul kredit oling.",
    "auth.google": "Google bilan davom etish",
    "auth.or": "yoki email orqali",
    "auth.email": "Email",
    "auth.password": "Parol",
    "auth.signin": "Kirish",
    "auth.signup": "Akkaunt yaratish",
    "auth.toggle.signup": "Yangi foydalanuvchimisiz? Akkaunt yarating",
    "auth.toggle.signin": "Akkauntingiz bormi? Kiring",
    "chat.placeholder": "Nova'dan istalgan narsani so'rang…",
    "chat.send": "Yuborish",
    "chat.new": "Yangi chat",
    "chat.empty.t": "Bugun sizga qanday yordam beray?",
    "chat.empty.s": "Yozing, gapiring yoki rasm yuboring.",
    "chat.mode.text": "Chat",
    "chat.mode.image": "Rasm",
    "chat.tts": "Ovoz bilan o'qish",
    "chat.recording": "Yozilmoqda… to'xtatish uchun bosing",
    "profile.title": "Profilingiz",
    "profile.name": "Ko'rsatiladigan ism",
    "profile.save": "Saqlash",
    "profile.avatar": "Rasmni almashtirish",
    "profile.credits": "Kreditlar",
    "profile.plan": "Joriy reja",
    "profile.upgrade": "Yangilash",
    "pricing.title": "Oddiy kredit paketlari",
    "pricing.sub": "Bir marta to'lang. Istalgan vaqtda foydalaning. Obuna yo'q.",
    "pricing.buy": "Kredit sotib olish",
    "lang.label": "Til",
    "credits.low": "Kreditlar tugadi. Davom etish uchun yangilang.",
  },
} as const;

type Key = keyof typeof dict["en"];

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void; t: (k: Key) => string }>({
  lang: "en",
  setLang: () => {},
  t: (k) => dict.en[k],
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("nova-lang")) as Lang | null;
    if (stored === "en" || stored === "uz") setLangState(stored);
  }, []);
  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("nova-lang", l);
  };
  const t = (k: Key) => dict[lang][k] ?? dict.en[k];
  return <Ctx.Provider value={{ lang, setLang, t }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}