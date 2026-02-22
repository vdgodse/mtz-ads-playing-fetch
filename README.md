# mtz-ads-playing-fetch

Fun friday - playing fetch

## React Compiler (Forget)

This project has React Compiler enabled through Vite's React plugin.

- Babel plugin: `babel-plugin-react-compiler`
- Target: React `18`
- Runtime package: `react-compiler-runtime`

To verify it is active, build the project and inspect output for imports from
`react-compiler-runtime` and memoization cache helper calls.

## Linting (Oxlint only)

This project uses **Oxlint** as the only linter.

- Run lint checks: `npm run lint`
- Auto-fix where possible: `npm run lint:fix`

Note: React Compiler's dedicated diagnostic rules are currently provided through
the ESLint React Hooks plugin. Since this project is Oxlint-only, those
ESLint-specific compiler diagnostics are intentionally not enabled.

## Formatting (Oxfmt)

This project also uses **Oxfmt** for code formatting.

- Format files in-place: `npm run format`
- Check formatting (CI-friendly): `npm run format:check`
