/**
 * A utility to export JSON data to an Excel-compatible CSV file.
 * We use CSV with BOM (\ufeff) to support Arabic characters in Excel.
 */
export const exportToExcel = (data: any[], filename: string) => {
  if (!data || !data.length) return

  // Extract headers
  const headers = Object.keys(data[0])

  // Convert to CSV
  const csvRows = []
  
  // Add headers
  csvRows.push(headers.join(','))

  // Add rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header]
      // Escape quotes and wrap in quotes if there's a comma
      const stringVal = String(val !== null && val !== undefined ? val : '')
      return `"${stringVal.replace(/"/g, '""')}"`
    })
    csvRows.push(values.join(','))
  }

  const csvString = csvRows.join('\n')
  
  // Add BOM for Arabic support
  const blob = new Blob(['\ufeff' + csvString], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
