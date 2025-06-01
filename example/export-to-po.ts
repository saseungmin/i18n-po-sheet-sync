import i18nSync from "./i18nSync";

async function exportToPO() {
  try {
    const result = await i18nSync.exportToPO({
      filterMissingTranslations: false,
      preserveExistingItems: false,
    });

    console.log("Upload with reset completed:", result);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}

exportToPO();
