/* eslint-disable unicorn/prefer-module */
module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: [
    "@typescript-eslint",
    "unicorn",
    "jest",
    "import",
    "react",
    "prettier",
    "react-hooks",
    "jsx-a11y",
    "promise",
  ],
  extends: [
    "plugin:unicorn/recommended",
    "plugin:react-hooks/recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "plugin:jsx-a11y/recommended",
    "plugin:promise/recommended",
  ],
  settings: {
    react: {
      version: "detect",
    },
  },
  rules: {
    "react/button-has-type": "error",
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "function-declaration",
        unnamedComponents: "arrow-function",
      },
    ],
    "prefer-const": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "react/react-in-jsx-scope": "off",
    "react/jsx-uses-react": "off",
    "no-unused-vars": "off",
    "no-var": "off",
    "unicorn/no-null": "off",
    "unicorn/prefer-node-protocol": "off",
    "unicorn/filename-case": "off",
    "unicorn/prevent-abbreviations": "off",
  },
};
