import { NextRequest, NextResponse } from "next/server";
import { getSession, getChatsByUserId, getChatById, updateChatTitleById, updateChatVisibilityById, deleteChatById } from "@/lib/db/queries";
import { ChatbotError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = Number.parseInt(searchParams.get("limit") || "50", 10);
  const startingAfter = searchParams.get("starting_after");
  const endingBefore = searchParams.get("ending_before");

  if (startingAfter && endingBefore) {
    return new ChatbotError(
      "bad_request:api",
      "Only one of starting_after or ending_before can be provided."
    ).toResponse();
  }

  const session = await getSession();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chats = await getChatsByUserId({
    id: session.user.id,
    limit,
    startingAfter,
    endingBefore,
  });

  return Response.json(chats);
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const body = await request.json();
    const { chatId, title } = body;

    if (!chatId || !title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json({ error: "chatId and title are required" }, { status: 400 });
    }

    const chat = await getChatById({ id: chatId });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await updateChatTitleById({ chatId, title: title.trim() });

    return NextResponse.json({ success: true, title: title.trim() });
  } catch (error) {
    console.error("Failed to update chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const body = await request.json();
    const { chatId, visibility } = body;

    if (!chatId || !visibility || !["public", "private"].includes(visibility)) {
      return NextResponse.json({ error: "chatId and visibility (public/private) are required" }, { status: 400 });
    }

    const chat = await getChatById({ id: chatId });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await updateChatVisibilityById({ chatId, visibility });

    return NextResponse.json({ success: true, visibility });
  } catch (error) {
    console.error("Failed to update chat visibility:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const { searchParams } = request.nextUrl;
    const chatId = searchParams.get("chatId");

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 });
    }

    const chat = await getChatById({ id: chatId });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    if (chat.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteChatById({ id: chatId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete chat:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}