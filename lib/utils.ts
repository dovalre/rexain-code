import { UIMessagePart } from 'ai';
import { formatISO } from 'date-fns';
import { type Message } from '@/lib/db/schema';
import { ChatMessage, VibecodeTools, CustomUIDataTypes } from '@/lib/types';

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function convertToUIMessages(messages: Message[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, VibecodeTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}