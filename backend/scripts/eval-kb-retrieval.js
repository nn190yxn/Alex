// KB Retrieval Regression: evaluates KB retrieval quality against standard dataset
// Usage: node scripts/eval-kb-retrieval.js [mapping_only|mapping_plus_vector]
// Output: Prints score table and saves report to data/eval-report.json

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATASET_FILE = join(__dirname, '../data/eval-dataset.json')
const REPORT_DIR = join(__dirname, '../data')
const REPORT_FILE = join(REPORT_DIR, 'eval-report.json')

// Retrieve KB context
async function getKBContext(mode, toolCode, memberLevel, formData) {
  const { getKBContextWithMeta, getKBContextDualChannel, getDynamicContextBudget } =
    await import('../src/services/kbService.js')

  if (mode === 'mapping_plus_vector') {
    const result = await getKBContextDualChannel(toolCode, memberLevel, formData, { retrievalMode: mode })
    return { context: result.context, meta: result.meta }
  } else {
    const result = getKBContextWithMeta(toolCode, memberLevel, formData, { retrievalMode: mode })
    return { context: result.context, meta: result.meta }
  }
}

// Evaluate a single test case
function evaluateTestCase(test, context, meta) {
  const scores = {}

  // 1. Keyword coverage: check if expected keywords appear in context
  const lowerContext = context.toLowerCase()
  let matchedKeywords = 0
  for (const kw of test.expectedKeywords) {
    if (lowerContext.includes(kw.toLowerCase())) {
      matchedKeywords++
    }
  }
  scores.keywordCoverage = test.expectedKeywords.length > 0
    ? matchedKeywords / test.expectedKeywords.length
    : 1.0

  // 2. Forbidden check: penalize if forbidden content appears
  let forbiddenPenalty = 0
  for (const forbidden of (test.forbiddenOutput || [])) {
    if (lowerContext.includes(forbidden.toLowerCase())) {
      forbiddenPenalty += 0.3
    }
  }
  scores.forbiddenCheck = Math.max(0, 1 - forbiddenPenalty)

  // 3. Context adequacy: check if context is non-empty and reasonably sized
  const contextChars = meta.contextChars || context.length
  scores.contextAdequacy = contextChars > 0
    ? Math.min(1, contextChars / 500) // 500 chars = full score
    : 0

  // 4. KB utilization: check if KB files were actually used
  scores.kbUtilization = meta.kbFilesUsed && meta.kbFilesUsed.length > 0 ? 1.0 : 0

  // Overall score (weighted)
  scores.overall =
    scores.keywordCoverage * 0.35 +
    scores.forbiddenCheck * 0.25 +
    scores.contextAdequacy * 0.20 +
    scores.kbUtilization * 0.20

  return {
    testId: test.id,
    toolCode: test.toolCode,
    scores,
    contextChars: meta.contextChars || 0,
    kbFilesUsed: meta.kbFilesUsed || [],
    retrievalMode: meta.retrievalMode || 'unknown',
    dynamicBudget: meta.dynamicBudget || 0
  }
}

// Run full evaluation
async function runEval(mode = 'mapping_only') {
  console.log(`=== KB Retrieval Evaluation: ${mode} ===\n`)

  if (!existsSync(DATASET_FILE)) {
    console.error(`Dataset not found: ${DATASET_FILE}`)
    process.exit(1)
  }

  const dataset = JSON.parse(readFileSync(DATASET_FILE, 'utf-8'))
  const results = []
  const categoryResults = {}

  const memberLevel = 'pro' // Use pro level for standard evaluation

  for (const [catKey, category] of Object.entries(dataset.categories)) {
    console.log(`Category: ${category.name}`)
    const catResults = []

    for (const test of category.tests) {
      const { context, meta } = await getKBContext(
        mode,
        test.toolCode,
        memberLevel,
        test.formData
      )

      const result = evaluateTestCase(test, context, meta)
      catResults.push(result)
      results.push(result)

      console.log(`  ${test.id} | ${test.toolCode.padEnd(22)} | overall: ${result.scores.overall.toFixed(3)} | chars: ${result.contextChars} | kw: ${result.scores.keywordCoverage.toFixed(2)} | files: ${result.kbFilesUsed.length}`)
    }

    const catAvg = catResults.reduce((sum, r) => sum + r.scores.overall, 0) / catResults.length
    categoryResults[catKey] = {
      name: category.name,
      testCount: catResults.length,
      avgScore: Number(catAvg.toFixed(4)),
      keywordCoverageAvg: Number((catResults.reduce((sum, r) => sum + r.scores.keywordCoverage, 0) / catResults.length).toFixed(4)),
      contextCharsAvg: Math.round(catResults.reduce((sum, r) => sum + r.contextChars, 0) / catResults.length)
    }
    console.log(`  Category avg: ${catAvg.toFixed(4)}\n`)
  }

  // Summary
  const overallAvg = results.reduce((sum, r) => sum + r.scores.overall, 0) / results.length
  const keywordAvg = results.reduce((sum, r) => sum + r.scores.keywordCoverage, 0) / results.length
  const contextAvg = Math.round(results.reduce((sum, r) => sum + r.contextChars, 0) / results.length)
  const kbUtilRate = (results.filter(r => r.kbFilesUsed.length > 0).length / results.length * 100).toFixed(1)

  console.log('=== Summary ===')
  console.log(`Mode: ${mode}`)
  console.log(`Total tests: ${results.length}`)
  console.log(`Overall avg: ${overallAvg.toFixed(4)}`)
  console.log(`Keyword coverage: ${keywordAvg.toFixed(4)}`)
  console.log(`Avg context chars: ${contextAvg}`)
  console.log(`KB utilization rate: ${kbUtilRate}%`)

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    mode,
    memberLevel,
    totalTests: results.length,
    overallAvg: Number(overallAvg.toFixed(4)),
    keywordCoverageAvg: Number(keywordAvg.toFixed(4)),
    avgContextChars: contextAvg,
    kbUtilizationRate: Number(kbUtilRate),
    byCategory: categoryResults,
    details: results
  }

  if (!existsSync(REPORT_DIR)) {
    mkdirSync(REPORT_DIR, { recursive: true })
  }
  writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`\nReport saved: ${REPORT_FILE}`)

  return report
}

// Run both modes and compare
async function runComparison() {
  console.log('=== KB Retrieval Mode Comparison ===\n')

  const mappingReport = await runEval('mapping_only')
  console.log('\n' + '='.repeat(60) + '\n')
  const dualReport = await runEval('mapping_plus_vector')

  console.log('\n' + '='.repeat(60))
  console.log('=== Comparison Summary ===\n')

  const overallDiff = dualReport.overallAvg - mappingReport.overallAvg
  const kwDiff = dualReport.keywordCoverageAvg - mappingReport.keywordCoverageAvg
  const charsDiff = dualReport.avgContextChars - mappingReport.avgContextChars

  console.log(`Overall: ${mappingReport.overallAvg.toFixed(4)} -> ${dualReport.overallAvg.toFixed(4)} (${overallDiff >= 0 ? '+' : ''}${overallDiff.toFixed(4)})`)
  console.log(`Keyword: ${mappingReport.keywordCoverageAvg.toFixed(4)} -> ${dualReport.keywordCoverageAvg.toFixed(4)} (${kwDiff >= 0 ? '+' : ''}${kwDiff.toFixed(4)})`)
  console.log(`Context: ${mappingReport.avgContextChars} -> ${dualReport.avgContextChars} (${charsDiff >= 0 ? '+' : ''}${charsDiff})`)

  // DoD check
  const improvement20 = overallDiff >= 0.20
  const costIncrease = (dualReport.avgContextChars - mappingReport.avgContextChars) / mappingReport.avgContextChars
  const costUnder10 = costIncrease <= 0.10

  console.log(`\nDoD Check:`)
  console.log(`  Overall improvement >= 20%: ${improvement20 ? 'PASS' : 'FAIL'} (${(overallDiff * 100).toFixed(1)}%)`)
  console.log(`  Cost increase <= 10%: ${costUnder10 ? 'PASS' : 'FAIL'} (${(costIncrease * 100).toFixed(1)}%)`)

  // Save comparison report
  const comparisonReport = {
    timestamp: new Date().toISOString(),
    mappingOnly: mappingReport,
    mappingPlusVector: dualReport,
    comparison: {
      overallDiff: Number(overallDiff.toFixed(4)),
      keywordDiff: Number(kwDiff.toFixed(4)),
      contextCharsDiff: charsDiff,
      costIncreasePercent: Number((costIncrease * 100).toFixed(1)),
      doDOverallImprovement: improvement20,
      doDCostUnder10: costUnder10
    }
  }

  const comparisonFile = join(REPORT_DIR, 'eval-comparison-report.json')
  writeFileSync(comparisonFile, JSON.stringify(comparisonReport, null, 2), 'utf-8')
  console.log(`\nComparison report saved: ${comparisonFile}`)
}

// Main
const args = process.argv.slice(2)
if (args.includes('--compare')) {
  runComparison()
} else {
  const mode = args[0] || 'mapping_only'
  runEval(mode)
}
