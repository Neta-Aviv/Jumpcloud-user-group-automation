// this function is ment to cleanup old access requests in the sheet so that it wont stay there for too long but still keep logs for a while (in this case a month)
function cleanup() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const rowsToDelete = [];

  for (let i = 1; i < data.length; i++) {
    const status = data[i][4];
    const removedTimestamp = data[i][7]; 

    if (status === 'Removed' && removedTimestamp) {
      const removedDate = new Date(removedTimestamp);
      const ageMs = now - removedDate;

      if (ageMs > THIRTY_DAYS_MS) {
        rowsToDelete.push(i + 1); 
      }
    }
  }

  // Delete rows from bottom to top to avoid shifting problems
  rowsToDelete.reverse().forEach(rowNum => {
    sheet.deleteRow(rowNum);
    Logger.log(`Deleted row ${rowNum} due to old removed status`);
  });

  Logger.log(`Cleanup complete. Deleted ${rowsToDelete.length} old removed users.`);
}
