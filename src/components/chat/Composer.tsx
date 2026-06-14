import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Send, Paperclip, ImagePlus, Camera, MessageSquare, ImageIcon, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { stt } from "@/lib/ai.functions";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

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
    recorderRef.current?.stop();
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
    <div className="border-t border-border bg-card p-3">
      {files.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
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
      <div className="flex items-end gap-2">
        <div className="flex items-center gap-1">
          <IconBtn onClick={() => fileRef.current?.click()} title="File"><Paperclip className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={() => imageRef.current?.click()} title="Image"><ImagePlus className="h-4 w-4" /></IconBtn>
          <IconBtn onClick={() => cameraRef.current?.click()} title="Camera"><Camera className="h-4 w-4" /></IconBtn>
          <IconBtn
            onClick={recording ? stopRecording : startRecording}
            title={recording ? "Stop" : "Mic"}
            className={recording ? "text-destructive" : ""}
          >
            {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </IconBtn>
        </div>

        <div className="flex-1 min-w-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={recording ? t("chat.recording") : t("chat.placeholder")}
            rows={1}
            className="w-full resize-none bg-transparent outline-none text-sm py-2 max-h-40"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(mode === "chat" ? "image" : "chat")}
            className="text-xs flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-muted"
            title="Mode"
          >
            {mode === "chat" ? <MessageSquare className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
            <span className="capitalize">{mode}</span>
          </button>
          <Button
            onClick={send}
            disabled={disabled || (!text.trim() && files.length === 0)}
            size="icon"
            className="nova-gradient text-white border-0 nova-glow h-10 w-10 rounded-full"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
      className={`h-9 w-9 rounded-full hover:bg-muted text-muted-foreground flex items-center justify-center ${className}`}
    >
      {children}
    </button>
  );
}