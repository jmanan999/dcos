import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow any type since we have untyped API responses from the backend
      "@typescript-eslint/no-explicit-any": "off",
      // Allow non-null assertions in Next.js pages
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
];

export default eslintConfig;
