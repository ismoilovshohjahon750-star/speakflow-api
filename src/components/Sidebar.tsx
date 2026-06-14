import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listConversations, createConversation, deleteConversation, getCredits } from "@/lib/chat.functions";
import { getProfile } from "@/lib/profile.functions";
import { Plus, Trash2, User, CreditCard, LogOut, MessageSquare } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageToggle } from "./LanguageToggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

export function Sidebar() {
  const { t } = useI18n();
  const nav = useNavigate();
  const qc = useQueryClient();
  const params = useParams({ strict: false }) as { threadId?: string };

  const listFn = useServerFn(listConversations);
  const createFn = useServerFn(createConversation);
  const delFn = useServerFn(deleteConversation);
  const creditsFn = useServerFn(getCredits);
  const profileFn = useServerFn(getProfile);

  const { data: conversations = [] } = useQuery({ queryKey: ["conversations"], queryFn: () => listFn() });
  const { data: credits } = useQuery({ queryKey: ["credits"], queryFn: () => creditsFn(), refetchInterval: 15000 });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => profileFn() });

  const createM = useMutation({
    mutationFn: () => createFn({ data: {} }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      nav({ to: "/app/c/$threadId", params: { threadId: row.id } });
    },
  });

  const delM = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (params.threadId === id) nav({ to: "/app" });
    },
  });

  const signOut = async () => {
    await supabase.auth.signOut();
    nav({ to: "/" });
  };

  const initials = (profile?.full_name || profile?.email || "U").slice(0, 1).toUpperCase();

  return (
    <aside className="w-72 shrink-0 h-screen border-r border-border bg-card flex flex-col">
      <div className="px-4 py-4 flex items-center justify-between">
        <Link to="/app"><Logo /></Link>
        <LanguageToggle />
      </div>
      <div className="px-3">
        <Button
          onClick={() => createM.mutate()}
          disabled={createM.isPending}
          className="w-full nova-gradient text-white border-0 nova-glow"
        >
          <Plus className="h-4 w-4 mr-1" /> {t("chat.new")}
        </Button>
      </div>
      <div className="mt-3 flex-1 overflow-y-auto px-2">
        {conversations.map((c) => {
          const active = params.threadId === c.id;
          return (
            <div
              key={c.id}
              className={`group flex items-center justify-between gap-1 px-2 py-2 rounded-lg text-sm cursor-pointer ${
                active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
              }`}
            >
              <Link
                to="/app/c/$threadId"
                params={{ threadId: c.id }}
                className="flex-1 truncate flex items-center gap-2"
              >
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="truncate">{c.title || "New chat"}</span>
              </Link>
              <button
                onClick={(e) => { e.stopPropagation(); delM.mutate(c.id); }}
                className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="border-t border-border p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("profile.credits")}</span>
          <span className="font-mono font-semibold">{credits?.balance ?? "—"}</span>
        </div>
        <Link to="/app/pricing" className="block">
          <Button variant="outline" size="sm" className="w-full">
            <CreditCard className="h-3.5 w-3.5 mr-1" /> {t("profile.upgrade")}
          </Button>
        </Link>
        <Link to="/app/profile" className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted">
          <Avatar className="h-8 w-8">
            {profile?.avatarSignedUrl && <AvatarImage src={profile.avatarSignedUrl} />}
            <AvatarFallback className="nova-gradient text-white text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-xs flex-1 truncate">
            <div className="font-medium truncate">{profile?.full_name || profile?.email}</div>
            <div className="text-muted-foreground capitalize">{profile?.plan || "free"}</div>
          </div>
          <User className="h-4 w-4 text-muted-foreground" />
        </Link>
        <button
          onClick={signOut}
          className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1 py-1"
        >
          <LogOut className="h-3 w-3" /> {t("nav.signout")}
        </button>
      </div>
    </aside>
  );
}