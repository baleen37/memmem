---
description: Greet the user with a friendly message
argument-hint: [name]
allowed-tools: []
---

# Hello Command

A simple greeting command that demonstrates command structure.

## Your task

When the user runs `/hello [name]`:

1. If a name is provided in `$ARGUMENTS`, use it
2. If no name is provided, use "World"
3. Output a friendly greeting message

## Example output

```
Hello, Jiho! Welcome to the example plugin.
```

or

```
Hello, World! Welcome to the example plugin.
```

## Notes

- Keep commands focused on a single purpose
- Use `$ARGUMENTS` to access user input
- Consider default values for optional arguments
