/**
 * @since 2020-06-12 13:25
 * @author vivaxy
 */
import * as vscode from 'vscode';
import { getPromptLocalize } from '../localize';

export const confirmButton: vscode.QuickInputButton = {
  iconPath: new vscode.ThemeIcon('arrow-right'),
  get tooltip() {
    return getPromptLocalize('confirm');
  },
};

export default function createQuickPick<T extends vscode.QuickPickItem>({
  blockedItem,
  trackSelection,
  placeholder,
  items = [],
  activeItems = [],
  value = '',
  step,
  totalSteps,
  buttons = [],
}: Partial<vscode.QuickPick<T>> & {
  blockedItem?: T;
  trackSelection?: boolean;
}): Promise<{
  value: string;
  selectionChanged?: boolean;
  activeItems: T[];
}> {
  return new Promise(function (resolve, reject) {
    const picker = vscode.window.createQuickPick<T>();
    picker.placeholder = placeholder;
    picker.matchOnDescription = true;
    picker.matchOnDetail = true;
    picker.ignoreFocusOut = true;
    picker.items = items;
    picker.activeItems = activeItems.length === 0 ? [items[0]] : activeItems;
    picker.value = value;
    picker.step = step;
    picker.totalSteps = totalSteps;
    const initialItem = activeItems[0] ?? items[0];
    let selectionChanged = false;
    if (trackSelection)
      picker.onDidChangeActive(([item]) => {
        if (item && item !== initialItem) selectionChanged = true;
      });

    function accept(item?: T) {
      if (!item || item === blockedItem) return;
      resolve({ value: picker.value, activeItems: [item], selectionChanged });
      picker.dispose();
    }

    picker.buttons = [...buttons, confirmButton];
    picker.onDidAccept(() => accept(picker.activeItems[0]));
    picker.onDidTriggerButton((button) => {
      if (button === confirmButton)
        accept(picker.activeItems[0] ?? picker.items[0]);
      if (button === vscode.QuickInputButtons.Back) {
        reject({
          button,
          value: picker.value,
          activeItems: picker.activeItems,
          selectionChanged,
        });
        picker.dispose();
      }
    });
    picker.show();
  });
}
