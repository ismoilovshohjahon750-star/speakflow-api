## VoiceForge — qisqacha

Foydalanuvchi ro'yxatdan o'tadi, 250 ta bepul kredit oladi, brauzerda TTS/STT'dan foydalanadi yoki o'z API kalitini olib tashqi ilovasidan chaqiradi. Kreditlar tugasa — Stripe Checkout orqali paket sotib oladi va kreditlar tanlangan API kalitiga qo'shiladi.

## 1. Backend (Lovable Cloud + ElevenLabs + Stripe)

**Connectorlar:**
- Lovable Cloud yoqiladi (auth + Postgres)
- ElevenLabs connector ulanadi (TTS, STT uchun)
- Stripe payments yoqiladi (kredit paketlari uchun)

**Jadvallar (RLS bilan):**
- `profiles` — id, email, created_at
- `user_roles` — admin/user (xavfsiz role tekshiruvi uchun)
- `credits` — user_id, balance (yangi user → 250 bepul)
- `api_keys` — id, user_id, name, key_hash, key_prefix, balance (har bir kalit alohida kredit balansi), created_at, last_used_at, revoked
- `usage_logs` — id, api_key_id, user_id, service (`tts`/`stt`), credits_used, chars_or_seconds, created_at
- `transactions` — id, user_id, api_key_id, package, credits, amount_cents, stripe_session_id, status

**Server funksiyalar (`createServerFn`, auth bilan):**
- `tts(text, voiceId)` — ElevenLabs `/v1/text-to-speech`, mp3 qaytaradi, kredit yechadi
- `stt(audio)` — ElevenLabs `/v1/speech-to-text` (scribe_v2), matn qaytaradi
- `createApiKey(name)` — yangi kalit (faqat bir marta to'liq ko'rsatiladi), balans 0
- `listApiKeys()`, `revokeApiKey(id)`
- `createCheckout(packageId, apiKeyId)` — Stripe Checkout sessiya, success url orqali kredit qo'shiladi

**Public API routes (`/api/public/*`, kalit autentifikatsiyasi `Authorization: Bearer vf_...`):**
- `POST /api/public/v1/tts` — `{ text, voice_id }` → audio/mpeg
- `POST /api/public/v1/stt` — multipart audio → `{ text, words }`
- `GET /api/public/v1/balance` → `{ balance }`

Har bir chaqiriqda: kalit hash bo'yicha topiladi, balans tekshiriladi, ElevenLabs chaqiriladi, balans yechiladi, `usage_logs`'ga yoziladi.

**Stripe webhook** (`/api/public/stripe-webhook`): `checkout.session.completed` → tegishli `api_keys.balance` ga kredit qo'shiladi, `transactions.status = 'paid'`.

**Paketlar:** Starter 1000/$5, Pro 5000/$20, Business 25000/$80, Enterprise 100000/$250.

**Krediit narxi:** TTS — 1 kredit / 1000 belgi. STT — 1 kredit / daqiqa.

## 2. Frontend (yorug', minimalist — ElevenLabs uslubi)

Design system: oq fon (#ffffff), qora matn (#0a0a0a), indigo accent (#6366f1), nozik kulrang surface (#f5f5f7). Inter font, ko'p oq joy, yumshoq border-radius, mayda animatsiyalar.

**Sahifalar:**
- `/` — landing: hero, demo (real TTS sinab ko'rish), narxlar, footer
- `/auth` — kirish/ro'yxatdan o'tish (email+parol)
- `/app` — dashboard: kredit balansi, tezkor TTS va STT studiosi (ovoz tanlash, matn → audio; audio yuklash → matn)
- `/app/api-keys` — kalitlar ro'yxati: yaratish, ko'chirish (faqat bir marta), kalit ostida balans + **"Add credits"** tugmasi → paket tanlash modali → Stripe Checkout
- `/app/usage` — so'nggi chaqiriqlar jadvali
- `/app/docs` — API hujjatlari (curl misollar bilan)

## 3. Texnik tafsilotlar

- Kalit formati: `vf_live_<32 random>`; DB'da faqat `sha256(key)` saqlanadi + 8 belgili prefix ko'rsatish uchun
- Stripe success URL `/app/api-keys?paid=1` ga qaytadi, webhook'gacha optimistik xabar
- TTS audio brauzerda `Blob` orqali ijro etiladi va yuklab olinadi
- STT uchun mikrofon yozish (MediaRecorder) yoki fayl yuklash
- ElevenLabs ovozlari: 8-10 ta mashhur ovoz ro'yxati (bepul preview ham mavjud)
- Barcha server kodi `process.env.ELEVENLABS_API_KEY` va `STRIPE_SECRET_KEY` orqali ishlaydi
- Yangi user trigger: `handle_new_user()` → profil + 250 kredit yaratadi

## 4. Bosqichlar

1. Lovable Cloud + ElevenLabs + Stripe yoqish
2. DB migratsiya (jadvallar, RLS, triggerlar, GRANTlar)
3. Auth sahifasi + protected layout
4. Server funksiyalar (TTS/STT/API keys/checkout)
5. Public API routes + Stripe webhook
6. Landing + dashboard + API keys + docs UI
7. Design system va sayqallash

Tasdiqlaysizmi?
