export interface OcrItem {
  description: string
  quantity: number
  price: number
  category?: string
}

export interface OcrResult {
  merchant: string
  date: Date
  items: OcrItem[]
  total: number
  confidence: number
}

export async function processReceiptOCR(_imageBlob: Blob): Promise<OcrResult> {
  // TODO: En producción, esto llama al CF Worker con Claude API
  await new Promise(resolve => setTimeout(resolve, 1500))

  return {
    merchant: 'Supermercado Éxito',
    date: new Date(),
    items: [
      { description: 'Leche deslactosada x 6', quantity: 6, price: 4200, category: 'Lácteos' },
      { description: 'Pan integral', quantity: 1, price: 8900, category: 'Panadería' },
      { description: 'Huevos x 30', quantity: 1, price: 18900, category: 'Proteínas' },
      { description: 'Arroz x 2kg', quantity: 2, price: 6300, category: 'Granos' },
      { description: 'Frutas variadas', quantity: 1, price: 23500, category: 'Frutas' },
    ],
    total: 31600,
    confidence: 0.92,
  }
}
