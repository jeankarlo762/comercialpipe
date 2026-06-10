import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/app-error.js';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export interface CompletionOptions {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export async function complete(options: CompletionOptions): Promise<string> {
  try {
    const response = await client.messages.create({
      model: env.ANTHROPIC_MODEL,
      max_tokens: options.maxTokens ?? 1024,
      temperature: options.temperature ?? 0.4,
      system: options.system,
      messages: [{ role: 'user', content: options.prompt }],
    });
    return response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido na IA';
    throw new AppError(502, 'AI_PROVIDER_ERROR', `Falha ao chamar o provedor de IA: ${message}`);
  }
}

/** Extracts the first balanced JSON object from a model response. */
export function extractJson<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new AppError(502, 'AI_PARSE_ERROR', 'Resposta da IA não continha JSON válido');
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    throw new AppError(502, 'AI_PARSE_ERROR', 'Não foi possível interpretar a resposta da IA');
  }
}
