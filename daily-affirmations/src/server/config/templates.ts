import type { TemplateDefinition } from '@/types/domain';

// Hand-authored, not JSON-loaded: these five are fixed and pixel-tuned, versioned tightly with
// the slot-kind mapping in src/lib/editor/templateToCanvas.ts. The "load from JSON, never
// hardcode" rule is about Products (so a non-developer can add an app without touching code) —
// it doesn't apply here the same way.
export const TEMPLATES: TemplateDefinition[] = [
  {
    key: 'apple-hero',
    label: 'Apple Hero',
    description: 'Dark, centered hero — one bold headline above a phone mockup, store badge below.',
    background: { kind: 'gradient', colors: ['#0a0a0c', '#161620'] },
    slots: [
      { key: 'headline', kind: 'headline', rect: { xPct: 8, yPct: 6, wPct: 84, hPct: 16 }, style: { fontSize: 64, fontWeight: '800', textAlign: 'center', fill: '#f5f5f7' } },
      { key: 'screenshot', kind: 'screenshot', device: 'iphone', rect: { xPct: 30, yPct: 26, wPct: 40, hPct: 62 } },
      { key: 'storeBadge', kind: 'storeBadge', rect: { xPct: 38, yPct: 91, wPct: 24, hPct: 6 } },
    ],
  },
  {
    key: 'problem-solution',
    label: 'Problem → Solution',
    description: 'Headline and three feature bullets on the left, phone mockup on the right, CTA below the bullets.',
    background: { kind: 'solid', colors: ['#101014'] },
    slots: [
      { key: 'headline', kind: 'headline', rect: { xPct: 6, yPct: 6, wPct: 46, hPct: 22 }, style: { fontSize: 46, fontWeight: '800', fill: '#f5f5f7' } },
      { key: 'bullets', kind: 'featureBullets', rect: { xPct: 6, yPct: 32, wPct: 42, hPct: 36 }, style: { fontSize: 20, fill: '#c9c9d1' } },
      { key: 'cta', kind: 'cta', rect: { xPct: 6, yPct: 78, wPct: 30, hPct: 8 }, style: { fontSize: 20, fontWeight: '700' } },
      { key: 'screenshot', kind: 'screenshot', device: 'iphone', rect: { xPct: 56, yPct: 8, wPct: 36, hPct: 86 } },
    ],
  },
  {
    key: 'feature-highlight',
    label: 'Feature Highlight',
    description: 'Large screenshot on the left; logo, headline, description, and CTA on the right.',
    background: { kind: 'solid', colors: ['#0d0d11'] },
    slots: [
      { key: 'screenshot', kind: 'screenshot', device: 'iphone', rect: { xPct: 6, yPct: 8, wPct: 44, hPct: 86 } },
      { key: 'logo', kind: 'logo', rect: { xPct: 56, yPct: 8, wPct: 14, hPct: 8 } },
      { key: 'headline', kind: 'headline', rect: { xPct: 56, yPct: 22, wPct: 38, hPct: 20 }, style: { fontSize: 38, fontWeight: '800', fill: '#f5f5f7' } },
      { key: 'subheadline', kind: 'subheadline', rect: { xPct: 56, yPct: 44, wPct: 38, hPct: 24 }, style: { fontSize: 19, fill: '#c9c9d1' } },
      { key: 'cta', kind: 'cta', rect: { xPct: 56, yPct: 76, wPct: 28, hPct: 8 }, style: { fontSize: 20, fontWeight: '700' } },
    ],
  },
  {
    key: 'comparison',
    label: 'Comparison',
    description: 'Before/after two-column layout — feature bullets on the left, product screenshot on the right.',
    background: { kind: 'solid', colors: ['#0a0a0c'] },
    slots: [
      { key: 'headline', kind: 'headline', rect: { xPct: 8, yPct: 6, wPct: 84, hPct: 12 }, style: { fontSize: 42, fontWeight: '800', textAlign: 'center', fill: '#f5f5f7' } },
      { key: 'beforeLabel', kind: 'subheadline', rect: { xPct: 8, yPct: 20, wPct: 38, hPct: 8 }, style: { fontSize: 20, fill: '#8a8a93', textAlign: 'center' } },
      { key: 'bullets', kind: 'featureBullets', rect: { xPct: 8, yPct: 30, wPct: 38, hPct: 56 }, style: { fontSize: 19, fill: '#c9c9d1' } },
      { key: 'screenshot', kind: 'screenshot', device: 'iphone', rect: { xPct: 54, yPct: 18, wPct: 38, hPct: 74 } },
      { key: 'afterLabel', kind: 'subheadline', rect: { xPct: 54, yPct: 92, wPct: 38, hPct: 6 }, style: { fontSize: 20, fill: '#f5f5f7', textAlign: 'center', fontWeight: '700' } },
    ],
  },
  {
    key: 'app-store-screenshot',
    label: 'App Store Screenshot',
    description: 'Screenshot-forward — a short caption above a large phone mockup, matching App Store screenshot conventions.',
    background: { kind: 'gradient', colors: ['#1b1030', '#0a0a0c'] },
    slots: [
      { key: 'headline', kind: 'headline', rect: { xPct: 8, yPct: 6, wPct: 84, hPct: 16 }, style: { fontSize: 44, fontWeight: '800', textAlign: 'center', fill: '#f5f5f7' } },
      { key: 'screenshot', kind: 'screenshot', device: 'iphone', rect: { xPct: 18, yPct: 24, wPct: 64, hPct: 74 } },
    ],
  },
];

export function getTemplate(key: string): TemplateDefinition | undefined {
  return TEMPLATES.find((t) => t.key === key);
}
