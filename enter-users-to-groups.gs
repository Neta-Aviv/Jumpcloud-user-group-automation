const JUMPCLOUD_API_KEY = PropertiesService.getScriptProperties().getProperty("JUMPCLOUD_API_KEY");
const JUMPCLOUD_BASE_URL = 'https://console.jumpcloud.com/api';

function getGroupIdByName(groupName) {
  const pageLimit = 50; 
  let groupId = null;
  let start = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${JUMPCLOUD_BASE_URL}/v2/usergroups?limit=${pageLimit}&skip=${start}`;
    const options = {
      method: 'get',
      headers: {
        'x-api-key': JUMPCLOUD_API_KEY,
        'Content-Type': 'application/json'
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const groups = JSON.parse(response.getContentText());

    if (!Array.isArray(groups) || groups.length === 0) {
      hasMore = false;
    } else {
      for (let group of groups) {
        if (group.name === groupName) {
          groupId = group.id;
          hasMore = false; // Stop if found
          break;
        }
      }
      start += pageLimit;
    }
  }
  if (!groupId) {
    Logger.log(`Group not found: ${groupName}`);
  }
  return groupId;
}


function checkPendingUsers() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const email = row[2];    // Column C
    const status = row[4];   // Column E

    if (!email || status !== 'Pending') {
      continue; // Skip rows with missing email or non-Pending status
    }

    Logger.log(`Checking user at row ${i + 1}: ${email}`);

    try {
      const userId = getUserIdByEmail(email.trim().toLowerCase());

      if (userId) {
        Logger.log(`Found user '${email}' with ID: ${userId}`);
        sheet.getRange(i + 1, 6).setValue(userId); // Column F
      } else {
        Logger.log(`No user found with email: ${email}`);
        sheet.getRange(i + 1, 5).setValue("Not Found"); // Column E
      }
    } catch (e) {
      Logger.log(`Error while checking '${email}': ${e.message}`);
      sheet.getRange(i + 1, 5).setValue(`Error: ${e.message}`);
    }
  }
}

function getUserIdByEmail(email) {
  const options = {
    method: 'post',
    headers: {
      'x-api-key': JUMPCLOUD_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      filter: {
        or: [{ email: email }]
      }
    }),
    muteHttpExceptions: true
  };

  const url = `${JUMPCLOUD_BASE_URL}/search/systemusers`;
  const response = UrlFetchApp.fetch(url, options);

  if (response.getResponseCode() !== 200) {
    throw new Error(`JumpCloud API error: ${response.getContentText()}`);
  }

  const json = JSON.parse(response.getContentText());
  const users = json.results || json;

  if (!Array.isArray(users) || users.length === 0) {
    Logger.log("No users found");
    return null;
  } else {
    Logger.log(`Amount of users found: ${users.length}`);
  }

  return users[0]._id;
}

function addPendingUsersToGroup() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
  const row = data[i];
  const durationLabel = row[1]; // Column B
  const email = row[2];         // Column C
  const groupName = row[3];     // Column D
  const status = row[4];        // Column E
  const userId = row[5];        // Column F
  const futureDateStr = row[0]; // Column A


    if (!email || status !== 'Pending' || !userId) {
      continue; // Skip if email missing, status not Pending, or no user ID
    }

    const groupId = getGroupIdByName(groupName);
    if (!groupId) {
      Logger.log(`Could not find group ID for ${groupName}`);
      continue;
    }

    let shouldAdd = false;

    if (!futureDateStr) {
      shouldAdd = true;
    } else {
      const futureDate = new Date(futureDateStr);
      if (now >= futureDate) {
        shouldAdd = true;
      } else {
        Logger.log(`Not time to add user ${email} yet. Scheduled for: ${futureDate}`);
      }
    }

    if (shouldAdd) {
      try {
        const success = addUserToGroup(userId, groupId);
        if (success) {
          const timestamp = new Date();
          sheet.getRange(i + 1, 7).setValue(timestamp); // Column G
          sheet.getRange(i + 1, 5).setValue('Added');   // Column E
          Logger.log(`Added user ${email} to group ${groupName} at ${timestamp}`);

          // Send confirmation email
          MailApp.sendEmail({
          to: email,
          subject: `You have been granted access to "${groupName}"`,
          body: `Hi,\n\nYou have been granted access to the group "${groupName}" for a duration of ${durationLabel}.\n\nBest,\nIT Team`
           });
        } else {
          Logger.log(`Failed to add user ${email} to group ${groupName}`);
        }
      } catch (e) {
        Logger.log(`Error adding user ${email} to group: ${e.message}`);
      }
    }
  }
}


function addUserToGroup(userId, groupId) {
  const url = `${JUMPCLOUD_BASE_URL}/v2/usergroups/${groupId}/members`;
  const options = {
    method: 'post',
    headers: {
      'x-api-key': JUMPCLOUD_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      type: "user",
      op: "add",
      id: userId
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const responseCode = response.getResponseCode();
  const responseText = response.getContentText();

  Logger.log(`Add User Response Code: ${responseCode}`);
  Logger.log(`Add User Response Body: ${responseText}`);

  return responseCode === 204;
}

function processPendingUsers() {
  Logger.log("Starting user processing...");
  checkPendingUsers();
  addPendingUsersToGroup();
  Logger.log("Finished processing all pending users.");
}


function removeOldUsersFromGroup() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    const durationLabel = data[i][1];     
    const email = data[i][2]; 
    const groupName = data[i][3]; 
    const groupId = getGroupIdByName(groupName);
    const status = data[i][4];
    const userId = data[i][5];
    const addedTimestamp = data[i][6]; 
    
    if (!groupId) {
  Logger.log(`Could not find group ID for ${groupName}`);
  continue;
}
    if (!email || status !== 'Added' || !userId) {
      continue; // Skip if email missing
    }

    if (status === 'Added' && addedTimestamp && userId && groupId) {
      const durationMs = getDurationInMilliseconds(durationLabel);
      if (!durationMs) {
        Logger.log(`Invalid duration "${durationLabel}" for user ${email}`);
        continue;
      }

      const addedTime = new Date(addedTimestamp);
      const elapsed = now - addedTime;

      if (elapsed >= durationMs) {
        try {
          const success = removeUserFromGroup(userId, groupId);
          if (success) {
            sheet.getRange(i + 1, 8).setValue(now);       // Column H
            sheet.getRange(i + 1, 5).setValue('Removed'); // Column E
            Logger.log(`Removed user ${email} from group ${groupId}`);
            try {
              MailApp.sendEmail({
              to: email,
              subject: `You have been removed from the group "${groupName}"`,
              body: `Hi,\n\nYour temporary access to the group "${groupName}" has ended and you have been removed from it.\n\nBest,\nIT Team`
              });
              Logger.log(`Removal email sent to ${email}`);
              } catch (e) {
              Logger.log(`⚠️ Error sending removal email: ${e.message}`);
              }
          } 
          else {
            Logger.log(`Failed to remove user ${email} from group`);
          }
        } catch (e) {
          Logger.log(`Error removing user ${email}: ${e.message}`);
        }
      }
    }
  }
}

function getDurationInMilliseconds(label) {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  switch (label) {
    case '1 hour': return 1 * hour;
    case '6 hours': return 6 * hour;
    case '12 hours': return 12 * hour;
    case '1 day': return 1 * day;
    case '1 week': return 7 * day;
    default: return null;
  }
}


function removeUserFromGroup(userId, groupId) {
  const url = `${JUMPCLOUD_BASE_URL}/v2/usergroups/${groupId}/members`;
  const options = {
    method: 'post',
    headers: {
      'x-api-key': JUMPCLOUD_API_KEY,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      type: "user",
      op: "remove",
      id: userId
    }),
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  const code = response.getResponseCode();
  const body = response.getContentText();

  Logger.log(`Remove User Response Code: ${code}`);
  Logger.log(`Remove User Response Body: ${body}`);

  return code === 204;
}


function listGroupMembers(groupId) {
  if (!groupId) {
    Logger.log("No groupId provided!");
    return;
  }

  const url = `${JUMPCLOUD_BASE_URL}/v2/usergroups/${groupId}/members`;
  const options = {
    method: 'get',
    headers: {
      'x-api-key': JUMPCLOUD_API_KEY,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  const response = UrlFetchApp.fetch(url, options);
  Logger.log(`Response Code: ${response.getResponseCode()}`);
  Logger.log(`Response Body: ${response.getContentText()}`);

  const members = JSON.parse(response.getContentText());

  Logger.log(`Members of group ${groupId}:`);
  members.forEach(member => {
    const id = member.to?.id;
    const type = member.to?.type;
    Logger.log(` - ID: ${id}, Type: ${type}`);
  });
}






