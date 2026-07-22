export type AiProvider = 'gemini' | 'openai' | 'deepseek';

export interface AiModelOption {
  id: string;
  label: string;
}

export const AI_PROVIDERS: Record<AiProvider, { label: string; models: AiModelOption[] }> = {
  gemini: {
    label: 'Google Gemini',
    models: [
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
      { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    ],
  },
  openai: {
    label: 'OpenAI',
    models: [
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4o', label: 'GPT-4o' },
    ],
  },
  deepseek: {
    label: 'DeepSeek',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat (V3)' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner (R1)' },
    ],
  },
};

export const DEFAULT_AI_PROVIDER: AiProvider = 'deepseek';
export const DEFAULT_AI_MODEL = 'deepseek-chat';

export function getDefaultModelForProvider(provider: AiProvider): string {
  return AI_PROVIDERS[provider].models[0]?.id ?? DEFAULT_AI_MODEL;
}

export function isValidModelForProvider(provider: AiProvider, model: string): boolean {
  return AI_PROVIDERS[provider].models.some((m) => m.id === model);
}

export function resolveAiConfig(
  provider?: AiProvider | string | null,
  model?: string | null
): { provider: AiProvider; model: string } {
  const p = (provider as AiProvider) in AI_PROVIDERS ? (provider as AiProvider) : DEFAULT_AI_PROVIDER;
  const m = model && isValidModelForProvider(p, model) ? model : getDefaultModelForProvider(p);
  return { provider: p, model: m };
}

export function getProviderLabel(provider: AiProvider): string {
  return AI_PROVIDERS[provider].label;
}

export function getModelLabel(provider: AiProvider, model: string): string {
  return AI_PROVIDERS[provider].models.find((m) => m.id === model)?.label ?? model;
}
