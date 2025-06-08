import * as fs from "node:fs";
import path from "node:path";

import pofile from "pofile";

import type { ExportOptions, Language } from "./types";

export function loadOrCreatePOFile(
  filePath: string,
  language: Language,
  options?: ExportOptions
): pofile {
  if (!fs.existsSync(filePath)) {
    return createNewPOFile(language, options);
  }

  try {
    const poData = fs.readFileSync(filePath, "utf8");
    const po = pofile.parse(poData);

    // Update revision date
    po.headers = {
      ...po.headers,
      "PO-Revision-Date": new Date().toISOString(),
    };

    return po;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to load PO file at ${filePath}: ${error.message}`
      );
    }

    throw new Error(`Failed to load PO file at ${filePath}`);
  }
}

export function createNewPOFile(
  language: Language,
  options?: ExportOptions
): pofile {
  const po = new pofile();

  const pluralForms =
    options?.pluralFormsByLanguage?.[language] ||
    (language === "ko"
      ? "nplurals=1; plural=0;"
      : "nplurals=2; plural=(n != 1);");

  po.headers = {
    "POT-Creation-Date": new Date().toISOString(),
    "MIME-Version": "1.0",
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Transfer-Encoding": "8bit",
    "X-Generator": "i18n-po-sheet-sync",
    Language: language,
    "Project-Id-Version": "",
    "Report-Msgid-Bugs-To": "",
    "PO-Revision-Date": new Date().toISOString(),
    "Last-Translator": "",
    "Language-Team": "",
    "Plural-Forms": pluralForms,
  };

  return po;
}

export function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function savePOFile(po: pofile, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ensureDirectoryExists(filePath);

    po.save(filePath, (err) => {
      if (err) {
        reject(
          new Error(`Failed to save PO file at ${filePath}: ${err.message}`)
        );
      } else {
        resolve();
      }
    });
  });
}
