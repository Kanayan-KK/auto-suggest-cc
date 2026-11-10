/**
 * @since 2020-03-25 09:09
 * @author vivaxy
 */
import { getScopePrompt, getTagPrompt } from './prompts/choices';
import { getTypeItems } from './prompts/type-items';
import { gitmojiItems } from './prompts/gitmoji';
import { runPrompts } from './prompts/run';
import * as configuration from './configuration';
import { PROMPT_TYPES, Prompt } from './prompts/prompt-types';
import {
  CommitMessage,
  serializeSubject,
  serializeHeader,
} from './commit-message';
import commitlint from './commitlint';
import { getPromptLocalize, getPromptPlaceholder, locale } from './localize';
import { QuickInputButtons } from 'vscode';
import { UserPromptConfig } from '@commitlint/types/lib/prompt';

export default async function prompts({
  gitmoji,
  showEditor,
  emojiFormat,
  lineBreak,
  suggestedType,
  suggestedScope,
  promptScopes,
  promptBody,
  promptFooter,
  promptCI,
  promptConfig,
  promptTag,
}: {
  gitmoji: boolean;
  showEditor: boolean;
  emojiFormat: configuration.EMOJI_FORMAT;
  lineBreak: string;
  suggestedType?: string;
  suggestedScope?: string;
  promptScopes: boolean;
  promptBody: boolean;
  promptFooter: boolean;
  promptCI: boolean;
  promptTag: boolean;
  promptConfig?: UserPromptConfig;
}): Promise<CommitMessage> {
  const commitMessage = new CommitMessage();

  function lineBreakFormatter(input: string): string {
    if (lineBreak) {
      return input.replace(
        new RegExp(lineBreak.replace(/\\/g, '\\\\'), 'g'),
        '\n',
      );
    }
    return input;
  }

  // Keep an unclassified change pending until the user chooses a valid type.
  const typeItems = getTypeItems(
    locale,
    commitlint.getTypeEnum(),
    promptConfig?.questions?.type?.enum,
    getPromptLocalize,
  ).filter((item) => !commitlint.lintType(item.value));
  const initialType = typeItems.find((item) => item.value === suggestedType);
  const chooseType = { label: getPromptLocalize('type.choose') };
  const questions: Prompt[] = [
    {
      type: PROMPT_TYPES.QUICK_PICK,
      name: 'type',
      placeholder: getPromptLocalize('type.placeholder'),
      items: initialType ? typeItems : [chooseType, ...typeItems],
      activeItems: [initialType ?? chooseType],
      blockedItem: chooseType,
      validate(input: string) {
        return commitlint.lintType(input);
      },
    },
    getScopePrompt(suggestedScope, promptConfig),
    {
      type: PROMPT_TYPES.QUICK_PICK,
      name: 'gitmoji',
      placeholder: getPromptLocalize('gitmoji.placeholder'),
      items: gitmojiItems(emojiFormat, locale),
      trackSelection: true,
      noneItem: {
        label: getPromptLocalize('gitmoji.noneItem.label'),
        description: '',
        detail: getPromptLocalize('gitmoji.noneItem.detail'),
        alwaysShow: true,
      },
    },
    {
      type: PROMPT_TYPES.QUICK_PICK,
      name: 'ci',
      placeholder: getPromptLocalize('ci.placeholder'),
      items: [
        {
          label: getPromptLocalize('ci.accept.label'),
          value: 'Yes',
          detail: getPromptLocalize('ci.accept.detail'),
        },
      ],
      noneItem: {
        label: getPromptLocalize('ci.decline.label'),
        detail: getPromptLocalize('ci.decline.detail'),
        alwaysShow: true,
      },
    },
    getTagPrompt(),
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: 'subject',
      placeholder: getPromptPlaceholder(
        'subject',
        promptConfig?.questions?.subject?.description,
      ),
      validate(input: string) {
        if (!input.trim()) return getPromptLocalize('subject.required');
        const { type, scope, gitmoji, ci, tag } = commitMessage;
        const serializedSubject = serializeSubject({
          gitmoji,
          subject: input,
        });
        let subjectError = commitlint.lintSubject(serializedSubject);
        if (subjectError) {
          if (gitmoji) {
            subjectError += ' (';
            subjectError += getPromptLocalize('subject.error.including');
            subjectError += getPromptLocalize('subject.error.gitmoji');
            subjectError += gitmoji;
            subjectError += ')';
          }
          return subjectError;
        }

        let headerError = commitlint.lintHeader(
          serializeHeader({
            type,
            scope,
            gitmoji,
            subject: input,
            ci,
            tag,
          }),
        );
        if (headerError) {
          headerError += ' (';
          headerError += getPromptLocalize('subject.error.including');
          headerError += getPromptLocalize('subject.error.type');
          headerError += type;
          if (scope) {
            headerError += ', ';
            headerError += getPromptLocalize('subject.error.scope');
            headerError += scope;
          }
          if (gitmoji) {
            headerError += ', ';
            headerError += getPromptLocalize('subject.error.gitmoji');
            headerError += gitmoji;
          }
          headerError += ')';
          return headerError;
        }

        return '';
      },
      format: lineBreakFormatter,
    },
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: 'body',
      placeholder: getPromptPlaceholder(
        'body',
        promptConfig?.questions?.body?.description,
      ),
      validate(input: string) {
        return commitlint.lintBody(input);
      },
      format: lineBreakFormatter,
    },
    {
      type: PROMPT_TYPES.INPUT_BOX,
      name: 'footer',
      placeholder: getPromptPlaceholder(
        'footer',
        promptConfig?.questions?.footer?.description,
      ),
      validate(input: string) {
        return commitlint.lintFooter(input);
      },
      format: lineBreakFormatter,
    },
  ]
    .filter(function (question) {
      if (question.name === 'scope' && !promptScopes) return false;

      if (question.name === 'tag' && !promptTag) return false;

      if (question.name === 'gitmoji' && !gitmoji) return false;

      if (question.name === 'ci' && !promptCI) return false;

      if (question.name === 'body') {
        if (showEditor || !promptBody) return false;
      }

      if (question.name === 'footer') {
        if (showEditor || !promptFooter) return false;
      }

      return true;
    })
    .map(function (question, index, array) {
      return {
        ...question,
        step: index + 1,
        totalSteps: array.length,
        buttons: index > 0 ? [QuickInputButtons.Back] : [],
      };
    });

  await runPrompts(questions, commitMessage);
  return commitMessage;
}
