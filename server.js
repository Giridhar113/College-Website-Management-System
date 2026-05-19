const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const dataDir = path.join(root, "data");
const port = Number(process.env.PORT || 3000);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".mp4": "video/mp4",
  ".txt": "text/plain; charset=utf-8"
};

function ensureDataFile(name, fallback) {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const file = path.join(dataDir, name);
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  return file;
}

const files = {
  site: ensureDataFile("site.json", {
    notices: [
      {
        date: "15 May 2026",
        category: "Admissions",
        title: "2026-27 applications are open for School, Intermediate, and B.Tech programs.",
        description: "Applicants can submit online forms and contact the admissions help desk for counseling slots."
      },
      {
        date: "20 May 2026",
        category: "Verification",
        title: "Document verification desk is open on working days from 9:00 AM to 5:00 PM.",
        description: "Carry marks memo, transfer certificate, Aadhaar, photos, and category certificates if applicable."
      },
      {
        date: "01 Jun 2026",
        category: "Placement Cell",
        title: "Final-year placement training batch registration begins at the placement office.",
        description: "Students should register with updated resumes and department mentor approval."
      }
    ],
    companies: [
      { code: "TCS", name: "TCS", description: "Software trainee, digital operations, and campus hiring preparation." },
      { code: "INF", name: "Infosys", description: "Aptitude, programming, communication, and foundation training alignment." },
      { code: "WIP", name: "Wipro", description: "IT services, project readiness, and entry-level engineering roles." },
      { code: "HCL", name: "HCLTech", description: "Technical support, software services, and engineering trainee pathways." },
      { code: "ACC", name: "Accenture", description: "Consulting, software delivery, and graduate talent preparation." },
      { code: "CAP", name: "Capgemini", description: "Campus coding rounds, interview practice, and project portfolio reviews." },
      { code: "COG", name: "Cognizant", description: "Application development, quality engineering, and trainee opportunities." },
      { code: "IBM", name: "IBM", description: "Cloud, analytics, AI fundamentals, and professional readiness tracks." }
    ]
  }),
  applications: ensureDataFile("applications.json", []),
  contacts: ensureDataFile("contacts.json", []),
  users: ensureDataFile("users.json", {
    admin: [{ id: "JGS-ADM-001", password: "admin123", name: "JGS Administrator" }],
    teacher: [{ id: "JGS-FAC-001", password: "teacher123", name: "Faculty User" }],
    student: [{ id: "22JGS-AIML-001", password: "student123", name: "Arjun Reddy", branch: "AI&ML" }],
    parent: [{ id: "JGS-PAR-001", password: "parent123", name: "Parent / Guardian", studentId: "22JGS-AIML-001" }]
  })
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request body is too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function cleanText(value) {
  return String(value || "").trim();
}

function createApplicationNumber() {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const token = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `JGS-APP-${stamp}-${token}`;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/site") {
    return sendJson(res, 200, readJson(files.site));
  }

  if (req.method === "POST" && url.pathname === "/api/applications") {
    const body = await readBody(req);
    const record = {
      applicationNo: createApplicationNumber(),
      name: cleanText(body.name),
      phone: cleanText(body.phone),
      email: cleanText(body.email),
      dob: cleanText(body.dob),
      program: cleanText(body.program),
      quota: cleanText(body.quota),
      previous: cleanText(body.previous),
      marks: cleanText(body.marks),
      address: cleanText(body.address),
      status: "Submitted",
      stage: "Admissions office will verify details and contact the applicant for counseling.",
      createdAt: new Date().toISOString()
    };
    if (!record.name || !record.phone || !record.program) {
      return sendJson(res, 400, { error: "Name, phone, and program are required." });
    }
    const applications = readJson(files.applications);
    applications.unshift(record);
    writeJson(files.applications, applications);
    return sendJson(res, 201, record);
  }

  if (req.method === "GET" && url.pathname === "/api/applications/status") {
    const query = cleanText(url.searchParams.get("query"));
    const applications = readJson(files.applications);
    const match = applications.find(item =>
      item.applicationNo.toLowerCase() === query.toLowerCase() ||
      item.phone === query
    );
    if (!match) return sendJson(res, 404, { error: "Application record was not found." });
    return sendJson(res, 200, match);
  }

  if (req.method === "POST" && url.pathname === "/api/contact") {
    const body = await readBody(req);
    const record = {
      name: cleanText(body.name),
      email: cleanText(body.email),
      phone: cleanText(body.phone),
      message: cleanText(body.message),
      createdAt: new Date().toISOString()
    };
    const contacts = readJson(files.contacts);
    contacts.unshift(record);
    writeJson(files.contacts, contacts);
    return sendJson(res, 201, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/login") {
    const body = await readBody(req);
    const loginId = cleanText(body.loginId);
    const password = String(body.password || "");
    const users = readJson(files.users);

    for (const [portal, roleUsers] of Object.entries(users)) {
      const user = (roleUsers || []).find(item => item.id === loginId && item.password === password);
      if (user) {
        const { password: _password, ...safeUser } = user;
        return sendJson(res, 200, { ok: true, portal, user: safeUser });
      }
    }

    return sendJson(res, 401, { error: "Invalid ID or password." });
  }

  if (req.method === "GET" && url.pathname === "/api/admin/applications") {
    return sendJson(res, 200, { applications: readJson(files.applications) });
  }

  if (req.method === "POST" && url.pathname === "/api/admin/site") {
    const body = await readBody(req);
    fs.writeFileSync(files.site, JSON.stringify(body, null, 2));
    return sendJson(res, 200, { ok: true, message: "Site data updated successfully." });
  }

  if (req.method === "GET" && url.pathname === "/api/admin/contacts") {
    return sendJson(res, 200, { contacts: readJson(files.contacts) });
  }

  return sendJson(res, 404, { error: "API route not found." });
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(root, `.${pathname}`);
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname.startsWith("/api/")) {
        await handleApi(req, res, url);
        return;
      }
      serveStatic(req, res, url);
    } catch (error) {
      sendJson(res, 500, { error: error.message || "Server error" });
    }
  });
}

if (require.main === module) {
  createServer().listen(port, () => {
    console.log(`JGS dynamic website running at http://localhost:${port}`);
  });
}

module.exports = { createServer };
