import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { createSandboxTool } from "./tools/create-sandbox";
import type { createFileTool } from "./tools/create-file";
import type { readFileTool } from "./tools/read-file";
import type { runCommandTool } from "./tools/run-command";
import type { getSandboxUrlTool } from "./tools/get-sandbox-url";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type createSandboxTool = InferUITool<typeof createSandboxTool>;
type createFileTool = InferUITool<typeof createFileTool>;
type readFileTool = InferUITool<typeof readFileTool>;
type runCommandTool = InferUITool<typeof runCommandTool>;
type getSandboxUrlTool = InferUITool<typeof getSandboxUrlTool>;

export type VibecodeTools = {
  createSandbox: createSandboxTool;
  createFile: createFileTool;
  readFile: readFileTool;
  runCommand: runCommandTool;
  getSandboxUrl: getSandboxUrlTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  appendMessage: string;
  id: string;
  title: string;
  clear: null;
  finish: null;
  "chat-title": string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  VibecodeTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};