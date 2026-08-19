import {
  UIMessage,
  createAgentUIStreamResponse,
  gateway,
  ToolLoopAgent,
  stepCountIs,
} from 'ai';
import { readFileSync } from 'fs';
import path from 'path';
import { generateUUID } from '@/lib/utils';
import { getSession, saveChat, saveMessages, getChatById, updateChatTitleById } from '@/lib/db/queries';
import { getUserCredit, deductCredit } from '@/lib/db/credit-queries';
import { createFileTool } from '@/lib/tools/create-file';
import { readFileTool } from '@/lib/tools/read-file';
import { runCommandTool } from '@/lib/tools/run-command';
import { createSandboxTool } from '@/lib/tools/create-sandbox';
import { getSandboxUrlTool } from '@/lib/tools/get-sandbox-url';
import { todoTool } from '@/lib/tools/todo';
import { taskTool } from '@/lib/tools/task';
import { db } from '@/lib/db';
import { account } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { provider } from "@/lib/provider";
import { generateTitleFromUserMessage } from '../../actions';

export const maxDuration = 120;

export async function POST(req: Request) {
  const {
    messages,
    model,
    chatId,
    source,
  }: {
    messages: UIMessage[];
    model: string;
    chatId?: string;
    source?: { url: string; type: string; username?: string; password?: string; repositoryName?: string };
  } = await req.json();

  const session = await getSession();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  // 0. Check credit balance — user must have credit to use the AI agent
  const userCredit = await getUserCredit(userId);
  if (userCredit <= 0) {
    return new Response(
      JSON.stringify({
        error: 'Insufficient credit',
        message: 'You have no credit balance. Please top up your credit to continue.',
        code: 'INSUFFICIENT_CREDIT',
      }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 1. Pastikan chat ada, jika belum, buat chat baru
  const existingChat = await getChatById({ id: chatId });
  let titlePromise: Promise<string> | null = null;

  if (!existingChat) {
    await saveChat({
      id: chatId,
      userId: session.user.id,
      title: "New chat",
      visibility: 'private',
    });
    titlePromise = generateTitleFromUserMessage({ message: messages[0] });
  }

  // 2. Jika ada source (repository GitHub yang dipilih), ambil token GitHub dari database
  let gitSource = source;
  if (source?.type === 'git' && source.url) {
    // Ambil account GitHub spesifik (bukan Google atau provider lain)
    const [githubAccount] = await db
      .select()
      .from(account)
      .where(
        and(
          eq(account.userId, userId),
          eq(account.providerId, 'github')
        )
      )
      .limit(1);

    if (githubAccount?.accessToken) {
      gitSource = {
        ...source,
        password: githubAccount.accessToken,
      };
    }
  }

  // 3. Simpan pesan user ke database sebelum memulai streaming
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    await saveMessages({
      messages: [{
        id: generateUUID(),
        chatId,
        role: lastUserMessage.role,
        parts: lastUserMessage.parts,
        attachments: (lastUserMessage as any).attachments || [],
        createdAt: new Date(),
      }]
    });
  }

  // 4. Inject source instructions jika ada repository yang dipilih
  const sourceInstructionsPath = path.join(process.cwd(), 'lib/prompts/source-instructions.md');
  const instructionsPath = path.join(process.cwd(), 'lib/prompts/instructions.md');

  const baseInstructions = readFileSync(instructionsPath, 'utf-8');

  let sourceInstructions = '';
  if (gitSource?.url) {
    const sourceTemplate = readFileSync(sourceInstructionsPath, 'utf-8').trimEnd();
    sourceInstructions = '\n\n' + sourceTemplate
      .replace(/{{repositoryName}}/g, gitSource.repositoryName || gitSource.url)
      .replace(/{{url}}/g, gitSource.url)
      .replace(/{{password}}/g, gitSource.password || '');
  }

  const instructions = baseInstructions.replace('{{sourceInstructions}}', sourceInstructions);

  let generationId: string | undefined;

  const vibecodeAgent = new ToolLoopAgent({
    model: provider.languageModel(model),
    instructions: instructions,
    tools: {
      createSandbox: createSandboxTool,
      createFile: createFileTool,
      readFile: readFileTool,
      runCommand: runCommandTool,
      getSandboxUrl: getSandboxUrlTool,
      todoList: todoTool,
      task: taskTool,
    },
    stopWhen: stepCountIs(150),
  });

  return createAgentUIStreamResponse({
    agent: vibecodeAgent,
    uiMessages: messages,
    messageMetadata: ({ part }) => {
      if (!generationId && 'providerMetadata' in part) {
        const partGenerationId = part.providerMetadata?.gateway?.generationId;

        if (typeof partGenerationId === 'string' && partGenerationId.length > 0) {
          generationId = partGenerationId;
        }
      }

      return undefined;
    },
    onFinish: async ({ messages: finalMessages }) => {
      // 3. Simpan hanya pesan asisten & tool ke database (user messages sudah disimpan sebelumnya)
      const messagesToSave = finalMessages
        .filter((msg) => msg.role !== 'user')
        .map((msg) => ({
          id: generateUUID(),
          chatId,
          role: msg.role,
          parts: msg.parts,
          attachments: (msg as any).attachments || [],
          createdAt: new Date(),
        }));

      if (messagesToSave.length > 0) {
        await saveMessages({ messages: messagesToSave });
      }

      if (titlePromise) {
        const title = await titlePromise;
        if (title) {
          await updateChatTitleById({ chatId, title });
        }
      }

      // 5. Look up each gateway generation and deduct the official total cost.
      try {
        let totalCost = 0;
        let generationCount = 0;

        if (generationId) {
          const generation = await gateway.getGenerationInfo({ id: generationId });
          if (Number.isFinite(generation.totalCost) && generation.totalCost > 0) {
            totalCost += generation.totalCost;
            generationCount++;
          }
        }

        if (totalCost > 0) {
          await deductCredit({
            userId,
            amount: totalCost,
            description: `AI usage: ${model} (${generationCount} generation(s))`,
            chatId,
          });
          console.log(`Deducted $${totalCost.toFixed(6)} from user ${userId} for ${generationCount} generation(s)`);
        }
      } catch (costError) {
        console.error('Failed to process AI usage cost:', costError);
      }
    },
  });
}