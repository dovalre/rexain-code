'use client';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import type { ChatMessage } from '@/lib/types';
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from "ai";
import { ChatPanel } from '@/components/chat-panel';
import { PreviewPanel } from '@/components/preview-panel';
import type { Repository } from '@/components/repository-selector';

interface ChatInterfaceProps {
  chatId: string;
  initialMessages: ChatMessage[];
  isOwner: boolean;
  visibility: 'public' | 'private';
}

/**
 * Extract repository name from a GitHub clone URL.
 * e.g. "https://github.com/owner/repo.git" → "repo"
 *      "https://github.com/owner/repo" → "repo"
 */
function extractRepoNameFromUrl(url: string): string | null {
  try {
    // Remove trailing .git
    const cleanUrl = url.replace(/\.git$/, '');
    const parts = cleanUrl.split('/');
    return parts[parts.length - 1] || null;
  } catch {
    return null;
  }
}

export function ChatInterface({
  chatId,
  initialMessages,
  isOwner,
  visibility,
}: ChatInterfaceProps) {
  const [selectedRepository, setSelectedRepository] =
    useState<Repository | null>(null);
  
  const { messages, setMessages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/agent",
    }),
  } as any);

  // Track current preview URL (from AI tool or from user navigation in iframe)
  const [currentPreviewUrl, setCurrentPreviewUrl] = useState<string | undefined>(undefined);

  // --- Auto-detect source repository from createSandbox tool output ---
  const autoSelectRepo = useCallback(async (msgs: any[]) => {
    if (msgs.length === 0) return;

    // Skip if already selected
    if (selectedRepository) return;

    // Scan messages for createSandbox tool invocation with source
    let sourceUrl: string | null = null;

    for (const msg of msgs) {
      if (!msg.parts) continue;

      for (const part of msg.parts) {
        const p = part as any;
        const partType: string = p.type || '';

        const isTool =
          partType.startsWith('tool-') || partType === 'dynamic-tool';
        if (!isTool) continue;

        const toolName =
          partType === 'dynamic-tool'
            ? p.toolName
            : partType.slice('tool-'.length);

        if (toolName !== 'createSandbox') continue;

        // Priority 1: Read sourceUrl from tool output (always saved to DB)
        const output = p.output as any;
        if (output?.sourceUrl) {
          sourceUrl = output.sourceUrl;
          break;
        }

        // Priority 2: Fallback to input args
        const input = p.input as any;
        if (input?.source?.url) {
          sourceUrl = input.source.url;
          break;
        }
      }
      if (sourceUrl) break;
    }

    if (!sourceUrl) return;

    const repoName = extractRepoNameFromUrl(sourceUrl);
    if (!repoName) return;

    // Fetch repository list to find the matching repo
    try {
      const res = await fetch('/api/github/repos');
      const data = await res.json();
      const repos: Repository[] = data.repositories || [];

      const matchingRepo = repos.find(
        (r) => r.name === repoName
      );
      if (matchingRepo) {
        setSelectedRepository(matchingRepo);
      }
    } catch (err) {
      console.warn('[ChatInterface] Failed to fetch repos for auto-select:', err);
    }
  }, [selectedRepository]);

  // Run auto-select on mount with initialMessages
  useEffect(() => {
    autoSelectRepo(initialMessages);
  }, [autoSelectRepo, initialMessages]);

  // Also run auto-select when live messages update (for new sandbox creation)
  useEffect(() => {
    if (messages.length > 0) {
      autoSelectRepo(messages);
    }
  }, [messages, autoSelectRepo]);
  // --- End auto-detect ---

  // Set pesan dari database ke Chat instance ketika messages kosong
  // Penting: tidak pakai initialized guard karena StrictMode mount 2x
  const prevChatId = useRef(chatId);
  useEffect(() => {
    if (initialMessages.length === 0) return;

    // Ganti chatId → reset + set messages baru
    if (prevChatId.current !== chatId) {
      prevChatId.current = chatId;
    }

    const id = setTimeout(() => {
      setMessages(initialMessages as any);
    }, 0);
    return () => clearTimeout(id);
  }, [initialMessages, setMessages, chatId]);

  // Extract sandbox metadata + saved files from AI tool results in messages
  const sandboxData = useMemo(() => {
    let sandboxName: string | undefined;
    let previewUrl: string | undefined;
    let runCommandCalls: Array<{
      cmdId: string;
      command: string;
      args?: string[];
    }> = [];
    const savedFiles: Array<{
      path: string;
      content: string;
      language: string;
    }> = [];

    // Scan all message parts for tool invocations with output
    for (const msg of messages) {
      if (!msg.parts) continue;

      for (const part of msg.parts) {
        const p = part as any;
        const partType: string = p.type || '';

        const isTool =
          partType.startsWith('tool-') || partType === 'dynamic-tool';
        if (!isTool) continue;
        if (p.state !== 'output-available') continue;

        const toolName =
          partType === 'dynamic-tool'
            ? p.toolName
            : partType.slice('tool-'.length);

        const result = p.output;
        if (!result) continue;

        if (toolName === 'createSandbox' && result.sandboxName) {
          sandboxName = result.sandboxName;
        }

        if (toolName === 'createFile' && result.path) {
          const ext = result.path.split('.').pop()?.toLowerCase() ?? '';
          const langMap: Record<string, string> = {
            ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
            json: 'json', md: 'markdown', css: 'css', scss: 'scss',
            html: 'html', py: 'python', rs: 'rust', go: 'go',
            yml: 'yaml', yaml: 'yaml', sh: 'bash', bash: 'bash',
            sql: 'sql', mjs: 'javascript',
          };
          // Hanya simpan file terakhir untuk setiap path (deduplikasi)
          const existingIdx = savedFiles.findIndex(f => f.path === result.path);
          const fileEntry = {
            path: result.path,
            content: result.content || '',
            language: (langMap[ext] || 'txt') as any,
          };
          if (existingIdx >= 0) {
            savedFiles[existingIdx] = fileEntry;
          } else {
            savedFiles.push(fileEntry);
          }
        }

        if (toolName === 'getSandboxUrl' && result.previewUrl) {
          previewUrl = result.previewUrl;
        }

        if (toolName === 'runCommand' && result.cmdId) {
          runCommandCalls.push({
            cmdId: result.cmdId,
            command: result.command,
            args: result.args,
          });
        }
      }
    }

    return { sandboxName, previewUrl, runCommandCalls, savedFiles };
  }, [messages]);

  // Sync currentPreviewUrl with sandboxData.previewUrl when AI provides a new URL
  useEffect(() => {
    if (sandboxData.previewUrl) {
      setCurrentPreviewUrl(sandboxData.previewUrl);
    }
  }, [sandboxData.previewUrl]);

  // Handle URL change from PreviewPanel (iframe navigation, back/forward, URL bar input)
  const handlePreviewUrlChange = useCallback((url: string) => {
    setCurrentPreviewUrl(url);
  }, []);

  // Update URL ke /chat/[id] ketika user mengirim pesan pertama
  // Pakai replaceState agar tidak trigger server roundtrip (chat belum disimpan di DB)
  const prevMessageCount = useRef(0);
  useEffect(() => {
    if (prevMessageCount.current === 0 && messages.length > 0) {
      window.history.replaceState(null, '', `/chat/${chatId}`);
    }
    prevMessageCount.current = messages.length;
  }, [messages.length, chatId]);

  // Debug: log sandbox data whenever it changes
  useEffect(() => {
    if (sandboxData.sandboxName || sandboxData.previewUrl) {
      console.log('[ChatInterface] sandboxData:', sandboxData);
    }
  }, [sandboxData]);

  const isLanding = messages.length === 0 && initialMessages.length === 0;

  const chatPanelContent = (
    <ChatPanel
      messages={messages}
      sendMessage={sendMessage}
      status={status}
      chatId={chatId}
      selectedRepository={selectedRepository}
      onRepositorySelect={setSelectedRepository}
      isLanding={isLanding}
    />
  );

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="h-screen flex flex-col">
        {(currentPreviewUrl || sandboxData.previewUrl) ? (
          <ResizablePanelGroup className="flex-1">
            {/* Chat Panel */}
            <ResizablePanel defaultSize={50} minSize={30}>
              <div className="h-full p-6 overflow-hidden">
                {chatPanelContent}
              </div>
            </ResizablePanel>

            {/* Resizable Divider */}
            <ResizableHandle withHandle />

            {/* Preview Panel */}
            <ResizablePanel defaultSize={50} minSize={20}>
              <div className="h-full overflow-hidden">
                <PreviewPanel
                  sandboxName={sandboxData.sandboxName}
                  previewUrl={currentPreviewUrl || sandboxData.previewUrl}
                  initialFiles={sandboxData.savedFiles.map(f => ({ path: f.path, name: f.path.split('/').pop() || f.path }))}
                  runCommandCalls={sandboxData.runCommandCalls}
                  repoUrl={selectedRepository?.clone_url}
                  onUrlChange={handlePreviewUrlChange}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : isLanding ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-3xl h-full flex flex-col">
              {chatPanelContent}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-6 overflow-hidden">
            <div className="w-full max-w-3xl mx-auto h-full flex flex-col">
              {chatPanelContent}
            </div>
          </div>
        )}
      </SidebarInset>
    </SidebarProvider>
  );
}