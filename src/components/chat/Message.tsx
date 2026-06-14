import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Volume2, Loader2, Square } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { tts } from "@/lib/ai.functions";
import { toast } from "sonner";
import type { UIMessage } from "ai";

export function Message({
  message,
  userAvatar,
  userInitial,
}: {
  message: UIMessage;
  userAvatar?: string | null;
  userInitial?: string;
}) {
  const isUser = message.role === "user";
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const ttsFn = useServerFn(tts);

  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  const speak = async () => {
    if (audio && playing) { audio.pause(); setPlaying(false); return; }
    if (audio) { audio.play(); setPlaying(true); return; }
    setLoading(true);
    try {
      const res = await ttsFn({ data: { text } });
      const a = new Audio(res.audioDataUrl);
      a.onended = () => setPlaying(false);
      setAudio(a);
      a.play();
      setPlaying(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "TTS failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full nova-gradient flex items-center justify-center text-white text-xs font-semibold shrink-0">
          N
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "order-1" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "nova-gradient text-white"
              : "bg-card border border-border text-foreground"
          }`}
        >
          {message.parts.map((p, i) => {
            if (p.type === "text") {
              return (
                <div key={i} className={isUser ? "whitespace-pre-wrap" : "prose-nova"}>
                  {isUser ? p.text : <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{p.text}</ReactMarkdown>}
                </div>
              );
            }
            if (p.type === "file" && p.mediaType?.startsWith("image/")) {
              return <img key={i} src={p.url} alt="" className="rounded-lg mt-2 max-h-80" />;
            }
            return null;
          })}
        </div>
        {!isUser && text.trim() && (
          <button
            onClick={speak}
            disabled={loading}
            className="mt-1 ml-1 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : playing ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
            <span>Read</span>
          </button>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8 shrink-0">
          {userAvatar && <AvatarImage src={userAvatar} />}
          <AvatarFallback className="text-xs">{userInitial}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}