import type { JWTOptions } from 'google-auth-library';
import type { GoogleSpreadsheetRow } from 'google-spreadsheet';
import type pofile from 'pofile';

export type Language = string;

export type ServiceAccount = Omit<JWTOptions, 'scopes'>;

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface I18nSyncConfig {
  /**
   * Service account credentials (required)
   * @example {
   *   email: serviceAccount.client_email,
   *   key: serviceAccount.private_key,
   * }
   */
  serviceAccount: ServiceAccount;
  /**
   * Spreadsheet ID (required)
   */
  spreadsheetId: string;
  /**
   * Languages (required)
   * @example ['en', 'ko', 'ja']
   */
  languages: Language[];
  /**
   * Base path for PO files (required)
   * @example join(__dirname, 'locales')
   */
  poFilesBasePath: string;
  /**
   * Sheet index (optional)
   */
  sheetIndex?: number;
}

export interface HeaderMapping {
  msgid: string;
  msgctxt?: string;
  references?: string;
  comments?: string;
  extractedComments?: string;
}

export type HeaderMappingValue = NonNullable<
  HeaderMapping[keyof HeaderMapping]
>;

export type Row = Record<HeaderMappingValue, string>;

export type SheetRow = GoogleSpreadsheetRow<Row>;

export type POItem = InstanceType<typeof pofile.Item>;

export interface ExportOptions {
  /**
   * Filter out missing translations
   * @default false
   */
  filterMissingTranslations?: boolean;
  /**
   * Preserve existing items
   * @default false
   */
  preserveExistingItems?: boolean;
  /**
   * Plural forms by language
   * @default {
   *   ko: "nplurals=1; plural=0;",
   *   en: "nplurals=2; plural=(n != 1);",
   * }
   */
  pluralFormsByLanguage?: Record<Language, string>;
}

export interface UploadOptions {
  /**
   * Apply conditional formatting to empty translation cells
   * @default true
   */
  applyConditionalFormatting?: boolean;
  /**
   * Background color for empty cells (HEX code)
   * @default "#FFEBEE"
   */
  emptyColor?: string;
  /**
   * Preserve existing translations
   */
  preserveExistingTranslations?: boolean;
}

export interface ExportResult {
  language: Language;
  totalItems: number;
  updatedItems: number;
  removedItems: number;
  filePath: string;
}

export interface UploadResult {
  language?: Language;
  totalItems: number;
  addedItems: number;
  updatedItems: number;
  status?: 'success' | 'failed';
}
