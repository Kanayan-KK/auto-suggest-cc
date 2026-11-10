import getTypesByLocale from '@yi-xu-0100/conventional-commit-types-i18n';
import type { Item } from './prompt-types';

type TypeText = { title?: string; description?: string };

export function getTypeItems(
  language: string,
  allowed: readonly string[],
  configured: Record<string, TypeText> | undefined,
  text: (key: string) => string,
): (Item & { value: string })[] {
  const localized = new Map(Object.entries(getTypesByLocale(language).types));
  const english = new Map(Object.entries(getTypesByLocale('en').types));
  const overrides = new Map(Object.entries(configured ?? {}));
  const types = new Set([...allowed, ...overrides.keys(), ...localized.keys()]);
  return Array.from(types, (value) => {
    const preset = english.get(value);
    const defaults = localized.get(value);
    const custom = overrides.get(value);
    if (language === 'ja') {
      // commitlint supplies its stock English text even when VS Code is Japanese.
      // Keep explicit project overrides, resolving title and description independently.
      const title =
        custom?.title && custom.title !== preset?.title
          ? custom.title
          : value === 'chore'
            ? text('type.chore.title')
            : defaults?.title;
      const detail =
        custom?.description && custom.description !== preset?.description
          ? custom.description
          : value === 'docs'
            ? text('type.docs.description')
            : defaults?.description;
      return {
        value,
        label: title || value,
        description: title ? value : '',
        detail: detail || text('type.fromCommitlintConfig'),
      };
    }
    return {
      value,
      label: value,
      description: custom ? custom.title || '' : defaults?.title || '',
      detail: custom
        ? custom.description || ''
        : defaults?.description || text('type.fromCommitlintConfig'),
    };
  });
}
