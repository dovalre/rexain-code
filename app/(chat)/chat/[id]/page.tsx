import { notFound, redirect } from "next/navigation";
import { convertToUIMessages } from "@/lib/utils";
import {
  getSession,
  getChatById,
  getMessagesByChatId,
} from "@/lib/db/queries";
import { ChatInterface } from "@/components/chat-interface";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chat = await getChatById({ id });

  if (!chat) {
    redirect("/");
  }

  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  if (chat.visibility === "private") {
    if (!session.user) {
      return notFound();
    }
    if (session.user.id !== chat.userId) {
      return notFound();
    }
  }
 
  const messagesFromDb = await getMessagesByChatId({ id });
 
  const initialMessages = convertToUIMessages(messagesFromDb);

  return (
    <ChatInterface
      chatId={id}
      initialMessages={initialMessages}
      isOwner={session?.user?.id === chat.userId}
      visibility={chat.visibility}
    />
  );
}