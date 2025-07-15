# JumpCloud User Group Automation

A complete solution for automating user requests and user group membership in JumpCloud. This repo has **three core components**, each handling a key part of the workflow:

---

## 📋 1. Google Form — Request Access

- A streamlined Google Form that allows users to request membership in a specific JumpCloud group.
- Built with Google Apps Script to capture submissions and initial metadata.
- The form is user-friendly and accessible internally (for example, limited to HR or specific teams).

---

## 📊 2. Tracking Spreadsheet — Request Logging & Approval

- Each form submission is automatically recorded in a Google Sheet.
- The sheet has columns like:
  - **Timestamp**, **Requester Name**, **Requested Group**
  - **Approval Status**: Pending / Approved / Rejected
  - **Approver Details** and **Decision Timestamp**
- Includes buttons/scripts to approve or reject requests and record that decision in the sheet.

---

## 🪄 3. Automation Spreadsheet — Membership Magic

- This is where the magic happens:
  - Approved requests trigger scripts that **add users to JumpCloud groups**
  - Users are also **removed at the appropriate time** based on defined criteria
- Contains your core Google Apps Script functions—using `GroupsApp`, custom scheduling, triggers, and the JumpCloud API.
- Centralizes group membership logic: addition, removal, time-based cleanup, and logging.

---

## ⚙️ How it works together

1. A user submits the form → request logged in Tracking Sheet.  
2. Admin reviews and approves/rejects directly in the sheet.  
3. Upon approval:
   - The Automation script triggers.
   - Calls JumpCloud API to add the user to the specified group.
   - Schedules removal (or performs it based on rules).
   - Logs outcome in the Automation Spreadsheet.

---

## 🚀 Getting Started

1. **Set up Form and Scripts**  
   - Copy the provided Google Form and attached Apps Script.  
   - Customize script variables (e.g., group IDs, API keys).

2. **Setup Tracking Sheet**  
   - Copy the template and configure triggers for form submission.  
   - Add approval buttons.

3. **Deploy Automation Sheet**  
   - Copy the sheet and its Apps Script.  
   - Update JumpCloud group IDs, set triggers for scheduled checks.

4. **Authentication & API Setup**  
   - Provide JumpCloud API Key in the script.  
   - Authorize Apps Script scopes (Forms, Sheets, GroupsApp, UrlFetchApp).

---

## 🧩 Key Code Highlights

- **Google Form handler**: captures submissions → adds rows in the Tracking Sheet.  
- **Approval logic**: ‘Approve’ and ‘Reject’ buttons trigger sheet-based scripts.  
- **JumpCloud integration**: uses Apps Script + UrlFetch to call JumpCloud's REST API.  
  - Adds users to groups and schedules removal.  
- **Time-based checks**: runs daily to remove expired group memberships or stale requests.  
- **Use of `GroupsApp`** + named ranges and on-edit triggers for user-friendly automation.

---

## 📚 Technologies & Libraries

- **Google Apps Script** — lightweight JS for automating Google Workspace :contentReference[oaicite:1]{index=1}  
- **JumpCloud API** — used for adding/removing users via REST calls  
- **Google Services** — Forms, Sheets, and GroupsApp for integrated logic

---

## ✨ Why this repo rocks

- Full **end-to-end automation**: request → approval → automated membership management  
- Completely **self-service and limited scope** — no external tools needed  
- **Modular & maintainable**: separation between request tracking and execution  
- You’ve built robust scripts: approvals, scheduling, API integration, validation, cleanup — all neatly organized!


