---
"i18n-po-sheet-sync": major
---

feat!: replace incremental upload with bulk replace strategy

BREAKING CHANGE: Remove uploadFromPOFiles incremental update method
- Rename uploadFromPOFilesWithReset to uploadFromPOFiles
- Use bulk replace as the single upload strategy
- Fixes rate limiting issues and improves performance
