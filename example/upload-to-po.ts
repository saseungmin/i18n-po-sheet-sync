import i18nSync from "./i18nSync";

async function uploadToPO() {
  try {
    const result = await i18nSync.uploadFromPO({
      createMissingItems: true,
      updateExistingItems: true,
      batchSize: 100,
      applyConditionalFormatting: false,
    });

    console.log("Upload to PO completed:", result);
  } catch (error) {
    console.error("Upload failed:", error);
  }
}

uploadToPO();
