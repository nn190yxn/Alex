// Calculator tool definitions for generate.js
// Imports calcFn from calculatorEngine.js

import { CALCULATORS } from '../services/calculatorEngine.js'

export function createCalculatorTools() {
  const tools = {}
  for (const [code, calc] of Object.entries(CALCULATORS)) {
    if (!calc || typeof calc !== 'object' || typeof calc.calc !== 'function' || !calc.name) {
      continue
    }
    tools[code] = {
      name: calc.name,
      engineType: 'calculator',
      code
    }
  }
  return tools
}
