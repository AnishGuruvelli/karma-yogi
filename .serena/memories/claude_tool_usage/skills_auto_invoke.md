# Claude Skills — Auto-Invoke Rules

Claude must invoke the relevant skill automatically when the user's prompt matches one of the trigger patterns below. Do NOT wait for the user to type a slash command.

## Trigger → Skill mapping

| When the prompt is about… | Invoke |
|---|---|
| Adding a new page | `/new-page` |
| Adding a modal or bottom sheet | `/new-modal` |
| Calling a new backend endpoint | `/new-api-endpoint` |
| Mobile UI issues, responsiveness, tap targets | `/mobile-checklist` |
| Building APK/AAB, Play Store, cap sync | `/deploy-android` |
| Reviewing code, PR review, checking changes | `/review-changes` |
| Refactoring, renaming, restructuring code | `/refactor-safely` |
| Exploring codebase, "where is X", "how does Y work" | `/explore-codebase` |
| Debugging a bug, tracing an error, "why is X broken" | `/debug-issue` |

## How to invoke

Use the `Skill` tool with the skill name (without the slash):

```
Skill({ skill: "new-page" })
Skill({ skill: "new-modal" })
Skill({ skill: "new-api-endpoint" })
Skill({ skill: "mobile-checklist" })
Skill({ skill: "deploy-android" })
Skill({ skill: "review-changes" })
Skill({ skill: "refactor-safely" })
Skill({ skill: "explore-codebase" })
Skill({ skill: "debug-issue" })
```

Skills live in `.claude/skills/`. Never use `Skill` for MCP tools (those are invoked via `ToolSearch` + direct call).

## Why

The project's CLAUDE.md explicitly requires auto-invocation. Skipping it causes Claude to miss structured checklists and conventions that the skill encodes, leading to incomplete implementations.
