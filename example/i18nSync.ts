import I18nPOSheetSync from 'i18n-po-sheet-sync';
import { join } from 'node:path';
import serviceAccountAuth from './service-account-auth.json';

const i18nSync = new I18nPOSheetSync({
  languages: ['ko', 'en'],
  poFilesBasePath: join(__dirname, 'locales'),
  spreadsheetId: serviceAccountAuth.sheet_id,
  serviceAccount: {
    email: serviceAccountAuth.client_email,
    key: serviceAccountAuth.private_key,
  },
});

export default i18nSync;
