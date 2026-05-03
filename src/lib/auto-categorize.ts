const RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /netflix|spotify|hbo|disney\+?|prime\s*video|youtube\s*premium/i, category: 'Servicios' },
  { pattern: /uber|didi|beat|taxi|cabify/i, category: 'Transporte' },
  { pattern: /exito|carulla|jumbo|d1\b|ara\b|olimpica|makro/i, category: 'Supermercado' },
  { pattern: /rappi|ifood|domicilios\.com|pedidosya|iens|fork/i, category: 'Comida fuera' },
  { pattern: /farmacia|cruz\s*azul|copel|isf|drogueria/i, category: 'Salud' },
  { pattern: /eps|sanitas|nueva\s*eps|sura|compensar/i, category: 'Salud' },
  { pattern: /bodytech|gym|gimnasio|smartfit|sportlife/i, category: 'Salud' },
  { pattern: /coursera|udemy|platzi|politecnico|universidad/i, category: 'Educación' },
  { pattern: /arriendo|renta|alquiler|inquilino/i, category: 'Hogar' },
  { pattern: /movistar|claro|tigo|etb|wom|fibra/i, category: 'Servicios' },
  { pattern: /diezmo|iglesia|ofrenda|misión|mision|parroquia/i, category: 'Diezmo' },
  { pattern: /sueldo|salario|nomina|nómina|pago\s*mensual/i, category: 'Sueldo' },
  { pattern: /freelance|contrato|honorario|consultoria/i, category: 'Freelance' },
  { pattern: /paypal|stripe|wise|transferencia/i, category: 'Transferencias' },
  { pattern: /impuesto|rete|ica|iva|dian/i, category: 'Impuestos' },
  { pattern: /comision|cargo|mantenimiento/i, category: 'Comisiones bancarias' },
  { pattern: /interes|interest/i, category: 'Intereses bancarios' },
]

export function suggestCategory(concept: string): string | null {
  for (const rule of RULES) {
    if (rule.pattern.test(concept)) return rule.category
  }
  return null
}
