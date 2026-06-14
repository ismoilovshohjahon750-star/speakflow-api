import type { SupabaseClient } from "@supabase/supabase-js";

export async function getBalance(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.balance ?? 0;
}

export async function spendCredits(userId: string, cost: number) {
  if (cost <= 0) return;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  const balance = data?.balance ?? 0;
  if (balance < cost) throw new Error("INSUFFICIENT_CREDITS");
  const { error: upErr } = await supabaseAdmin
    .from("credits")
    .update({ balance: balance - cost, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (upErr) throw upErr;
}

export async function grantCredits(userId: string, amount: number) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("credits")
    .select("balance")
    .eq("user_id", userId)
    .maybeSingle();
  const balance = data?.balance ?? 0;
  await supabaseAdmin
    .from("credits")
    .upsert({ user_id: userId, balance: balance + amount, updated_at: new Date().toISOString() });
}