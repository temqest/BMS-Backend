# AGENTS.md - Backend Security Guidelines

## Security Rules
1. **No Hardcoded Secrets**: Never embed API keys, secret tokens, or credentials as default fallback strings (`process.env.KEY || "AIzaSy..."`).
2. **Environment Variable Enforcement**: All service keys and secrets must be loaded dynamically from `process.env`.
3. **Safe Bypass Evaluation**: Always verify that secret bypass codes are non-empty before evaluating authorization requests.

---

## Clean Code & No Comments Rule (STRICT)
1. **No Unnecessary Code Comments**: Do NOT add explanatory comments, inline explanations, or narrative text describing what code does. Write clean, self-documenting code.
2. **No Section Dividers or Decorative Banners**: Do NOT add comment dividers, section headers, or ASCII banners.
3. **No TODOs or Meta Commentary**: Never leave `// TODO`, `// NOTE`, or AI self-referential notes.
4. **Exceptions Only When Mandatory**: Only include comments if explicitly requested by the user or strictly required for compiler/linter directives.

