import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { spendCredits } from "./credits.server";
import { LOVABLE_GATEWAY_URL } from "./ai-gateway.server";

// ===== Image generation (Gemini Nano Banana via Lovable AI) =====
export const generateImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string }) => input)
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    await spendCredits(context.userId, 20);
    const res = await fetch(`${LOVABLE_GATEWAY_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: data.prompt }],
        modalities: ["image", "text"],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Image gen failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    const msg = json.choices?.[0]?.message;
    const images: string[] = msg?.images?.map((i: { image_url?: { url?: string } }) => i?.image_url?.url).filter(Boolean) ?? [];
    return { imageDataUrl: images[0] ?? null, text: typeof msg?.content === "string" ? msg.content : "" };
  });

// ===== TTS via OpenAI =====
export const tts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; voice?: string }) => input)
  .handler(async ({ data, context }) => {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("Missing OPENAI_API_KEY");
    await spendCredits(context.userId, 2);
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: data.voice ?? "nova",
        input: data.text.slice(0, 4000),
        format: "mp3",
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TTS failed: ${res.status} ${text}`);
    }
    const buf = await res.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    return { audioDataUrl: `data:audio/mpeg;base64,${b64}` };
  });

// ===== STT via Lovable AI (Gemini) =====
export const stt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { audioBase64: string; format: string }) => input)
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    await spendCredits(context.userId, 2);
    const res = await fetch(`${LOVABLE_GATEWAY_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Transcribe this audio verbatim. Reply with the transcript only, no extra words." },
              { type: "input_audio", input_audio: { data: data.audioBase64, format: data.format } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`STT failed: ${res.status} ${text}`);
    }
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content ?? "";
    return { text: typeof text === "string" ? text.trim() : "" };
  });