# AGENTS.md - Backend Security Guidelines

## Security Rules
1. **No Hardcoded Secrets**: Never embed API keys, secret tokens, or credentials as default fallback strings (`process.env.KEY || "AIzaSy..."`).
2. **Environment Variable Enforcement**: All service keys and secrets must be loaded dynamically from `process.env`.
3. **Safe Bypass Evaluation**: Always verify that secret bypass codes are non-empty before evaluating authorization requests.
