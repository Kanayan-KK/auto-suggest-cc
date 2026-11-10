import { QuickInputButtons } from 'vscode';
import type { CommitMessage } from '../commit-message';
import { suggestedGitmoji } from './gitmoji';
import handlers, {
  PROMPT_TYPES,
  Prompt,
  PromptStatus,
  Item,
  ConfigurableQuickPickOptions,
} from './prompt-types';

function answer(question: Prompt, status: PromptStatus) {
  const item = status.activeItems[0];
  if (item && item === question.noneItem) return '';
  if (
    !item ||
    item === question.newItem ||
    item === question.newItemWithoutSetting
  )
    return status.value;
  return item.value ?? item.label;
}

export async function runPrompts(questions: Prompt[], message: CommitMessage) {
  const history: PromptStatus[] = questions.map(() => ({
    value: '',
    activeItems: [],
  }));
  let manualScope = false;
  let manualEmoji: Item | undefined;
  let index = 0;
  while (index < questions.length) {
    const question = questions[index];
    const previous = history[index];
    let automaticEmoji: Item | undefined;

    // Recompute only the automatic choice when the confirmed type changes.
    if (question.name === 'gitmoji') {
      automaticEmoji = suggestedGitmoji(
        message.type,
        question.items!,
        question.noneItem!,
      );
      question.activeItems = [manualEmoji ?? automaticEmoji];
    } else if (question.suggestedScope && !manualScope) {
      // Let the picker select its candidate unless it repeats the confirmed type.
      question.activeItems =
        question.suggestedScope === message.type ? [question.noneItem!] : [];
    } else if (previous.activeItems.length) {
      question.activeItems = previous.activeItems;
    }

    // A configurable picker keeps free text only for its one-time input option.
    if (
      question.type === PROMPT_TYPES.INPUT_BOX ||
      (question.newItemWithoutSetting &&
        previous.activeItems[0] === question.newItemWithoutSetting)
    )
      question.value = previous.value;
    else if (question.type === PROMPT_TYPES.CONFIGURABLE_QUICK_PICK)
      question.value = '';

    // Use the same history for accepted answers and Back, but only commit accepted values.
    let result: PromptStatus;
    let back = false;
    try {
      result = await handlers[question.type](
        question as ConfigurableQuickPickOptions,
      );
    } catch (event) {
      if (event?.button !== QuickInputButtons.Back || index === 0) throw event;
      result = {
        value: event.value ?? previous.value,
        activeItems: event.activeItems ?? previous.activeItems,
        selectionChanged: event.selectionChanged,
      };
      back = true;
    }

    history[index] = result;
    const selected = result.activeItems[0];
    if (question.suggestedScope && selected) {
      const isDefault =
        question.suggestedScope === message.type
          ? selected === question.noneItem
          : selected.label === question.suggestedScope &&
            selected !== question.noneItem;
      if (result.selectionChanged || !isDefault) manualScope = true;
    }
    if (
      automaticEmoji &&
      selected &&
      (manualEmoji || result.selectionChanged || selected !== automaticEmoji)
    )
      manualEmoji = selected;
    if (back) {
      index--;
      continue;
    }

    const value = answer(question, result);
    message[question.name as keyof CommitMessage] =
      question.format?.(value) ?? value;
    index++;
  }
}
