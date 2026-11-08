import * as path from 'path';
import { expect, test } from 'vitest';
import { scopeFromFiles } from '../scope-default';

const root = path.resolve('project');

test.each<[string[], string | undefined]>([
  [['README.md'], 'README'],
  [['package.json'], 'package'],
  [['.gitignore'], '.gitignore'],
  [['src/index.ts'], 'src'],
  [['src/auth/login.ts'], 'auth'],
  [['src/components/Button.tsx'], 'components'],
  [['src/a.ts', 'src/b.ts'], 'src'],
  [['src/auth/a.ts', 'src/auth/b.ts'], 'auth'],
  [['src/auth/a.ts', 'src/user/b.ts'], undefined],
  [['README.md', 'package.json'], undefined],
  [['src/a.ts', '../other/src/b.ts'], undefined],
  [[], undefined],
])('derives a common scope for %j', (files, expected) => {
  expect(
    scopeFromFiles(
      root,
      files.map((file) => path.resolve(root, file)),
    ),
  ).toBe(expected);
});
