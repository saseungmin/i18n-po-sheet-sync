# i18n-po-sheet-sync

> [English](./README.md) | 한국어

다국어 PO 파일과 Google 스프레드시트 간의 동기화를 쉽게 해주는 Node.js 라이브러리입니다.   
효율적인 다국어를 관리하기 위해 유료 협업 도구를 사용합니다.   
하지만, 대다수의 경우 유료 도구의 경우 비용 부담이 됩니다. 그래서 대부분의 경우에 Google 스프레드시트만으로도 충분합니다.   

.PO 확장자는 다국어 프로그램을 위한 국제화 및 현지화(i18n) 시스템에 많이 사용됩니다. i18n-po-sheet-sync는 .PO와 Google 스프레드시트간의 동기화를 통해 빠르고 간편하게 다국어 관리를 할 수 있습니다.

## 기능

- Google 스프레드시트에서 PO 파일로 다국어 데이터 내보내기
- PO 파일에서 Google 스프레드시트로 다국어 데이터 업로드
- 두 가지 업로드 방식 지원 (증분 업데이트 / 시트 초기화 후 일괄 업데이트)
- 다국어 항목의 문맥(context), 참조(references), 설명(comments) 동기화
- 빈 번역 셀에 조건부 서식 자동 적용
- Typescript 지원
- 타 다국어 프레임워크와의 사용 (lingui, i18next)

## 설치

```bash
npm install i18n-po-sheet-sync
# 또는
yarn add i18n-po-sheet-sync
```

## 사용 예시 (Example)
- `i18n-po-sheet-sync`의 사용법은 [example](./example) 폴더를 참고하세요.
- [locales 폴더](./example/locales/)에는 각 언어별(en, ko 등) PO 파일들이 구성되어 있습니다.
- `example-account-auth.json`은 Google Spreadsheet에 접근 권한을 가진 서비스 계정 정보의 예시입니다. 실제 사용 시에는 본인의 서비스 계정 정보로 변경하여 사용해주세요.
- i18n-po-sheet-sync로 관리되는 Google Spreadsheet 예시를 확인하려면 [여기](https://docs.google.com/spreadsheets/d/1BzFBfl9xefXPl4X57NU5aBiE2-eZ6lc2YhN37RSmo3k/edit?usp=sharing)를 클릭하세요.

## Installation

```bash
npm install i18n-po-sheet-sync
# or
yarn add i18n-po-sheet-sync
```

### 기본 설정

```typescript
import I18nPOSheetSync from 'i18n-po-sheet-sync';
import { join } from 'path';

// 설정
const config = {
  serviceAccount: {
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
  },
  spreadsheetId: 'GOOGLE_SHEET_ID',
  languages: ['ko', 'en', 'ja', 'zh'],
  poFilesBasePath: join(__dirname, 'locale/locales')
};

// 인스턴스 생성
const i18nSync = new I18nPOSheetSync(config);
```

### Google 스프레드시트에서 PO 파일로 내보내기

```typescript
async function exportToPO() {
  try {
    const results = await i18nSync.exportToPO({
      filterMissingTranslations: false,
      preserveExistingItems: true
    });
    
    console.log('Export completed:', results);
  } catch (error) {
    console.error('Export failed:', error);
  }
}

exportToPO();
```

### PO 파일에서 Google 스프레드시트로 업로드

#### 방법 1: 증분 업데이트 (기존 데이터 유지)

```typescript
async function uploadToPO() {
  try {
    const results = await i18nSync.uploadFromPO({
      createMissingItems: true, // 새 항목 추가
      updateExistingItems: true, // 기존 항목 업데이트
      batchSize: 50, // 배치 처리 크기
    });
    
    console.log('Upload completed:', results);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

uploadToPO();
```

#### 방법 2: 시트 초기화 후 일괄 업데이트

```typescript
async function uploadWithReset() {
  try {
    const result = await i18nSync.uploadFromPOWithReset({
      applyConditionalFormatting: true, // 빈 셀에 배경색 적용
      emptyColor: '#FFEBEE', // 빈 셀 배경색 (연한 빨강)
      preserveExistingTranslations: true, // 기존 번역 보존
    });
    
    console.log('Upload with reset completed:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
}

uploadWithReset();
```

#### 조건부 서식만 적용

```typescript
async function applyFormatting() {
  try {
    await i18nSync.applyConditionalFormatting('#FFEBEE');
    console.log('Conditional formatting applied successfully');
  } catch (error) {
    console.error('Failed to apply formatting:', error);
  }
}

applyFormatting();
```

## 설정 옵션

### 기본 설정 (I18nSyncConfig)

| 옵션 | 타입 | 설명 |
|------|------|------|
| `serviceAccount` | `ServiceAccountConfig` | Google 서비스 계정 정보 |
| `languages` | `string[]` | 지원하는 언어 코드 배열 |
| `poFilesBasePath` | `string` | PO 파일이 저장된 기본 경로 |
| `sheetIndex` | `number` (옵션) | 스프레드시트 내 시트 인덱스 (기본값: 0) |

### 스프레드시트 Header Title

| 옵션 | 타입 | 설명 |
|------|------|------|
| `msgid` | `string` | 메시지 ID 헤더 (기본값: 'messageId') |
| `msgctxt` | `string` (옵션) | 문맥 헤더 (기본값: 'context') |
| `references` | `string` (옵션) | 참조 헤더 (기본값: 'references') |
| `comments` | `string` (옵션) | 설명 헤더 (기본값: 'comments') |
| `extractedComments` | `string` (옵션) | 추출된 설명 헤더 (기본값: 'extractedComments') |

### 내보내기 옵션 (ExportOptions)

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `filterMissingTranslations` | `boolean` | `false` | 번역이 없는 항목 필터링 여부 |
| `preserveExistingItems` | `boolean` | `false` | 스프레드시트에 없는 기존 PO 항목 유지 여부 |
| `pluralFormsByLanguage` | `Record<string, string>` | - | 언어별 복수형 규칙 지정 |

### 업로드 옵션 (UploadOptions)

#### 일반 옵션 (모든 업로드 방식 공통)

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `applyConditionalFormatting` | `boolean` | `false` | 빈 번역 셀에 배경색 적용 여부 |
| `emptyColor` | `string` | `#FFEBEE` | 빈 번역 셀 배경색 (HEX 코드) |

#### 증분 업데이트 옵션 (uploadFromPO)

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `createMissingItems` | `boolean` | `true` | 스프레드시트에 없는 항목 생성 여부 |
| `updateExistingItems` | `boolean` | `true` | 기존 항목 업데이트 여부 |
| `batchSize` | `number` | `100` | 배치 처리 크기 |

#### 일괄 업데이트 옵션 (uploadFromPOWithReset)

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `preserveExistingTranslations` | `boolean` | `false` | 기존 번역 값 보존 여부 |

## Google 스프레드시트 형식

라이브러리는 다음과 같은 형식의 스프레드시트를 예상합니다:

| messageId | ko | en | ... | context | references | comments | extractedComments |
|-----------|----|----|-----|-----------|---------------|------|-------------|
| hello     | 안녕하세요 | Hello | ... | greeting | src/App.js    | 인사말 | 사용자 인사 |
| goodbye   | 안녕히 가세요 | Goodbye | ... | greeting | src/App.js    | 작별인사 | 로그아웃 시 |

헤더 이름은 `HeaderMapping` 옵션을 통해 변경할 수 있습니다.


## 타 다국어 프레임워크와의 사용

### lingui 활용
- i18n 다국어 프레임워크인 [lingui](https://lingui.dev/)와도 함께 사용할 수 있습니다.

```bash
yarn add --dev @lingui/cli
```

- Add package.json

```json
{
  "scripts": {
    "extract": "lingui extract",
    "compile": "lingui compile",
    "upload": "ts-node scripts/upload-translate.ts",
    "export": "ts-node scripts/export-translate.ts",
  }
}
```

- extract 스크립트를 실행하면 현재 사용하고 있는 .PO 파일이 생성됩니다.
- upload 스크립트를 실행하면 Google 스프레드시트에 반영됩니다.
- export 스크립트를 실행하면 Google 스프레드시트의 변경된 다국어가 반영됩니다.
- compile 스크립트 실행하면 반영된 .PO 다국어 파일을 컴파일합니다.

### i18next
- i18next는 [i18next-gettext-converter](https://github.com/i18next/i18next-gettext-converter)를 활용해서 .PO 다국어 파일로 변환할 수 있습니다.

```bash
i18next-conv -l en -s ./locales/en.translation.json -t ./locales/en/translation.po
```

## 라이선스

MIT
