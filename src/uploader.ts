import * as fs from 'node:fs';
import * as path from 'node:path';

import { JWT } from 'google-auth-library';
import type {
  GoogleSpreadsheet,
  GoogleSpreadsheetWorksheet,
} from 'google-spreadsheet';

import pofile from 'pofile';

import { DEFAULT_HEADER_MAPPING } from './constants';
import type {
  HeaderMapping,
  I18nSyncConfig,
  Language,
  RGBColor,
  Row,
  ServiceAccount,
  SheetRow,
  UploadOptions,
  UploadResult,
  UploadWithResetOptions,
} from './types';

export class POUploader {
  private config: I18nSyncConfig;
  private headerMapping: HeaderMapping;
  private reverseMapping: Record<string, string>;

  constructor(
    config: I18nSyncConfig,
    headerMapping: HeaderMapping = DEFAULT_HEADER_MAPPING,
  ) {
    this.config = config;
    this.headerMapping = headerMapping;

    // 역방향 매핑 생성 (값 -> 키)
    this.reverseMapping = {};

    for (const [key, value] of Object.entries(headerMapping)) {
      if (value) this.reverseMapping[value] = key;
    }
  }

  /**
   * PO 파일에서 스프레드시트로 데이터 업로드 (개별 항목 업데이트 방식)
   */
  async uploadFromPOFiles(
    spreadsheet: GoogleSpreadsheet,
    options: UploadOptions = {
      createMissingItems: true,
      updateExistingItems: true,
      batchSize: 100,
      applyConditionalFormatting: false,
    },
  ): Promise<UploadResult[]> {
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

    const rowMap = new Map<string, SheetRow>();

    for (const row of rows) {
      const msgId = row.get(this.headerMapping.msgid);

      if (msgId) {
        rowMap.set(msgId, row);
      }
    }

    const results: UploadResult[] = [];

    for (const lang of filteredLanguages) {
      try {
        const result = await this.processUploadLanguage(
          lang,
          sheet,
          rowMap,
          options,
        );
        results.push(result);
      } catch (error) {
        console.error(`Error uploading language ${lang}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * PO 파일에서 스프레드시트로 데이터 업로드 (시트 초기화 후 일괄 업데이트 방식)
   */
  async uploadFromPOFilesWithReset(
    spreadsheet: GoogleSpreadsheet,
    options: UploadWithResetOptions = {
      applyConditionalFormatting: true,
      emptyColor: '#FFEBEE',
    },
  ): Promise<UploadResult> {
    const sheetIndex = this.config.sheetIndex || 0;
    const sheet = spreadsheet.sheetsByIndex[sheetIndex];

    if (!sheet) {
      throw new Error(
        `Sheet with index ${sheetIndex} not found in the spreadsheet`,
      );
    }

    console.time('Total upload time');

    try {
      let existingData: Record<string, Record<string, string>> = {};

      if (options.preserveExistingTranslations) {
        try {
          const rows = await sheet.getRows<Row>();

          existingData = this.buildExistingDataMap(rows);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          if (errorMessage.includes('No values in the header row')) {
            console.log('No header row found, will create new headers');
            existingData = {};
          } else {
            throw error;
          }
        }
      }

      // 모든 PO 파일에서 번역 데이터 수집
      const allTranslations =
        await this.collectTranslationsFromPOFiles(existingData);

      await sheet.clear();

      const sheetHeaderRow = Object.values(this.headerMapping);

      const msgid = sheetHeaderRow.filter(
        (value) => value === this.headerMapping.msgid,
      );
      const otherHeaders = sheetHeaderRow.filter(
        (value) => value !== this.headerMapping.msgid,
      );

      const headerKeysRow = [
        ...msgid,
        ...this.config.languages,
        ...otherHeaders,
      ];

      await sheet.setHeaderRow(headerKeysRow);

      const rowsToAdd = this.prepareRowsToAdd(allTranslations);

      if (rowsToAdd.length > 0) {
        await sheet.addRows(rowsToAdd);
      }

      if (options.applyConditionalFormatting) {
        await this.applyConditionalFormatting(
          sheet,
          spreadsheet.spreadsheetId,
          this.config.serviceAccount,
          options.emptyColor || '#FFEBEE',
        );
      }

      console.timeEnd('Total upload time');

      return {
        totalItems: rowsToAdd.length,
        addedItems: rowsToAdd.length,
        updatedItems: 0,
        status: 'success',
      };
    } catch (error) {
      console.error('Error uploading translations:', error);
      throw error;
    }
  }

  /**
   * 여러 PO 파일에서 번역 데이터 수집
   */
  private async collectTranslationsFromPOFiles(
    existingData: Record<string, Record<string, string>> = {},
  ): Promise<Record<string, Record<string, string>>> {
    const allTranslations: Record<string, Record<string, string>> = {};

    for (const lang of this.config.languages) {
      console.time(`Processing time for ${lang}`);
      try {
        const poFilePath = path.join(
          this.config.poFilesBasePath,
          lang,
          'messages.po',
        );

        if (!fs.existsSync(poFilePath)) {
          console.warn(`PO file not found: ${poFilePath}`);
          continue;
        }

        const poData = fs.readFileSync(poFilePath, 'utf8');
        const po = pofile.parse(poData);

        for (const item of po.items) {
          if (!item.msgid) {
            continue;
          }

          if (!allTranslations[item.msgid]) {
            allTranslations[item.msgid] = {
              msgid: item.msgid,
            };
          }

          // 번역 값 우선순위: 기존 스프레드시트 번역 > PO 파일 번역
          const existingTranslation = existingData[item.msgid]?.[lang];
          const poTranslation = item.msgstr[0] || '';

          allTranslations[item.msgid][lang] =
            existingTranslation || poTranslation || '';

          // 메타데이터: PO 파일 값 우선 (기존 스프레드시트 값 무시)
          if (item.msgctxt) {
            allTranslations[item.msgid].context = item.msgctxt;
          }

          if (item.references?.length > 0) {
            allTranslations[item.msgid].reference = item.references.join('\n');
          }

          if (item.comments?.length > 0) {
            allTranslations[item.msgid].comments = item.comments.join('\n');
          }

          if (item.extractedComments?.length > 0) {
            allTranslations[item.msgid].extractedComments =
              item.extractedComments.join('\n');
          }
        }

        console.timeEnd(`Processing time for ${lang}`);
      } catch (error) {
        console.warn(
          `Could not process ${lang} PO file:`,
          (error as Error)?.message,
        );
      }
    }

    return allTranslations;
  }

  /**
   * 기존 행 데이터에서 맵 구성
   */
  private buildExistingDataMap(
    rows: SheetRow[],
  ): Record<string, Record<string, string>> {
    const existingData: Record<string, Record<string, string>> = {};

    for (const row of rows) {
      const msgid = row.get(this.headerMapping.msgid);

      if (msgid) {
        const rowObject = row.toObject();
        existingData[msgid] = {};

        for (const [key, value] of Object.entries(rowObject)) {
          const mappedKey = this.reverseMapping[key] || key;
          existingData[msgid][mappedKey] = value || '';
        }
      }
    }

    return existingData;
  }

  /**
   * 스프레드시트에 추가할 행 데이터 준비
   */
  private prepareRowsToAdd(
    translations: Record<string, Record<string, string>>,
  ): Record<string, string>[] {
    return Object.values(translations).map((translation) => {
      const rowData: Record<string, string> = {};

      rowData[this.headerMapping.msgid] = translation.msgid || '';

      for (const lang of this.config.languages) {
        if (this.isValidHeader(lang)) {
          rowData[lang] = translation[lang] || '';
        }
      }

      if (this.headerMapping.msgctxt && translation.context) {
        rowData[this.headerMapping.msgctxt] = translation.context;
      }

      if (this.headerMapping.references && translation.reference) {
        rowData[this.headerMapping.references] = translation.reference;
      }

      if (this.headerMapping.comments && translation.comments) {
        rowData[this.headerMapping.comments] = translation.comments;
      }

      if (
        this.headerMapping.extractedComments &&
        translation.extractedComments
      ) {
        rowData[this.headerMapping.extractedComments] =
          translation.extractedComments;
      }

      return rowData;
    });
  }

  /**
   * 유효한 헤더인지 확인
   */
  private isValidHeader(header: string): boolean {
    return !!header;
  }

  /**
   * 개별 언어 업로드 처리 (증분 업데이트 방식)
   */
  private async processUploadLanguage(
    language: Language,
    sheet: GoogleSpreadsheetWorksheet,
    rowMap: Map<string, SheetRow>,
    options: UploadOptions,
  ): Promise<UploadResult> {
    const poFilePath = path.join(
      this.config.poFilesBasePath,
      language,
      'messages.po',
    );

    if (!fs.existsSync(poFilePath)) {
      throw new Error(`PO file not found at ${poFilePath}`);
    }

    const poData = fs.readFileSync(poFilePath, 'utf8');
    const po = pofile.parse(poData);

    let addedCount = 0;
    let updatedCount = 0;
    const batchSize = options.batchSize || 100;
    const rowsToAdd: Record<string, string>[] = [];
    const rowsToUpdate: SheetRow[] = [];

    for (const item of po.items) {
      const msgId = item.msgid;
      const translation = item.msgstr[0] || '';

      if (rowMap.has(msgId)) {
        if (options.updateExistingItems) {
          const row = rowMap.get(msgId);
          let needsUpdate = false;

          if (row?.get(language) !== translation) {
            row?.set(language, translation);
            needsUpdate = true;
          }

          if (this.headerMapping.msgctxt && item.msgctxt) {
            row?.set(this.headerMapping.msgctxt, item.msgctxt);
            needsUpdate = true;
          }

          if (
            this.headerMapping.references &&
            item.references &&
            item.references.length > 0
          ) {
            row?.set(this.headerMapping.references, item.references.join('\n'));
            needsUpdate = true;
          }

          if (
            this.headerMapping.comments &&
            item.comments &&
            item.comments.length > 0
          ) {
            row?.set(this.headerMapping.comments, item.comments.join('\n'));
            needsUpdate = true;
          }

          if (
            this.headerMapping.extractedComments &&
            item.extractedComments &&
            item.extractedComments.length > 0
          ) {
            row?.set(
              this.headerMapping.extractedComments,
              item.extractedComments.join('\n'),
            );
            needsUpdate = true;
          }

          if (needsUpdate && row) {
            rowsToUpdate.push(row);
            updatedCount++;
          }
        }
      } else if (options.createMissingItems) {
        const newRow: Record<string, string> = {
          [this.headerMapping.msgid]: msgId,
          [language]: translation,
        };

        if (this.headerMapping.msgctxt && item.msgctxt) {
          newRow[this.headerMapping.msgctxt] = item.msgctxt;
        }

        if (
          this.headerMapping.references &&
          item.references &&
          item.references.length > 0
        ) {
          newRow[this.headerMapping.references] = item.references.join('\n');
        }

        if (
          this.headerMapping.comments &&
          item.comments &&
          item.comments.length > 0
        ) {
          newRow[this.headerMapping.comments] = item.comments.join('\n');
        }

        if (
          this.headerMapping.extractedComments &&
          item.extractedComments &&
          item.extractedComments.length > 0
        ) {
          newRow[this.headerMapping.extractedComments] =
            item.extractedComments.join('\n');
        }

        rowsToAdd.push(newRow);
        addedCount++;
      }

      if (rowsToUpdate.length >= batchSize) {
        await this.saveRowBatch(rowsToUpdate);
        rowsToUpdate.length = 0;
      }
    }

    if (rowsToAdd.length > 0) {
      await sheet.addRows(rowsToAdd);
    }

    if (rowsToUpdate.length > 0) {
      await this.saveRowBatch(rowsToUpdate);
    }

    return {
      language,
      totalItems: po.items.length,
      addedItems: addedCount,
      updatedItems: updatedCount,
      status: 'success',
    };
  }

  /**
   * 행 배치 저장
   */
  private async saveRowBatch(rows: SheetRow[]): Promise<void> {
    // 병렬로 행 저장하여 성능 향상
    await Promise.all(rows.map((row) => row.save()));
  }

  /**
   * 빈 번역 셀에 조건부 서식 적용
   */
  async applyConditionalFormatting(
    sheet: GoogleSpreadsheetWorksheet,
    spreadsheetId: string,
    serviceAccountConfig: ServiceAccount,
    backgroundColor = '#FFEBEE',
  ): Promise<void> {
    try {
      const serviceAccountAuth = new JWT({
        ...serviceAccountConfig,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const headerValues = sheet.headerValues;
      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      const formatRequests: any[] = [];

      for (const lang of this.config.languages) {
        const index = headerValues.indexOf(lang);

        if (index !== -1) {
          formatRequests.push({
            addConditionalFormatRule: {
              rule: {
                ranges: [
                  {
                    sheetId: sheet.sheetId,
                    startRowIndex: 1,
                    startColumnIndex: index,
                    endColumnIndex: index + 1,
                  },
                ],
                booleanRule: {
                  condition: {
                    type: 'BLANK',
                  },
                  format: {
                    backgroundColor: this.hexToGoogleColor(backgroundColor),
                  },
                },
              },
              index: 0,
            },
          });
        }
      }

      if (formatRequests.length > 0) {
        const request = {
          spreadsheetId,
          resource: {
            requests: formatRequests,
          },
        };

        await serviceAccountAuth.request({
          url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
          method: 'POST',
          data: request.resource,
        });

        console.log('조건부 서식이 성공적으로 적용되었습니다.');
      }
    } catch (error) {
      console.error('조건부 서식 적용 중 오류 발생:', error);
    }
  }

  /**
   * HEX 색상 코드를 Google Sheets API 색상 형식으로 변환
   */
  private hexToGoogleColor(hex: string): {
    red: number;
    green: number;
    blue: number;
  } {
    const rgb = this.hexToRgb(hex);
    return {
      red: rgb.r / 255,
      green: rgb.g / 255,
      blue: rgb.b / 255,
    };
  }

  /**
   * HEX 색상 코드를 RGB로 변환
   */
  private hexToRgb(hex: string): RGBColor {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: Number.parseInt(result[1], 16),
          g: Number.parseInt(result[2], 16),
          b: Number.parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }
}
