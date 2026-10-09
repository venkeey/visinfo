/**
 * Labeling service: asks the configured chat provider for a short label,
 * sentiment, themes and summary for a cluster of poll responses.
 */

import { getDefaultProvider } from '../providers';
import type { ChatMessage } from '../types';

export interface LabelClusterInput {
  samples: string[];
  context?: string;
  maxSamples?: number;
}

export interface ClusterLabel {
  label: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  themes: string[];
  summary: string;
}

const FALLBACK: ClusterLabel = { label: 'Unknown', sentiment: 'neutral', themes: [], summary: '' };

function extractJson(text: string): Partial<ClusterLabel> | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export class LabelingService {
  /** Accepts either a plain list of responses or an options object. */
  async labelCluster(input: string[] | LabelClusterInput): Promise<ClusterLabel> {
    const opts: LabelClusterInput = Array.isArray(input) ? { samples: input } : input;
    const samples = opts.samples.slice(0, opts.maxSamples ?? 15);
    if (samples.length === 0) return FALLBACK;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'You name groups of similar free-text responses. Reply with JSON only: ' +
          '{"label": "2-5 word title", "sentiment": "positive|neutral|negative", ' +
          '"themes": ["..."], "summary": "one sentence"}.',
      },
      {
        role: 'user',
        content: `${opts.context ? `Context: ${opts.context}\n` : ''}Responses:\n${samples
          .map((s, i) => `${i + 1}. ${s}`)
          .join('\n')}`,
      },
    ];

    const reply = await getDefaultProvider().chat(messages, { temperature: 0.2, responseFormat: 'json' });
    const parsed = extractJson(reply);
    if (!parsed?.label) return FALLBACK;

    return {
      label: String(parsed.label).trim(),
      sentiment: parsed.sentiment === 'positive' || parsed.sentiment === 'negative' ? parsed.sentiment : 'neutral',
      themes: Array.isArray(parsed.themes) ? parsed.themes.map(String) : [],
      summary: String(parsed.summary ?? ''),
    };
  }
}

export const labelingService = new LabelingService();
