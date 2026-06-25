import nextPlugin from "@next/eslint-plugin-next";

export default [
  { ignores: [".next/**", "node_modules/**"] },
  nextPlugin.configs.recommended,
  nextPlugin.configs["core-web-vitals"],
];
