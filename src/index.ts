import { getSpreadsheetDocument } from './auth';
import { DEFAULT_HEADER_MAPPING } from './constants';
import { POExporter } from './exporter';
import type {
  ExportOptions,
  ExportResult,
  HeaderMapping,
  I18nSyncConfig,
  Language,
  POItem,
  RGBColor,
  Row,
  ServiceAccount,
  SheetRow,
  UploadOptions,
  UploadResult,
  UploadWithResetOptions,
} from './types';
import { POUploader } from './uploader';

export type {
  ExportOptions,
  ExportResult,
  HeaderMapping,
  I18nSyncConfig,
  Language,
  POItem,
  RGBColor,
  Row,
  ServiceAccount,
  SheetRow,
  UploadOptions,
  UploadResult,
};

class I18nPOSheetSync {
  private config: I18nSyncConfig;
  private headerMapping: HeaderMapping;

  constructor(config: I18nSyncConfig, headerMapping?: HeaderMapping) {
    this.config = config;
    this.headerMapping = headerMapping || DEFAULT_HEADER_MAPPING;
  }

  /**
   * Export data from Google Spreadsheet to PO files
   * @param options Export options
   */
  async exportToPO(options?: ExportOptions): Promise<ExportResult[]> {
    const spreadsheet = await getSpreadsheetDocument(
      this.config.spreadsheetId,
      this.config.serviceAccount,
    );
    const exporter = new POExporter(this.config, this.headerMapping);

    return exporter.exportToPOFiles(spreadsheet, options);
  }

  /**
   * Upload data from PO files to Google Spreadsheet (Incremental update method)
   * @param options Upload options
   */
  async uploadFromPO(options?: UploadOptions): Promise<UploadResult[]> {
    const spreadsheet = await getSpreadsheetDocument(
      this.config.spreadsheetId,
      this.config.serviceAccount,
    );
    const uploader = new POUploader(this.config, this.headerMapping);

    return uploader.uploadFromPOFiles(spreadsheet, options);
  }

  /**
   * Upload data from PO files to Google Spreadsheet (Bulk update after sheet reset)
   * @param options Upload with reset options
   */
  async uploadFromPOWithReset(
    options?: UploadWithResetOptions,
  ): Promise<UploadResult> {
    const spreadsheet = await getSpreadsheetDocument(
      this.config.spreadsheetId,
      this.config.serviceAccount,
    );
    const uploader = new POUploader(this.config, this.headerMapping);

    return uploader.uploadFromPOFilesWithReset(spreadsheet, options);
  }

  /**
   * Apply conditional formatting to empty translation cells
   * @param emptyColor Background color for empty cells (HEX code)
   */
  async applyConditionalFormatting(emptyColor = '#FFEBEE'): Promise<void> {
    const spreadsheet = await getSpreadsheetDocument(
      this.config.spreadsheetId,
      this.config.serviceAccount,
    );
    const sheet = spreadsheet.sheetsByIndex[this.config.sheetIndex || 0];

    if (!sheet) {
      throw new Error(
        `Sheet with index ${this.config.sheetIndex || 0} not found`,
      );
    }

    const uploader = new POUploader(this.config, this.headerMapping);

    await uploader.applyConditionalFormatting(
      sheet,
      spreadsheet.spreadsheetId,
      this.config.serviceAccount,
      emptyColor,
    );
  }
}

export default I18nPOSheetSync;
