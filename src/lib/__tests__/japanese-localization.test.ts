import * as path from 'path';
import { expect, test } from 'vitest';
import { gitmojiItems } from '../prompts/gitmoji';
import { getTypeItems } from '../prompts/type-items';

const root = path.resolve(__dirname, '../../..');
const english: Record<string, string> = require(
  path.join(root, 'package.nls.json'),
);
const japanese: Record<string, string> = require(
  path.join(root, 'package.nls.ja.json'),
);

test('the conventional preset displays Japanese type names and details while retaining commit codes', () => {
  const preset = require('@commitlint/config-conventional').default.prompt
    .questions.type.enum;
  const text = (key: string) => japanese['extension.sources.prompt.' + key];
  const items = getTypeItems('ja', [], preset, text);
  expect(items).toHaveLength(11);
  for (const item of items) {
    expect(item.label).toMatch(/[ぁ-んァ-ン一-龯]/);
    expect(item.detail).toMatch(/[ぁ-んァ-ン一-龯]/);
    expect(item.description).toBe(item.value);
  }
  expect(items.find((item) => item.value === 'build')?.label).toBe('ビルド');
  const overrides = {
    ...preset,
    build: { ...preset.build, title: 'リリース準備' },
    infra: { title: '基盤作業', description: '設定を更新する' },
  };
  const custom = getTypeItems('ja', [], overrides, text);
  expect(custom.find((item) => item.value === 'build')).toMatchObject({
    label: 'リリース準備',
    detail: items.find((item) => item.value === 'build')?.detail,
  });
  expect(custom.find((item) => item.value === 'infra')).toMatchObject({
    label: '基盤作業',
    detail: '設定を更新する',
  });
});

test('Japanese UI translations cover every English key and retain its placeholders', () => {
  expect(Object.keys(japanese).sort()).toEqual(Object.keys(english).sort());
  for (const [key, source] of Object.entries(english)) {
    expect(japanese[key].trim(), key).not.toBe('');
    expect(japanese[key].match(/\{\w+\}/g)?.sort(), key).toEqual(
      source.match(/\{\w+\}/g)?.sort(),
    );
  }
});

test('every gitmoji has a Japanese explanation with the same recorded value', () => {
  for (const format of ['code', 'emoji'] as const) {
    const items = gitmojiItems(format);
    const localized = gitmojiItems(format, 'ja');
    expect(localized.map((item) => item.label)).toEqual(
      items.map((item) => item.label),
    );
    for (const item of localized)
      expect(item.detail, item.code).toMatch(/[ぁ-んァ-ン一-龯]/);
  }
});
