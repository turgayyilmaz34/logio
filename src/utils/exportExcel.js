import * as XLSX from 'xlsx'
 
export function exportMultiSheet(sheets, fileName) {
  const wb = XLSX.utils.book_new()
  sheets.forEach(({ name, data }) => {
    if (!data || data.length === 0) {
      const ws = XLSX.utils.json_to_sheet([{ 'Bilgi': 'Veri bulunamadı' }])
      XLSX.utils.book_append_sheet(wb, ws, name)
    } else {
      const ws = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(wb, ws, name)
    }
  })
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
 
export function exportToExcel(data, fileName, sheetName = 'Sayfa1') {
  if (!data || data.length === 0) {
    alert('Dışa aktarılacak veri bulunamadı.')
    return
  }
  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}
