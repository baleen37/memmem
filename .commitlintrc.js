export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'ralph-loop',
        'git-guard',
        'me',
        'example-plugin',
        'release',
        'ci',
      ],
    ],
    'subject-case': [0],
  },
  parserPreset: {
    parserOpts: {
      breakHeaderPattern: /^(?:(?<wip>WIP)|\w+):(?:\s.*)?\n\n(?<broken>.*)/s,
    },
  },
};
