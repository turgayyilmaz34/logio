
import * as XLSX from 'xlsx'
 
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
 
