import i18nSync from './i18nSync';

async function uploadFromPO() {
  try {
    const result = await i18nSync.uploadFromPO({
      applyConditionalFormatting: true,
      emptyColor: '#FFEBEE',
      preserveExistingTranslations: true,
    });

    console.log('Upload from PO completed:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

uploadFromPO();
