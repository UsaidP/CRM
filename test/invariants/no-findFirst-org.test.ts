import { describe, it, expect } from 'bun:test';
import { readdirSync, statSync, readFileSync } from 'fs';
import { join } from 'path';

function findSourceFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir);
  for (const file of files) {
    const fullPath = join(dir, file);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      findSourceFiles(fullPath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.tsx')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe('Multi-Org Invariant Ratchet', () => {
  it('organization.findFirst is never called anywhere in src/', () => {
    const srcDir = join(process.cwd(), 'src');
    const allFiles = findSourceFiles(srcDir);

    const violations: { file: string; line: number; lineContent: string }[] = [];

    for (const filePath of allFiles) {
      const content = readFileSync(filePath, 'utf-8');
      if (content.includes('organization.findFirst')) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('organization.findFirst')) {
            violations.push({
              file: filePath.replace(process.cwd(), ''),
              line: index + 1,
              lineContent: line.trim(),
            });
          }
        });
      }
    }

    expect(violations).toEqual([]);
  });
});
