const portalMenuItems = [
  ["About", "about.html"],
  ["10th", "class.html"],
  ["Intermediate", "intermediate.html"],
  ["B.Tech", "programs.html"],
  ["Achievements", "achievements.html"],
  ["Alumni", "previous-students.html"],
  ["Contact", "contact.html"],
  ["Register", "admissions.html"],
  ["Student Login", "student-login.html"],
  ["Parent Login", "parent-login.html"],
  ["Faculty Login", "teacher-login.html"],
  ["Admin Login", "admin-login.html"],
];

const scholarLinks = document.querySelector(".scholar-links");
if (scholarLinks) {
  scholarLinks.innerHTML = portalMenuItems
    .map(([label, href]) => {
      const chip = label.includes("Login") ? " class=\"login-chip\"" : "";
      const shortLabel = label.replace(" Login", "");
      return `<li><a${chip} href="${href}">${shortLabel}</a></li>`;
    })
    .join("");
}

let menu = document.getElementById("mobile-menu");
if (!menu && document.querySelector(".scholar-header")) {
  menu = document.createElement("div");
  menu.id = "mobile-menu";
  menu.className = "mobile-menu";
  menu.setAttribute("aria-hidden", "true");
  document.body.insertBefore(menu, document.querySelector("main"));
}
if (menu && document.querySelector(".scholar-header")) {
  menu.innerHTML = `<button id="menu-close" type="button" aria-label="Close menu">X</button>${portalMenuItems
    .map(([label, href]) => `<a href="${href}">${label}</a>`)
    .join("")}`;
}

const publicMain = document.querySelector("body.scholar-ui main");
const isPortalPage = document.querySelector(".portal-login, .dashboard-shell, .id-stage, .ticket-page");
if (publicMain && !isPortalPage && publicMain.querySelectorAll(":scope > section").length < 6) {
  const pageLabel = document.querySelector(".scholar-search")?.textContent?.trim() || "JGS";
  publicMain.insertAdjacentHTML("beforeend", `
    <section class="auto-page-depth">
      <div class="depth-band">
        <article>
          <span class="mini-title">More About ${pageLabel}</span>
          <h2>What students and parents get at JGS</h2>
          <p>JGS Group of Institutes supports learners from 10th and Intermediate to B.Tech, M.Tech and MBA with admission counseling, digital dashboards, faculty mentoring and placement readiness.</p>
          <div class="depth-actions">
            <a class="scholar-btn purple" href="admissions.html">Admission Form</a>
            <a class="scholar-btn white" href="contact.html">Contact Us</a>
          </div>
        </article>
        <article>
          <h3>Academic Support</h3>
          <ul>
            <li>Structured class timetable, internal marks, attendance tracking and notices.</li>
            <li>Course guidance for 10th, Intermediate and six B.Tech branches.</li>
            <li>Parent communication, campus visit booking and admission document help.</li>
          </ul>
        </article>
      </div>
      <div class="depth-band">
        <article>
          <h3>Campus Services</h3>
          <p>Students get library access, lab sessions, achievement records, ID card support, hall ticket access, grievance help and placement drive updates through the connected JGS ecosystem.</p>
        </article>
        <article>
          <h3>Admissions Help</h3>
          <p>For 2026-27 admissions, families can call, WhatsApp or submit the form for eligibility checks, fee guidance, scholarship details, hostel and transport information.</p>
          <div class="depth-actions">
            <a class="scholar-btn purple" href="tel:+912248901100">Call Now</a>
            <a class="scholar-btn white" href="https://wa.me/912248901100" target="_blank" rel="noopener">WhatsApp</a>
          </div>
        </article>
      </div>
    </section>
  `);
}

const jgsPrograms = [
  { title: "B.Tech AI & ML", type: "Engineering", seats: "50 Seats", image: "images/Photo6.jpg", href: "btech-aiml.html", text: "Python, data science, machine learning, neural networks, MLOps and AI projects." },
  { title: "B.Tech Computer Science", type: "Engineering", seats: "50 Seats", image: "images/Photo7.jpg", href: "btech-cse.html", text: "Programming, DSA, databases, cloud, cybersecurity and full-stack product building." },
  { title: "B.Tech ECE", type: "Engineering", seats: "50 Seats", image: "images/Photo8.jpg", href: "btech-ece.html", text: "IoT, embedded systems, VLSI, circuits, signals and communication networks." },
  { title: "B.Tech EEE", type: "Engineering", seats: "50 Seats", image: "images/Photo5.jpg", href: "btech-eee.html", text: "Power systems, automation, smart grids, EV basics and electrical machines." },
  { title: "B.Tech Mechanical", type: "Engineering", seats: "50 Seats", image: "images/Photo10.jpg", href: "btech-mechanical.html", text: "Design, manufacturing, CAD/CAM, robotics, thermal systems and workshops." },
  { title: "B.Tech Civil", type: "Engineering", seats: "50 Seats", image: "images/Photo11.jpg", href: "btech-civil.html", text: "Structures, surveying, construction planning, materials and infrastructure." },
  { title: "Class 10", type: "School", seats: "Open", image: "images/Photo3.jpg", href: "class.html", text: "Board preparation, science, mathematics, languages, activities and parent updates." },
  { title: "Intermediate Science", type: "Intermediate", seats: "Open", image: "images/Photo10.jpg", href: "intermediate.html", text: "Class 11 and 12 PCM / PCB with practicals, tests and career counseling." },
  { title: "M.Tech / MBA", type: "PG", seats: "Open", image: "images/Photo11.jpg", href: "admissions.html", text: "Postgraduate pathways for specialization, leadership and career advancement." },
];

const heroSection = document.querySelector("body.scholar-ui .scholar-hero");
if (heroSection && !isPortalPage && !document.querySelector(".jgs-counter-band")) {
  heroSection.insertAdjacentHTML("afterend", `
    <section class="jgs-counter-band" aria-label="JGS quick numbers">
      <article><b data-dynamic-count="300">0</b><span>B.Tech seats</span></article>
      <article><b data-dynamic-count="80">0</b><span>students placed</span></article>
      <article><b data-dynamic-count="100">0</b><span>recruiters</span></article>
      <article><b data-dynamic-count="6">0</b><span>engineering branches</span></article>
    </section>
  `);
}

const courseGrid = document.querySelector(".scholar-courses .course-grid");
const courseTabs = document.querySelector(".scholar-courses .course-tabs");
if (courseGrid && courseTabs && document.body.classList.contains("scholar-ui")) {
  courseTabs.insertAdjacentHTML("afterend", `<div class="dynamic-toolbar"><input id="course-search" type="search" placeholder="Search course, branch, skill or stream" /><span class="dynamic-badge" id="course-count"></span></div>`);
  const courseSearch = document.getElementById("course-search");
  const courseCount = document.getElementById("course-count");
  const renderCourses = () => {
    const active = courseTabs.querySelector(".active")?.textContent.trim() || "Show All";
    const query = (courseSearch?.value || "").toLowerCase();
    const filtered = jgsPrograms.filter((item) => {
      const inTab = active === "Show All" || item.type === active || (active === "School" && item.type === "Intermediate");
      const inSearch = `${item.title} ${item.type} ${item.text}`.toLowerCase().includes(query);
      return inTab && inSearch;
    });
    courseGrid.innerHTML = filtered.map((item) => `
      <a class="course-card" href="${item.href}">
        <img src="${item.image}" alt="${item.title}" />
        <span>${item.type}</span>
        <b>${item.seats}</b>
        <h3>${item.title}</h3>
        <p>${item.text}</p>
      </a>
    `).join("");
    if (courseCount) courseCount.textContent = `${filtered.length} program${filtered.length === 1 ? "" : "s"}`;
  };
  courseTabs.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      courseTabs.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      renderCourses();
    });
  });
  courseSearch?.addEventListener("input", renderCourses);
  renderCourses();
}

const jgsPreviousStudents = [
  { name: "Kavya Pillai", batch: "2025", branch: "B.Tech AI & ML", outcome: "ML Intern", company: "TCS Digital", package: "12 LPA", image: "KP" },
  { name: "Arjun Mehta", batch: "2025", branch: "B.Tech CSE", outcome: "Software Engineer", company: "Infosys", package: "9 LPA", image: "AM" },
  { name: "Riya Shah", batch: "2025", branch: "B.Tech ECE", outcome: "Embedded Trainee", company: "L&T Technology", package: "8 LPA", image: "RS" },
  { name: "Sameer Khan", batch: "2024", branch: "B.Tech Mechanical", outcome: "Design Engineer", company: "Mahindra", package: "7.5 LPA", image: "SK" },
  { name: "Nisha Rao", batch: "2024", branch: "B.Tech Civil", outcome: "Planning Associate", company: "Godrej Construction", package: "6.8 LPA", image: "NR" },
  { name: "Dev Malhotra", batch: "2024", branch: "B.Tech EEE", outcome: "Automation Engineer", company: "Siemens Partner", package: "8.2 LPA", image: "DM" },
  { name: "Ayesha Fernandes", batch: "2023", branch: "Intermediate Science", outcome: "B.Tech CSE Admission", company: "JGS Pathway", package: "Merit Track", image: "AF" },
  { name: "Rahul Patil", batch: "2023", branch: "Class 10", outcome: "Intermediate Science", company: "JGS Junior College", package: "Distinction", image: "RP" },
  { name: "Meera Iyer", batch: "2022", branch: "B.Tech CSE", outcome: "Cloud Engineer", company: "Wipro", package: "10 LPA", image: "MI" },
  { name: "Vedant Joshi", batch: "2022", branch: "B.Tech AI & ML", outcome: "Data Analyst", company: "Product Startup", package: "11 LPA", image: "VJ" },
  { name: "Priya Nair", batch: "2021", branch: "MBA", outcome: "Management Trainee", company: "ICICI Partner", package: "7 LPA", image: "PN" },
  { name: "Aditya Singh", batch: "2021", branch: "B.Tech Civil", outcome: "Site Engineer", company: "Larsen & Toubro", package: "8 LPA", image: "AS" },
];

const alumniGrid = document.querySelector("[data-previous-students]");
if (alumniGrid) {
  const alumniFilters = document.querySelector("[data-alumni-filters]");
  const alumniSearch = document.getElementById("alumni-search");
  const alumniCount = document.getElementById("alumni-count");
  const batches = ["All", ...new Set(jgsPreviousStudents.map((item) => item.batch))];
  if (alumniFilters) {
    alumniFilters.innerHTML = batches.map((batch, index) => `<button class="${index === 0 ? "active" : ""}" type="button">${batch}</button>`).join("");
  }
  const renderAlumni = () => {
    const active = alumniFilters?.querySelector(".active")?.textContent.trim() || "All";
    const query = (alumniSearch?.value || "").toLowerCase();
    const filtered = jgsPreviousStudents.filter((item) => {
      const batchOk = active === "All" || item.batch === active;
      const textOk = `${item.name} ${item.branch} ${item.outcome} ${item.company}`.toLowerCase().includes(query);
      return batchOk && textOk;
    });
    alumniGrid.innerHTML = filtered.map((item) => `
      <article class="alumni-card">
        <div class="alumni-avatar">${item.image}</div>
        <div>
          <span>${item.batch} Batch</span>
          <h3>${item.name}</h3>
          <p>${item.branch}</p>
          <b>${item.outcome}</b>
          <small>${item.company} - ${item.package}</small>
        </div>
      </article>
    `).join("");
    if (alumniCount) alumniCount.textContent = `${filtered.length} students`;
  };
  alumniFilters?.addEventListener("click", (event) => {
    if (!event.target.matches("button")) return;
    alumniFilters.querySelectorAll("button").forEach((button) => button.classList.remove("active"));
    event.target.classList.add("active");
    renderAlumni();
  });
  alumniSearch?.addEventListener("input", renderAlumni);
  renderAlumni();
}
const menuToggle = document.getElementById("menu-toggle");
const menuClose = document.getElementById("menu-close");

function setMenu(open) {
  if (!menu || !menuToggle) return;
  menu.classList.toggle("open", open);
  document.body.classList.toggle("menu-open", open);
  menu.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
}

menuToggle?.addEventListener("click", () => setMenu(true));
menuClose?.addEventListener("click", () => setMenu(false));
menu?.addEventListener("click", (event) => {
  if (event.target.matches("a")) setMenu(false);
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });
document.querySelectorAll(".reveal").forEach((item) => revealObserver.observe(item));

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.counter);
    const suffix = el.dataset.suffix || "";
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: 0.5 });
document.querySelectorAll("[data-counter]").forEach((item) => counterObserver.observe(item));

const dynamicCounterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.dynamicCount);
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / 1200, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - progress, 3))) + "+";
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    dynamicCounterObserver.unobserve(el);
  });
}, { threshold: 0.45 });
document.querySelectorAll("[data-dynamic-count]").forEach((item) => dynamicCounterObserver.observe(item));

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
document.querySelectorAll(".gallery-button").forEach((button) => {
  button.addEventListener("click", () => {
    const img = button.querySelector("img");
    lightboxImg.src = button.dataset.full;
    lightboxImg.alt = img.alt;
    lightbox.classList.add("open");
    lightbox.setAttribute("aria-hidden", "false");
  });
});

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove("open");
  lightbox.setAttribute("aria-hidden", "true");
  lightboxImg.removeAttribute("src");
}

document.getElementById("lightbox-close")?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenu(false);
    closeLightbox();
  }
});

const enquiryForm = document.getElementById("enquiry-form");
const enquiryKey = "jgsAdmissionEnquiries";
function getEnquiries() {
  try {
    return JSON.parse(localStorage.getItem(enquiryKey) || "[]");
  } catch {
    return [];
  }
}
function saveEnquiry(entry) {
  const next = [entry, ...getEnquiries()].slice(0, 5);
  localStorage.setItem(enquiryKey, JSON.stringify(next));
  return next;
}
function renderEnquiryHistory() {
  if (!enquiryForm || document.getElementById("enquiry-history")) return;
  const saved = getEnquiries();
  if (!saved.length) return;
  enquiryForm.closest("section")?.insertAdjacentHTML("afterend", `
    <section class="enquiry-history" id="enquiry-history">
      <h3>Recent enquiries saved on this device</h3>
      <p>This is a browser-side dynamic preview. A real backend can later connect this same form to Google Sheets or a database.</p>
      <ul>${saved.map((item) => `<li><b>${item.name}</b> - ${item.program || item.level} - ${item.time}</li>`).join("")}</ul>
    </section>
  `);
}
renderEnquiryHistory();

enquiryForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const name = data.get("name") || "Student";
  const phone = data.get("phone") || "";
  const level = data.get("level") || data.get("program") || "JGS admissions";
  const program = data.get("program") || data.get("course") || "";
  const city = data.get("city") || "";
  const visit = data.get("visit") || "";
  const userMessage = data.get("message") || "";
  const entry = {
    name: String(name),
    phone: String(phone),
    level: String(level),
    program: String(program),
    city: String(city),
    visit: String(visit),
    time: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
  };
  saveEnquiry(entry);
  const message = encodeURIComponent(
    `Hi JGS Admissions, I am ${name}. Phone: ${phone}. Level: ${level}. Program: ${program}. City: ${city}. Campus visit: ${visit}. Message: ${userMessage}`
  );
  const note = document.getElementById("form-note");
  if (note) note.textContent = "Enquiry saved on this device. Opening WhatsApp with your details.";
  document.getElementById("enquiry-history")?.remove();
  renderEnquiryHistory();
  window.open(`https://wa.me/912248901100?text=${message}`, "_blank", "noopener");
});

document.querySelectorAll("[data-login-target]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const target = form.getAttribute("data-login-target");
    const note = form.querySelector(".login-note");
    if (note) note.textContent = "Login successful. Opening dashboard...";
    setTimeout(() => {
      window.location.href = target;
    }, 450);
  });
});
