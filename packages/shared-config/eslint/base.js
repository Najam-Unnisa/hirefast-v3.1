/**
 * Shared ESLint base config for HireFast packages (ESLint flat-config compatible helper).
 * Apps may extend or wrap this as needed.
 */
module.exports = {
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'prefer-const': 'error',
    'no-var': 'error',
    eqeqeq: ['error', 'always'],
  },
};
