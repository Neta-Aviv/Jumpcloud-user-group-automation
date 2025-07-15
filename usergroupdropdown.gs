// This function is not a must only if you want to use this spreadsheet directly instead of using a google form. 
// This function will make it so that you will have a dropdown of all availble user group in jumpcloud to choose from.

function updateUserGroupDropdownOnSheet1() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  if (!sheet) {
    Logger.log('Sheet1 not found!');
    return;
  }
  
  let groups = [];
  let skip = 0;
  const limit = 100;
  do {
    const url = `${JUMPCLOUD_BASE_URL}/v2/usergroups?limit=${limit}&skip=${skip}`;
    const options = {
      method: 'get',
      headers: {
        'x-api-key': JUMPCLOUD_API_KEY,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) {
      Logger.log('Failed to fetch groups: ' + response.getContentText());
      return;
    }
    const json = JSON.parse(response.getContentText());
    groups = groups.concat(json);
    skip += limit;
    if (json.length < limit) break; // last page
  } while (true);

  if (groups.length === 0) {
    Logger.log('No groups found from API.');
    return;
  }
  
  const groupNames = groups.map(g => g.name).filter(n => n); 
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log('No data rows found to apply dropdown.');
    return;
  }
  
  const dropdownRange = sheet.getRange(2, 4, lastRow - 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(groupNames, true)
    .setAllowInvalid(false)
    .build();
  
  dropdownRange.setDataValidation(rule);
  Logger.log(`Dropdown list with ${groupNames.length} groups applied to Sheet1!D2:D${lastRow}`);
}
