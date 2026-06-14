import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

type Body = { messages?: UIMessage[]; conversationId?: string };

async function getUserFromAuth(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { userId: data.claims.sub as string, token };
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await getUserFromAuth(request.headers.get("authorization"));
        if (!auth) return new Response("Unauthorized", { status: 401 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Credits check
        const { data: cr } = await supabaseAdmin
          .from("credits").select("balance").eq("user_id", auth.userId).maybeSingle();
        if (!cr || cr.balance < 1) {
          return new Response(JSON.stringify({ error: "INSUFFICIENT_CREDITS" }), {
            status: 402, headers: { "content-type": "application/json" },
          });
        }

        const body = (await request.json()) as Body;
        if (!Array.isArray(body.messages)) return new Response("messages required", { status: 400 });
        if (!body.conversationId) return new Response("conversationId required", { status: 400 });

        // Persist the last user message
        const lastUser = [...body.messages].reverse().find((m) => m.role === "user");
        if (lastUser) {
          await supabaseAdmin.from("messages").insert({
            conversation_id: body.conversationId,
            user_id: auth.userId,
            role: "user",
            parts: lastUser.parts as unknown as never,
          });
          // Title from first user message text
          const firstText = (lastUser.parts as Array<{ type: string; text?: string }>).find((p) => p.type === "text")?.text ?? "";
          if (firstText) {
            const { data: convo } = await supabaseAdmin
              .from("conversations").select("title").eq("id", body.conversationId).maybeSingle();
            if (convo && (convo.title === "New chat" || !convo.title)) {
              await supabaseAdmin.from("conversations")
                .update({ title: firstText.slice(0, 60), updated_at: new Date().toISOString() })
                .eq("id", body.conversationId);
            } else {
              await supabaseAdmin.from("conversations")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", body.conversationId);
            }
          }
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-2.5-flash");

        const result = streamText({
          model,
          system:
            "You are Nova, a warm, sharp, and concise multimodal AI assistant. Format with markdown. Use fenced code blocks for code with language tags. Be honest and direct.",
          messages: await convertToModelMessages(body.messages),
          onFinish: async ({ text }) => {
            try {
              await supabaseAdmin.from("messages").insert({
                conversation_id: body.conversationId!,
                user_id: auth.userId,
                role: "assistant",
                parts: [{ type: "text", text }],
              });
              await supabaseAdmin
                .from("credits")
                .update({ balance: Math.max(0, cr.balance - 1), updated_at: new Date().toISOString() })
                .eq("user_id", auth.userId);
            } catch (e) {
              console.error("persist error", e);
            }
          },
        });

        return result.toUIMessageStreamResponse();
      },
    },
  },
});