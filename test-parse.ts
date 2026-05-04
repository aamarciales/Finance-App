import fs from 'fs'
import { detectBank, parseCSV } from './src/lib/csv-parser'

const csv = fs.readFileSync('/Users/andres/Downloads/finanzas_abril_mayo_2026.csv', 'utf-8')
const bank = detectBank(csv)
console.log('Bank:', bank)
const parsed = parseCSV(csv, bank)
console.log('Parsed lines:', parsed.length)
console.log('First:', parsed[0])
console.log('Last:', parsed[parsed.length - 1])
