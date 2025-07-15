const FORM_ID = '1q-MT1cTUrKk_JVM_mkpk40Fjc2e2xLCAK4iedH32REo'; // Replace with your actual Google Form ID
const JUMPCLOUD_API_KEY = 'jca_4BLoFAUhWchMnigGPs8ncWSA79F9Ubd8KPjb';
const JUMPCLOUD_BASE_URL = 'https://console.jumpcloud.com/api';

function updateUserGroupDropdownInForm() {
// This function makes sure the form is always updated with the user group available in jumpcloud 
  const form = FormApp.openById(FORM_ID);
  const dropdownTitle = 'Select User Group:'; // Must match the title of your form dropdown question
  
  // Fetch existing dropdown question
  const items = form.getItems(FormApp.ItemType.LIST);
  const dropdown = items.find(item => item.getTitle() === dropdownTitle);
  if (!dropdown) {
    Logger.log(`Dropdown question "${dropdownTitle}" not found in form.`);
    return;
  }

  const listItem = dropdown.asListItem();
  
  // Fetch groups from JumpCloud
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
    if (json.length < limit) break;
  } while (true);

  const groupNames = groups.map(g => g.name).filter(n => n);
  if (groupNames.length === 0) {
    Logger.log('No groups found to update the dropdown.');
    return;
  }

  // Update form dropdown choices
  listItem.setChoiceValues(groupNames);
  Logger.log(`Updated form dropdown "${dropdownTitle}" with ${groupNames.length} groups.`);
}
