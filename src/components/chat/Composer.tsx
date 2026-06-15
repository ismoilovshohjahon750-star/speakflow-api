import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Paperclip, ImagePlus, Camera, MessageSquare, ImageIcon, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { stt } from "@/lib/ai.functions";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

type SR = typeof window extends { SpeechRecognition: infer T } ? T : unknown;
function getSpeechRecognition(): (new () => any) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown };
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => any) | null;
}

export type Attachment = { url: string; mediaType: string; name?: string };

export function Composer({
  mode,
  setMode,
  onSend,
  disabled,
}: {
  mode: "chat" | "image";
  setMode: (m: "chat" | "image") => void;
  onSend: (text: string, files: Attachment[]) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [text, setText] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const sttFn = useServerFn(stt);
  const recognitionRef = useRef<any>(null);
  const baseTextRef = useRef("");
  const { lang } = useI18n();

  useEffect(() => () => {
    try { recognitionRef.current?.stop(); } catch {/* noop */}
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
  }, []);

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const arr: Promise<Attachment>[] = Array.from(list).map(
      (f) =>
        new Promise<Attachment>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve({ url: reader.result as string, mediaType: f.type || "application/octet-stream", name: f.name });
          reader.readAsDataURL(f);
        }),
    );
    Promise.all(arr).then((items) => setFiles((p) => [...p, ...items]));
  };

  const startRecording = async () => {
    // Prefer the live, free, accurate browser SpeechRecognition where available
    const SRClass = getSpeechRecognition();
    if (SRClass) {
      try {
        const rec = new SRClass();
        rec.lang = lang === "uz" ? "uz-UZ" : "en-US";
        rec.continuous = true;
        rec.interimResults = true;
        baseTextRef.current = text ? text + " " : "";
        rec.onresult = (e: any) => {
          let interim = "";
          let final = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) final += r[0].transcript;
            else interim += r[0].transcript;
          }
          setText(baseTextRef.current + final + interim);
          if (final) baseTextRef.current += final;
        };
        rec.onerror = (e: any) => {
          if (e?.error === "not-allowed") toast.error("Microphone access denied");
          else if (e?.error !== "no-speech" && e?.error !== "aborted") toast.error(`Mic error: ${e?.error ?? "unknown"}`);
          setRecording(false);
        };
        rec.onend = () => setRecording(false);
        rec.start();
        recognitionRef.current = rec;
        setRecording(true);
        return;
      } catch {
        // fall through to MediaRecorder + server STT
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime });
        const buf = await blob.arrayBuffer();
        const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
        const format = mime.includes("webm") ? "webm" : "m4a";
        setTranscribing(true);
        try {
          const r = await sttFn({ data: { audioBase64: b64, format } });
          setText((p) => (p ? p + " " : "") + r.text);
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : "Transcription failed");
        } finally {
          setTranscribing(false);
        }
      };
      mr.start();
      recorderRef.current = mr;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  };
  const stopRecording = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* noop */ }
      recognitionRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed && files.length === 0) return;
    onSend(trimmed, files);
    setText("");
    setFiles([]);
  };

  return (
    <div className="px-3 pb-3 pt-1">
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap max-w-3xl mx-auto">
          {files.map((f, i) => (
            <div key={i} className="relative">
              {f.mediaType.startsWith("image/") ? (
                <img src={f.url} alt={f.name} className="h-16 w-16 object-cover rounded-lg" />
              ) : (
                <div className="h-16 px-3 rounded-lg border bg-muted text-xs flex items-center">{f.name}</div>
              )}
              <button
                onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-foreground text-background text-[10px] leading-4"
              >×</button>
            </div>
          ))}
        </div>
      )}
      <div className="max-w-3xl mx-auto rounded-3xl border border-border bg-card shadow-xl shadow-black/5 overflow-hidden">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
          }}
          placeholder={recording ? t("chat.recording") : t("chat.placeholder")}
          rows={1}
          className="w-full resize-none bg-transparent outline-none text-[15px] px-4 pt-3.5 pb-1 max-h-48"
        />
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="flex items-center gap-0.5">
            <IconBtn onClick={() => fileRef.current?.click()} title="Attach file"><Paperclip className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => imageRef.current?.click()} title="Attach image"><ImagePlus className="h-4 w-4" /></IconBtn>
            <IconBtn onClick={() => cameraRef.current?.click()} title="Camera"><Camera className="h-4 w-4" /></IconBtn>
            <IconBtn
              onClick={recording ? stopRecording : startRecording}
              title={recording ? "Stop" : "Voice"}
              className={recording ? "text-destructive animate-pulse" : ""}
            >
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </IconBtn>
            <button
              onClick={() => setMode(mode === "chat" ? "image" : "chat")}
              className="ml-1 text-xs flex items-center gap-1.5 px-2.5 h-8 rounded-full border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition"
              title="Toggle mode"
            >
              {mode === "chat" ? <MessageSquare className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
              <span className="capitalize">{mode}</span>
            </button>
          </div>
          <Button
            onClick={send}
            disabled={disabled || (!text.trim() && files.length === 0)}
            size="icon"
            className="nova-gradient text-white border-0 nova-glow h-9 w-9 rounded-full disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-2">Nova can make mistakes. Verify important info.</p>

      <input ref={fileRef} type="file" hidden onChange={(e) => onPickFiles(e.target.files)} />
      <input ref={imageRef} type="file" accept="image/*" hidden onChange={(e) => onPickFiles(e.target.files)} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPickFiles(e.target.files)} />
    </div>
  );
}

function IconBtn({ children, onClick, title, className = "" }: { children: React.ReactNode; onClick: () => void; title: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`h-8 w-8 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition ${className}`}
    >
      {children}
    </button>
  );
}