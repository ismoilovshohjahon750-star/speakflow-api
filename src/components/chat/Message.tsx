import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { useEffect, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Volume2, Square, Copy, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { UIMessage } from "ai";
import { toast } from "sonner";

export function Message({
  message,
  userAvatar,
  userInitial,
}: {
  message: UIMessage;
  userAvatar?: string | null;
  userInitial?: string;
}) {
  const { lang } = useI18n();
  const isUser = message.role === "user";
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("");

  useEffect(() => () => {
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // CRITICAL: create the utterance synchronously inside the click handler
  // so the browser keeps the user-gesture context for speechSynthesis.
  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Speech is not supported in this browser");
      return;
    }
    if (playing) {
      window.speechSynthesis.cancel();
      setPlaying(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === "uz" ? "uz-UZ" : "en-US";
    utter.rate = 1;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred =
      voices.find((v) => v.lang.toLowerCase().startsWith(utter.lang.toLowerCase())) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("en")) ||
      voices[0];
    if (preferred) utter.voice = preferred;
    utter.onend = () => setPlaying(false);
    utter.onerror = () => setPlaying(false);
    utterRef.current = utter;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setPlaying(true);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} group/msg`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-xl nova-gradient flex items-center justify-center text-white text-xs font-bold shrink-0 nova-glow">
          N
        </div>
      )}
      <div className={`max-w-[85%] md:max-w-[80%] ${isUser ? "order-1" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 leading-relaxed ${
            isUser
              ? "nova-gradient text-white shadow-lg"
              : "bg-transparent text-foreground"
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
              return <img key={i} src={p.url} alt="" className="rounded-xl mt-2 max-h-96 border border-border" />;
            }
            return null;
          })}
        </div>
        {!isUser && text.trim() && (
          <div className="mt-1 ml-1 flex items-center gap-3 opacity-60 hover:opacity-100 transition">
            <button
              onClick={speak}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              title={playing ? "Stop" : "Read aloud"}
            >
              {playing ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
              <span>{playing ? "Stop" : "Read"}</span>
            </button>
            <button
              onClick={copy}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              title="Copy"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
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