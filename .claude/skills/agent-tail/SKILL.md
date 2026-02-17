---
name: agent-tail
description: Read and analyze agent-tail log files to debug server errors, browser console output, and runtime issues. Use when investigating bugs, checking for errors, or when the user mentions logs.
argument-hint: "[service-name]"
allowed-tools: Read, Grep, Glob, Bash(cat var/logs/*), Bash(ls var/logs/*)
---

# Agent-tail Log Reader

Read the agent-tail logs to diagnose the issue. If `$ARGUMENTS` is provided, focus on that service's log file.

## Log locations

All logs live under `var/logs/latest/` (symlink to most recent session):

| File           | Contents                                            |
| -------------- | --------------------------------------------------- |
| `combined.log` | All services merged chronologically                 |
| `web.log`      | Vite dev server output                              |
| `api.log`      | Bun API server output                               |
| `browser.log`  | Browser console output (via vite-plugin-agent-tail) |

## Log format

```
[HH:MM:SS.mmm] [LEVEL  ] message (url)
    stack trace indented 4 spaces
```

Levels: `LOG`, `WARN`, `ERROR`, `INFO`, `DEBUG`. The level field is padded to 7 characters.

## Steps

1. If a specific service was requested, read `var/logs/latest/$ARGUMENTS.log`. Otherwise start with `combined.log`.
2. Search for `ERROR` and `WARN` entries first.
3. When you find an error, read the surrounding context and any stack traces.
4. Correlate browser errors with server errors by matching timestamps.
5. Report findings with the relevant log lines and your analysis.

## Tips

- Browser errors include the source URL — use it to locate the failing code.
- Stack traces follow the error line, indented with 4 spaces.
- If logs are empty or missing, the dev server may not be running (`bun run dev`).
- For older sessions, check `var/logs/` for timestamped directories.
