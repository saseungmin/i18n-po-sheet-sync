import i18nSync from './i18nSync';

async function exportToPO() {
  try {
    const result = await i18nSync.exportToPO({
      filterMissingTranslations: false,
      preserveExistingItems: false,
    });

    console.log('export to po completed:', result);
  } catch (error) {
    console.error('export to po failed:', error);
  }
}

exportToPO();
