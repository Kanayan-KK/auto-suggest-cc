import * as path from 'path';

function commonFileValue(
  root: string,
  files: readonly string[],
  classify: (relative: string) => string | undefined,
) {
  let common: string | undefined;
  for (const file of files) {
    // Ignore the entire suggestion if a path lies outside the chosen repository.
    const relative = path.relative(root, file);
    if (
      !relative ||
      relative === '..' ||
      relative.startsWith('..' + path.sep) ||
      path.isAbsolute(relative)
    )
      return undefined;

    const value = classify(relative);
    if (!value || (common !== undefined && common !== value)) return undefined;
    common = value;
  }
  return common;
}

export function scopeFromFiles(root: string, files: readonly string[]) {
  return commonFileValue(root, files, (relative) => {
    const { dir, name } = path.parse(relative);
    return dir ? path.basename(dir) : name;
  });
}

export function typeFromFiles(root: string, files: readonly string[]) {
  return commonFileValue(root, files, (relative) => {
    const parts = relative.split(path.sep);
    const name = parts.pop()!;
    // Workflow, test and documentation rules run in that order.
    if (parts[0] === '.github' && parts[1] === 'workflows') return 'ci';
    if (
      parts.some((dir) => ['test', 'tests', '__tests__'].includes(dir)) ||
      /\.(test|spec)\./.test(name)
    )
      return 'test';
    if (parts[0] === 'docs' || name.endsWith('.md')) return 'docs';
    return undefined;
  });
}
