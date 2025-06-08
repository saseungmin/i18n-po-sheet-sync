import i18nSync from "./i18nSync";

async function uploadWithReset() {
  try {
    const result = await i18nSync.uploadFromPOWithReset({
      applyConditionalFormatting: true,
      emptyColor: "#FFEBEE",
      preserveExistingTranslations: true,
    });

    console.log("Upload with reset completed:", result);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}

uploadWithReset();
