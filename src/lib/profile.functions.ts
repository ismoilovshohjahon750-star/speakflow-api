import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, plan")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    let signedAvatar: string | null = null;
    if (data?.avatar_url) {
      const { data: sig } = await supabase.storage
        .from("avatars")
        .createSignedUrl(data.avatar_url, 60 * 60 * 6);
      signedAvatar = sig?.signedUrl ?? null;
    }
    return { ...(data ?? {}), avatarSignedUrl: signedAvatar };
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { full_name?: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: data.full_name })
      .eq("id", userId);
    if (error) throw error;
    return { ok: true };
  });

export const uploadAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { dataUrl: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const m = /^data:(image\/[\w+.-]+);base64,(.+)$/.exec(data.dataUrl);
    if (!m) throw new Error("Invalid image");
    const mime = m[1];
    const ext = mime.split("/")[1].split("+")[0];
    const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
    const path = `${userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { contentType: mime, upsert: true });
    if (upErr) throw upErr;
    const { error: pErr } = await supabase
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", userId);
    if (pErr) throw pErr;
    const { data: sig } = await supabase.storage
      .from("avatars")
      .createSignedUrl(path, 60 * 60 * 6);
    return { ok: true, signedUrl: sig?.signedUrl ?? null };
  });