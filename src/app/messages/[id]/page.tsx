import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversationWithMessages } from "@/lib/db/messages";
import { TopMenuBar } from "@/components/top-menu-bar";
import { MessageThread } from "@/components/messages/message-thread";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ConversationPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await getConversationWithMessages(id);
  if (!result) notFound();

  const { conversation, messages } = result;
  const isParticipant =
    user.id === conversation.buyer_id || user.id === conversation.seller_id;
  if (!isParticipant) notFound();

  return (
    <>
      <TopMenuBar />
      <MessageThread
        conversation={conversation}
        initialMessages={messages}
        currentUserId={user.id}
      />
    </>
  );
}
