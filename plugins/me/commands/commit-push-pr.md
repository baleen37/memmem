---
description: Commit changes, push to remote, and create/update a pull request
---

Use the `commit-push-pr` skill to handle the complete git workflow: gather context, check for merge conflicts, commit changes, push, and create or update a PR.

The skill will:
1. Check current branch, git status, and PR state in parallel
2. Verify no merge conflicts with the base branch
3. Create a WIP branch if currently on main/master
4. Commit changes with conventional commit format
5. Push to remote
6. Create new PR or update existing one with --base flag

Always invoke the skill using the Skill tool before taking any action.
