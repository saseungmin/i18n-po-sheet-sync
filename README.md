# i18n-po-sheet-sync

> English | [한국어](./README-ko_kr.md)

A Node.js library that facilitates synchronization between multilingual PO files and Google Spreadsheets.  
Paid collaborative tools are often used for efficient multilingual management.  
However, in most cases, paid tools can be a financial burden. Therefore, Google Spreadsheets alone are usually sufficient.

The .PO extension is widely used in internationalization and localization (i18n) systems for multilingual programs. i18n-po-sheet-sync enables quick and simple multilingual management through synchronization between .PO files and Google Spreadsheets.

## Features

- Export multilingual data from Google Spreadsheets to PO files
- Upload multilingual data from PO files to Google Spreadsheets
- Support for two upload methods (incremental update / batch update after sheet reset)
- Synchronize context, references, and comments of multilingual items
- Automatically apply conditional formatting to empty translation cells
- TypeScript support
- Usage with Other Multilingual Frameworks (lingui, i18next)

## Example
- Please refer to the [example](./example) folder for usage instructions of `i18n-po-sheet-sync`.
- The [locales folder](./example/locales/) contains PO files organized by language (en, ko, etc.).
- `example-account-auth.json` is an example of service account credentials with access permissions to Google Spreadsheet. Please change it to your own service account credentials when using.
- To view an example Google Spreadsheet managed by i18n-po-sheet-sync, click [here](https://docs.google.com/spreadsheets/d/1BzFBfl9xefXPl4X57NU5aBiE2-eZ6lc2YhN37RSmo3k/edit?usp=sharing).

## Installation

```bash
npm install i18n-po-sheet-sync
# or
yarn add i18n-po-sheet-sync
```

## Usage

### Basic Configuration

```typescript
import I18nPOSheetSync from 'i18n-po-sheet-sync';
import { join } from 'path';

// Configuration
const config = {
  serviceAccount: {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  },
  spreadsheetId: 'GOOGLE_SHEET_ID',
  languages: ['ko', 'en', 'ja', 'zh', '...'],
  poFilesBasePath: join(__dirname, 'locale/locales')
};

// Create instance
const i18nSync = new I18nPOSheetSync(config);
```

### Export from Google Spreadsheet to PO files

```typescript
async function exportToPO() {
  try {
    const results = await i18nSync.exportToPO({
      filterMissingTranslations: false,
      preserveExistingItems: true
    });
    
    console.log('Export completed:', results);
  } catch (error) {
    console.error('Export failed:', error);
  }
}

exportToPO();
```

### Upload from PO files to Google Spreadsheet

```typescript
async function uploadFromPO() {
  try {
    const result = await i18nSync.uploadFromPO({
      applyConditionalFormatting: true, // Apply background color to empty cells
      emptyColor: '#FFEBEE', // Empty cell background color (light red)
      preserveExistingTranslations: true, // Preserve existing translations
    });
    
    console.log('Upload from po completed:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

uploadFromPO();
```

#### Apply Conditional Formatting Only

```typescript
async function applyFormatting() {
  try {
    await i18nSync.applyConditionalFormatting('#FFEBEE');
    console.log('Conditional formatting applied successfully');
  } catch (error) {
    console.error('Failed to apply formatting:', error);
  }
}

applyFormatting();
```

## Configuration Options

### Basic Configuration (I18nSyncConfig)

| Option | Type | Description |
|------|------|------|
| `serviceAccount` | `ServiceAccountConfig` | Google service account information |
| `languages` | `string[]` | Array of supported language codes |
| `poFilesBasePath` | `string` | Base path where PO files are stored |
| `sheetIndex` | `number` (optional) | Sheet index within the spreadsheet (default: 0) |

### Spreadsheet Header Titles

| Option | Type | Description |
|------|------|------|
| `msgid` | `string` | Message ID header (default: 'messageId') |
| `msgctxt` | `string` (optional) | Context header (default: 'context') |
| `references` | `string` (optional) | References header (default: 'references') |
| `comments` | `string` (optional) | Comments header (default: 'comments') |
| `extractedComments` | `string` (optional) | Extracted comments header (default: 'extractedComments') |

### Export Options (ExportOptions)

| Option | Type | Default | Description |
|------|------|--------|------|
| `filterMissingTranslations` | `boolean` | `false` | Whether to filter items with missing translations |
| `preserveExistingItems` | `boolean` | `false` | Whether to preserve existing PO items not in the spreadsheet |
| `pluralFormsByLanguage` | `Record<string, string>` | - | Specify plural rules by language |

### Upload Options (UploadOptions)

| Option | Type | Default | Description |
|------|------|--------|------|
| `applyConditionalFormatting` | `boolean` | `false` | Whether to apply background color to empty translation cells |
| `emptyColor` | `string` | `#FFEBEE` | Background color for empty translation cells (HEX code) |
| `preserveExistingTranslations` | `boolean` | `false` | Whether to preserve existing translation values |

## Google Spreadsheet Format

The library expects a spreadsheet in the following format:

| messageId | ko | en | ... | context | references | comments | extractedComments |
|-----------|----|----|-----|-----------|---------------|------|-------------|
| hello     | 안녕하세요 | Hello | ... | greeting | src/App.js    | Greeting | User greeting |
| goodbye   | 안녕히 가세요 | Goodbye | ... | greeting | src/App.js    | Farewell | On logout |

Header names can be changed through the `HeaderMapping` option.

## Usage with Other Multilingual Frameworks

### Using with lingui
- Can be used together with [lingui](https://lingui.dev/), an i18n multilingual framework.

```bash
yarn add --dev @lingui/cli
```

- Add to package.json

```json
{
  "scripts": {
    "extract": "lingui extract",
    "compile": "lingui compile",
    "upload": "ts-node scripts/upload-translate.ts",
    "export": "ts-node scripts/export-translate.ts",
  }
}
```

- Running the extract script generates .PO files currently in use.
- Running the upload script reflects changes to the Google Spreadsheet.
- Running the export script applies multilingual changes from the Google Spreadsheet.
- Running the compile script compiles the updated .PO multilingual files.

### i18next
- With i18next, you can convert to .PO multilingual files using [i18next-gettext-converter](https://github.com/i18next/i18next-gettext-converter).

```bash
i18next-conv -l en -s ./locales/en.translation.json -t ./locales/en/translation.po
```

## License

MIT
