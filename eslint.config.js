import baseConfig from "@workspace/eslint-config/base"

export default [
  ...baseConfig,
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
]
