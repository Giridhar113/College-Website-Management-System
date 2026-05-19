# JGS Dynamic Website

This project now includes a local Node.js backend. Use it instead of opening the HTML files directly when you want dynamic features.

## Start

```powershell
node server.js
```

Open:

```text
http://localhost:3000
```

## Dynamic Data

The backend stores editable JSON data in the `data/` folder:

- `site.json` - official notices and recruiting companies
- `applications.json` - submitted admission applications
- `contacts.json` - contact form inquiries
- `users.json` - portal users for local development

## Current Dynamic Features

- Home page notices load from `/api/site`
- Recruiting companies slider loads from `/api/site`
- Admission applications save to `/api/applications`
- Application status checks `/api/applications/status`
- Contact form saves to `/api/contact`
- Portal login checks `/api/login` first, then falls back to existing frontend records
- Unified portal login is available at `login.html`
- Login forms include password visibility, account recovery/OTP UI, last-login messaging, and temporary lock handling
- Student hall ticket download is blocked when fee balance is pending
- `payment.html` clears the local fee gate and redirects back to the student portal

For production, replace JSON files with a database and move passwords to hashed credentials.
