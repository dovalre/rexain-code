import { customProvider, gateway } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

const nvidia = createOpenAICompatible({
  name: "nvidia",
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export const provider = customProvider({
  languageModels: {
    // OpenAI
    "openai/gpt-5.6-sol": gateway("gpt-5.6-sol"),
    "openai/gpt-5.6-luna": gateway("gpt-5.6-luna"),
    "openai/gpt-5.6-terra": gateway("gpt-5.6-terra"),
    "openai/gpt-5.5": gateway("gpt-5.5"),
    "openai/gpt-5.5-pro": gateway("gpt-5.5-pro"),
    "openai/gpt-5.4": gateway("gpt-5.4"),
    "openai/gpt-5.4-mini": gateway("gpt-5.4-mini"),
    "openai/gpt-5.4-nano": gateway("gpt-5.4-nano"),
    "openai/gpt-5.4-pro": gateway("gpt-5.4-pro"),

    // Anthropic
    "anthropic/claude-fable-5": gateway("claude-fable-5"),
    "anthropic/claude-opus-5": gateway("claude-opus-5"),
    "anthropic/claude-opus-4-8": gateway("claude-opus-4-8"),
    "anthropic/claude-sonnet-5": gateway("claude-sonnet-5"),
    "anthropic/claude-sonnet-4-6": gateway("claude-sonnet-4-6"),
    "anthropic/claude-haiku-4-5": gateway("claude-haiku-4-5"),

    // Google
    "google/gemini-3.6-flash": gateway("gemini-3.6-flash"),
    "google/gemini-3.5-flash": gateway("gemini-3.5-flash"),
    "google/gemini-3.1-pro": gateway("gemini-3.1-pro"),
    "google/gemini-3.1-flash-lite": gateway("gemini-3.1-flash-lite"),
    "google/gemini-3-flash": gateway("gemini-3-flash"),

    // xAI
    "xai/grok-4.5": gateway("grok-4.5"),
    "xai/grok-4.3": gateway("grok-4.3"),
    "xai/grok-build-0.1": gateway("grok-build-0.1"),

    // Alibaba
    "alibaba/qwen3.7-max": gateway("qwen3.7-max"),
    "alibaba/qwen3.7-plus": gateway("qwen3.7-plus"),
    "alibaba/qwen3.7-flash": gateway("qwen3.7-flash"),

    // DeepSeek
    "deepseek/deepseek-v4-pro": gateway("deepseek-v4-pro"),
    "deepseek/deepseek-v4-flash": gateway("deepseek-v4-flash"),

    // Xiaomi
    "xiaomi/mimo-v2.5-pro": gateway("mimo-v2.5-pro"),
    "xiaomi/mimo-v2.5": gateway("mimo-v2.5"),

    // Z.ai
    "zai/glm-5.2": gateway("glm-5.2"),
    "zai/glm-5.1": gateway("glm-5.1"),
    "zai/glm-5": gateway("glm-5"),

    // MiniMax
    "minimax/m3": gateway("minimax-m3"),
    "minimax/m2.7": gateway("minimax-m2.7"),
    "minimax/m2.5": gateway("minimax-m2.5"),

    // Moonshot AI
    "moonshotai/kimi-k3": gateway("kimi-k3"),
    "moonshotai/kimi-k2.7-code": gateway("kimi-k2.7-code"),
    "moonshotai/kimi-k2.6": gateway("kimi-k2.6"),

    // Free Models
    "zai/glm-5.2:free": nvidia.chatModel("z-ai/glm-5.2"),
    "nvidia/nemotron-3-ultra-550b-a55b:free": nvidia.chatModel("nvidia/nemotron-3-ultra-550b-a55b"),
    "nvidia/nemotron-3-super-120b-a12b:free": nvidia.chatModel("nvidia/nemotron-3-super-120b-a12b"),
    "nvidia/nemotron-3-nano-30b-a3b:free": nvidia.chatModel("nvidia/nemotron-3-nano-30b-a3b"),
    "minimax/minimax-m3.0:free": nvidia.chatModel("minimaxai/minimax-m3.0"),
    "deepseek/deepseek-v4-pro:free": nvidia.chatModel("deepseek-ai/deepseek-v4-pro"),
    "stepfun/step-3.7-flash:free": nvidia.chatModel("stepfun-ai/step-3.7-flash"),
    "moonshot/kimi-k2.6:free": nvidia.chatModel("moonshotai/kimi-k2.6"),
    "openai/gpt-oss-120b:free": nvidia.chatModel("openai/gpt-oss-120b"),
    "openai/gpt-oss-20b:free": nvidia.chatModel("openai/gpt-oss-20b"),
    "poolside/laguna-s-2.1-free": gateway("poolside/laguna-s-2.1-free"),
  },
});