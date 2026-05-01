// Spreadsheet tool definitions for generate.js

import { SPREADSHEETS } from '../services/spreadsheetEngine.js'

export function createSpreadsheetTools() {
  const tools = {}
  for (const [code, sheet] of Object.entries(SPREADSHEETS)) {
    tools[code] = {
      name: sheet.name,
      engineType: 'spreadsheet',
      code
    }
  }
  return tools
}
