const APPROVER_EMAIL = 'emailhere';  // Please write here the email of the person who should approve the access request

function isJumpCloudEmailValid(email) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("JUMPCLOUD_API_KEY");
  const options = {
    method: 'post',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      filter: {
        or: [{ email: email }]
      }
    }),
    muteHttpExceptions: true
  };

  const url = 'https://console.jumpcloud.com/api/search/systemusers';
  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();
    const body = response.getContentText();

    Logger.log(`JumpCloud response code: ${code}`);
    Logger.log(`JumpCloud response body: ${body}`);

    if (code !== 200) {
      Logger.log(`JumpCloud API error for ${email}: ${code} - ${body}`);
      return false;
    }

    const json = JSON.parse(body);
    const users = json.results || json;

    return Array.isArray(users) && users.length > 0;
  } catch (error) {
    Logger.log('JumpCloud email validation error: ' + error);
    return false;
  }
}

function onFormSubmit(e) {
  const formSpreadsheetId = 'sheetid'; // Change to your sheet ID 
  const sheet = SpreadsheetApp.openById(formSpreadsheetId).getSheetByName('Form Responses 1');
  const row = sheet.getLastRow();
  const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

  const email = rowData[1];
  const targetEmail = rowData[2];
  const futureDateStr = rowData[6];

  // Validate future date
  if (futureDateStr) {
    const futureDate = new Date(futureDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    futureDate.setHours(0, 0, 0, 0);

    if (futureDate <= today) {
      sheet.getRange(row, 9).setValue("Rejected: Invalid future date");
      MailApp.sendEmail(email, "Your access request was rejected",
        `The date you selected ("${futureDateStr}") is not in the future. Please resubmit the form with a valid date.`);
      return;
    }
  }

  Logger.log("Checking JumpCloud for: " + targetEmail);
  const isValid = isJumpCloudEmailValid(targetEmail);
  Logger.log("JumpCloud valid? " + isValid);

  if (!isValid) {
    sheet.getRange(row, 9).setValue("Rejected: Email not found in JumpCloud");
    MailApp.sendEmail(email, "Your access request was rejected",
      `The email address you entered ("${targetEmail}") does not match any user in our system. Please resubmit the form using the user's correct company email.`);
    return;
  }


  const scriptUrl = 'https://script.google.com/a/macros/techsee.me/s/AKfycbza6GOoS_UOdC2s6TsZ7wWHoyQB1du9JMXjTdsHHUvA5259I-RWkpUmZy99JpFSxweiGA/exec';
  const approveUrl = `${scriptUrl}?action=approve&row=${row}`;
  const rejectUrl = `${scriptUrl}?action=reject&row=${row}`;

  const subject = 'Access Request Approval Needed';
  const htmlBody =
    `<p>A new access request has been submitted.</p>
    <p><b>Request Details:</b><br>
    Sender of request: ${rowData[1]}<br>
    Email of user needing permissions: ${rowData[2]}<br>
    Future date to add to group: ${rowData[6]}<br>
    Time to be in group: ${rowData[5]}<br>
    Reason: ${rowData[4]}<br>
    JumpCloud Group Name: ${rowData[3]}</p>
    <p>
    <a href="${approveUrl}" target="_blank">✅ Approve</a><br>
    <a href="${rejectUrl}">❌ Reject</a>
    </p>`;

  MailApp.sendEmail({
    to: APPROVER_EMAIL,
    subject: subject,
    htmlBody: htmlBody
  });
}

function doGet(e) {
  Logger.log("doGet triggered");
  if (!e || !e.parameter || !e.parameter.action || !e.parameter.row) {
    return HtmlService.createHtmlOutput("Invalid request.");
  }

  const action = e.parameter.action;
  const row = parseInt(e.parameter.row);

  if (action === 'approve') {
    const template = HtmlService.createTemplateFromFile('approvalPage');
    template.row = row;
    return template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (action === 'reject') {
    const template = HtmlService.createTemplateFromFile('rejectForm');
    template.row = row;
    return template.evaluate().setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutput("Unknown action.");
}


function approveRequestFromClient(row) {
  const approver = Session.getActiveUser().getEmail();
  Logger.log("Approver from client call: " + approver);

  const formSpreadsheetId = 'spreadsheetid'; // Change to the id of the google spreadsheet where all requests are saved 
  const sheet = SpreadsheetApp.openById(formSpreadsheetId).getSheetByName('Form Responses 1');

  const statusCol = 9;
  const approvedbycol = 10;
  const formRow = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const targetEmail = formRow[2];
  const groupName = formRow[3];
  const duration = formRow[5];
  const futureDate = formRow[6];
  const emailofForm = formRow[1];
  if (sheet.getLastColumn() < approvedbycol) {
    sheet.insertColumnAfter(sheet.getLastColumn());
  }

  sheet.getRange(row, statusCol).setValue("Approved");
  sheet.getRange(row, approvedbycol).setValue(approver);

  const targetSpreadsheetId = 'spreadsheetid'; // Change to the id of the google spreadsheet where aproved requests are proccessed
  const targetSheet = SpreadsheetApp.openById(targetSpreadsheetId).getSheetByName('Sheet1');
  targetSheet.appendRow([
    futureDate,
    duration,
    targetEmail,
    groupName,
    "Pending",
    emailofForm,
    approver
  ]);

  MailApp.sendEmail(targetEmail, "Your access request was approved",
    "Your request has been approved and scheduled for processing.");

}


function handleRejection(row, reason) {
  const activeUser = Session.getEffectiveUser().getEmail();
  if (!activeUser.endsWith('@techsee.me')) {
    throw new Error("Access denied. Please log in with your @techsee.me account.");
  }

  const formSpreadsheetId = '1kkXvjYPYSD5YVkJpCV2_nS7AzWu-2h0Zoy1HdODhKpg';
  const sheet = SpreadsheetApp.openById(formSpreadsheetId).getSheetByName('Form Responses 1');
  const statusCol = 9;
  const approvedByCol = 10;

  const email = sheet.getRange(row, 3).getValue();
  sheet.getRange(row, statusCol).setValue("Rejected: " + reason);
  sheet.getRange(row, approvedByCol).setValue(activeUser); 

  MailApp.sendEmail(email, "Your access request was rejected",
    `Your request for elevated access was rejected for the following reason:\n\n${reason}`);

  return "Rejection submitted successfully. The user has been notified.";
}


function doPost(e) {
  const action = e.parameter.action;

  if (action === 'rejectSubmit') {
    const row = parseInt(e.parameter.row);
    const reason = e.parameter.reason;

    try {
      const message = handleRejection(row, reason);
      const htmlOutput = HtmlService.createHtmlOutput(
      `<div style="font-family:Arial; padding:20px;">
      <h2>✅ Rejection submitted successfully</h2>
      <p>The user has been notified by email with the following reason:</p>
      <blockquote style="color:#555; border-left:4px solid #ccc; padding-left:10px;">${reason}</blockquote>
      <p>You may now close this window.</p>
      </div>`
      );
      return htmlOutput;

    } catch (error) {
      return HtmlService.createHtmlOutput("❌ Error: " + error.message);
    }
  }

  return HtmlService.createHtmlOutput("Unknown POST action.");
}

