import { ChatInterface } from "@/components/chat-interface";
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/db/queries';
import { generateUUID } from "@/lib/utils";

export default async function ChatPage() {
  const session = await getSession();

  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const id = generateUUID();

  return (
    <ChatInterface
      chatId={id}
      initialMessages={[]}
      isOwner={true}
      visibility="private"
    />
  );
}