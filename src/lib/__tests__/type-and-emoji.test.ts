import * as path from 'path';
import { expect, test } from 'vitest';
import { typeFromFiles } from '../scope-default';
import { suggestedGitmoji, gitmojiItems } from '../prompts/gitmoji';

const root = path.resolve('project');
test.each<[string[], string | undefined]>([
  [['docs/guide.txt', 'README.md'], 'docs'],
  [['.github/workflows/tests.md'], 'ci'],
  [['tests/README.md', 'src/a.spec.ts', '__tests__/example.js'], 'test'],
  [['readme.MD'], undefined],
  [['src/a.ts', 'docs/a.md'], undefined],
  [['tests/a.ts', 'docs/a.md'], undefined],
  [['../other/docs/a.md'], undefined],
  [[], undefined],
])('classifies all commit paths %j', (files, expected) => {
  expect(
    typeFromFiles(
      root,
      files.map((file) => path.resolve(root, file)),
    ),
  ).toBe(expected);
});

test.each([
  ['feat', ':sparkles:', '✨'],
  ['fix', ':bug:', '🐛'],
  ['docs', ':memo:', '📝'],
  ['style', ':art:', '🎨'],
  ['refactor', ':recycle:', '♻️'],
  ['perf', ':zap:', '⚡️'],
  ['test', ':white_check_mark:', '✅'],
  ['build', ':package:', '📦️'],
  ['ci', ':construction_worker:', '👷'],
  ['chore', ':wrench:', '🔧'],
  ['revert', ':rewind:', '⏪️'],
  ['internal', 'None', 'None'],
])('suggests both representations for %s', (type, code, emoji) => {
  const none = { label: 'None' };
  expect(suggestedGitmoji(type, gitmojiItems('code'), none).label).toBe(code);
  expect(suggestedGitmoji(type, gitmojiItems('emoji'), none).label).toBe(emoji);
});
