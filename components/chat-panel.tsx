'use client';

import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
  MessageToolbar,
} from '@/components/ai-elements/message';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input';
import { useRef, useState, useCallback, useEffect } from 'react';
import { Task, TaskTrigger, TaskContent, TaskItem, TaskItemFile } from '@/components/ai-elements/task';
import {
  Queue,
  QueueSection,
  QueueSectionTrigger,
  QueueSectionLabel,
  QueueSectionContent,
  QueueList,
  QueueItem as QueueItemUI,
  QueueItemIndicator,
  QueueItemContent,
  QueueItemDescription,
} from '@/components/ai-elements/queue';
import { CopyIcon, CheckIcon, RefreshCcwIcon, MicIcon, ArrowUpIcon, ListTodoIcon } from 'lucide-react';
import { RepositorySelector, type Repository } from '@/components/repository-selector';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning';
import { Loader } from '@/components/ai-elements/loader';
import { models } from "@/lib/models";

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null;
  }
  return (
    <Attachments variant="inline">
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

export interface ChatPanelProps {
  messages: any[];
  sendMessage: (message: { text: string; files?: any[] }, options?: any) => void;
  status: any;
  chatId: string;
  selectedRepository: Repository | null;
  onRepositorySelect: (repo: Repository | null) => void;
  isLanding?: boolean;
}

export function ChatPanel({
  messages,
  sendMessage,
  status,
  chatId,
  selectedRepository,
  onRepositorySelect,
  isLanding = false,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [model, setModel] = useState<string>(models[0].id);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedModelData = models.find((m) => m.id === model);
  const chefs = Array.from(new Set(models.map((model) => model.chef)));

  // Recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Cleanup stream on unmount
  useEffect(
    () => () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop();
        }
      }
    },
    []
  );

  const handleSubmit = async (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    let uploadedFiles = message.files;

    // Upload attachments ke /api/upload jika ada
    if (hasAttachments) {
      setIsUploading(true);
      try {
        uploadedFiles = await Promise.all(
          message.files.map(async (file) => {
            // Fetch blob URL untuk mendapatkan file data
            const response = await fetch(file.url);
            const blob = await response.blob();
            const fileObj = new File([blob], file.filename, { type: file.mediaType });

            const formData = new FormData();
            formData.append('file', fileObj);

            const uploadRes = await fetch('/api/upload', {
              method: 'POST',
              body: formData,
            });

            if (!uploadRes.ok) {
              const errData = await uploadRes.json();
              throw new Error(errData.error || 'Upload failed');
            }

            const uploadData = await uploadRes.json();

            return {
              ...file,
              url: uploadData.url,
            };
          })
        );
      } catch (error) {
        console.error('Upload failed:', error);
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const body: Record<string, any> = {
      model: model,
      chatId: chatId,
    };

    // Jika ada repository yang dipilih, kirim source info ke API
    if (selectedRepository) {
      body.source = {
        url: selectedRepository.clone_url,
        type: 'git',
        username: 'x-access-token',
        password: '', // Token akan diisi oleh server dari database
      };
    }

    sendMessage(
      {
        text: message.text || 'Sent with attachments',
        files: uploadedFiles,
      },
      {
        body,
      },
    );
    setInput('');
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      const handleDataAvailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      const handleStop = async () => {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;

        const audioBlob = new Blob(audioChunksRef.current, {
          type: 'audio/webm',
        });

        if (audioBlob.size > 0) {
          try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.webm');

            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (response.ok) {
              const data = await response.json();
              if (data.text) {
                setInput((prev) => prev + data.text);
              }
            }
          } catch (error) {
            console.error('Transcription failed:', error);
          }
        }
      };

      const handleError = () => {
        setIsRecording(false);
        for (const track of stream.getTracks()) {
          track.stop();
        }
        streamRef.current = null;
      };

      mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
      mediaRecorder.addEventListener('stop', handleStop);
      mediaRecorder.addEventListener('error', handleError);

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const handleRetry = () => {
    console.log("Retrying...");
  };

  const isLandingState = isLanding && messages.length === 0;

  if (isLandingState) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <PromptInput globalDrop multiple onSubmit={handleSubmit}>
            <PromptInputAttachmentsDisplay />
            <PromptInputBody>
              <PromptInputTextarea
                onChange={(e) => setInput(e.target.value)}
                ref={textareaRef}
                value={input}
                placeholder="Ask me to build anything..."
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <ModelSelector
                  onOpenChange={setModelSelectorOpen}
                  open={modelSelectorOpen}
                >
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton>
                      {selectedModelData?.chefSlug && (
                        <ModelSelectorLogo
                          provider={selectedModelData.chefSlug}
                        />
                      )}
                      {selectedModelData?.name && (
                        <ModelSelectorName>
                          {selectedModelData.name}
                        </ModelSelectorName>
                      )}
                    </PromptInputButton>
                  </ModelSelectorTrigger>
                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                      {chefs.map((chef) => (
                        <ModelSelectorGroup heading={chef} key={chef}>
                          {models
                            .filter((m) => m.chef === chef)
                            .map((m) => (
                              <ModelSelectorItem
                                key={m.id}
                                onSelect={() => {
                                  setModel(m.id);
                                  setModelSelectorOpen(false);
                                }}
                                value={m.id}
                              >
                                <ModelSelectorLogo provider={m.chefSlug} />
                                <ModelSelectorName>{m.name}</ModelSelectorName>
                                <ModelSelectorLogoGroup>
                                  {m.providers.map((provider) => (
                                    <ModelSelectorLogo
                                      key={provider}
                                      provider={provider}
                                    />
                                  ))}
                                </ModelSelectorLogoGroup>
                                {model === m.id ? (
                                  <CheckIcon className="ml-auto size-4" />
                                ) : (
                                  <div className="ml-auto size-4" />
                                )}
                              </ModelSelectorItem>
                            ))}
                        </ModelSelectorGroup>
                      ))}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>
              <div className="flex items-center gap-2">
                <RepositorySelector
                  selectedRepository={selectedRepository}
                  onRepositorySelect={onRepositorySelect}
                />
                <PromptInputButton
                  onClick={toggleRecording}
                  variant={isRecording ? 'default' : 'ghost'}
                >
                  <MicIcon size={16} />
                  <span className="sr-only">Microphone</span>
                </PromptInputButton>
                <PromptInputSubmit
                  disabled={(!input && (status as string) !== 'streaming') || isUploading} 
                  status={status as any}
                >
                  <ArrowUpIcon size={16} />
                </PromptInputSubmit>
              </div>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Conversation className="flex-1 overflow-hidden">
        <ConversationContent>
          {messages.map((message) => {
            const parts = (message as any).parts || [];
            let todoListTodos: Array<{ title: string; description?: string; status: string }> | null = null;

            for (const part of parts) {
              // Collect todos from todoList tool results
              const partType: string = part.type || '';
              const isTodoTool =
                (partType.startsWith('tool-') || partType === 'dynamic-tool') &&
                part.state === 'output-available' &&
                ((partType === 'dynamic-tool' && part.toolName === 'todoList') ||
                 partType.slice('tool-'.length) === 'todoList');
              if (isTodoTool && part.output?.todos && Array.isArray(part.output.todos)) {
                todoListTodos = part.output.todos;
              }
            }

            return (
            <div key={message.id}>
              {message.role === "user" && message.parts.filter((part: any) => part.type === "file").length > 0 && (
                <Attachments variant="grid">
                  {message.parts.filter((part: any) => part.type === "file").map((part: any, i: number) => (
                    <Attachment
                      key={`${message.id}-attachment-${i}`}
                      data={{ ...part, id: `${message.id}-attachment-${i}` }}
                    >
                      <AttachmentPreview />
                    </Attachment>
                  ))}
                </Attachments>
              )}

              {/* Merged todo list - one Queue per message */}
              {todoListTodos && todoListTodos.length > 0 && (
                <Message from={message.role}>
                  <MessageContent>
                    <Queue>
                      <QueueSection defaultOpen>
                        <QueueSectionTrigger>
                          <QueueSectionLabel
                            count={todoListTodos.length}
                            label="tasks"
                            icon={<ListTodoIcon className="size-4" />}
                          />
                        </QueueSectionTrigger>
                        <QueueSectionContent>
                          <QueueList>
                            {todoListTodos.map((todo: any, idx: number) => (
                              <QueueItemUI key={idx}>
                                <div className="flex items-center gap-2">
                                  <QueueItemIndicator completed={todo.status === 'completed'} />
                                  <QueueItemContent completed={todo.status === 'completed'}>
                                    {todo.title || ''}
                                  </QueueItemContent>
                                </div>
                                {todo.description && (
                                  <QueueItemDescription completed={todo.status === 'completed'}>
                                    {todo.description}
                                  </QueueItemDescription>
                                )}
                              </QueueItemUI>
                            ))}
                          </QueueList>
                        </QueueSectionContent>
                      </QueueSection>
                    </Queue>
                  </MessageContent>
                </Message>
              )}

              {(parts as any[]).map((part: any, i: number) => {
                switch (part.type) {
                  case 'text':
                    return (
                      <Message key={`${message.id}-${i}`} from={message.role}>
                        <MessageContent>
                          <MessageResponse>
                            {part.text}
                          </MessageResponse>
                        </MessageContent>
                        {message.role === 'assistant' && i === ((message as any).parts?.length - 1) && (
                          <MessageToolbar>
                            <MessageActions>
                              <MessageAction
                                onClick={() => handleRetry()}
                                label="Retry"
                              >
                                <RefreshCcwIcon className="size-4" />
                              </MessageAction>
                              <MessageAction
                                onClick={() =>
                                  navigator.clipboard.writeText(part.text)
                                }
                                label="Copy"
                              >
                                <CopyIcon className="size-4" />
                              </MessageAction>
                            </MessageActions>
                          </MessageToolbar>
                        )}
                      </Message>
                    );
                  case 'reasoning':
                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        className="w-full"
                        isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{part.text}</ReasoningContent>
                      </Reasoning>
                    );
                  case 'tool-task':
                    return (
                      part.state === 'output-available' && (
                        <Message key={`${message.id}-${i}`} from={message.role}>
                          <MessageContent>
                            <Task className="mb-2">
                              <TaskTrigger title={part.output?.title || 'Task'} />
                              <TaskContent>
                                {Array.isArray(part.output?.items) &&
                                  part.output.items.map((item: any, idx: number) =>
                                    item.type === 'file' && item.file ? (
                                      <TaskItemFile key={idx}>
                                        {item.file.icon && <span>{item.file.icon}</span>}
                                        <span>{item.file.name}</span>
                                      </TaskItemFile>
                                    ) : (
                                      <TaskItem key={idx}>
                                        {item.text}
                                      </TaskItem>
                                    )
                                  )}
                              </TaskContent>
                            </Task>
                          </MessageContent>
                        </Message>
                      )
                    );
                  default:
                    return null;
                }
              })}
            </div>
          );
          })}
          {status === 'submitted' && <Loader />}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="grid shrink-0 gap-4 pt-4">
        <PromptInput globalDrop multiple onSubmit={handleSubmit}>
          <PromptInputAttachmentsDisplay />
          <PromptInputBody>
            <PromptInputTextarea
              onChange={(e) => setInput(e.target.value)}
              ref={textareaRef}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools>
              <PromptInputActionMenu>
                <PromptInputActionMenuTrigger />
                <PromptInputActionMenuContent>
                  <PromptInputActionAddAttachments />
                </PromptInputActionMenuContent>
              </PromptInputActionMenu>
              <ModelSelector
                onOpenChange={setModelSelectorOpen}
                open={modelSelectorOpen}
              >
                <ModelSelectorTrigger asChild>
                  <PromptInputButton>
                    {selectedModelData?.chefSlug && (
                      <ModelSelectorLogo
                        provider={selectedModelData.chefSlug}
                      />
                    )}
                    {selectedModelData?.name && (
                      <ModelSelectorName>
                        {selectedModelData.name}
                      </ModelSelectorName>
                    )}
                  </PromptInputButton>
                </ModelSelectorTrigger>
                <ModelSelectorContent>
                  <ModelSelectorInput placeholder="Search models..." />
                  <ModelSelectorList>
                    <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
                    {chefs.map((chef) => (
                      <ModelSelectorGroup heading={chef} key={chef}>
                        {models
                          .filter((m) => m.chef === chef)
                          .map((m) => (
                            <ModelSelectorItem
                              key={m.id}
                              onSelect={() => {
                                setModel(m.id);
                                setModelSelectorOpen(false);
                              }}
                              value={m.id}
                            >
                              <ModelSelectorLogo provider={m.chefSlug} />
                              <ModelSelectorName>{m.name}</ModelSelectorName>
                              <ModelSelectorLogoGroup>
                                {m.providers.map((provider) => (
                                  <ModelSelectorLogo
                                    key={provider}
                                    provider={provider}
                                  />
                                ))}
                              </ModelSelectorLogoGroup>
                              {model === m.id ? (
                                <CheckIcon className="ml-auto size-4" />
                              ) : (
                                <div className="ml-auto size-4" />
                              )}
                            </ModelSelectorItem>
                          ))}
                      </ModelSelectorGroup>
                    ))}
                  </ModelSelectorList>
                </ModelSelectorContent>
              </ModelSelector>
            </PromptInputTools>
            <div className="flex items-center gap-2">
              <RepositorySelector
                selectedRepository={selectedRepository}
                onRepositorySelect={onRepositorySelect}
              />
              <PromptInputButton
                onClick={toggleRecording}
                variant={isRecording ? 'default' : 'ghost'}
              >
                <MicIcon size={16} />
                <span className="sr-only">Microphone</span>
              </PromptInputButton>
              <PromptInputSubmit
                disabled={(!input && (status as string) !== 'streaming') || isUploading} 
                status={status as any}
              >
                <ArrowUpIcon size={16} />
              </PromptInputSubmit>
            </div>
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
