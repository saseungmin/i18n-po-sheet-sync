import { JWT } from 'google-auth-library';
import { GoogleSpreadsheet } from 'google-spreadsheet';

import type { ServiceAccount } from './types';

export async function getSpreadsheetDocument(
  spreadsheetId: string,
  jwtOptions: ServiceAccount,
): Promise<GoogleSpreadsheet> {
  try {
    const serviceAccountAuth = new JWT({
      ...jwtOptions,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(spreadsheetId, serviceAccountAuth);

    await doc.loadInfo();

    return doc;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to authenticate and load spreadsheet: ${error.message}`,
      );
    }

    throw new Error('Failed to authenticate and load spreadsheet');
  }
}
