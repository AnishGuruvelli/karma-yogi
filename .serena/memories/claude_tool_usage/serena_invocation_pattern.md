# Serena MCP Tool Invocation — Correct Pattern

## Rule
Never call Serena tools via the `Skill` tool. `Skill` is only for files in `.claude/skills/`. Serena tools are MCP tools and require a two-step invocation:

1. `ToolSearch("select:mcp__serena__initial_instructions")` — loads the schema
2. `mcp__serena__initial_instructions()` — calls it directly as a tool

Same pattern for all Serena tools (`mcp__serena__find_symbol`, `mcp__serena__get_symbols_overview`, `mcp__serena__replace_symbol_body`, etc.): load schema via ToolSearch first, then call directly.

## Why
`Skill(mcp__serena__initial_instructions)` throws "Unknown skill" and silently skips Serena entirely, wasting tokens on raw Read/Edit/Bash instead of Serena's superior symbolic tools.

## How to apply
At the start of every coding task, load and call `mcp__serena__initial_instructions` before any Read, grep, or Bash on code files.
