import * as path from 'path';

/** Return a default only when every commit path yields the same nonempty scope. */
export function scopeFromFiles(root: string, files: readonly string[]) {
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

    // Root files contribute their stem. Nested files contribute their immediate parent.
    const { dir, name } = path.parse(relative);
    const scope = dir ? path.basename(dir) : name;
    if (!scope || (common !== undefined && common !== scope)) return undefined;
    common = scope;
  }
  return common;
}
