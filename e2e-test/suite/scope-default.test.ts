import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  acceptDefault,
  goBack,
  installPromptStubs,
  PromptAnswer,
} from './stub-prompts';

interface Repository {
  rootUri: vscode.Uri;
  inputBox: { value: string };
  status(): Promise<void>;
}
interface Git {
  repositories: Repository[];
  openRepository(uri: vscode.Uri): Promise<Repository | null>;
}

suite('suggested scope in a selected repository', () => {
  let root: string;
  let repo: Repository;
  const settings = vscode.workspace.getConfiguration();
  const changedSettings = new Set<string>();

  async function configure(key: string, value: unknown) {
    changedSettings.add(key);
    await settings.update(key, value, vscode.ConfigurationTarget.Global);
  }

  function git(...args: string[]) {
    execFileSync('git', args, { cwd: root, stdio: 'pipe' });
  }

  function write(file: string) {
    const target = path.join(root, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file);
  }

  async function check(
    scope: string,
    answers: PromptAnswer[] = [acceptDefault],
  ) {
    await repo.status();
    const stubs = installPromptStubs(['feat', ...answers, 'test scope']);
    try {
      await vscode.commands.executeCommand(
        'autoSuggestCC.createCommit',
        repo.rootUri,
      );
      assert.strictEqual(
        repo.inputBox.value,
        scope ? `feat(${scope}): test scope` : 'feat: test scope',
      );
      assert.strictEqual(stubs.remaining(), 0);
    } finally {
      stubs.dispose();
    }
  }

  suiteSetup(async () => {
    // Use an additional real repository so the selected workspace matters.
    root = process.env.SECOND_REPO_PATH!;
    const extension = vscode.extensions.getExtension('vscode.git')!;
    const api: Git = (await extension.activate()).getAPI(1);
    const opened = await api.openRepository(vscode.Uri.file(root));
    assert.ok(opened);
    repo = opened;
    assert.ok(
      api.repositories.some((r) => r.rootUri.fsPath !== repo.rootUri.fsPath),
    );
    for (const key of ['autoCommit', 'gitmoji', 'promptBody', 'promptFooter'])
      await configure('conventionalCommits.' + key, false);
  });

  teardown(() => {
    git('reset', '--hard', 'HEAD');
    git('clean', '-fd');
  });

  suiteTeardown(async () => {
    for (const key of changedSettings)
      await settings.update(key, undefined, vscode.ConfigurationTarget.Global);
  });

  test('prefers staged changes, including a rename destination and a deletion', async () => {
    fs.mkdirSync(path.join(root, 'docs'));
    git('mv', 'README.md', 'docs/guide.md');
    write('unrelated/file.txt');
    await check('docs');
    git('reset', '--hard', 'HEAD');
    git('rm', 'README.md');
    await check('README');
  });

  test('matches smart commit settings for tracked and untracked files', async () => {
    write('README.md');
    write('other/file.txt');
    await configure('git.enableSmartCommit', false);
    await check('');
    await configure('git.enableSmartCommit', true);
    await configure('git.smartCommitChanges', 'tracked');
    await check('README');
    await configure('git.smartCommitChanges', 'all');
    await check('');
    await configure('git.untrackedChanges', 'separate');
    await check('README');
    await configure('git.untrackedChanges', 'mixed');
  });

  test('keeps manual choices on Back and does not save generated or one-time scopes', async () => {
    write('src/file.ts');
    git('add', 'src');
    await configure('conventionalCommits.scopes', ['manual']);
    await check('src');
    await check('manual', ['manual', goBack, acceptDefault]);
    await check('', ['', goBack, acceptDefault]);
    await check('one-time', [
      'New scope (only use once)',
      'one-time',
      goBack,
      acceptDefault,
      acceptDefault,
    ]);
    assert.deepStrictEqual(
      vscode.workspace.getConfiguration().get('conventionalCommits.scopes'),
      ['manual'],
    );
    await configure('conventionalCommits.defaultScopeMode', 'disabled');
    await check('');
    await configure('conventionalCommits.defaultScopeMode', 'fromChangedFiles');
  });

  test('rejects a suggestion disallowed by commitlint', async () => {
    fs.writeFileSync(
      path.join(root, '.commitlintrc.json'),
      JSON.stringify({ rules: { 'scope-enum': [2, 'always', ['allowed']] } }),
    );
    write('src/file.ts');
    git('add', 'src');
    await check('');
    await check('allowed', ['allowed']);
  });
});
