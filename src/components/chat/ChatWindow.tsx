import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { loadMessages } from "@/lib/chat.functions";
import { generateImage } from "@/lib/ai.functions";
import { getProfile } from "@/lib/profile.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Composer, type Attachment } from "./Composer";
import { Message } from "./Message";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export function ChatWindow({ threadId }: { threadId: string }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"chat" | "image">("chat");
  const [token, setToken] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null);
  const [imgLoading, setImgLoading] = useState(false);

  const loadFn = useServerFn(loadMessages);
  const imageFn = useServerFn(generateImage);
  const profileFn = useServerFn(getProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setToken(data.session?.access_token ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setInitialMessages(null);
    loadFn({ data: { conversationId: threadId } }).then((rows) => {
      if (cancelled) return;
      const ui: UIMessage[] = rows.map((r) => ({
        id: r.id,
        role: r.role as "user" | "assistant",
        parts: (r.parts as unknown as UIMessage["parts"]) ?? [],
      }));
      setInitialMessages(ui);
    });
    return () => { cancelled = true; };
  }, [threadId, loadFn]);

  if (initialMessages === null || token === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Inner
      threadId={threadId}
      token={token}
      initialMessages={initialMessages}
      mode={mode}
      setMode={setMode}
      onImage={async (text: string) => {
        setImgLoading(true);
        try {
          const r = await imageFn({ data: { prompt: text } });
          if (!r.imageDataUrl) throw new Error("No image returned");
          qc.invalidateQueries({ queryKey: ["credits"] });
          toast.success("Image ready");
          return r.imageDataUrl;
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Image failed";
          if (msg.includes("INSUFFICIENT_CREDITS")) toast.error(t("credits.low"));
          else toast.error(msg);
          return null;
        } finally {
          setImgLoading(false);
        }
      }}
      imgLoading={imgLoading}
      profileAvatar={profile?.avatarSignedUrl ?? null}
      profileInitial={(profile?.full_name || profile?.email || "U").slice(0, 1).toUpperCase()}
    />
  );
}

function Inner({
  threadId,
  token,
  initialMessages,
  mode,
  setMode,
  onImage,
  imgLoading,
  profileAvatar,
  profileInitial,
}: {
  threadId: string;
  token: string;
  initialMessages: UIMessage[];
  mode: "chat" | "image";
  setMode: (m: "chat" | "image") => void;
  onImage: (text: string) => Promise<string | null>;
  imgLoading: boolean;
  profileAvatar: string | null;
  profileInitial: string;
}) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [localImages, setLocalImages] = useState<{ id: string; role: "assistant" | "user"; parts: UIMessage["parts"] }[]>([]);

  const transport = new DefaultChatTransport({
    api: "/api/chat",
    headers: { Authorization: `Bearer ${token}` },
    body: { conversationId: threadId },
  });

  const { messages, sendMessage, status, error } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => {
      if (e.message.includes("402") || e.message.includes("INSUFFICIENT")) {
        toast.error("Out of credits. Upgrade to keep chatting.");
      } else {
        toast.error(e.message);
      }
    },
    onFinish: () => {
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, localImages]);

  const handleSend = async (text: string, files: Attachment[]) => {
    if (mode === "image" && text) {
      const promptId = crypto.randomUUID();
      setLocalImages((p) => [...p, { id: promptId, role: "user", parts: [{ type: "text", text }] as UIMessage["parts"] }]);
      const url = await onImage(text);
      if (url) {
        setLocalImages((p) => [
          ...p,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            parts: [{ type: "file", url, mediaType: "image/png" }] as unknown as UIMessage["parts"],
          },
        ]);
      }
      return;
    }
    const parts: UIMessage["parts"] = [];
    if (text) parts.push({ type: "text", text } as never);
    for (const f of files) {
      parts.push({ type: "file", url: f.url, mediaType: f.mediaType, filename: f.name } as never);
    }
    await sendMessage({ parts });
  };

  const isLoading = status === "submitted" || status === "streaming" || imgLoading;
  const allMessages = [...messages, ...localImages] as UIMessage[];

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {allMessages.length === 0 ? (
            <div className="text-center py-24">
              <div className="inline-flex h-14 w-14 rounded-2xl nova-gradient items-center justify-center text-white mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">{t("chat.empty.t")}</h2>
              <p className="text-muted-foreground mt-1 text-sm">{t("chat.empty.s")}</p>
            </div>
          ) : (
            allMessages.map((m) => (
              <Message
                key={m.id}
                message={m}
                userAvatar={profileAvatar}
                userInitial={profileInitial}
              />
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pl-11">
              <Loader2 className="h-4 w-4 animate-spin" /> thinking…
            </div>
          )}
          {error && <div className="text-sm text-destructive">{error.message}</div>}
        </div>
      </div>
      <div className="max-w-3xl w-full mx-auto">
        <Composer mode={mode} setMode={setMode} onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}