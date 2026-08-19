export interface Model {
  id: string;
  name: string;
  chef: string;
  chefSlug: string;
  providers: string[];
}

export const models: Model[] = [
  // OpenAI
  {
    id: "openai/gpt-5.6-terra",
    name: "GPT-5.6 Terra",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-5.6-luna",
    name: "GPT-5.6 Luna",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-5.6-sol",
    name: "GPT-5.6 Sol",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-5.5-pro",
    name: "GPT-5.5 Pro",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-5.4",
    name: "GPT-5.4",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-5.4-nano",
    name: "GPT-5.4 Nano",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-5.4-pro",
    name: "GPT-5.4 Pro",
    chef: "OpenAI",
    chefSlug: "openai",
    providers: ["openai"],
  },

  // Anthropic
  {
    id: "anthropic/claude-fable-5",
    name: "Claude Fable 5",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic"],
  },
  {
    id: "anthropic/claude-opus-4-8",
    name: "Claude Opus 4.8",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic"],
  },
  {
    id: "anthropic/claude-opus-5",
    name: "Claude Opus 5",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic"],
  },
  {
    id: "anthropic/claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic"],
  },
  {
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic"],
  },
  {
    id: "anthropic/claude-haiku-4-5",
    name: "Claude Haiku 4.5",
    chef: "Anthropic",
    chefSlug: "anthropic",
    providers: ["anthropic"],
  },

  // Google
  {
    id: "google/gemini-3-flash",
    name: "Gemini 3 Flash",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
  },
  {
    id: "google/gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
  },
  {
    id: "google/gemini-3.1-pro-preview",
    name: "Gemini 3.1 Pro Preview",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
  },
  {
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
  },
  {
    id: "google/gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    chef: "Google",
    chefSlug: "google",
    providers: ["google"],
  },

  // xAI
  {
    id: "xai/grok-build-0.1",
    name: "Grok Build 0.1",
    chef: "xAI",
    chefSlug: "xai",
    providers: ["xai"],
  },
  {
    id: "xai/grok-4.3",
    name: "Grok 4.3",
    chef: "xAI",
    chefSlug: "xai",
    providers: ["xai"],
  },
  {
    id: "xai/grok-4.5",
    name: "Grok 4.5",
    chef: "xAI",
    chefSlug: "xai",
    providers: ["xai"],
  },

  // Alibaba
  {
    id: "alibaba/qwen3.7-flash",
    name: "Qwen 3.7 Flash",
    chef: "Alibaba",
    chefSlug: "alibaba",
    providers: ["alibaba"],
  },
  {
    id: "alibaba/qwen3.7-plus",
    name: "Qwen 3.7 Plus",
    chef: "Alibaba",
    chefSlug: "alibaba",
    providers: ["alibaba"],
  },
  {
    id: "alibaba/qwen3.7-max",
    name: "Qwen 3.7 Max",
    chef: "Alibaba",
    chefSlug: "alibaba",
    providers: ["alibaba"],
  },
  {
    id: "alibaba/qwen3.8-max",
    name: "Qwen 3.8 Max",
    chef: "Alibaba",
    chefSlug: "alibaba",
    providers: ["alibaba"],
  },
  

  // DeepSeek
  {
    id: "deepseek/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    chef: "DeepSeek",
    chefSlug: "deepseek",
    providers: ["deepseek"],
  },
  {
    id: "deepseek/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    chef: "DeepSeek",
    chefSlug: "deepseek",
    providers: ["deepseek"],
  },

  // Xiaomi
  {
    id: "xiaomi/mimo-v2.5",
    name: "MiMo V2.5",
    chef: "Xiaomi",
    chefSlug: "xiaomi",
    providers: ["xiaomi"],
  },
  {
    id: "xiaomi/mimo-v2.5-pro",
    name: "MiMo V2.5 Pro",
    chef: "Xiaomi",
    chefSlug: "xiaomi",
    providers: ["xiaomi"],
  },

  // Z.ai
  {
    id: "zai/glm-5",
    name: "GLM 5",
    chef: "Z.ai",
    chefSlug: "zai",
    providers: ["zai"],
  },
  {
    id: "zai/glm-5.1",
    name: "GLM 5.1",
    chef: "Z.ai",
    chefSlug: "zai",
    providers: ["zai"],
  },
  {
    id: "zai/glm-5.2",
    name: "GLM 5.2",
    chef: "Z.ai",
    chefSlug: "zai",
    providers: ["zai"],
  },

  // MiniMax
  {
    id: "minimax/minimax-m2.5",
    name: "MiniMax M2.5",
    chef: "MiniMax",
    chefSlug: "minimax",
    providers: ["minimax"],
  },
  {
    id: "minimax/minimax-m2.7",
    name: "MiniMax M2.7",
    chef: "MiniMax",
    chefSlug: "minimax",
    providers: ["minimax"],
  },
  {
    id: "minimax/minimax-m3",
    name: "MiniMax M3",
    chef: "MiniMax",
    chefSlug: "minimax",
    providers: ["minimax"],
  },

  // Moonshot AI
  {
    id: "moonshotai/kimi-k2.6",
    name: "Kimi K2.6",
    chef: "Moonshot AI",
    chefSlug: "moonshotai",
    providers: ["moonshotai"],
  },
  {
    id: "moonshotai/kimi-k2.7-code",
    name: "Kimi K2.7 Code",
    chef: "Moonshot AI",
    chefSlug: "moonshotai",
    providers: ["moonshotai"],
  },
  {
    id: "moonshotai/kimi-k3",
    name: "Kimi K3",
    chef: "Moonshot AI",
    chefSlug: "moonshotai",
    providers: ["moonshotai"],
  },
  
  // Free Models
  {
    id: "poolside/laguna-s-2.1-free",
    name: "Laguna S 2.1 Free",
    chef: "Free Models",
    chefSlug: "poolside",
    providers: ["poolside"],
  },
  {
    id: "zai/glm-5.2:free",
    name: "GLM 5.2",
    chef: "Free Models",
    chefSlug: "zai",
    providers: ["zai"],
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra 550B",
    chef: "Free Models",
    chefSlug: "nvidia",
    providers: ["nvidia"],
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b:free",
    name: "Nemotron 3 Super 120B",
    chef: "Free Models",
    chefSlug: "nvidia",
    providers: ["nvidia"],
  },
  {
    id: "nvidia/nemotron-3-nano-30b-a3b:free",
    name: "Nemotron 3 Nano 30B",
    chef: "Free Models",
    chefSlug: "nvidia",
    providers: ["nvidia"],
  },
  {
    id: "minimax/minimax-m3.0:free",
    name: "MiniMax M3.0",
    chef: "Free Models",
    chefSlug: "minimax",
    providers: ["minimax"],
  },
  {
    id: "deepseek/deepseek-v4-pro:free",
    name: "DeepSeek V4 Pro",
    chef: "Free Models",
    chefSlug: "deepseek",
    providers: ["deepseek"],
  },
  {
    id: "stepfun/step-3.7-flash:free",
    name: "Step 3.7 Flash",
    chef: "Free Models",
    chefSlug: "stepfun",
    providers: ["stepfun"],
  },
  {
    id: "moonshot/kimi-k2.6:free",
    name: "Kimi K2.6",
    chef: "Free Models",
    chefSlug: "moonshotai",
    providers: ["moonshotai"],
  },
  {
    id: "openai/gpt-oss-120b:free",
    name: "GPT-OSS 120B",
    chef: "Free Models",
    chefSlug: "openai",
    providers: ["openai"],
  },
  {
    id: "openai/gpt-oss-20b:free",
    name: "GPT-OSS 20B",
    chef: "Free Models",
    chefSlug: "openai",
    providers: ["openai"],
  },
];