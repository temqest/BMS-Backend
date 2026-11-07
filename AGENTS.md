# AGENTS.md - Backend Security Guidelines

## Security Rules
1. **No Hardcoded Secrets**: Never embed API keys, secret tokens, or credentials as default fallback strings (`process.env.KEY || "AIzaSy..."`).
2. **Environment Variable Enforcement**: All service keys and secrets must be loaded dynamically from `process.env`.
3. **Safe Bypass Evaluation**: Always verify that secret bypass codes are non-empty before evaluating authorization requests.

---

## Clean Code & No Comments Rule (STRICT)
1. **Purge Existing Comments on Encounter**: When coding, modifying, or editing any file, proactively remove any comments encountered from previous coding sessions, past authors, or AI generations.
2. **Never Add Code Comments**: Do NOT add comments, inline explanations, or narrative text describing what code does. Write clean, self-documenting code.
3. **No Section Dividers or Decorative Banners**: Do NOT add comment dividers, section headers, or ASCII banners. Remove existing ones immediately.
4. **No TODOs or Meta Commentary**: Never leave `// TODO`, `// NOTE`, `// FIXME`, or AI self-referential notes.
5. **Exceptions Only When Mandatory**: Only include comments if strictly required for compiler/linter directives.

