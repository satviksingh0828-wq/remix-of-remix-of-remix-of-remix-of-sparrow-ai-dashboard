---
name: GitHub snapshot pushes
description: Environment constraints for publishing a single current-app snapshot without rewriting repository history.
---

When a project combines unrelated local and GitHub histories but only the current merged-app files should be published, base one new snapshot commit directly on the GitHub tip; do not force-push the local history.

**Why:** The workspace may have no GitHub HTTPS credentials, and a gitsafe backup remote does not authenticate or publish to GitHub. Git LFS may also be unavailable locally, so history operations involving tracked binaries need LFS smudging disabled.

**How to apply:** Verify the new commit has exactly the current `origin/main` as its parent and is one commit ahead. Push only after GitHub authentication is available; never paste credentials into chat.