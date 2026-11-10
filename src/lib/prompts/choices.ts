import type { UserPromptConfig } from '@commitlint/types/lib/prompt';
import * as configuration from '../configuration';
import { getPromptLocalize } from '../localize';
import * as keys from '../../configs/keys';
import commitlint from '../commitlint';
import { PROMPT_TYPES, Item, Prompt } from './prompt-types';

export function getScopePrompt(
  suggestedScope?: string,
  promptConfig?: UserPromptConfig,
): Omit<Prompt, 'step' | 'totalSteps'> {
  const name = 'scope';
  const emptyError = commitlint.lintScope('');
  const placeholder = getPromptLocalize('scope.placeholder');
  const scopeEnum = commitlint.getScopeEnum();
  const scopeEnumFromPrompt = promptConfig?.questions?.scope?.enum;
  const noneItem: Item = {
    label: emptyError
      ? getPromptLocalize('scope.placeholder')
      : getPromptLocalize('scope.noneItem.label'),
    description: '',
    detail: emptyError || getPromptLocalize('scope.noneItem.detail'),
    alwaysShow: true,
  };

  // Preserve the existing precedence of commitlint prompt metadata and scope rules.
  const presetItems: Item[] =
    scopeEnumFromPrompt && Object.keys(scopeEnumFromPrompt).length
      ? Object.entries(scopeEnumFromPrompt).map(([label, meta]) => ({
          label,
          description: meta.title || '',
          detail: meta.description || '',
        }))
      : scopeEnum.map((label) => ({
          label,
          detail: getPromptLocalize('type.fromCommitlintConfig'),
        }));
  if (
    presetItems.some((item) => !commitlint.lintScope(item.label)) &&
    !suggestedScope
  )
    return {
      type: PROMPT_TYPES.QUICK_PICK,
      name,
      placeholder,
      blockedItem: emptyError ? noneItem : undefined,
      items: presetItems.filter((item) => !commitlint.lintScope(item.label)),
      noneItem,
    };

  return {
    type: PROMPT_TYPES.CONFIGURABLE_QUICK_PICK,
    name,
    placeholder,
    blockedItem: emptyError ? noneItem : undefined,
    suggestedScope,
    items: presetItems.length ? presetItems : undefined,
    configurationKey: keys.SCOPES as keyof configuration.Configuration,
    newItem: {
      label: getPromptLocalize('scope.newItem.label'),
      description: '',
      detail: getPromptLocalize('scope.newItem.detail'),
      alwaysShow: true,
      placeholder: getPromptLocalize('scope.newItem.placeholder'),
    },
    noneItem,
    newItemWithoutSetting: {
      label: getPromptLocalize('scope.newItemWithoutSetting.label'),
      description: '',
      detail: getPromptLocalize('scope.newItemWithoutSetting.detail'),
      alwaysShow: true,
      placeholder: getPromptLocalize('scope.newItem.placeholder'),
    },
    validate(input: string) {
      return commitlint.lintScope(input);
    },
    storeGlobal: configuration.get<boolean>('storeScopesGlobally'),
  };
}

export function getTagPrompt(): Omit<Prompt, 'step' | 'totalSteps'> {
  const name = 'tag';
  const placeholder = getPromptLocalize('tag.placeholder');
  const noneItem: Item = {
    label: getPromptLocalize('tag.noneItem.label'),
    description: '',
    detail: getPromptLocalize('tag.noneItem.detail'),
    alwaysShow: true,
  };

  return {
    type: PROMPT_TYPES.CONFIGURABLE_QUICK_PICK,
    name,
    placeholder,
    configurationKey: keys.TAGS as keyof configuration.Configuration,
    newItem: {
      label: getPromptLocalize('tag.newItem.label'),
      description: '',
      detail: getPromptLocalize('tag.newItem.detail'),
      alwaysShow: true,
      placeholder: getPromptLocalize('tag.newItem.placeholder'),
    },
    noneItem,
    newItemWithoutSetting: {
      label: getPromptLocalize('tag.newItemWithoutSetting.label'),
      description: '',
      detail: getPromptLocalize('tag.newItemWithoutSetting.detail'),
      alwaysShow: true,
      placeholder: getPromptLocalize('tag.newItem.placeholder'),
    },
    storeGlobal: configuration.get<boolean>('storeTagsGlobally'),
  };
}
