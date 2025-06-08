import * as path from 'node:path';

import type { GoogleSpreadsheet } from 'google-spreadsheet';
import pofile from 'pofile';

import { DEFAULT_HEADER_MAPPING } from './constants';
import { loadOrCreatePOFile, savePOFile } from './po-utils';
import type {
  ExportOptions,
  ExportResult,
  HeaderMapping,
  I18nSyncConfig,
  Language,
  POItem,
  Row,
  SheetRow,
} from './types';

export class POExporter {
  private config: I18nSyncConfig;
  private headerMapping: HeaderMapping;

  constructor(
    config: I18nSyncConfig,
    headerMapping: HeaderMapping = DEFAULT_HEADER_MAPPING,
  ) {
    this.config = config;
    this.headerMapping = headerMapping;
  }

  async exportToPOFiles(
    spreadsheet: GoogleSpreadsheet,
    options: ExportOptions = {
      filterMissingTranslations: false,
      preserveExistingItems: false,
    },
  ): Promise<ExportResult[]> {
    const sheetIndex = this.config.sheetIndex || 0;
    const sheet = spreadsheet.sheetsByIndex[sheetIndex];

    if (!sheet) {
      throw new Error(
        `Sheet with index ${sheetIndex} not found in the spreadsheet`,
      );
    }

    await sheet.loadHeaderRow();
    const headers = sheet.headerValues;

    const filteredLanguages = headers.filter((header): header is Language =>
      this.config.languages.includes(header),
    );

    if (filteredLanguages.length === 0) {
      throw new Error('No configured languages found in spreadsheet headers');
    }

    const rows = await sheet.getRows<Row>();

    if (rows.length === 0) {
      throw new Error('No data found in spreadsheet');
    }

    const results: ExportResult[] = [];

    for (const lang of filteredLanguages) {
      try {
        const result = await this.processLanguage(lang, rows, options);
        results.push(result);
      } catch (error) {
        console.error(`Error processing language ${lang}:`, error);
        throw error;
      }
    }

    return results;
  }

  private async processLanguage(
    language: Language,
    rows: SheetRow[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    const poFilePath = path.join(
      this.config.poFilesBasePath,
      language,
      'messages.po',
    );

    const po = loadOrCreatePOFile(poFilePath, language, options);

    const existingItems: Record<string, POItem> = {};
    for (const item of po.items) {
      existingItems[item.msgid] = item;
    }

    const spreadsheetMsgIds = new Set<string>();
    const originalItemsCount = po.items.length;
    let updatedCount = 0;

    const newItems: POItem[] = options.preserveExistingItems
      ? [...po.items]
      : [];

    for (const row of rows) {
      const rowObject = row.toObject();
      const msgid = rowObject[this.headerMapping.msgid];

      if (!msgid) {
        continue;
      }

      spreadsheetMsgIds.add(msgid);

      const translation = rowObject[language];

      // Skip if there's no translation and we're filtering missing translations
      if (options.filterMissingTranslations && !translation) {
        continue;
      }

      let item: POItem;
      let isNewItem = false;

      if (existingItems[msgid]) {
        item = existingItems[msgid];

        // Check if any updates are needed
        if (
          item.msgstr[0] !== translation ||
          (this.headerMapping.msgctxt &&
            item.msgctxt !== rowObject[this.headerMapping.msgctxt]) ||
          this.referencesChanged(
            item,
            rowObject,
            this.headerMapping.references,
          ) ||
          this.commentsChanged(
            item,
            rowObject,
            this.headerMapping.comments,
            'comments',
          ) ||
          this.commentsChanged(
            item,
            rowObject,
            this.headerMapping.extractedComments,
            'extractedComments',
          )
        ) {
          updatedCount++;
        } else {
          // No changes needed, keep the existing item if preserving
          if (options.preserveExistingItems) {
            continue;
          }
        }
      } else {
        item = new pofile.Item();
        isNewItem = true;
        updatedCount++;
      }

      // Update all fields
      item.msgid = msgid;

      // Always set msgstr even if empty
      item.msgstr = [translation || ''];

      // Update optional fields if available
      this.updateOptionalFields(item, rowObject);

      if (!options.preserveExistingItems) {
        newItems.push(item);
      }
    }

    // Filter items to only keep those in the spreadsheet if not preserving
    if (!options.preserveExistingItems) {
      po.items = newItems.filter((item) => spreadsheetMsgIds.has(item.msgid));
    }

    const removedCount = options.preserveExistingItems
      ? 0
      : originalItemsCount - po.items.length;

    await savePOFile(po, poFilePath);

    return {
      language,
      totalItems: po.items.length,
      updatedItems: updatedCount,
      removedItems: removedCount,
      filePath: poFilePath,
    };
  }

  // 메타데이터 업데이트 - 스프레드시트에 값이 있는 경우에만 업데이트
  private updateOptionalFields(item: POItem, rowObject: Partial<Row>): void {
    if (this.headerMapping.msgctxt && rowObject[this.headerMapping.msgctxt]) {
      item.msgctxt = rowObject[this.headerMapping.msgctxt];
    }

    if (
      this.headerMapping.references &&
      rowObject[this.headerMapping.references]
    ) {
      const references =
        rowObject[this.headerMapping.references]?.split('\n') ?? [];
      item.references = references;
    }

    if (this.headerMapping.comments && rowObject[this.headerMapping.comments]) {
      const comments =
        rowObject[this.headerMapping.comments]?.split('\n') ?? [];
      item.comments = comments;
    }

    if (
      this.headerMapping.extractedComments &&
      rowObject[this.headerMapping.extractedComments]
    ) {
      const extractedComments =
        rowObject[this.headerMapping.extractedComments]?.split('\n') ?? [];
      item.extractedComments = extractedComments;
    }
  }

  private referencesChanged(
    item: POItem,
    rowObject: Partial<Row>,
    fieldName?: string,
  ): boolean {
    if (!fieldName || !rowObject[fieldName]) {
      return false;
    }

    const newReferences = rowObject[fieldName].split('\n');
    return JSON.stringify(item.references) !== JSON.stringify(newReferences);
  }

  private commentsChanged(
    item: POItem,
    rowObject: Partial<Row>,
    fieldName?: string,
    itemField: 'comments' | 'extractedComments' = 'comments',
  ): boolean {
    if (!fieldName || !rowObject[fieldName]) {
      return false;
    }

    const newComments = rowObject[fieldName].split('\n');
    return JSON.stringify(item[itemField]) !== JSON.stringify(newComments);
  }
}
