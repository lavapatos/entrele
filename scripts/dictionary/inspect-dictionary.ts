import { readFile } from 'node:fs/promises'

import { PATHS, requireInputKey } from './shared.ts'

const data = JSON.parse(await readFile(PATHS.generatedDictionary, 'utf8')) as {
  version: string
  words: readonly string[]
}
const report = JSON.parse(await readFile(PATHS.generatedReport, 'utf8')) as {
  totals: Record<string, number>
  schedule: Record<string, string>
  samples: Record<string, unknown>
}
const query = process.argv[2]

if (query) {
  const key = requireInputKey(query)
  const rank = data.words.findIndex((display) => requireInputKey(display) === key)
  console.log(JSON.stringify({ query, inputKey: key, accepted: rank >= 0, rank }, null, 2))
} else {
  console.log(JSON.stringify({ version: data.version, ...report }, null, 2))
}
