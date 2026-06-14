import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, updateProfile, uploadAvatar } from "@/lib/profile.functions";
import { getCredits } from "@/lib/chat.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const profileFn = useServerFn(getProfile);
  const updateFn = useServerFn(updateProfile);
  const uploadFn = useServerFn(uploadAvatar);
  const creditsFn = useServerFn(getCredits);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });
  const { data: credits } = useQuery({ queryKey: ["credits"], queryFn: () => creditsFn() });
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (profile?.full_name) setName(profile.full_name); }, [profile?.full_name]);

  const onAvatar = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await uploadFn({ data: { dataUrl: reader.result as string } });
        qc.invalidateQueries({ queryKey: ["profile"] });
        toast.success("Avatar updated");
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Upload failed");
      }
    };
    reader.readAsDataURL(file);
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await updateFn({ data: { full_name: name } });
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Saved");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally { setSaving(false); }
  };

  const initial = (profile?.full_name || profile?.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("profile.title")}</h1>

        <Card>
          <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  {profile?.avatarSignedUrl && <AvatarImage src={profile.avatarSignedUrl} />}
                  <AvatarFallback className="nova-gradient text-white text-xl">{initial}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full nova-gradient text-white flex items-center justify-center nova-glow"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && onAvatar(e.target.files[0])}
                />
              </div>
              <div className="text-sm">
                <div className="font-medium">{profile?.email}</div>
                <div className="text-muted-foreground text-xs mt-1">{t("profile.avatar")}</div>
              </div>
            </div>

            <div>
              <Label htmlFor="name">{t("profile.name")}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <Button onClick={onSave} disabled={saving} className="nova-gradient text-white border-0">
              {t("profile.save")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">{t("profile.plan")}</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-semibold capitalize nova-text">{profile?.plan || "free"}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {t("profile.credits")}: <span className="font-mono font-semibold text-foreground">{credits?.balance ?? "—"}</span>
                </div>
              </div>
              <Link to="/app/pricing">
                <Button className="nova-gradient text-white border-0 nova-glow">{t("profile.upgrade")}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}