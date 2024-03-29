/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  extends: ['@modern-js'],
  rules: {
    'no-param-reassign': 'off',
    'new-cap': 'off',
    'no-new': 'off',
    'no-implicit-coercion': 'off',
    'spaced-comment': [
      'error',
      'always',
      {
        line: {
          markers: ['#region', '#endregion', 'region', 'endregion'],
        },
      },
    ],
    '@typescript-eslint/typedef': 'off',
    '@typescript-eslint/no-parameter-properties': 'off',
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports', disallowTypeAnnotations: false }],
    'import/no-named-as-default-member': 'off',
    'import/order': [
      'warn',
      {
        pathGroups: [
          {
            pattern: '{@/**,@api}',
            group: 'internal',
          },
          {
            pattern: '{react,react-dom,homebridge}',
            group: 'builtin',
          },
        ],
        pathGroupsExcludedImportTypes: ['type'],
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
        'newlines-between': 'always',
        groups: ['builtin', 'external', 'unknown', ['internal', 'sibling', 'parent', 'index'], 'object', 'type'],
      },
    ],
  },
  overrides: [
    {
      files: ['*.d.ts'],
      rules: {
        'spaced-comment': 'off',
      },
    },
  ],
};
