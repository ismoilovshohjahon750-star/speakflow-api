import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listConversations, createConversation } from "@/lib/chat.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/")({
  component: AppIndex,
});

function AppIndex() {
  const nav = useNavigate();
  const listFn = useServerFn(listConversations);
  const createFn = useServerFn(createConversation);

  useEffect(() => {
    (async () => {
      const list = await listFn();
      if (list[0]) {
        nav({ to: "/app/c/$threadId", params: { threadId: list[0].id }, replace: true });
      } else {
        const c = await createFn({ data: {} });
        nav({ to: "/app/c/$threadId", params: { threadId: c.id }, replace: true });
      }
    })();
  }, [listFn, createFn, nav]);

  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}