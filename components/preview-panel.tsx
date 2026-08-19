'use client';

import type { BundledLanguage } from 'shiki';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  WebPreview,
  WebPreviewNavigation,
  WebPreviewNavigationButton,
  WebPreviewUrl,
  WebPreviewBody,
  WebPreviewConsole,
} from '@/components/ai-elements/web-preview';
import {
  FileTree,
  FileTreeFolder,
  FileTreeFile,
} from '@/components/ai-elements/file-tree';
import { CodeBlock } from '@/components/ai-elements/code-block';
import {
  AppWindowIcon,
  CodeIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  RefreshCcwIcon,
  ExternalLinkIcon,
  Maximize2Icon,
  FileIcon,
  FolderOpenIcon,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import React from 'react';
import { CommitDialog } from '@/components/commit-dialog';

export interface PreviewPanelProps {
  sandboxName?: string;
  previewUrl?: string;
  initialFiles?: Array<{ path: string; name: string }>;
  runCommandCalls?: Array<{ cmdId: string; command: string; args?: string[] }>;
  repoUrl?: string;
  onUrlChange?: (url: string) => void;
}

interface FileItem {
  path: string;
  name: string;
}

interface LogEntry {
  level: 'log' | 'error' | 'warn';
  message: string;
  timestamp: Date;
}

const LANG_MAP: Record<string, string> = {
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', json: 'json', md: 'markdown',
  css: 'css', scss: 'scss', html: 'html', py: 'python', rs: 'rust', go: 'go', rb: 'ruby',
  php: 'php', yml: 'yaml', yaml: 'yaml', sh: 'bash', bash: 'bash', sql: 'sql', mjs: 'javascript',
  svelte: 'svelte', vue: 'vue', astro: 'astro', tf: 'hcl', dockerfile: 'dockerfile', env: 'dotenv',
};

// Module-level guard: hanya cek sandbox SEKALI seumur hidup aplikasi
const sandboxChecked = new Set<string>();
// Module-level guard: hanya stream logs SEKALI per cmdId seumur hidup aplikasi
const streamedCmdIds = new Set<string>();

function buildFileTree(files: FileItem[]): React.ReactNode {
  if (files.length === 0) return null;

  const folderMap = new Map<string, FileItem[]>();
  const rootFiles: FileItem[] = [];

  for (const file of files) {
    const parts = file.path.split('/');
    if (parts.length > 1) {
      const folderName = parts[0];
      if (!folderMap.has(folderName)) folderMap.set(folderName, []);
      folderMap.get(folderName)!.push(file);
    } else {
      rootFiles.push(file);
    }
  }

  function renderFolder(prefix: string, folderFiles: FileItem[]): React.ReactNode {
    const prefixSlash = prefix + '/';
    const subFolderMap = new Map<string, FileItem[]>();
    const directFiles: FileItem[] = [];

    for (const file of folderFiles) {
      if (!file.path.startsWith(prefixSlash)) continue;
      const relativePath = file.path.slice(prefixSlash.length);
      const parts = relativePath.split('/');
      if (parts.length > 1) {
        const subFolder = parts[0];
        if (!subFolderMap.has(subFolder)) subFolderMap.set(subFolder, []);
        subFolderMap.get(subFolder)!.push(file);
      } else {
        directFiles.push({ path: file.path, name: parts[0] });
      }
    }

    const nodes: React.ReactNode[] = [];
    for (const [subName, subFiles] of subFolderMap) {
      nodes.push(renderFolder(prefix + '/' + subName, subFiles));
    }
    for (const file of directFiles) {
      nodes.push(<FileTreeFile key={file.path} name={file.name} path={file.path} />);
    }

    return (
      <FileTreeFolder key={prefix} name={prefix.split('/').pop() || prefix} path={prefix}>
        {nodes}
      </FileTreeFolder>
    );
  }

  const allNodes: React.ReactNode[] = [];
  for (const [folderName, folderFiles] of folderMap) {
    allNodes.push(renderFolder(folderName, folderFiles));
  }
  for (const file of rootFiles) {
    allNodes.push(<FileTreeFile key={file.path} name={file.name} path={file.path} />);
  }

  return <>{allNodes}</>;
}

export function PreviewPanel({
  sandboxName,
  previewUrl: propPreviewUrl,
  initialFiles,
  runCommandCalls = [],
  repoUrl: propRepoUrl,
  onUrlChange,
}: PreviewPanelProps) {
  const [selectedPath, setSelectedPath] = useState<string | undefined>(
    initialFiles?.[0]?.path
  );
  const [files, setFiles] = useState<FileItem[]>(initialFiles || []);
  const [fileContent, setFileContent] = useState<string>('');
  const [fileLanguage, setFileLanguage] = useState<string>('txt');
  // formUrl = URL yang ditampilkan di URL bar DAN dimuat sebagai src iframe
  const [formUrl, setFormUrl] = useState(propPreviewUrl || '/');
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('preview');
  const [previewKey, setPreviewKey] = useState(0);

  // Navigasi history iframe-only (tidak mempengaruhi window utama)
  const [urlHistory, setUrlHistory] = useState<string[]>([propPreviewUrl || '/']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [iframeKey, setIframeKey] = useState(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const urlHistoryRef = useRef(urlHistory);
  const historyIndexRef = useRef(historyIndex);
  const onUrlChangeRef = useRef(onUrlChange);

  // Sync refs with latest state values to avoid stale closures in callbacks
  urlHistoryRef.current = urlHistory;
  historyIndexRef.current = historyIndex;
  onUrlChangeRef.current = onUrlChange;

  // Sync initialFiles when they change
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setFiles(initialFiles);
    }
  }, [initialFiles]);

  // Sync preview URL dari luar HANYA saat AI memberikan URL baru.
  // Setelah itu, URL bar dan iframe src dikendalikan oleh navigasi user (formUrl),
  // bukan oleh propPreviewUrl. Ini mencegah URL bar tidak sinkron dengan iframe.
  const propPreviewUrlRef = useRef(propPreviewUrl);
  useEffect(() => {
    if (!propPreviewUrl || propPreviewUrl === '/') return;
    // Track latest propPreviewUrl we've seen
    propPreviewUrlRef.current = propPreviewUrl;
    // Skip if URL bar already matches (user navigated to same URL, or URL came back from parent)
    if (propPreviewUrl === formUrl) return;

    setPreviewKey((k) => k + 1);
    setFormUrl(propPreviewUrl);
    // Push ke history iframe
    const newUrls = urlHistory.slice(0, historyIndex + 1);
    if (newUrls[newUrls.length - 1] !== propPreviewUrl) {
      newUrls.push(propPreviewUrl);
      setUrlHistory(newUrls);
      setHistoryIndex(newUrls.length - 1);
    }
    setIframeKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propPreviewUrl]);

  // Stream logs dari API untuk setiap runCommand (cmdId)
  // Hanya stream cmdId yang BELUM pernah di-stream — mencegah spam API
  useEffect(() => {
    if (!sandboxName || runCommandCalls.length === 0) return;

    const abortController = new AbortController();

    async function streamLogs(
      name: string,
      cmdId: string,
      command: string,
      signal: AbortSignal
    ) {
      try {
        const res = await fetch(
          `/api/sandboxes/${name}/cmds/${cmdId}/logs`,
          { signal }
        );
        if (!res.ok || !res.body) return;

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // Tambahkan header log untuk command ini
        setConsoleLogs((prev) => [
          ...prev,
          {
            level: 'log',
            message: `$ ${command}${prev.length > 0 ? '' : ''}`,
            timestamp: new Date(),
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const parsed = JSON.parse(line);
              const streamType: string = parsed.stream || 'stdout';
              const logData: string = parsed.data || '';
              const ts = parsed.timestamp
                ? new Date(parsed.timestamp)
                : new Date();

              setConsoleLogs((prev) => [
                ...prev,
                {
                  level: streamType === 'stderr' ? 'error' : 'log',
                  message: logData,
                  timestamp: ts,
                },
              ]);
            } catch {
              // Baris tidak valid JSON, lewati
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.warn('[PreviewPanel] Failed to stream logs:', err);
        }
      }
    }

    // Hanya stream cmdId yang belum pernah di-stream
    const newCommands = runCommandCalls.filter(
      (cmd) => !streamedCmdIds.has(cmd.cmdId)
    );

    for (const cmd of newCommands) {
      streamedCmdIds.add(cmd.cmdId);
      streamLogs(
        sandboxName,
        cmd.cmdId,
        `${cmd.command}${cmd.args ? ' ' + cmd.args.join(' ') : ''}`,
        abortController.signal
      );
    }

    return () => {
      abortController.abort();
    };
  }, [sandboxName, runCommandCalls]);

  // Cek status sandbox SEKALI — untuk restart jika stopped
  useEffect(() => {
    if (!sandboxName) return;
    if (sandboxChecked.has(sandboxName)) return;
    sandboxChecked.add(sandboxName);

    let cancelled = false;

    async function checkSandbox() {
      try {
        const res = await fetch(`/api/sandboxes/${sandboxName}`);
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (data.status === 'running') {
          console.log(`[PreviewPanel] Sandbox ${sandboxName} is running`);
        } else {
          console.log(`[PreviewPanel] Sandbox ${sandboxName} status: ${data.status}`);
        }
      } catch (err) {
        console.warn('[PreviewPanel] Failed to check sandbox:', err);
      }
    }

    checkSandbox();

    return () => {
      cancelled = true;
    };
  }, [sandboxName]);

  const handleFileSelect = useCallback(
    async (path: string) => {
      setSelectedPath(path);

      // Check if it's a folder
      if (files.some(f => f.path.startsWith(path + '/') && f.path !== path)) return;

      if (!sandboxName) {
        setFileContent('// Sandbox not available');
        setFileLanguage('text');
        return;
      }

      setLoading(true);
      try {
        const res = await fetch(
          `/api/sandboxes/${sandboxName}/files?path=${encodeURIComponent(path)}`
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          setFileContent(`// Error: ${errData?.error || res.statusText}`);
          setFileLanguage('text');
        } else {
          const content = await res.text();
          const ext = path.split('.').pop()?.toLowerCase() ?? '';
          setFileContent(content);
          setFileLanguage(LANG_MAP[ext] || 'txt');
        }
      } catch (err: any) {
        setFileContent(`// Error: ${err.message}`);
        setFileLanguage('text');
      } finally {
        setLoading(false);
      }
    },
    [sandboxName, files]
  );

  // Navigasi iframe-only: push URL baru ke history (user explicit navigation via URL bar)
  const navigateToUrl = useCallback((newUrl: string) => {
    setFormUrl(newUrl);
    onUrlChangeRef.current?.(newUrl);
    const currentHistory = urlHistoryRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentHistory[currentIndex] === newUrl) return;
    const newUrls = currentHistory.slice(0, currentIndex + 1);
    newUrls.push(newUrl);
    setUrlHistory(newUrls);
    setHistoryIndex(newUrls.length - 1);
    setIframeKey((k) => k + 1);
  }, []);

  // Iframe navigasi internal: update URL bar + history (dari onLoad handler)
  const handleIframeUrlChange = useCallback((newUrl: string) => {
    setFormUrl(newUrl);
    onUrlChangeRef.current?.(newUrl);
    const currentHistory = urlHistoryRef.current;
    const currentIndex = historyIndexRef.current;
    if (currentHistory[currentIndex] === newUrl) return;
    const newUrls = currentHistory.slice(0, currentIndex + 1);
    newUrls.push(newUrl);
    setUrlHistory(newUrls);
    setHistoryIndex(newUrls.length - 1);
  }, []);

  // Go back hanya di iframe
  const goBack = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    if (currentIndex <= 0) return;
    const newIndex = currentIndex - 1;
    const newUrl = urlHistoryRef.current[newIndex];
    setHistoryIndex(newIndex);
    setFormUrl(newUrl);
    onUrlChangeRef.current?.(newUrl);
    setIframeKey((k) => k + 1);
  }, []);

  // Go forward hanya di iframe
  const goForward = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    const currentHistory = urlHistoryRef.current;
    if (currentIndex >= currentHistory.length - 1) return;
    const newIndex = currentIndex + 1;
    const newUrl = currentHistory[newIndex];
    setHistoryIndex(newIndex);
    setFormUrl(newUrl);
    onUrlChangeRef.current?.(newUrl);
    setIframeKey((k) => k + 1);
  }, []);

  // Reload hanya iframe
  const reloadIframe = useCallback(() => {
    setIframeKey((k) => k + 1);
  }, []);

  // Fullscreen hanya pada container preview
  const toggleFullscreen = useCallback(() => {
    if (!previewContainerRef.current) return;
    if (!document.fullscreenElement) {
      previewContainerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  const displayFile = selectedPath
    ? { path: selectedPath, content: fileContent, language: fileLanguage as BundledLanguage }
    : { path: 'No file selected', content: '', language: 'text' as BundledLanguage };

  return (
    <div className="h-full flex flex-col bg-background border-t">
      <Tabs
        defaultValue="preview"
        className="flex h-full flex-col"
        onValueChange={setActiveTab}
      >
        <TabsList className="justify-start rounded-none border-b bg-muted/40">
          <TabsTrigger value="preview" className="flex gap-2">
            <AppWindowIcon className="size-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="code" className="flex gap-2">
            <CodeIcon className="size-4" />
            Code
          </TabsTrigger>
          {sandboxName ? (
            <>
              <div className="ml-auto flex items-center gap-2">
                <CommitDialog
                  sandboxName={sandboxName}
                  repoUrl={propRepoUrl}
                />
                <span className="px-3 py-1 text-xs text-muted-foreground truncate max-w-[200px] font-mono">
                  {sandboxName}
                </span>
              </div>
            </>
          ) : null}
        </TabsList>

        <TabsContent value="preview" className="flex-1 min-h-0 p-0 m-0">
          <div className="h-full" ref={previewContainerRef}>
            <WebPreview key={previewKey} defaultUrl={formUrl || '/'} onUrlChange={navigateToUrl}>
              <WebPreviewNavigation>
                <WebPreviewNavigationButton onClick={goBack} disabled={historyIndex <= 0} tooltip="Go back">
                  <ArrowLeftIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewNavigationButton onClick={goForward} disabled={historyIndex >= urlHistory.length - 1} tooltip="Go forward">
                  <ArrowRightIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewNavigationButton onClick={reloadIframe} tooltip="Reload">
                  <RefreshCcwIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewUrl placeholder="Your app here..." />
                <WebPreviewNavigationButton
                  onClick={() => formUrl !== '/' && window.open(formUrl, '_blank')}
                  tooltip="Open in new tab"
                >
                  <ExternalLinkIcon className="size-4" />
                </WebPreviewNavigationButton>
                <WebPreviewNavigationButton onClick={toggleFullscreen} tooltip="Maximize">
                  <Maximize2Icon className="size-4" />
                </WebPreviewNavigationButton>
              </WebPreviewNavigation>
              <WebPreviewBody key={iframeKey} src={formUrl || '/'} onUrlChange={handleIframeUrlChange} />
              <WebPreviewConsole logs={consoleLogs} />
            </WebPreview>
          </div>
        </TabsContent>

        <TabsContent value="code" className="flex-1 min-h-0 p-0 m-0">
          <div className="h-full flex overflow-hidden">
            <div className="w-48 border-r overflow-y-auto bg-muted/20 shrink-0">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <FolderOpenIcon className="size-3" />
                  Files
                </span>
              </div>
              <FileTree selectedPath={selectedPath} onSelect={handleFileSelect as any}>
                {files.length > 0 ? (
                  buildFileTree(files)
                ) : loading ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading files...</div>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground">
                    <FileIcon className="size-4 mb-2 opacity-50" />
                    No files available
                  </div>
                )}
              </FileTree>
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-y-auto">
              {loading && !fileContent ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
                    <p className="text-sm">Loading...</p>
                  </div>
                </div>
              ) : fileContent ? (
                <div className="w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_pre]:!overflow-visible [&_pre]:!overflow-y-visible">
                  <CodeBlock
                    code={fileContent}
                    language={fileLanguage as BundledLanguage}
                    showLineNumbers
                    className="w-full rounded-none border-0"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <p>Select a file to view its content</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}