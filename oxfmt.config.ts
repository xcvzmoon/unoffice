import { defineConfig } from 'oxfmt';

export default defineConfig({
  sortPackageJson: false,
  sortImports: {
    groups: [
      'type-import',
      ['value-builtin', 'value-external'],
      'value-internal',
      ['value-parent', 'value-sibling', 'value-index'],
      'unknown',
    ],
    newlinesBetween: false,
  },
  singleQuote: true,
  ignorePatterns: ['CHANGELOG.md'],
});
