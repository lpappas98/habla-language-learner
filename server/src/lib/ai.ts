import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { cacheGet, cacheSet, getRedis } from './redis';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-4-6';

const loadPrompt = (name: string): string =>
  readFileSync(join(__dirname, '../prompts', `${name}.txt`), 'utf-8');

// Cache wrapper — returns cached string or calls fn and caches result
export const withCache = async (
  key: string,
  ttlSeconds: number | null,
  fn: () => Promise<string>
): Promise<string> => {
  const cached = await cacheGet(key);
  if (cached) return cached;

  const result = await fn();

  if (ttlSeconds === null) {
    try { await getRedis().set(key, result); } catch {} // permanent
  } else {
    await cacheSet(key, result, ttlSeconds);
  }

  return result;
};

export const cacheKey = (parts: (string | number)[]): string =>
  createHash('sha256').update(parts.join(':')).digest('hex');

export const callClaude = async (
  promptName: string,
  userContent: string,
  options: { maxTokens?: number } = {}
): Promise<string> => {
  const system = loadPrompt(promptName);
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? 512,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type');
  return block.text;
};

export const callClaudeStream = (
  promptName: string,
  userContent: string,
  options: { maxTokens?: number } = {}
) => {
  const system = loadPrompt(promptName);
  return client.messages.stream({
    model: MODEL,
    max_tokens: options.maxTokens ?? 1024,
    system,
    messages: [{ role: 'user', content: userContent }],
  });
};
