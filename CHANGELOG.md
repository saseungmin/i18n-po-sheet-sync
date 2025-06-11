# i18n-po-sheet-sync

## 2.0.0

### Major Changes

- 80b4668: feat!: replace incremental upload with bulk replace strategy

  BREAKING CHANGE: Remove uploadFromPOFiles incremental update method

  - Rename uploadFromPOFilesWithReset to uploadFromPOFiles
  - Use bulk replace as the single upload strategy
  - Fixes rate limiting issues and improves performance

## 1.3.2

### Patch Changes

- 3bf472e: docs: add keywords in package.json with npm

## 1.3.1

### Patch Changes

- bb1b28c: fix: include dist folder in npm package

## 1.3.0

### Minor Changes

- 3c3a186: perf: migrate to rust-based toolchain for improved performance

## 1.2.1

### Patch Changes

- ae71584: chore: fix lint with biome

## 1.2.0

### Minor Changes

- ec664a0: docs: add usage example with sample code and documentation

## 1.1.1

### Patch Changes

- 10129be: fix: prevent data loss when exporting to PO files with existing values

## 1.1.0

### Minor Changes

- cc5bf26: fix: handle missing sheet headers in uploadFromPOWithReset

## 1.0.2

### Patch Changes

- cac60c8: docs: fix basic configuration example

## 1.0.1

### Patch Changes

- 7b0f227: docs: fix basic configuration

## 1.0.0

### Major Changes

- cd34f69: 🎉 Initial Release i18n-po-sheet-sync v1.0.0
