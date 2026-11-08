import type { Item } from './prompt-types';
const gitmojis: {
  gitmojis: {
    emoji: string;
    entity: string;
    code: string;
    description: string;
    name: string;
  }[];
} = require('../../vendors/gitmojis.json');

const codesByType = new Map(
  Object.entries({
    feat: ':sparkles:',
    fix: ':bug:',
    docs: ':memo:',
    style: ':art:',
    refactor: ':recycle:',
    perf: ':zap:',
    test: ':white_check_mark:',
    build: ':package:',
    ci: ':construction_worker:',
    chore: ':wrench:',
    revert: ':rewind:',
  }),
);

export function gitmojiItems(format: 'code' | 'emoji'): Item[] {
  return gitmojis.gitmojis.map(({ emoji, code, description }) => ({
    label: format === 'code' ? code : emoji,
    description: format === 'code' ? emoji : code,
    detail: description,
    code,
  }));
}

export function suggestedGitmoji(type: string, items: Item[], none: Item) {
  const code = codesByType.get(type);
  return code ? (items.find((item) => item.code === code) ?? none) : none;
}
