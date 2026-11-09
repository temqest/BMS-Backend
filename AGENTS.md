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

---

## 📌 Notion Sprint Auto-Ticket Creation on Git Push (MANDATORY)

Whenever the AI is requested to push changes (or commit and push) to git for this repository (`BirthMonitoring-Backend`):

The AI **MUST automatically create and log a corresponding Sprint Ticket in Notion** to ensure the sprint boards remain continuously updated and reflect active development:

1. **Target Notion Agile Board**:
   - **Backend Agile Board (BMS API & Database)** (`database_id: 3f88e9dc-d486-813d-b447-e7aebba4f419`) | Prefix: `BMS-BE-###`

2. **Mandatory Ticket Fields**:
   - **`Task Name`**: Action-oriented, descriptive title of what was delivered.
   - **`Ticket ID`**: Next sequential ticket ID for that board.
   - **`Status`**: `Done` for completed/shipped tasks, or `In Review / QA` / `In Progress` for active branches.
   - **`Sprint`**: The current active sprint (e.g., `Sprint 6 - Multi-Tenant Facility Isolation & SuperAdmin`).
   - **`Type`**: `User Story`, `Technical Task`, `Bug / Defect`, `Security & Audit`, or `Architecture`.
   - **`Priority`**: `Critical`, `High`, `Medium`, or `Low`.
   - **`Module`**: Targeted architectural or clinical module.
   - **`Story Points`**: Fibonacci estimation (1, 2, 3, 5, or 8).
   - **`Assignee`**: Developer name (`Patrick Villamer` or role).

3. **Mandatory Card Body Content**:
   Each created ticket page must contain:
   - `## 📋 User Story & Description`: Technical and clinical motivation for the change.
   - `### ✅ Acceptance Criteria (Definition of Done)`: Checkbox list of verifiable criteria.
   - `### 🛠️ Implementation Details & Codebase Artifacts`: Specific commit hash, key files changed, and affected controllers/services.

4. **Workflow Execution**:
   - After executing `git commit` and `git push`, invoke Notion MCP (`API-post-page`) or Notion API to create the ticket.
   - Report the created Ticket ID, Notion URL, and sprint status in the response to the user.

