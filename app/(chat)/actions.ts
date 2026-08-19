import { generateText, UIMessage } from 'ai';
import { google } from '@ai-sdk/google';

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
    const prompt = message.parts
        .filter((part) => part.type === 'text')
        .map((part) => (part as { type: 'text'; text: string }).text)
        .join('');
    const { text } = await generateText({
        model: google('gemma-4-26b-a4b-it'),
        system: `You are an expert title generator. You are given a message and you need to generate a short title based on it.
        - you will generate a short 3-4 words title based on the first message a user begins a conversation with
        - the title should creative and unique
        - do not write anything other than the title
        - do not use quotes or colons
        - no markdown formatting allowed
        - keep plain text only
        - not more than 4 words in the title
        - do not use any other text other than the title
        - do not show your reasoning or chain-of-thought
        - output ONLY the final title, nothing else`,
        prompt,
    });
    return text
            .replace(/^[#*"\s]+/, "")
            .replace(/["]+$/, "")
            .trim();
}