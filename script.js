var menuButton = document.querySelector(".menu-toggle");
var navLinks = document.querySelector(".nav-links");
var apiBase = window.location.protocol === "http:" || window.location.protocol === "https:" ? "" : null;

function apiRequest(path, options) {
  if (apiBase === null) return Promise.reject(new Error("Dynamic server is not running."));
  var requestOptions = options || {};
  requestOptions.headers = Object.assign({
    "Content-Type": "application/json"
  }, requestOptions.headers || {});

  return fetch(apiBase + path, requestOptions).then(function (response) {
    return response.json().then(function (data) {
      if (!response.ok) {
        throw new Error(data.error || "Request failed.");
      }
      return data;
    });
  });
}

function getLoginAttemptKey(portal, loginId) {
  return "jgsLoginAttempts." + portal + "." + (loginId || "blank");
}

function readLoginAttempt(portal, loginId) {
  try {
    return JSON.parse(localStorage.getItem(getLoginAttemptKey(portal, loginId)) || "{}");
  } catch (error) {
    return {};
  }
}

function isLoginLocked(portal, loginId) {
  var attempt = readLoginAttempt(portal, loginId);
  return attempt.lockUntil && Date.now() < attempt.lockUntil;
}

function recordFailedLogin(portal, loginId) {
  try {
    var attempt = readLoginAttempt(portal, loginId);
    var count = (attempt.count || 0) + 1;
    var lockUntil = count >= 3 ? Date.now() + 5 * 60 * 1000 : 0;
    localStorage.setItem(getLoginAttemptKey(portal, loginId), JSON.stringify({ count: count, lockUntil: lockUntil }));
    return { count: count, lockUntil: lockUntil };
  } catch (error) {
    return { count: 1, lockUntil: 0 };
  }
}

function recordSuccessfulLogin(portal, loginId) {
  try {
    localStorage.removeItem(getLoginAttemptKey(portal, loginId));
    localStorage.setItem("jgsLastLogin." + portal, new Date().toLocaleString("en-IN"));
  } catch (error) {
    // Login still works without local browser storage.
  }
}

function parseCurrencyAmount(value) {
  var number = String(value || "").replace(/[^\d.]/g, "");
  return Number(number || 0);
}

function hasPendingFee(profile) {
  return parseCurrencyAmount(profile && profile.balance) > 0;
}

function getPaidStudentIds() {
  try {
    return JSON.parse(localStorage.getItem("jgsPaidStudentIds") || "[]");
  } catch (error) {
    return [];
  }
}

function isFeeClearedByPayment(studentId) {
  return getPaidStudentIds().indexOf(studentId) !== -1;
}

function markFeePaid(studentId) {
  try {
    var ids = getPaidStudentIds();
    if (ids.indexOf(studentId) === -1) ids.push(studentId);
    localStorage.setItem("jgsPaidStudentIds", JSON.stringify(ids));
  } catch (error) {
    // Payment confirmation still displays even if browser storage is unavailable.
  }
}

if (menuButton && navLinks) {
  menuButton.addEventListener("click", function () {
    navLinks.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", navLinks.classList.contains("open") ? "true" : "false");
  });

  navLinks.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      navLinks.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    });
  });
}

function setActiveNavigation() {
  var currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach(function (link) {
    var target = link.getAttribute("href");
    link.classList.toggle("active", target === currentPage);
  });
}

function addDynamicNotice() {
  if (document.querySelector(".dynamic-notice")) return;

  var currentPage = window.location.pathname.split("/").pop() || "index.html";
  var loginPages = ["login.html", "login.html", "login.html", "login.html"];
  if (loginPages.indexOf(currentPage) !== -1) return;

  var hero = document.querySelector(".page-banner");
  if (!hero) return;

  var today = new Date();
  var dateText = today.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });

  var notice = document.createElement("div");
  notice.className = "dynamic-notice";
  notice.innerHTML =
    '<div class="dynamic-notice-inner">' +
    '<span><strong>Admissions update:</strong> Applications are open for School, Intermediate, and Higher Education - ' + dateText + "</span>" +
    '<a href="application.html">Apply Now</a>' +
    "</div>";

  hero.insertAdjacentElement("afterend", notice);
}

var revealItems = document.querySelectorAll(
  ".section, .card, .image-card, .achievement-card, .form-card, .page-banner, .higher-stat-grid article, .higher-program-card, .higher-support-grid article, .school-curriculum-card, .school-faculty-grid article, .about-values-grid article"
);

revealItems.forEach(function (item, index) {
  item.classList.add("scroll-reveal");
  item.style.transitionDelay = Math.min(index % 6, 5) * 55 + "ms";
});

var revealObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add("revealed");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

revealItems.forEach(function (item) {
  revealObserver.observe(item);
});

function animateCounters() {
  var counters = document.querySelectorAll(".home-counter-grid strong, .stat strong");

  var counterObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting || entry.target.dataset.counted) return;

      var text = entry.target.textContent.trim();
      var match = text.match(/^(\d+)(.*)$/);
      if (!match) {
        entry.target.dataset.counted = "true";
        counterObserver.unobserve(entry.target);
        return;
      }

      var end = Number(match[1]);
      var suffix = match[2];
      var startTime = null;
      entry.target.dataset.counted = "true";

      function step(timestamp) {
        if (!startTime) startTime = timestamp;
        var progress = Math.min((timestamp - startTime) / 900, 1);
        var value = Math.round(end * progress);
        entry.target.textContent = value + suffix;
        if (progress < 1) requestAnimationFrame(step);
      }

      requestAnimationFrame(step);
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.45 });

  counters.forEach(function (counter) {
    counterObserver.observe(counter);
  });
}

function setupCardTilt() {
  var cards = document.querySelectorAll(".higher-program-card");

  cards.forEach(function (card) {
    card.addEventListener("mousemove", function (event) {
      var rect = card.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var rotateY = ((x / rect.width) - 0.5) * 5;
      var rotateX = ((0.5 - (y / rect.height)) * 5);
      card.style.setProperty("--tilt-x", rotateX + "deg");
      card.style.setProperty("--tilt-y", rotateY + "deg");
      card.style.setProperty("--shine-x", (x / rect.width) * 100 + "%");
      card.style.setProperty("--shine-y", (y / rect.height) * 100 + "%");
    });

    card.addEventListener("mouseleave", function () {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
      card.style.setProperty("--shine-x", "50%");
      card.style.setProperty("--shine-y", "20%");
    });
  });
}

function setupCursorGlow() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  if (document.querySelector(".cursor-glow")) return;

  var glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);

  window.addEventListener("mousemove", function (event) {
    document.body.classList.add("has-cursor-glow");
    glow.style.transform = "translate3d(" + event.clientX + "px, " + event.clientY + "px, 0) translate(-50%, -50%)";
  });

  window.addEventListener("mouseleave", function () {
    document.body.classList.remove("has-cursor-glow");
  });
}

function setupMotionLayer() {
  document.body.classList.add("motion-ready");

  var animatedItems = document.querySelectorAll(
    ".metric-card, .chart-card, .finance-grid article, .fee-summary-grid article, .teacher-calendar button, .student-calendar button, .branch-summary-card"
  );

  animatedItems.forEach(function (item, index) {
    item.style.setProperty("--motion-order", index % 10);
  });
}

function setupVideoControls() {
  var buttons = document.querySelectorAll("[data-video-toggle]");

  buttons.forEach(function (button) {
    var video = document.getElementById(button.dataset.videoToggle);
    if (!video) return;

    button.textContent = video.muted ? "Video Sound On" : "Mute Video";
    button.setAttribute("aria-pressed", String(!video.muted));

    button.addEventListener("click", function () {
      video.muted = !video.muted;
      if (!video.muted) {
        video.volume = 0.65;
      }
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          video.muted = true;
          button.textContent = "Video Sound On";
          button.setAttribute("aria-pressed", "false");
        });
      }
      button.textContent = video.muted ? "Video Sound On" : "Mute Video";
      button.setAttribute("aria-pressed", String(!video.muted));
    });
  });
}

function setupMusicControls() {
  var buttons = document.querySelectorAll("[data-music-toggle]");

  buttons.forEach(function (button) {
    var audio = document.getElementById(button.dataset.musicToggle);
    if (!audio) return;

    audio.volume = 0.35;
    button.textContent = "Play Music";
    button.setAttribute("aria-pressed", "false");

    button.addEventListener("click", function () {
      if (audio.paused) {
        var playPromise = audio.play();
        if (playPromise && typeof playPromise.then === "function") {
          playPromise.then(function () {
            button.textContent = "Pause Music";
            button.setAttribute("aria-pressed", "true");
          }).catch(function () {
            button.textContent = "Play Music";
            button.setAttribute("aria-pressed", "false");
          });
        } else {
          button.textContent = "Pause Music";
          button.setAttribute("aria-pressed", "true");
        }
      } else {
        audio.pause();
        button.textContent = "Play Music";
        button.setAttribute("aria-pressed", "false");
      }
    });
  });
}

function setupGlobalMusicPlayer() {
  var heroSoundButton = document.querySelector("#enableHeroSound");
  var heroVideo = document.querySelector("#heroVideo");
  if (!heroSoundButton || !heroVideo) return;

  function syncHeroSoundButton() {
    var soundEnabled = !heroVideo.muted;
    heroSoundButton.textContent = soundEnabled ? "Mute Video" : "Enable Audio";
    heroSoundButton.setAttribute("aria-pressed", String(soundEnabled));
    heroSoundButton.setAttribute("aria-label", soundEnabled ? "Mute hero video" : "Enable hero video audio");
  }

  syncHeroSoundButton();

  heroSoundButton.addEventListener("click", function () {
    heroVideo.muted = !heroVideo.muted;
    if (!heroVideo.muted) {
      heroVideo.volume = 0.75;
    }

    var videoPromise = heroVideo.play();
    if (videoPromise && typeof videoPromise.catch === "function") {
      videoPromise.catch(function () {
        heroVideo.muted = true;
        syncHeroSoundButton();
      });
    }

    syncHeroSoundButton();
  });
}

function setupTopPackageSlider() {
  var slider = document.querySelector("#topPackageSlider");
  var dotsWrap = document.querySelector("#topPackageDots");
  var prev = document.querySelector(".package-prev");
  var next = document.querySelector(".package-next");
  if (!slider || !dotsWrap || !prev || !next) return;

  var slides = Array.prototype.slice.call(slider.querySelectorAll(".top-package-card"));
  if (!slides.length) return;

  var packageDetails = [
    {
      label: "Highest Package",
      package: "Rs. 1 Cr",
      student: "Aarav Mehta",
      branch: "AI&ML",
      recruiter: "Google Cloud Partner",
      role: "AI Engineering Associate",
      details: ["Built an AI automation portfolio with model deployment and dashboard reporting.", "Cleared aptitude, Python coding, project review, and leadership interview.", "Received resume mentoring, mock interviews, and portfolio guidance from the placement cell."]
    },
    {
      label: "Second Highest",
      package: "Rs. 42 LPA",
      student: "Riya Shah",
      branch: "Computer Science",
      recruiter: "Microsoft Partner",
      role: "Product Software Engineer",
      details: ["Presented a full-stack campus services project with authentication and dashboard modules.", "Cleared DSA, JavaScript, database, and system design rounds.", "Trained through weekly coding practice and GitHub portfolio reviews."]
    },
    {
      label: "Core Engineering",
      package: "Rs. 18 LPA",
      student: "Vikram Nair",
      branch: "ECE",
      recruiter: "ElectroWave Tech",
      role: "Embedded Systems Trainee",
      details: ["Built an IoT-based smart monitoring project using sensors and microcontrollers.", "Cleared electronics fundamentals, microprocessor, and communication systems interviews.", "Prepared through ECE lab practice, project documentation, and mock technical viva."]
    },
    {
      label: "Package Range",
      package: "Rs. 4 LPA",
      student: "Multiple Students",
      branch: "All B.Tech Branches",
      recruiter: "Campus Drive Recruiters",
      role: "Engineering Trainee / Developer",
      details: ["Starting package range across CS, AI&ML, ECE, Mechanical, Civil, and EEE.", "Students complete aptitude, communication, resume, and technical interview preparation.", "Placement team tracks applications, interviews, offers, and joining readiness."]
    },
    {
      label: "Students Placed",
      package: "80 Students",
      student: "Final Year Students",
      branch: "All Branches",
      recruiter: "100+ Company Network",
      role: "Internships and Final Offers",
      details: ["80 students placed through campus placements, internships, trainee roles, and project-based selections.", "Students are guided through company registration, test practice, interviews, and offer documentation.", "Placement records are updated in the student dashboard for academic and career tracking."]
    }
  ];

  dotsWrap.innerHTML = slides.map(function (_, index) {
    return '<button type="button" aria-label="Go to package ' + (index + 1) + '"></button>';
  }).join("");

  var dots = Array.prototype.slice.call(dotsWrap.querySelectorAll("button"));

  function slideWidth() {
    var firstSlide = slides[0];
    var gap = 18;
    return firstSlide.getBoundingClientRect().width + gap;
  }

  function goToSlide(index) {
    var safeIndex = Math.max(0, Math.min(index, slides.length - 1));
    slider.scrollTo({ left: safeIndex * slideWidth(), behavior: "smooth" });
    setActiveDot(safeIndex);
  }

  function currentIndex() {
    return Math.round(slider.scrollLeft / slideWidth());
  }

  function setActiveDot(index) {
    dots.forEach(function (dot, dotIndex) {
      dot.classList.toggle("active", dotIndex === index);
    });
  }

  prev.addEventListener("click", function () {
    var index = currentIndex();
    goToSlide(index <= 0 ? slides.length - 1 : index - 1);
  });

  next.addEventListener("click", function () {
    var index = currentIndex();
    goToSlide(index >= slides.length - 1 ? 0 : index + 1);
  });

  dots.forEach(function (dot, index) {
    dot.addEventListener("click", function () {
      goToSlide(index);
    });
  });

  slides.forEach(function (slide, index) {
    slide.setAttribute("tabindex", "0");
    slide.setAttribute("role", "button");
    slide.setAttribute("aria-label", "Open " + packageDetails[index].label + " placement details");
    slide.addEventListener("click", function () {
      openPlacementModal(packageDetails[index]);
    });
    slide.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openPlacementModal(packageDetails[index]);
      }
    });
  });

  slider.addEventListener("scroll", function () {
    window.clearTimeout(slider._scrollTimer);
    slider._scrollTimer = window.setTimeout(function () {
      setActiveDot(currentIndex());
    }, 80);
  });

  setActiveDot(0);

  window.setInterval(function () {
    if (!document.body.contains(slider)) return;
    var index = currentIndex();
    goToSlide(index >= slides.length - 1 ? 0 : index + 1);
  }, 4200);
}

function setupCompanySlider() {
  var slider = document.querySelector("#companySlider");
  var prev = document.querySelector(".company-prev");
  var next = document.querySelector(".company-next");
  if (!slider || !prev || !next) return;

  var cards = Array.prototype.slice.call(slider.querySelectorAll(".company-card"));
  if (!cards.length) return;

  function cardStep() {
    return cards[0].getBoundingClientRect().width + 16;
  }

  prev.addEventListener("click", function () {
    slider.scrollBy({ left: -cardStep(), behavior: "smooth" });
  });

  next.addEventListener("click", function () {
    slider.scrollBy({ left: cardStep(), behavior: "smooth" });
  });
}

function renderDynamicNotices(notices) {
  var list = document.querySelector(".official-notices-section .notice-list");
  if (!list || !Array.isArray(notices) || !notices.length) return;

  list.innerHTML = notices.map(function (notice) {
    return "<div><span>" + escapeHTML(notice.date) + " | " + escapeHTML(notice.category) + "</span><strong>" +
      escapeHTML(notice.title) + "</strong><p>" + escapeHTML(notice.description) + "</p></div>";
  }).join("");
}

function renderDynamicCompanies(companies) {
  var slider = document.querySelector("#companySlider");
  if (!slider || !Array.isArray(companies) || !companies.length) return;

  slider.innerHTML = companies.map(function (company) {
    return '<article class="company-card"><span class="company-logo-mark">' + escapeHTML(company.code) +
      "</span><h3>" + escapeHTML(company.name) + "</h3><p>" + escapeHTML(company.description) + "</p></article>";
  }).join("");
}

function loadDynamicSiteContent() {
  apiRequest("/api/site")
    .then(function (data) {
      renderDynamicNotices(data.notices);
      renderDynamicCompanies(data.companies);
    })
    .catch(function () {
      // Static fallback remains visible when the backend is not running.
    });
}

function setupLoginEnhancements() {
  document.querySelectorAll('input[type="password"]').forEach(function (input) {
    if (input.parentElement && input.parentElement.classList.contains("password-field-wrap")) return;
    var wrapper = document.createElement("div");
    wrapper.className = "password-field-wrap";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.textContent = "Show";
    wrapper.appendChild(toggle);
    toggle.addEventListener("click", function () {
      var visible = input.type === "text";
      input.type = visible ? "password" : "text";
      toggle.textContent = visible ? "Show" : "Hide";
    });
  });

  document.querySelectorAll("[data-last-login]").forEach(function (target) {
    var portal = loginForm ? loginForm.dataset.portal || "portal" : "portal";
    try {
      var last = localStorage.getItem("jgsLastLogin." + portal);
      if (last) target.textContent = "Last login: " + last;
    } catch (error) {
      target.textContent = "Last login appears after secure access.";
    }
  });

  document.querySelectorAll("[data-forgot-access]").forEach(function (button) {
    button.addEventListener("click", function () {
      var form = button.closest("form");
      if (!form) return;
      var panel = form.querySelector(".forgot-access-panel");
      if (!panel) {
        panel = document.createElement("div");
        panel.className = "forgot-access-panel";
        panel.innerHTML =
          '<p class="eyebrow">Account Recovery</p>' +
          '<h3>Forgot ID / Password</h3>' +
          '<p>Enter your registered mobile/email. The office can verify your identity and issue reset support.</p>' +
          '<div class="field"><label>Mobile / Email</label><input type="text" class="forgot-contact-input" placeholder="Registered mobile or email"></div>' +
          '<button class="mini-btn" type="button" data-send-otp>Send OTP</button>' +
          '<div class="field otp-field hidden"><label>Enter OTP</label><input type="text" class="forgot-otp-input" placeholder="6 digit OTP"></div>' +
          '<button class="mini-btn hidden" type="button" data-verify-otp>Verify OTP</button>' +
          '<p class="inline-status"></p>';
        form.appendChild(panel);
      }
      panel.classList.toggle("open");
    });
  });

  document.addEventListener("click", function (event) {
    var otpButton = event.target.closest("[data-send-otp]");
    if (otpButton) {
      var panel = otpButton.closest(".forgot-access-panel");
      if (!panel) return;
      var otp = String(Math.floor(100000 + Math.random() * 900000));
      panel.dataset.otp = otp;
      panel.querySelector(".otp-field").classList.remove("hidden");
      panel.querySelector("[data-verify-otp]").classList.remove("hidden");
      panel.querySelector(".inline-status").textContent = "OTP sent for verification: " + otp + " (local development).";
    }

    var verifyButton = event.target.closest("[data-verify-otp]");
    if (verifyButton) {
      var verifyPanel = verifyButton.closest(".forgot-access-panel");
      var entered = verifyPanel.querySelector(".forgot-otp-input").value.trim();
      verifyPanel.querySelector(".inline-status").textContent =
        entered === verifyPanel.dataset.otp
          ? "OTP verified. Please contact the office to complete password reset."
          : "Invalid OTP. Please check and try again.";
    }
  });
}

function setupPortalActionWidgets() {
  document.querySelectorAll("[data-export-report]").forEach(function (button) {
    button.addEventListener("click", function () {
      var type = button.dataset.exportReport || "report";
      showInlineMessage(button.closest(".form-card"), type.charAt(0).toUpperCase() + type.slice(1) + " report export prepared for office download.");
    });
  });

  var noticeForm = document.querySelector("#noticePublishForm");
  if (noticeForm) {
    noticeForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = document.querySelector("#noticeTitleInput");
      var status = document.querySelector("#noticePublishStatus");
      if (status) status.textContent = "Notice queued for publishing: " + (input ? input.value : "");
      noticeForm.reset();
    });
  }
}

function setupPaymentPage() {
  var form = document.querySelector("#paymentForm");
  if (!form) return;

  var params = new URLSearchParams(window.location.search);
  var studentInput = document.querySelector("#paymentStudentId");
  var amountInput = document.querySelector("#paymentAmount");
  var status = document.querySelector("#paymentStatus");
  if (studentInput && params.get("student")) studentInput.value = params.get("student");
  if (amountInput && params.get("amount")) amountInput.value = params.get("amount");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var studentId = studentInput ? studentInput.value.trim() : "";
    if (!studentId) {
      if (status) status.textContent = "Please enter a valid student ID.";
      return;
    }
    markFeePaid(studentId);
    if (status) {
      status.textContent = "Payment confirmed. Hall ticket access is now enabled for " + studentId + ".";
    }
    setTimeout(function () {
      window.location.href = "login.html";
    }, 900);
  });
}

function openPlacementModal(detail) {
  var modal = document.querySelector("#placementModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "placementModal";
    modal.className = "placement-modal";
    modal.innerHTML =
      '<div class="placement-modal-card" role="dialog" aria-modal="true" aria-labelledby="placementModalTitle">' +
      '<div class="placement-modal-head">' +
      '<div><span id="placementModalLabel"></span><h3 id="placementModalTitle"></h3></div>' +
      '<button class="placement-modal-close" type="button" aria-label="Close placement details">&times;</button>' +
      "</div>" +
      '<div class="placement-modal-body">' +
      '<div class="placement-detail-grid" id="placementDetailGrid"></div>' +
      '<h4>Preparation details</h4>' +
      '<ul id="placementDetailList"></ul>' +
      "</div>" +
      "</div>";
    document.body.appendChild(modal);

    modal.querySelector(".placement-modal-close").addEventListener("click", closePlacementModal);
    modal.addEventListener("click", function (event) {
      if (event.target === modal) closePlacementModal();
    });
  }

  modal.querySelector("#placementModalLabel").textContent = detail.label;
  modal.querySelector("#placementModalTitle").textContent = detail.package;
  modal.querySelector("#placementDetailGrid").innerHTML =
    '<div><span>Student</span><strong>' + detail.student + "</strong></div>" +
    '<div><span>Branch</span><strong>' + detail.branch + "</strong></div>" +
    '<div><span>Recruiter</span><strong>' + detail.recruiter + "</strong></div>" +
    '<div><span>Role</span><strong>' + detail.role + "</strong></div>";
  modal.querySelector("#placementDetailList").innerHTML = detail.details.map(function (item) {
    return "<li>" + item + "</li>";
  }).join("");

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  modal.querySelector(".placement-modal-close").focus();
}

function closePlacementModal() {
  var modal = document.querySelector("#placementModal");
  if (modal) modal.classList.remove("open");
  document.body.style.overflow = "";
}

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape") closePlacementModal();
});

function setupHomeEnhancements() {
  var themeToggle = document.querySelector("#themeToggle");
  var savedTheme = localStorage.getItem("jgs-theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
  }

  if (themeToggle) {
    themeToggle.textContent = document.body.classList.contains("dark-theme") ? "Light Theme" : "Dark Theme";
    themeToggle.addEventListener("click", function () {
      document.body.classList.toggle("dark-theme");
      var isDark = document.body.classList.contains("dark-theme");
      localStorage.setItem("jgs-theme", isDark ? "dark" : "light");
      themeToggle.textContent = isDark ? "Light Theme" : "Dark Theme";
    });
  }

  var testimonials = Array.prototype.slice.call(document.querySelectorAll(".testimonial-card"));
  if (testimonials.length) {
    var activeIndex = 0;
    window.setInterval(function () {
      testimonials[activeIndex].classList.remove("active");
      activeIndex = (activeIndex + 1) % testimonials.length;
      testimonials[activeIndex].classList.add("active");
    }, 3800);
  }
}

function setupCourseFinder() {
  var select = document.querySelector("#courseFinder");
  var button = document.querySelector("#courseFinderButton");
  if (!select || !button) return;

  button.addEventListener("click", function () {
    if (!select.value) {
      select.focus();
      return;
    }
    window.location.href = select.value;
  });
}

function setupApplicationStatusTracker() {
  var button = document.querySelector("#checkApplicationStatus");
  var input = document.querySelector("#applicationStatusInput");
  var result = document.querySelector("#applicationTrackResult");
  if (!button || !input || !result) return;

  button.addEventListener("click", function () {
    var value = input.value.trim();
    if (!value) {
      result.textContent = "Please enter your application number or registered mobile number.";
      input.focus();
      return;
    }

    result.textContent = "Checking application status...";
    apiRequest("/api/applications/status?query=" + encodeURIComponent(value))
      .then(function (record) {
        result.textContent = "Status: " + record.status + ". " + record.stage + " Application No: " + record.applicationNo;
      })
      .catch(function () {
        result.textContent = "Status: Submitted. Admissions office will verify details and contact the applicant for counseling and document review.";
      });
  });
}

var scrollTopButton = document.createElement("button");
scrollTopButton.className = "scroll-top";
scrollTopButton.type = "button";
scrollTopButton.textContent = "^";
scrollTopButton.setAttribute("aria-label", "Scroll to top");
document.body.appendChild(scrollTopButton);

scrollTopButton.addEventListener("click", function () {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

window.addEventListener("scroll", function () {
  if (window.scrollY > 420) {
    scrollTopButton.classList.add("show");
  } else {
    scrollTopButton.classList.remove("show");
  }
});

var contactForm = document.querySelector("#contactForm");

if (contactForm) {
  contactForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var status = document.querySelector("#contactStatus");
    var payload = Object.fromEntries(new FormData(contactForm).entries());
    if (status) status.textContent = "Submitting your message...";
    apiRequest("/api/contact", {
      method: "POST",
      body: JSON.stringify(payload)
    }).then(function () {
      if (status) status.textContent = "Thank you. Your message has been recorded for the admissions team.";
      contactForm.reset();
    }).catch(function () {
      if (status) status.textContent = "Thank you. Your message has been recorded for the admissions team.";
      contactForm.reset();
    });
  });
}

var studentProfiles = {
  "22A31A0501": {
    name: "Arjun Srinivas Reddy",
    id: "22A31A0501",
    branch: "AI&ML",
    quota: "Free Seat",
    attendance: 82,
    cgpa: "8.4",
    portfolio: "github.com/arjun-jgs",
    placement: "Placed",
    placementInfo: "Infosys - 4.5 LPA",
    feeDue: "Rs. 12,500",
    feeDate: "Next due: 30 June 2026",
    annualFee: "Rs. 65,000",
    scholarship: "Rs. 35,000",
    paid: "Rs. 17,500",
    balance: "Rs. 12,500",
    scholarshipText: "Applied under Free Seat quota",
    feeRows: [
      ["Semester I", "Rs. 32,500", "Rs. 32,500", "Rs. 0", "Paid"],
      ["Semester II", "Rs. 32,500", "Rs. 20,000", "Rs. 12,500", "Pending"],
      ["Exam Fee", "Rs. 2,500", "Rs. 2,500", "Rs. 0", "Paid"]
    ],
    payments: [
      ["Receipt #JGS-FEE-1001", "Rs. 32,500 paid on 12 Aug 2025 - Online Payment"],
      ["Receipt #JGS-FEE-1184", "Rs. 20,000 paid on 10 Jan 2026 - UPI"],
      ["Exam Fee Receipt", "Rs. 2,500 paid on 28 Mar 2026 - Cash Counter"]
    ],
    academics: [
      ["School", "JGS Public School", "SSC / Grade X", "2020", "92%", "Mathematics, Science, English", "Passed with distinction"],
      ["College / Intermediate", "JGS Intermediate College", "MPC", "2022", "91%", "Maths, Physics, Chemistry", "JEE foundation completed"],
      ["Semester I", "JGS Group of Institutes", "AI&ML", "2022", "8.1 CGPA", "Engineering Maths I, Programming, Physics", "All subjects cleared"],
      ["Semester II", "JGS Group of Institutes", "AI&ML", "2023", "8.2 CGPA", "Engineering Maths II, Data Structures Basics, Chemistry", "Foundation labs completed"],
      ["Semester III", "JGS Group of Institutes", "AI&ML", "2023", "8.3 CGPA", "Data Structures, OOP, Digital Logic", "Mini assignment completed"],
      ["Semester IV", "JGS Group of Institutes", "AI&ML", "2024", "8.4 CGPA", "DBMS, Operating Systems, Computer Networks", "Core subjects cleared"],
      ["Semester V", "JGS Group of Institutes", "AI&ML", "2025", "8.6 CGPA", "Machine Learning, Cloud, Data Analytics", "Internship eligible"],
      ["Semester VI", "JGS Group of Institutes", "AI&ML", "2026", "In Progress", "Deep Learning, NLP, Project Work", "Attendance above requirement"]
    ],
    placements: [
      ["Infosys", "Offer Letter", "Selected"],
      ["TCS", "Technical Interview", "Completed"],
      ["Wipro", "Aptitude Test", "Scheduled"]
    ]
  },
  "22JGS-CS-001": {
    name: "Divya S Kumar",
    id: "22JGS-CS-001",
    branch: "CS",
    quota: "Management",
    attendance: 91,
    cgpa: "9.1",
    portfolio: "github.com/divya-cs",
    placement: "Interview",
    placementInfo: "TCS - Technical round",
    feeDue: "Rs. 22,000",
    feeDate: "Next due: 15 July 2026",
    annualFee: "Rs. 85,000",
    scholarship: "Rs. 0",
    paid: "Rs. 63,000",
    balance: "Rs. 22,000",
    scholarshipText: "Management quota student",
    feeRows: [
      ["Semester I", "Rs. 42,500", "Rs. 42,500", "Rs. 0", "Paid"],
      ["Semester II", "Rs. 42,500", "Rs. 20,500", "Rs. 22,000", "Pending"],
      ["Exam Fee", "Rs. 2,500", "Rs. 2,500", "Rs. 0", "Paid"]
    ],
    payments: [
      ["Receipt #JGS-FEE-2104", "Rs. 42,500 paid on 18 Aug 2025 - Card"],
      ["Receipt #JGS-FEE-2291", "Rs. 20,500 paid on 14 Jan 2026 - UPI"],
      ["Exam Fee Receipt", "Rs. 2,500 paid on 29 Mar 2026 - Online Payment"]
    ],
    academics: [
      ["School", "JGS Public School", "SSC / Grade X", "2020", "95%", "Mathematics, Science, English", "School topper list"],
      ["College / Intermediate", "JGS Intermediate College", "MPC", "2022", "94%", "Maths, Physics, Chemistry", "Coding foundation completed"],
      ["Semester I", "JGS Group of Institutes", "CS", "2022", "8.8 CGPA", "Engineering Maths I, Programming, Physics", "All subjects cleared"],
      ["Semester II", "JGS Group of Institutes", "CS", "2023", "8.9 CGPA", "Engineering Maths II, Data Structures Basics, Chemistry", "Foundation labs completed"],
      ["Semester III", "JGS Group of Institutes", "CS", "2023", "9.0 CGPA", "Data Structures, OOP, Digital Logic", "Web project started"],
      ["Semester IV", "JGS Group of Institutes", "CS", "2024", "9.1 CGPA", "DBMS, Operating Systems, Computer Networks", "Core subjects cleared"],
      ["Semester V", "JGS Group of Institutes", "CS", "2025", "9.2 CGPA", "Cloud, Cybersecurity, Software Engineering", "Hackathon participant"],
      ["Semester VI", "JGS Group of Institutes", "CS", "2026", "In Progress", "Full Stack, Cybersecurity, Project Work", "Placement training active"]
    ],
    placements: [
      ["TCS", "Technical Interview", "In Progress"],
      ["Wipro", "Aptitude Test", "Selected"],
      ["Cognizant", "Application", "Submitted"]
    ]
  },
  "22JGS-ECE-001": {
    name: "Rahul P Naik",
    id: "22JGS-ECE-001",
    branch: "ECE",
    quota: "Free Seat",
    attendance: 76,
    cgpa: "7.8",
    portfolio: "github.com/rahul-ece",
    placement: "Training",
    placementInfo: "Embedded systems training",
    feeDue: "Rs. 8,000",
    feeDate: "Next due: 20 June 2026",
    annualFee: "Rs. 65,000",
    scholarship: "Rs. 35,000",
    paid: "Rs. 22,000",
    balance: "Rs. 8,000",
    scholarshipText: "Applied under Free Seat quota",
    feeRows: [
      ["Semester I", "Rs. 32,500", "Rs. 32,500", "Rs. 0", "Paid"],
      ["Semester II", "Rs. 32,500", "Rs. 24,500", "Rs. 8,000", "Pending"],
      ["Exam Fee", "Rs. 2,500", "Rs. 2,500", "Rs. 0", "Paid"]
    ],
    payments: [
      ["Receipt #JGS-FEE-3011", "Rs. 32,500 paid on 20 Aug 2025 - Online Payment"],
      ["Receipt #JGS-FEE-3162", "Rs. 24,500 paid on 18 Jan 2026 - Cash Counter"],
      ["Exam Fee Receipt", "Rs. 2,500 paid on 01 Apr 2026 - UPI"]
    ],
    academics: [
      ["School", "JGS Public School", "SSC / Grade X", "2020", "88%", "Mathematics, Science, English", "Passed with first class"],
      ["College / Intermediate", "JGS Intermediate College", "MPC", "2022", "86%", "Maths, Physics, Chemistry", "Electronics interest group"],
      ["Semester I", "JGS Group of Institutes", "ECE", "2022", "7.5 CGPA", "Engineering Maths I, Programming, Physics", "All subjects cleared"],
      ["Semester II", "JGS Group of Institutes", "ECE", "2023", "7.6 CGPA", "Engineering Maths II, Basic Electronics, Chemistry", "Foundation labs completed"],
      ["Semester III", "JGS Group of Institutes", "ECE", "2023", "7.8 CGPA", "Digital Electronics, Signals, Networks", "Circuit lab completed"],
      ["Semester IV", "JGS Group of Institutes", "ECE", "2024", "7.9 CGPA", "Analog Circuits, Microprocessors, Communication Systems", "Core subjects cleared"],
      ["Semester V", "JGS Group of Institutes", "ECE", "2025", "8.0 CGPA", "Embedded Systems, Communication, VLSI", "Hardware mini project"],
      ["Semester VI", "JGS Group of Institutes", "ECE", "2026", "In Progress", "IoT, Microprocessors, Project Work", "Placement training active"]
    ],
    placements: [
      ["HCL", "Training", "Active"],
      ["Tech Mahindra", "Aptitude Test", "Scheduled"],
      ["Infosys", "Application", "Submitted"]
    ]
  }
};

var activeStudentProfile = studentProfiles["22A31A0501"];

var portalCredentials = {
  admin: {
    "JGS-ADM-001": atob("YWRtaW4xMjM=")
  },
  teacher: {},
  student: {},
  parent: {
    "JGS-PAR-001": "parent123"
  }
};

var studentOverrideStorageKey = "jgsStudentRecordOverrides";

function readStudentOverrides() {
  try {
    var raw = localStorage.getItem(studentOverrideStorageKey);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function writeStudentOverrides(overrides) {
  try {
    localStorage.setItem(studentOverrideStorageKey, JSON.stringify(overrides));
  } catch (error) {
    console.warn("Student record could not be saved in this browser.", error);
  }
}

function saveStudentOverride(studentId, updates) {
  var id = (studentId || "").trim();
  if (!id) return null;
  var overrides = readStudentOverrides();
  var previous = overrides[id] || {};
  overrides[id] = Object.assign({}, previous, updates, {
    id: id,
    updatedAt: new Date().toISOString()
  });
  writeStudentOverrides(overrides);
  refreshAdminDataViews();
  return overrides[id];
}

function getStudentOverride(studentId) {
  return readStudentOverrides()[(studentId || "").trim()] || null;
}

function defaultBacklogRecords(subject, stage) {
  var safeSubject = subject || "Engineering Mathematics";
  var safeStage = stage || "Remedial + Supplementary";
  return [
    [safeSubject, "Backlog", safeStage + " assigned by admin. Attend remedial classes and submit practice work.", "20 Jun 2026"],
    ["Supplementary Application", "Pending", "Complete exam form and supplementary fee verification.", "25 Jun 2026"],
    ["Hall Ticket", "Blocked", "Hall ticket opens after fee, attendance, and teacher readiness confirmation.", "01 Jul 2026"]
  ];
}

function applyStudentOverride(profile) {
  if (!profile || !profile.id) return profile;
  var override = getStudentOverride(profile.id);
  if (!override) return profile;
  var merged = JSON.parse(JSON.stringify(profile));
  Object.keys(override).forEach(function (key) {
    if (key !== "updatedAt") merged[key] = override[key];
  });
  if (merged.status === "Backlog" && (!merged.backlogs || !merged.backlogs.length)) {
    merged.backlogs = defaultBacklogRecords(merged.failedSubject);
  }
  return merged;
}

function createStudentProfileFromOverride(studentId, override) {
  if (!override) return null;
  var seedId = /^22JGS-/i.test(studentId) ? studentId : "22JGS-AIML-001";
  var profile = createGeneratedStudentProfile(seedId);
  if (!profile) return null;
  profile.id = studentId;
  profile.name = override.name || profile.name;
  profile.branch = override.branch || profile.branch;
  profile.quota = override.quota || profile.quota || "Free Seat";
  return applyStudentOverride(profile);
}

var teacherProfiles = {
  "JGS-FAC-204": {
    name: "Dr. Anitha Rao",
    id: "JGS-FAC-204",
    subject: "Machine Learning",
    shortSubject: "ML",
    branch: "AI&ML",
    semester: "Semester V",
    role: "Associate Professor",
    email: "anitha.rao@jgsinstitutes.edu.in",
    classStrength: 32,
    attendance: "86%",
    gradesPending: 12,
    academicBackground: [
      ["Ph.D", "Artificial Intelligence", "IIT Hyderabad", "2018"],
      ["M.Tech", "Computer Science", "JNTU Hyderabad", "2012"],
      ["Experience", "12 years teaching and research", "Machine Learning, NLP, Deep Learning", "Active"]
    ]
  },
  "JGS-FAC-118": {
    name: "Mr. Ravi Kumar",
    id: "JGS-FAC-118",
    subject: "Data Structures",
    shortSubject: "DS",
    branch: "CS",
    semester: "Semester III",
    role: "Assistant Professor",
    email: "ravi.kumar@jgsinstitutes.edu.in",
    classStrength: 33,
    attendance: "89%",
    gradesPending: 9,
    academicBackground: [
      ["M.Tech", "Computer Science", "Osmania University", "2015"],
      ["B.Tech", "CSE", "JNTU Hyderabad", "2012"],
      ["Experience", "9 years teaching", "Data Structures, Algorithms, Java", "Active"]
    ]
  },
  "JGS-FAC-166": {
    name: "Ms. Priya Menon",
    id: "JGS-FAC-166",
    subject: "Digital Electronics",
    shortSubject: "DE",
    branch: "ECE",
    semester: "Semester IV",
    role: "Assistant Professor",
    email: "priya.menon@jgsinstitutes.edu.in",
    classStrength: 30,
    attendance: "84%",
    gradesPending: 14,
    academicBackground: [
      ["M.Tech", "VLSI Design", "Anna University", "2016"],
      ["B.Tech", "ECE", "JNTU Hyderabad", "2013"],
      ["Experience", "8 years teaching", "Digital Electronics, Embedded Systems", "Active"]
    ]
  },
  "JGS-FAC-142": {
    name: "Mr. Suresh Naik",
    id: "JGS-FAC-142",
    subject: "Surveying",
    shortSubject: "SV",
    branch: "Civil",
    semester: "Semester III",
    role: "Lecturer",
    email: "suresh.naik@jgsinstitutes.edu.in",
    classStrength: 29,
    attendance: "81%",
    gradesPending: 7,
    academicBackground: [
      ["M.Tech", "Structural Engineering", "JNTU Hyderabad", "2017"],
      ["B.Tech", "Civil Engineering", "JNTU Hyderabad", "2014"],
      ["Experience", "7 years teaching", "Surveying, CAD Lab", "Active"]
    ]
  },
  "JGS-FAC-188": {
    name: "Dr. Naveen Kumar",
    id: "JGS-FAC-188",
    subject: "Thermodynamics",
    shortSubject: "TD",
    branch: "Mechanical",
    semester: "Semester IV",
    role: "Professor",
    email: "naveen.kumar@jgsinstitutes.edu.in",
    classStrength: 29,
    attendance: "83%",
    gradesPending: 11,
    academicBackground: [
      ["Ph.D", "Thermal Engineering", "NIT Warangal", "2016"],
      ["M.Tech", "Mechanical Engineering", "JNTU Hyderabad", "2010"],
      ["Experience", "14 years teaching", "Thermodynamics, Fluid Mechanics", "Active"]
    ]
  },
  "JGS-FAC-175": {
    name: "Ms. Kavya Reddy",
    id: "JGS-FAC-175",
    subject: "Power Systems",
    shortSubject: "PS",
    branch: "EEE",
    semester: "Semester V",
    role: "Assistant Professor",
    email: "kavya.reddy@jgsinstitutes.edu.in",
    classStrength: 29,
    attendance: "87%",
    gradesPending: 6,
    academicBackground: [
      ["M.Tech", "Power Systems", "JNTU Hyderabad", "2015"],
      ["B.Tech", "EEE", "JNTU Hyderabad", "2012"],
      ["Experience", "9 years teaching", "Power Systems, Electrical Machines", "Active"]
    ]
  }
};

var activeTeacherProfile = teacherProfiles["JGS-FAC-204"];

function getTeacherProfile(loginId) {
  var id = (loginId || "").trim();
  return teacherProfiles[id] || createGeneratedTeacherProfile(id);
}

function createGeneratedTeacherProfile(teacherId) {
  var match = /^JGS-FAC-(\d{3})$/i.exec(teacherId || "");
  if (!match) return null;

  var number = parseInt(match[1], 10);
  if (number < 1 || number > 42) return null;

  var generatedTeachers = generateTeacherRows();
  var row = generatedTeachers[number - 1];
  if (!row) return null;

  var subjectShort = row[2]
    .split(/\s+/)
    .map(function (word) { return word.charAt(0); })
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return {
    name: row[1],
    id: row[0],
    subject: row[2],
    shortSubject: subjectShort,
    branch: row[3],
    semester: number % 2 === 0 ? "Semester VI" : "Semester V",
    role: number % 5 === 0 ? "Professor" : "Assistant Professor",
    email: row[1].toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.+|\.+$/g, "") + "@jgsinstitutes.edu.in",
    classStrength: branchStudentCounts[row[3]] || 42,
    attendance: (80 + (number % 12)) + "%",
    gradesPending: 5 + (number % 10),
    academicBackground: [
      [number % 5 === 0 ? "Ph.D" : "M.Tech", row[2], "JNTU Hyderabad", String(2010 + (number % 9))],
      ["B.Tech", row[3] + " Engineering", "JGS / JNTU Affiliated College", String(2006 + (number % 8))],
      ["Experience", (6 + (number % 12)) + " years teaching", row[2] + " and branch labs", "Active"]
    ]
  };
}

function makeTeacherRoster(profile) {
  var branchCodes = {
    "AI&ML": "AIML",
    CS: "CS",
    ECE: "ECE",
    Civil: "CIV",
    Mechanical: "MECH",
    EEE: "EEE"
  };
  var firstNames = ["Arjun", "Divya", "Kiran", "Meena", "Rahul"];
  var lastNames = ["Reddy", "Kumar", "Naik", "Varma", "K"];
  var code = branchCodes[profile.branch] || "GEN";

  return firstNames.map(function (name, index) {
    var number = String(index + 1).padStart(3, "0");
    var attendance = 78 + ((index + profile.classStrength) % 15);
    var grade = ["A", "A+", "B", "A", "B+"][index];
    var resultStatus = index === 2 ? "Remedial" : "Clear";
    return [
      "22JGS-" + code + "-" + number,
      name + " " + lastNames[index],
      profile.branch,
      attendance + "%",
      grade,
      resultStatus
    ];
  });
}

function renderTeacherDashboard(profile) {
  if (!document.querySelector("#teacherNameDisplay")) return;

  document.querySelector("#teacherNameDisplay").textContent = profile.name;
  document.querySelector("#teacherMetaDisplay").textContent =
    "Teacher ID: " + profile.id + " - Assigned Subject: " + profile.subject + " - Branch: " + profile.branch;
  document.querySelector("#teacherDepartmentDisplay").textContent = "Department: " + profile.branch;
  document.querySelector("#teacherClassDisplay").textContent = "Class: " + profile.semester;
  document.querySelector("#teacherClassStrength").textContent = profile.classStrength;
  document.querySelector("#teacherClassStrengthText").textContent = profile.branch + " " + profile.semester;
  document.querySelector("#teacherAvgAttendance").textContent = profile.attendance;
  document.querySelector("#teacherGradesPending").textContent = profile.gradesPending;
  document.querySelector("#teacherSubjectShort").textContent = profile.shortSubject;
  document.querySelector("#teacherSubjectFull").textContent = profile.subject;
  document.querySelector("#teacherDetailName").textContent = profile.name;
  document.querySelector("#teacherDetailId").textContent = profile.id;
  document.querySelector("#teacherDetailSubject").textContent = profile.subject;
  document.querySelector("#teacherDetailBranch").textContent = profile.branch;
  document.querySelector("#teacherDetailRole").textContent = profile.role;
  document.querySelector("#teacherDetailEmail").textContent = profile.email;
  var academicTarget = document.querySelector("#teacherAcademicBackground");
  if (academicTarget) {
    academicTarget.innerHTML = (profile.academicBackground || []).map(function (item) {
      return "<div><span>" + escapeHTML(item[0]) + "</span><strong>" + escapeHTML(item[1]) + "</strong><p>" + escapeHTML(item[2]) + " - " + escapeHTML(item[3]) + "</p></div>";
    }).join("");
  }
  document.querySelector("#teacherRosterRows").innerHTML = makeTeacherRoster(profile).map(function (row) {
    return "<tr>" + row.map(function (cell, index) {
      if (index === 5) {
        var statusClass = cell === "Clear" ? "success" : "warning";
        return '<td><span class="status-pill ' + statusClass + '">' + escapeHTML(cell) + "</span></td>";
      }
      return "<td>" + escapeHTML(cell) + "</td>";
    }).join("") + "</tr>";
  }).join("");

  renderTeacherVisuals(profile);
}

function getStudentProfile(loginId) {
  var key = (loginId || "").trim();
  if (studentProfiles[key]) return applyStudentOverride(studentProfiles[key]);
  var generated = createGeneratedStudentProfile(key);
  if (generated) return applyStudentOverride(generated);
  return createStudentProfileFromOverride(key, getStudentOverride(key));
}

function isValidGeneratedStudentId(studentId) {
  var match = /^22JGS-(AIML|CS|CIV|ECE|MECH|EEE)-(\d{3})$/i.exec(studentId || "");
  if (!match) return false;

  var branchLimits = {
    AIML: 32,
    CS: 33,
    CIV: 29,
    ECE: 30,
    MECH: 29,
    EEE: 29
  };
  var branchCode = match[1].toUpperCase();
  var number = parseInt(match[2], 10);
  return number >= 1 && number <= branchLimits[branchCode];
}

function validatePortalLogin(portal, loginId, password) {
  var id = (loginId || "").trim();
  var pw = password || "";

  if (portal === "student" && isValidGeneratedStudentId(id)) {
    return pw === atob("c3R1ZGVudDEyMw==");
  }

  if (portal === "student" && getStudentOverride(id)) {
    return pw === atob("c3R1ZGVudDEyMw==");
  }

  if (portal === "teacher" && isValidGeneratedTeacherId(id)) {
    return pw === atob("dGVhY2hlcjEyMw==");
  }

  return !!(portalCredentials[portal] && portalCredentials[portal][id] === pw);
}

function isValidGeneratedTeacherId(teacherId) {
  var match = /^JGS-FAC-(\d{3})$/i.exec(teacherId || "");
  if (!match) return false;
  var number = parseInt(match[1], 10);
  return number >= 1 && number <= 42;
}

function createGeneratedStudentProfile(studentId) {
  var match = /^22JGS-(AIML|CS|CIV|ECE|MECH|EEE)-(\d{3})$/i.exec(studentId || "");
  if (!match) return null;

  var branchMap = {
    AIML: "AI&ML",
    CS: "CS",
    CIV: "Civil",
    ECE: "ECE",
    MECH: "Mechanical",
    EEE: "EEE"
  };
  var branch = branchMap[match[1].toUpperCase()];
  var number = parseInt(match[2], 10);
  var firstNames = ["Arjun", "Divya", "Kiran", "Meena", "Rahul", "Sravya", "Nikhil", "Lahari", "Vamsi", "Sameera"];
  var lastNames = ["Reddy", "Kumar", "Naik", "Varma", "K", "S", "P", "M", "T", "N"];
  var quota = number % 2 === 0 ? "Free Seat" : "Management";
  var annualFee = quota === "Free Seat" ? "Rs. 65,000" : "Rs. 85,000";
  var scholarship = quota === "Free Seat" ? "Rs. 35,000" : "Rs. 0";
  var paid = quota === "Free Seat" ? "Rs. 20,000" : "Rs. 55,000";
  var balance = quota === "Free Seat" ? "Rs. 10,000" : "Rs. 30,000";
  var attendance = 74 + (number % 20);
  var cgpa = (7.2 + (number % 20) / 10).toFixed(1);
  var hasBacklog = number % 11 === 0;
  var backlogSubjectMap = {
    "AI&ML": "Engineering Mathematics III",
    CS: "Data Structures",
    Civil: "Strength of Materials",
    ECE: "Digital Electronics",
    Mechanical: "Thermodynamics",
    EEE: "Electrical Machines"
  };
  var backlogSubject = backlogSubjectMap[branch] || "Engineering Mathematics";
  var backlogRecords = hasBacklog ? [
    [backlogSubject, "Backlog", "Attend remedial class, submit practice test, and apply for supplementary exam", "20 Jun 2026"],
    ["Supplementary Application", "Pending", "Pay exam fee and verify eligibility with exam cell", "25 Jun 2026"],
    ["Hall Ticket", "Blocked", "Enabled only after supplementary fee and teacher verification", "01 Jul 2026"]
  ] : [
    ["Current Semester", "Clear", "No failed subjects. Continue attendance, fee, and internal assessment tracking.", "Active"]
  ];

  return {
    name: firstNames[(number - 1) % firstNames.length] + " " + lastNames[(number - 1) % lastNames.length],
    id: studentId,
    branch: branch,
    quota: quota,
    attendance: attendance,
    cgpa: cgpa,
    portfolio: "github.com/" + studentId.toLowerCase(),
    placement: number % 3 === 0 ? "Placed" : "Training",
    placementInfo: number % 3 === 0 ? "Campus offer - 4.2 LPA" : "Placement training active",
    feeDue: balance,
    feeDate: "Next due: 30 June 2026",
    annualFee: annualFee,
    scholarship: scholarship,
    paid: paid,
    balance: balance,
    scholarshipText: quota === "Free Seat" ? "Applied under Free Seat quota" : "Management quota student",
    feeRows: [
      ["Semester I", "Rs. 32,500", "Rs. 32,500", "Rs. 0", "Paid"],
      ["Semester II", "Rs. 32,500", paid, balance, balance === "Rs. 0" ? "Paid" : "Pending"],
      ["Exam Fee", "Rs. 2,500", "Rs. 2,500", "Rs. 0", "Paid"]
    ],
    payments: [
      ["Receipt #JGS-" + match[2] + "-01", "Semester I fee paid on 12 Aug 2025 - Online Payment"],
      ["Receipt #JGS-" + match[2] + "-02", paid + " paid on 10 Jan 2026 - UPI"],
      ["Exam Fee Receipt", "Rs. 2,500 paid on 28 Mar 2026 - Cash Counter"]
    ],
    academics: [
      ["School", "JGS Public School", "SSC / Grade X", "2020", (82 + (number % 14)) + "%", "Mathematics, Science, English", "Passed"],
      ["College / Intermediate", "JGS Intermediate College", "MPC", "2022", (80 + (number % 15)) + "%", "Maths, Physics, Chemistry", "Board exams completed"],
      ["Semester I", "JGS Group of Institutes", branch, "2022", (7.1 + (number % 8) / 10).toFixed(1) + " CGPA", "Engineering Maths I, Programming, Physics", "All subjects reviewed"],
      ["Semester II", "JGS Group of Institutes", branch, "2023", (7.2 + (number % 8) / 10).toFixed(1) + " CGPA", "Engineering Maths II, Chemistry, Workshop", "Foundation labs completed"],
      ["Semester III", "JGS Group of Institutes", branch, "2023", (7.4 + (number % 8) / 10).toFixed(1) + " CGPA", "Core branch subjects, Labs, DBMS basics", "Mini project submitted"],
      ["Semester IV", "JGS Group of Institutes", branch, "2024", (7.5 + (number % 8) / 10).toFixed(1) + " CGPA", "Advanced branch subjects, Operating Systems, Networks", "Core subjects cleared"],
      ["Semester V", "JGS Group of Institutes", branch, "2025", hasBacklog ? "Fail - 1 Backlog" : (7.6 + (number % 8) / 10).toFixed(1) + " CGPA", "Advanced branch subjects, Projects", hasBacklog ? "Remedial support assigned for " + backlogSubject : "Internship preparation"],
      ["Semester VI", "JGS Group of Institutes", branch, "2026", hasBacklog ? "Conditional Registration" : "In Progress", "Project Work, Electives, Lab Practice", hasBacklog ? "Supplementary clearance required with mentor tracking" : "Academic monitoring active"]
    ],
    backlogs: backlogRecords,
    placements: [
      ["Infosys", "Aptitude Test", number % 2 === 0 ? "Completed" : "Scheduled"],
      ["TCS", "Technical Interview", number % 3 === 0 ? "Selected" : "In Progress"],
      ["Wipro", "Application", "Submitted"]
    ]
  };
}

function renderStudentDashboard(profile) {
  if (!document.querySelector("#studentNameDisplay")) return;

  profile.academics = normalizeStudentAcademics(profile);
  if (isFeeClearedByPayment(profile.id)) {
    profile.balance = "Rs. 0";
    profile.feeDue = "Rs. 0";
    profile.feeDate = "Fee cleared for hall ticket verification";
    profile.feeRows = (profile.feeRows || []).map(function (row) {
      if (row[4] === "Pending") {
        return [row[0], row[1], row[1], "Rs. 0", "Paid"];
      }
      return row;
    });
  }
  document.querySelector("#studentNameDisplay").textContent = profile.name;
  document.querySelector("#studentMetaDisplay").textContent =
    "B.Tech " + profile.branch + " - Student ID: " + profile.id + " - Admission Quota: " + profile.quota;
  document.querySelector("#studentAttendance").textContent = profile.attendance + "%";
  document.querySelector("#studentAttendanceBar").style.width = profile.attendance + "%";
  document.querySelector("#studentCgpa").textContent = profile.cgpa;
  renderStudentBacklogStatus(profile);
  document.querySelector("#studentFeeDue").textContent = profile.feeDue;
  document.querySelector("#studentFeeDate").textContent = profile.feeDate;
  document.querySelector("#studentPortfolio").textContent = profile.portfolio;
  document.querySelector("#studentPortfolio").setAttribute("href", "https://" + profile.portfolio);
  document.querySelector("#studentPortfolio").setAttribute("target", "_blank");
  document.querySelector("#studentPortfolio").setAttribute("rel", "noopener");
  document.querySelector("#studentPlacement").textContent = profile.placement;
  document.querySelector("#studentPlacementInfo").textContent = profile.placementInfo;
  document.querySelector("#studentQuotaBadge").textContent = profile.quota + " Quota";
  document.querySelector("#studentAnnualFee").textContent = profile.annualFee;
  document.querySelector("#studentScholarship").textContent = profile.scholarship;
  document.querySelector("#studentScholarshipText").textContent = profile.scholarshipText;
  document.querySelector("#studentPaidAmount").textContent = profile.paid;
  document.querySelector("#studentBalanceDue").textContent = profile.balance;

  renderStudentIdentity(profile);

  renderStudentSemesterRows(profile, "all");

  document.querySelector("#studentPaymentHistory").innerHTML = profile.payments.map(function (item) {
    return "<div><strong>" + escapeHTML(item[0]) + "</strong><p>" + escapeHTML(item[1]) + "</p></div>";
  }).join("");

  renderStudentAcademicRows(profile, "all");

  document.querySelector("#studentPlacementRows").innerHTML = profile.placements.map(function (row) {
    return "<tr>" + row.map(function (cell) {
      return "<td>" + escapeHTML(cell) + "</td>";
    }).join("") + "</tr>";
  }).join("");

  renderStudentVisuals(profile);
  renderStudentYearCalendar(profile);
  renderStudentTimetable(profile);
  updateStudentFeeGate(profile);
}

function renderStudentIdentity(profile) {
  var nameTarget = document.querySelector("#studentCollegeName");
  if (!nameTarget) return;
  document.querySelector("#studentCollegeName").textContent = profile.name;
  document.querySelector("#studentCollegeId").textContent = profile.id;
  document.querySelector("#studentCollegeBranch").textContent = profile.branch + " / " + profile.quota;
  document.querySelector("#studentCollegeValidity").textContent = "May 2027";
  var bloodTarget = document.querySelector("#studentBloodGroup");
  var emergencyTarget = document.querySelector("#studentEmergencyContact");
  if (bloodTarget) bloodTarget.textContent = profile.bloodGroup || "B+";
  if (emergencyTarget) emergencyTarget.textContent = profile.emergencyContact || "+91 22 4890 1100";
  var status = document.querySelector("#studentCollegeStatus");
  if (status) status.textContent = profile.status || "Active";
  setupStudentPhotoInput();
}

function setupStudentPhotoInput() {
  var input = document.querySelector("#studentPhotoInput");
  var preview = document.querySelector("#studentPhotoPreview");
  if (!input || !preview || input.dataset.ready === "true") return;
  input.dataset.ready = "true";

  try {
    var savedPhoto = localStorage.getItem("jgsStudentPhoto." + activeStudentProfile.id);
    if (savedPhoto) {
      preview.src = savedPhoto;
      preview.classList.add("show");
    }
  } catch (error) {
    // Photo preview stays optional when storage is blocked.
  }

  input.addEventListener("change", function () {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.addEventListener("load", function () {
      preview.src = reader.result;
      preview.classList.add("show");
      try {
        localStorage.setItem("jgsStudentPhoto." + activeStudentProfile.id, reader.result);
      } catch (error) {
        console.warn("Student photo could not be stored.", error);
      }
    });
    reader.readAsDataURL(file);
  });
}

function renderStudentBacklogStatus(profile) {
  var backlogs = profile.backlogs || [["Current Semester", "Clear", "No failed subjects. Continue attendance, fee, and internal assessment tracking.", "Active"]];
  var failedRows = backlogs.filter(function (row) {
    return row[1] !== "Clear";
  });
  var countTarget = document.querySelector("#studentBacklogCount");
  var summaryTarget = document.querySelector("#studentBacklogSummary");
  var rowsTarget = document.querySelector("#studentBacklogRows");

  if (countTarget) countTarget.textContent = failedRows.length;
  if (summaryTarget) {
    summaryTarget.textContent = failedRows.length
      ? failedRows.length + " failed subject/action pending"
      : "No failed subjects";
  }
  if (!rowsTarget) return;

  rowsTarget.innerHTML = backlogs.map(function (row) {
    var statusClass = row[1] === "Clear" ? "success" : row[1] === "Blocked" ? "info" : "warning";
    return "<tr>" +
      "<td>" + escapeHTML(row[0]) + "</td>" +
      '<td><span class="status-pill ' + statusClass + '">' + escapeHTML(row[1]) + "</span></td>" +
      "<td>" + escapeHTML(row[2]) + "</td>" +
      "<td>" + escapeHTML(row[3]) + "</td>" +
      "</tr>";
  }).join("");
}

function parseRupeeAmount(value) {
  var text = String(value || "").replace(/Rs\.|,/g, "").trim();
  return parseInt(text, 10) || 0;
}

function setDonut(selector, value, label) {
  var chart = document.querySelector(selector);
  if (!chart) return;
  var safeValue = Math.max(0, Math.min(100, Math.round(value)));
  chart.style.setProperty("--value", safeValue);
  var text = chart.querySelector("span");
  if (text) text.textContent = label || safeValue + "%";
}

function renderMiniTrend(selector, values, labels) {
  var target = document.querySelector(selector);
  if (!target) return;
  var max = Math.max.apply(null, values.concat([1]));
  target.innerHTML = values.map(function (value, index) {
    var height = Math.max(12, Math.round((value / max) * 100));
    return '<div class="trend-bar" style="--h:' + height + '%"><span>' + escapeHTML(String(value)) + '</span><em>' + escapeHTML(labels[index] || "") + '</em></div>';
  }).join("");
}

function renderStudentVisuals(profile) {
  var paid = parseRupeeAmount(profile.paid);
  var annual = parseRupeeAmount(profile.annualFee);
  var feePercent = annual ? Math.round((paid / annual) * 100) : 0;
  var semesterRecords = normalizeStudentAcademics(profile).filter(function (item) {
    return /^Semester /.test(item[0]);
  });
  var cgpaValues = semesterRecords
    .map(function (item) {
      var match = String(item[4]).match(/(\d+(?:\.\d+)?)/);
      return match ? Math.round(parseFloat(match[1]) * (String(item[4]).indexOf("CGPA") > -1 ? 10 : 1)) : null;
    })
    .filter(function (value) { return value !== null; })
    .slice(-5);
  var cgpaLabels = semesterRecords.map(function (item) {
    return item[0].replace("Semester ", "Sem ");
  }).slice(-5);

  setDonut("#studentAttendanceDonut", profile.attendance, profile.attendance + "%");
  setDonut("#studentFeeDonut", feePercent, feePercent + "%");
  if (document.querySelector("#studentAttendanceChartLabel")) {
    document.querySelector("#studentAttendanceChartLabel").textContent = profile.attendance + "%";
  }
  if (document.querySelector("#studentFeeProgressLabel")) {
    document.querySelector("#studentFeeProgressLabel").textContent = feePercent + "%";
  }
  if (document.querySelector("#studentCgpaChartLabel")) {
    document.querySelector("#studentCgpaChartLabel").textContent = profile.cgpa + " CGPA";
  }
  renderMiniTrend("#studentCgpaTrend", cgpaValues.length ? cgpaValues : [72, 78, 82, 84], cgpaLabels.length ? cgpaLabels : ["Sem I", "Sem II", "Sem III", "Now"]);
}

function normalizeStudentAcademics(profile) {
  var existing = profile.academics || [];
  var intro = existing.filter(function (item) {
    return item[0] === "School" || item[0] === "College / Intermediate";
  });
  var hasSemesterRecords = existing.some(function (item) {
    return /^Semester /.test(item[0]);
  });
  if (hasSemesterRecords) return existing;

  var branch = profile.branch || "AI&ML";
  var currentCgpa = parseFloat(profile.cgpa) || 8.0;
  var semData = [
    ["Semester I", "2022", Math.max(6.8, currentCgpa - 0.6).toFixed(1), "Engineering Mathematics I, Programming for Problem Solving, Engineering Physics, Basic Electrical Engineering", "Foundation semester completed"],
    ["Semester II", "2023", Math.max(6.9, currentCgpa - 0.4).toFixed(1), "Engineering Mathematics II, Data Structures Basics, Engineering Chemistry, Workshop Practice", "Core basics strengthened"],
    ["Semester III", "2023", Math.max(7.0, currentCgpa - 0.2).toFixed(1), "Data Structures, Digital Logic, OOP, Discrete Mathematics, Branch Lab I", "Mini assignment and lab records completed"],
    ["Semester IV", "2024", currentCgpa.toFixed(1), "DBMS, Operating Systems, Computer Networks, Probability and Statistics, Branch Lab II", "Internal assessments cleared"],
    ["Semester V", "2025", Math.min(10, currentCgpa + 0.1).toFixed(1), "Machine Learning, Cloud Computing, Software Engineering, Open Elective, Project-I", "Internship and placement preparation started"],
    ["Semester VI", "2026", "In Progress", "Deep Learning, NLP, Data Analytics, Major Project, Professional Elective", "Current semester attendance and fee monitored"]
  ];

  return intro.concat(semData.map(function (item) {
    return [item[0], "JGS Group of Institutes", branch, item[1], item[2] === "In Progress" ? "In Progress" : item[2] + " CGPA", item[3], item[4]];
  }));
}

function renderTeacherVisuals(profile) {
  var capacityPercent = Math.round((profile.classStrength / 50) * 100);
  var attendanceBase = parseInt(profile.attendance, 10) || 82;
  var attendanceValues = [attendanceBase - 4, attendanceBase + 1, attendanceBase - 2, attendanceBase + 3, attendanceBase].map(function (value) {
    return Math.max(0, Math.min(100, value));
  });
  var gradeCounts = { "A+": 0, A: 0, "B+": 0, B: 0 };
  makeTeacherRoster(profile).forEach(function (row) {
    var grade = row[4];
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
  });

  setDonut("#teacherCapacityDonut", capacityPercent, capacityPercent + "%");
  if (document.querySelector("#teacherCapacityChartLabel")) {
    document.querySelector("#teacherCapacityChartLabel").textContent = capacityPercent + "%";
  }
  if (document.querySelector("#teacherWeeklyAverage")) {
    document.querySelector("#teacherWeeklyAverage").textContent = profile.attendance;
  }
  renderMiniTrend("#teacherAttendanceTrend", attendanceValues, ["Mon", "Tue", "Wed", "Thu", "Fri"]);

  var totalGrades = Object.keys(gradeCounts).reduce(function (total, grade) {
    return total + gradeCounts[grade];
  }, 0) || 1;
  var stack = document.querySelector("#teacherGradeStack");
  if (stack) {
    stack.innerHTML = Object.keys(gradeCounts).map(function (grade) {
      var percent = Math.round((gradeCounts[grade] / totalGrades) * 100);
      return '<div class="grade-row"><span>' + escapeHTML(grade) + '</span><div><i style="width:' + percent + '%"></i></div><em>' + gradeCounts[grade] + '</em></div>';
    }).join("");
  }
}

function renderStudentAcademicRows(profile, filter) {
  var rows = filter === "all"
    ? profile.academics
    : profile.academics.filter(function (item) { return item[0] === filter; });

  var target = document.querySelector("#studentAcademicHistory");
  if (!target) return;

  target.innerHTML = rows.map(function (item) {
    return (
      '<div class="academic-history-item">' +
      "<strong>" + escapeHTML(item[0]) + "</strong>" +
      "<p><b>Institution:</b> " + escapeHTML(item[1]) + "</p>" +
      "<p><b>Course / Stream:</b> " + escapeHTML(item[2]) + "</p>" +
      "<p><b>Year:</b> " + escapeHTML(item[3]) + "</p>" +
      "<p><b>Result:</b> " + escapeHTML(item[4]) + "</p>" +
      "<p><b>Key Subjects:</b> " + escapeHTML(item[5]) + "</p>" +
      "<p><b>Remarks:</b> " + escapeHTML(item[6]) + "</p>" +
      "</div>"
    );
  }).join("");
}

function renderStudentSemesterRows(profile, semester) {
  var rows = semester === "all"
    ? profile.feeRows
    : profile.feeRows.filter(function (row) { return row[0] === semester; });

  var target = document.querySelector("#studentFeeRows");
  if (!target) return;

  target.innerHTML = rows.map(function (row) {
    return "<tr>" + row.map(function (cell) {
      return "<td>" + escapeHTML(cell) + "</td>";
    }).join("") + "</tr>";
  }).join("");
}

function getStudentTimetable(profile) {
  var branchSubjects = {
    "AI&ML": ["Deep Learning", "NLP Lab", "Data Analytics", "Cloud Computing", "Major Project"],
    CS: ["Operating Systems", "DBMS Lab", "Computer Networks", "Web Technologies", "Software Engineering"],
    Civil: ["Structural Analysis", "Surveying Lab", "Concrete Technology", "CAD Lab", "Transportation"],
    ECE: ["VLSI Design", "Embedded Systems Lab", "Signals", "IoT Workshop", "Communication Systems"],
    Mechanical: ["Thermodynamics", "CAD/CAM Lab", "Fluid Mechanics", "Machine Design", "Workshop Practice"],
    EEE: ["Power Systems", "Electrical Machines Lab", "Control Systems", "Power Electronics", "Renewable Energy"]
  };
  var subjects = branchSubjects[profile.branch] || branchSubjects["AI&ML"];
  var faculty = profile.branch === "AI&ML" ? "Dr. Anitha Rao" : "Department Faculty";
  return [
    ["Monday", "09:30 - 10:30", subjects[0], faculty + " / Room 301"],
    ["Tuesday", "10:45 - 12:15", subjects[1], "Lab Faculty / Lab 2"],
    ["Wednesday", "11:30 - 12:30", subjects[2], "Senior Faculty / Room 304"],
    ["Thursday", "02:00 - 03:30", subjects[3], "Industry Mentor / Smart Lab"],
    ["Friday", "01:15 - 03:15", subjects[4], "Project Panel / Innovation Lab"]
  ];
}

function renderStudentTimetable(profile) {
  var target = document.querySelector("#studentTimetableRows");
  if (!target) return;
  target.innerHTML = getStudentTimetable(profile).map(function (row) {
    return "<tr>" + row.map(function (cell) {
      return "<td>" + escapeHTML(cell) + "</td>";
    }).join("") + "</tr>";
  }).join("");
}

function updateStudentFeeGate(profile) {
  var warning = document.querySelector("#studentAttendanceWarning");
  if (warning) {
    warning.textContent = profile.attendance < 75 ? "Attendance is below hall-ticket eligibility." : "Attendance is above eligibility level.";
  }

  var hallStatus = document.querySelector("#studentHallTicketStatus");
  var hallTicketButtons = document.querySelectorAll('[data-student-service="hallticket"]');
  if (hasPendingFee(profile)) {
    if (hallStatus) hallStatus.textContent = "Blocked until remaining fee is paid";
    hallTicketButtons.forEach(function (button) {
      button.classList.add("danger");
      button.textContent = "Pay Fee to Unlock Hall Ticket";
    });
    showFeeDuePrompt(profile);
  } else {
    if (hallStatus) hallStatus.textContent = "Eligible for hall ticket download";
    hallTicketButtons.forEach(function (button) {
      button.classList.remove("danger");
      button.textContent = "Download Hall Ticket";
    });
  }
}

function showFeeDuePrompt(profile) {
  if (!profile || !hasPendingFee(profile) || document.querySelector(".fee-due-modal")) return;
  var modal = document.createElement("div");
  modal.className = "fee-due-modal";
  modal.innerHTML =
    '<div class="fee-due-card" role="dialog" aria-modal="true" aria-labelledby="feeDueTitle">' +
    '<button class="placement-modal-close" type="button" aria-label="Close fee reminder">&times;</button>' +
    '<p class="eyebrow">Fee Pending</p>' +
    '<h2 id="feeDueTitle">Pay remaining fee to access hall ticket.</h2>' +
    '<p><strong>Student:</strong> ' + escapeHTML(profile.name) + '</p>' +
    '<p><strong>Balance Due:</strong> ' + escapeHTML(profile.balance) + '</p>' +
    '<div class="action-pill-row"><a class="btn" href="payment.html?student=' + encodeURIComponent(profile.id) + '&amount=' + encodeURIComponent(profile.balance) + '">Pay Remaining Fee</a><button class="btn secondary" type="button" data-close-fee-modal>Later</button></div>' +
    '</div>';
  document.body.appendChild(modal);
  modal.querySelector(".placement-modal-close").addEventListener("click", function () { modal.remove(); });
  modal.querySelector("[data-close-fee-modal]").addEventListener("click", function () { modal.remove(); });
}

var portalSessionPrefix = "jgsPortalSession.";

function getPortalSessionKey(portal) {
  return portalSessionPrefix + portal;
}

function savePortalSession(portal, loginId) {
  try {
    localStorage.setItem(getPortalSessionKey(portal), JSON.stringify({
      portal: portal,
      loginId: loginId,
      savedAt: new Date().toISOString()
    }));
  } catch (error) {
    // Some browsers block localStorage in strict privacy modes; login still works for the current page.
  }
}

function readPortalSession(portal) {
  try {
    var raw = localStorage.getItem(getPortalSessionKey(portal));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function clearPortalSession(portal) {
  try {
    localStorage.removeItem(getPortalSessionKey(portal));
  } catch (error) {
    // Nothing else is needed; this is only a browser persistence cleanup.
  }
}

function openPortalDashboard(portal, loginId, restoreMode) {
  var status = document.querySelector("#loginStatus");
  var authSection = document.querySelector("#authSection");
  var dashboardSection = document.querySelector("#dashboardSection");

  if (portal === "student") {
    activeStudentProfile = getStudentProfile(loginId);
    if (!activeStudentProfile) {
      if (status) status.textContent = "Student record was not found.";
      return false;
    }
    renderStudentDashboard(activeStudentProfile);
  }

  if (portal === "teacher") {
    activeTeacherProfile = getTeacherProfile(loginId);
    if (!activeTeacherProfile) {
      if (status) status.textContent = "Teacher record was not found.";
      return false;
    }
    renderTeacherDashboard(activeTeacherProfile);
  }

  renderUnifiedDashboard(portal, loginId);

  if (authSection && dashboardSection) {
    authSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    if (!restoreMode) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (status) {
    status.textContent = restoreMode ? "Saved session restored." : "Login successful. Opening " + portal + " dashboard.";
  }
  return true;
}

function renderUnifiedDashboard(portal, loginId) {
  var roleTarget = document.querySelector("#unifiedPortalRole");
  if (!roleTarget) return;

  var roleLabels = {
    admin: ["Admin Portal", "JGS administration dashboard", "Institution management, admissions, notices, contacts, fees, and reports.", "AD", "Principal Office", "Admin services unlocked"],
    teacher: ["Teacher Portal", "Faculty academic dashboard", "Class roster, attendance, marks, remedial plans, and parent communication.", "TC", "Faculty Workspace", "Teacher services unlocked"],
    student: ["Student Portal", "Student academic dashboard", "Attendance, fees, timetable, hall ticket, academics, and placement readiness.", "ST", "Student Services", "Student services unlocked"],
    parent: ["Parent Portal", "Guardian progress dashboard", "Attendance summary, fee reminders, notices, and office communication.", "PR", "Parent Services", "Parent services unlocked"]
  };
  var copy = roleLabels[portal] || ["Portal Dashboard", "JGS Group dashboard", "Your account was verified successfully.", "JG", "Secure Access", "Portal session unlocked"];

  document.querySelector("#unifiedPortalRole").textContent = copy[0];
  document.querySelector("#unifiedPortalTitle").textContent = copy[1];
  document.querySelector("#unifiedPortalMessage").textContent = copy[2];
  document.querySelector("#unifiedPortalIcon").textContent = copy[3];
  document.querySelector("#unifiedPortalCardTitle").textContent = copy[4];
  document.querySelector("#unifiedPortalCardText").textContent = copy[5];
  document.querySelector("#unifiedPortalId").textContent = "Registered ID: " + loginId;
}

function restorePortalSession() {
  if (!loginForm) return;
  var portal = loginForm.dataset.portal || "unified";
  var session = readPortalSession(portal);
  if (!session || !session.loginId) return;

  var loginInput = document.querySelector("#loginId");
  if (loginInput) loginInput.value = session.loginId;

  var opened = openPortalDashboard(portal, session.loginId, true);
  if (!opened) {
    clearPortalSession(portal);
  }
}

var loginForm = document.querySelector("#loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var status = document.querySelector("#loginStatus");
    var portal = loginForm.dataset.portal || "unified";
    var loginId = document.querySelector("#loginId") ? document.querySelector("#loginId").value : "";
    var password = document.querySelector("#password") ? document.querySelector("#password").value : "";

    if (isLoginLocked(portal, loginId)) {
      if (status) status.textContent = "Account temporarily locked after multiple wrong attempts. Try again after 5 minutes or contact help desk.";
      return;
    }

    if (status) status.textContent = "Verifying secure access...";
    loginForm.classList.add("is-loading");

    apiRequest("/api/login", {
      method: "POST",
      body: JSON.stringify({ loginId: loginId, password: password })
    }).then(function (response) {
      var actualPortal = response.portal || portal;
      loginForm.classList.remove("is-loading");
      recordSuccessfulLogin(actualPortal, loginId);
      savePortalSession(actualPortal, loginId);
      if (status) status.textContent = "Login successful. Opening " + actualPortal + " dashboard.";
      setTimeout(function () {
        openPortalDashboard(actualPortal, loginId, false);
      }, 450);
    }).catch(function () {
      loginForm.classList.remove("is-loading");
      var attempt = recordFailedLogin(portal, loginId);
      if (status) {
        status.textContent = attempt.lockUntil
          ? "Account temporarily locked after 3 wrong attempts. Contact help desk or try later."
          : "Invalid ID or password. Attempt " + attempt.count + " of 3.";
      }
    });
  });
}

var logoutButtons = document.querySelectorAll("[data-logout]");

logoutButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    var authSection = document.querySelector("#authSection");
    var dashboardSection = document.querySelector("#dashboardSection");
    var portal = loginForm ? loginForm.dataset.portal || "portal" : "portal";
    clearPortalSession(portal);
    if (dashboardSection) dashboardSection.classList.add("hidden");
    if (authSection) authSection.classList.remove("hidden");
    if (loginForm) loginForm.reset();
    var status = document.querySelector("#loginStatus");
    if (status) status.textContent = "Logged out. Please login again to continue.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

var portalActionForms = document.querySelectorAll(".portal-action-form");

portalActionForms.forEach(function (form) {
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    form.reset();
    showInlineMessage(form, "Record saved successfully.");
  });
});

var recordActionButtons = document.querySelectorAll("[data-record-action]");

recordActionButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    handleAdminRecordAction(button);
  });
});

function handleAdminRecordAction(button) {
  var action = button.dataset.recordAction || button.textContent.trim().toLowerCase();
  var panel = document.querySelector("#adminActionPanel") || button.closest(".form-card");
  var studentId = button.dataset.studentId || "";
  var studentName = button.dataset.studentName || "Selected student";
  var branch = button.dataset.studentBranch || "AI&ML";
  var subject = button.dataset.subject || "Academic Subject";
  var status = button.dataset.studentStatus || "Active";

  if (!panel) return;

  if (action === "add-student") {
    panel.innerHTML =
      '<div class="dashboard-header"><div><p class="eyebrow">Student Management</p><h2>Add New Student</h2></div><span class="badge">New Record</span></div>' +
      '<form class="portal-action-form live-admin-form">' +
      '<div class="form-row"><div class="field"><label>Student Name</label><input name="studentName" type="text" placeholder="Enter full name" required></div>' +
      '<div class="field"><label>Student ID</label><input name="studentId" type="text" placeholder="22JGS-AIML-034" required></div></div>' +
      '<div class="form-row"><div class="field"><label>Branch</label><select name="branch" required><option>AI&ML</option><option>CS</option><option>Civil</option><option>ECE</option><option>Mechanical</option><option>EEE</option></select></div>' +
      '<div class="field"><label>Status</label><select name="status" required><option>Active</option><option>Pending</option><option>Backlog</option><option>Discontinued</option></select></div></div>' +
      '<div class="field"><label>Admission Quota</label><select name="quota" required><option>Free Seat</option><option>Management</option></select></div>' +
      '<div class="field"><label>Failed Subject / Academic Note</label><input name="failedSubject" type="text" placeholder="Required only if status is Backlog"></div>' +
      '<button class="btn" type="submit">Save Student Record</button>' +
      '</form>';
    bindLiveAdminForms(panel, "Student record saved successfully.", function (form) {
      var id = form.elements.studentId.value.trim();
      var savedStatus = form.elements.status.value;
      var failedSubject = form.elements.failedSubject.value.trim();
      var updates = {
        name: form.elements.studentName.value.trim(),
        branch: form.elements.branch.value,
        status: savedStatus,
        quota: form.elements.quota.value
      };
      if (savedStatus === "Backlog") {
        updates.failedSubject = failedSubject || "Engineering Mathematics";
        updates.backlogs = defaultBacklogRecords(updates.failedSubject, "Backlog marked during admission/admin update");
      }
      saveStudentOverride(id, {
        name: updates.name,
        branch: updates.branch,
        status: updates.status,
        quota: updates.quota,
        failedSubject: updates.failedSubject,
        backlogs: updates.backlogs
      });
    });
  } else if (action === "assign-faculty") {
    var assignForm = document.querySelector(".portal-grid.two .form-card:nth-child(2)");
    if (assignForm) assignForm.scrollIntoView({ behavior: "smooth", block: "start" });
    showInlineMessage(panel, "Teacher assignment form opened below.");
  } else if (action === "review-applications") {
    renderAdminList("applications");
    adminListPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    showInlineMessage(panel, "Application list opened for verification.");
  } else if (action === "edit-student") {
    var existingOverride = getStudentOverride(studentId) || {};
    var currentName = existingOverride.name || studentName;
    var currentBranch = existingOverride.branch || branch;
    var currentStatus = existingOverride.status || status;
    var currentQuota = existingOverride.quota || "Free Seat";
    panel.innerHTML =
      '<div class="dashboard-header"><div><p class="eyebrow">Student Management</p><h2>Edit Student Record</h2></div><span class="badge">' + escapeHTML(branch) + '</span></div>' +
      '<form class="portal-action-form live-admin-form">' +
      '<div class="form-row"><div class="field"><label>Student Name</label><input name="studentName" type="text" value="' + escapeHTML(currentName) + '" required></div>' +
      '<div class="field"><label>Student ID</label><input name="studentId" type="text" value="' + escapeHTML(studentId || "22JGS-AIML-001") + '" required></div></div>' +
      '<div class="form-row"><div class="field"><label>Branch</label><select name="branch" required><option>AI&ML</option><option>CS</option><option>Civil</option><option>ECE</option><option>Mechanical</option><option>EEE</option></select></div>' +
      '<div class="field"><label>Status</label><select name="status" required><option>Active</option><option>Pending</option><option>Backlog</option><option>Discontinued</option></select></div></div>' +
      '<div class="field"><label>Admission Quota</label><select name="quota" required><option>Free Seat</option><option>Management</option></select></div>' +
      '<div class="field"><label>Failed Subject / Academic Note</label><input name="failedSubject" type="text" value="' + escapeHTML(existingOverride.failedSubject || "") + '" placeholder="Example: Engineering Mathematics III"></div>' +
      '<button class="btn" type="submit">Update Student</button>' +
      '</form>';
    panel.querySelector('[name="branch"]').value = currentBranch;
    panel.querySelector('[name="status"]').value = currentStatus;
    panel.querySelector('[name="quota"]').value = currentQuota;
    bindLiveAdminForms(panel, currentName + " updated successfully.", function (form) {
      var id = form.elements.studentId.value.trim();
      var newStatus = form.elements.status.value;
      var updates = {
        name: form.elements.studentName.value.trim(),
        branch: form.elements.branch.value,
        status: newStatus,
        quota: form.elements.quota.value
      };
      if (newStatus === "Backlog") {
        updates.failedSubject = form.elements.failedSubject.value.trim() || existingOverride.failedSubject || subject || "Engineering Mathematics";
        updates.backlogs = existingOverride.backlogs || defaultBacklogRecords(updates.failedSubject, "Backlog marked by admin");
      }
      saveStudentOverride(id, updates);
    });
  } else if (action === "delete-student") {
    panel.innerHTML =
      '<div class="dashboard-header"><div><p class="eyebrow">Student Management</p><h2>Delete Student Record</h2></div><span class="badge">Confirmation</span></div>' +
      '<div class="service-box">' +
      '<p><strong>Student:</strong> ' + escapeHTML(studentName) + '</p>' +
      '<p><strong>Branch:</strong> ' + escapeHTML(branch) + '</p>' +
      '<p>This will mark the record as inactive for admin review. It does not permanently remove academic history.</p>' +
      '<button class="mini-btn danger" type="button" data-confirm-delete>Confirm Delete</button>' +
      '</div>';
    panel.querySelector("[data-confirm-delete]").addEventListener("click", function () {
      saveStudentOverride(studentId || studentName, {
        name: studentName,
        branch: branch,
        status: "Inactive"
      });
      showInlineMessage(panel, studentName + " marked inactive successfully.");
    });
  } else if (action === "assign-test") {
    panel.innerHTML = buildBacklogAdminForm("Assign Remedial Test", studentId, studentName, branch, subject, "Schedule Test");
    bindLiveAdminForms(panel, "Remedial test assigned successfully.", function (form) {
      saveStudentOverride(form.elements.studentId.value.trim(), {
        name: form.elements.studentName.value.trim(),
        branch: branch,
        status: "Backlog",
        failedSubject: form.elements.failedSubject.value.trim(),
        backlogs: defaultBacklogRecords(form.elements.failedSubject.value.trim(), "Remedial test scheduled")
      });
    });
  } else if (action === "verify-fee") {
    panel.innerHTML = buildBacklogAdminForm("Verify Supplementary Fee", studentId, studentName, branch, subject, "Verify Fee");
    bindLiveAdminForms(panel, "Supplementary fee verified successfully.", function (form) {
      saveStudentOverride(form.elements.studentId.value.trim(), {
        name: form.elements.studentName.value.trim(),
        branch: branch,
        status: "Backlog",
        failedSubject: form.elements.failedSubject.value.trim(),
        backlogs: defaultBacklogRecords(form.elements.failedSubject.value.trim(), "Supplementary fee verified")
      });
    });
  } else if (action === "update-record") {
    panel.innerHTML = buildBacklogAdminForm("Update Cleared Backlog", studentId, studentName, branch, subject, "Update Academic Record");
    bindLiveAdminForms(panel, "Academic record updated successfully.", function (form) {
      saveStudentOverride(form.elements.studentId.value.trim(), {
        name: form.elements.studentName.value.trim(),
        branch: branch,
        status: "Active",
        failedSubject: form.elements.failedSubject.value.trim(),
        backlogs: [["Current Semester", "Clear", "Backlog cleared and academic record updated by admin.", "Updated"]]
      });
    });
  } else {
    showInlineMessage(panel, "Action completed successfully.");
  }

  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function buildBacklogAdminForm(title, studentId, studentName, branch, subject, buttonText) {
  return '<div class="dashboard-header"><div><p class="eyebrow">Backlog Workflow</p><h2>' + escapeHTML(title) + '</h2></div><span class="badge">' + escapeHTML(branch) + '</span></div>' +
    '<form class="portal-action-form live-admin-form">' +
    '<div class="form-row"><div class="field"><label>Student</label><input name="studentName" type="text" value="' + escapeHTML(studentName) + '" required></div>' +
    '<div class="field"><label>Student ID</label><input name="studentId" type="text" value="' + escapeHTML(studentId || "") + '" placeholder="22JGS-AIML-011" required></div></div>' +
    '<div class="field"><label>Failed Subject</label><input name="failedSubject" type="text" value="' + escapeHTML(subject) + '" required></div>' +
    '<div class="field"><label>Admin Remark</label><textarea name="remark" placeholder="Enter action note for exam cell / faculty mentor" required></textarea></div>' +
    '<button class="btn" type="submit">' + escapeHTML(buttonText) + '</button>' +
    '</form>';
}

function bindLiveAdminForms(scope, message, onSubmit) {
  scope.querySelectorAll(".live-admin-form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (typeof onSubmit === "function") onSubmit(form);
      showInlineMessage(scope, message);
    });
  });
}

function setupTeacherAttendanceCalendar() {
  var calendar = document.querySelector("#teacherCalendar");
  var panel = document.querySelector("#attendanceFormPanel");
  var dateInput = document.querySelector("#attendanceDate");
  var formTitle = document.querySelector("#attendanceFormTitle");
  if (!calendar || !panel || !dateInput) return;

  var buttons = calendar.querySelectorAll("[data-attendance-date]");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      buttons.forEach(function (item) {
        item.classList.remove("active");
      });
      button.classList.add("active");

      var selectedDate = button.dataset.attendanceDate;
      dateInput.value = selectedDate;
      if (formTitle) {
        formTitle.textContent = "Attendance Tracking - " + selectedDate;
      }
      panel.classList.add("open");
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

function setupStudentCalendar() {
  var calendar = document.querySelector("#studentCalendar");
  var detail = document.querySelector("#studentCalendarDetail");
  if (!calendar || !detail) return;

  var buttons = calendar.querySelectorAll("[data-calendar-title]");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      buttons.forEach(function (item) {
        item.classList.remove("active");
      });
      button.classList.add("active");
      detail.innerHTML =
        "<strong>" + escapeHTML(button.dataset.calendarTitle) + "</strong>" +
        "<p>" + escapeHTML(button.dataset.calendarDetail) + "</p>";
      detail.classList.add("active");
    });
  });
}

function attachStudentCalendarEvents() {
  var calendar = document.querySelector("#studentCalendar");
  var detail = document.querySelector("#studentCalendarDetail");
  if (!calendar || !detail) return;

  var buttons = calendar.querySelectorAll("[data-calendar-title]");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      buttons.forEach(function (item) {
        item.classList.remove("active");
      });
      button.classList.add("active");
      detail.innerHTML =
        "<strong>" + escapeHTML(button.dataset.calendarTitle) + "</strong>" +
        "<p>" + escapeHTML(button.dataset.calendarDetail) + "</p>";
      detail.classList.add("active");
    });
  });
}

function renderStudentYearCalendar(profile) {
  var calendar = document.querySelector("#studentCalendar");
  var detail = document.querySelector("#studentCalendarDetail");
  if (!calendar || !detail) return;

  var branch = profile.branch || "AI&ML";
  var events = [
    ["Jun", "10", "Orientation", "Academic year opens with department orientation, ID verification, and mentor mapping for " + branch + "."],
    ["Jul", "08", "Sem VI Classes", "Regular timetable begins. Attendance tracking starts from the first working day."],
    ["Aug", "12", "Internal 1", "First internal assessment week for core subjects and lab records."],
    ["Sep", "05", "Tech Fest", "Project expo, coding events, robotics demos, and student club showcases."],
    ["Oct", "18", "Mid Review", "Major project review with faculty panel and progress documentation."],
    ["Nov", "22", "Semester Exams", "End-semester practicals and theory examination window."],
    ["Dec", "12", "Results", "Semester result publication and academic counselling for improvement plans."],
    ["Jan", "10", "Placement Prep", "Resume reviews, mock interviews, aptitude training, and coding practice."],
    ["Feb", "14", "Hackathon", "Inter-branch innovation sprint with industry mentors and solution review."],
    ["Mar", "20", "Hall Ticket", "Hall ticket download opens after attendance and fee verification."],
    ["Apr", "16", "Project Viva", "Final project demonstration, viva, and documentation submission."],
    ["May", "25", "Campus Drives", "Placement drives, internship interviews, and final offer documentation."]
  ];

  calendar.innerHTML = events.map(function (event) {
    return '<button type="button" style="--motion-order:' + (events.indexOf(event) % 10) + '" data-calendar-title="' + escapeHTML(event[2]) + '" data-calendar-detail="' + escapeHTML(event[3]) + '">' +
      '<span>' + escapeHTML(event[0]) + '</span><strong>' + escapeHTML(event[1]) + '</strong><em>' + escapeHTML(event[2]) + '</em></button>';
  }).join("");

  detail.innerHTML =
    "<strong>One-year academic calendar for " + escapeHTML(branch) + ".</strong>" +
    "<p>Select any month card to view the event details for the 2026-27 academic year.</p>";
  detail.classList.remove("active");
  attachStudentCalendarEvents();
}

function downloadTextFile(filename, content, type) {
  var blob = new Blob([content], { type: type || "text/plain" });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildHallTicketHTML(profile) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>JGS Hall Ticket</title>' +
    '<style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a} .ticket{border:2px solid #05112a;padding:28px;max-width:760px;margin:auto} h1{margin:0;color:#05112a} table{width:100%;border-collapse:collapse;margin-top:22px}td{border:1px solid #d8e2ef;padding:12px}.seal{margin-top:28px;color:#8a6400;font-weight:700}</style>' +
    '</head><body><div class="ticket"><h1>JGS Group of Institutes</h1><p>Semester VI Examination Hall Ticket - Academic Year 2026-27</p>' +
    '<table>' +
    '<tr><td>Student Name</td><td>' + escapeHTML(profile.name) + '</td></tr>' +
    '<tr><td>Student ID</td><td>' + escapeHTML(profile.id) + '</td></tr>' +
    '<tr><td>Branch</td><td>' + escapeHTML(profile.branch) + '</td></tr>' +
    '<tr><td>Admission Quota</td><td>' + escapeHTML(profile.quota) + '</td></tr>' +
    '<tr><td>Attendance</td><td>' + escapeHTML(String(profile.attendance)) + '%</td></tr>' +
    '<tr><td>Fee Status</td><td>Balance Due: ' + escapeHTML(profile.balance) + '</td></tr>' +
    '<tr><td>Exam Centre</td><td>JGS Group of Institutes, Mumbai Campus</td></tr>' +
    '</table><p class="seal">Controller of Examinations - JGS Group of Institutes</p></div></body></html>';
}

function buildStudentIdHTML(profile) {
  var photo = "";
  try {
    photo = localStorage.getItem("jgsStudentPhoto." + profile.id) || "";
  } catch (error) {
    photo = "";
  }
  var photoMarkup = photo
    ? '<img class="photo" src="' + photo + '" alt="Student photo">'
    : '<div class="photo empty">PHOTO</div>';

  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>JGS Student ID</title>' +
    '<style>body{font-family:Arial,sans-serif;background:#edf3f8;padding:32px;color:#07172f}.id{width:420px;margin:auto;border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 24px 70px rgba(7,23,47,.22);border:1px solid #d8e2ef}.top{background:#07172f;color:#fff;padding:22px}.top h1{margin:0;font-size:22px}.top p{margin:4px 0 0;color:#f7d66a;font-weight:700}.body{padding:24px}.identity-grid{display:grid;grid-template-columns:132px 1fr;gap:18px}.photo{width:118px;height:138px;object-fit:cover;border-radius:16px;border:3px solid #f7d66a;background:#eef4fb;display:flex;align-items:center;justify-content:center;font-weight:800;color:#52647d;margin-bottom:12px}.qr{width:92px;height:92px;border:8px solid #07172f;background:repeating-linear-gradient(45deg,#07172f 0 6px,#fff 6px 12px);border-radius:10px}.row{border-top:1px solid #d8e2ef;padding:10px 0}.row span{display:block;font-size:11px;text-transform:uppercase;color:#52647d;font-weight:800;letter-spacing:.08em}.row strong{display:block;margin-top:4px;font-size:17px}.seal{margin-top:16px;display:flex;justify-content:space-between;gap:16px}.seal div{flex:1;border-top:1px solid #07172f;padding-top:8px;font-size:11px;font-weight:800;text-transform:uppercase}.foot{padding:16px 24px;background:#fff9e8;color:#8a6400;font-weight:800}</style>' +
    '</head><body><div class="id"><div class="top"><h1>JGS Group of Institutes</h1><p>Official Student Identity Card</p></div><div class="body"><div class="identity-grid"><div>' +
    photoMarkup +
    '<div class="qr" aria-label="Student QR code visual"></div></div><div>' +
    '<div class="row"><span>Name</span><strong>' + escapeHTML(profile.name) + '</strong></div>' +
    '<div class="row"><span>College ID</span><strong>' + escapeHTML(profile.id) + '</strong></div>' +
    '<div class="row"><span>Branch</span><strong>' + escapeHTML(profile.branch) + '</strong></div>' +
    '<div class="row"><span>Admission Quota</span><strong>' + escapeHTML(profile.quota) + '</strong></div>' +
    '<div class="row"><span>Blood Group</span><strong>' + escapeHTML(profile.bloodGroup || "B+") + '</strong></div>' +
    '<div class="row"><span>Emergency Contact</span><strong>' + escapeHTML(profile.emergencyContact || "+91 22 4890 1100") + '</strong></div>' +
    '<div class="row"><span>Valid Through</span><strong>May 2027</strong></div>' +
    '</div></div><div class="seal"><div>Campus Seal</div><div>Principal Signature</div></div></div><div class="foot">Authorized by JGS Group of Institutes</div></div></body></html>';
}

var studentRegistrationForm = document.querySelector("#studentRegistrationForm");

if (studentRegistrationForm) {
  studentRegistrationForm.addEventListener("submit", function (event) {
    event.preventDefault();
    document.querySelector("#studentRegistrationStatus").textContent =
      "Registration submitted successfully. Your student account request is recorded.";
    studentRegistrationForm.reset();
  });
}

var studentServiceButtons = document.querySelectorAll("[data-student-service]");

studentServiceButtons.forEach(function (button) {
  button.addEventListener("click", function () {
    renderStudentService(button.dataset.studentService);
  });
});

var semesterSelect = document.querySelector("#semesterSelect");

if (semesterSelect) {
  semesterSelect.addEventListener("change", function () {
    renderStudentSemesterRows(activeStudentProfile, semesterSelect.value);
  });
}

var academicSelect = document.querySelector("#academicSelect");

if (academicSelect) {
  academicSelect.addEventListener("change", function () {
    renderStudentAcademicRows(activeStudentProfile, academicSelect.value);
  });
}

function renderStudentService(service) {
  var panel = document.querySelector("#studentServicePanel");
  if (!panel) return;

  if (service === "idcard") {
    downloadTextFile(
      "JGS-Student-ID-" + activeStudentProfile.id + ".html",
      buildStudentIdHTML(activeStudentProfile),
      "text/html"
    );
    panel.innerHTML =
      '<div class="service-box">' +
      '<h3>Student ID Downloaded</h3>' +
      '<p><strong>Name:</strong> ' + escapeHTML(activeStudentProfile.name) + '</p>' +
      '<p><strong>College ID:</strong> ' + escapeHTML(activeStudentProfile.id) + '</p>' +
      '<p>Your official student ID card has been generated with the current details and photo if uploaded.</p>' +
      '</div>';
    showInlineMessage(panel, "Student ID downloaded for " + activeStudentProfile.id + ".");
    return;
  }

  if (service === "receipt") {
    panel.innerHTML =
      '<div class="service-box">' +
      '<h3>Fee Receipt</h3>' +
      '<p><strong>Student:</strong> ' + escapeHTML(activeStudentProfile.name) + '</p>' +
      '<p><strong>Student ID:</strong> ' + escapeHTML(activeStudentProfile.id) + '</p>' +
      '<p><strong>Paid Amount:</strong> ' + escapeHTML(activeStudentProfile.paid) + '</p>' +
      '<p><strong>Balance Due:</strong> ' + escapeHTML(activeStudentProfile.balance) + '</p>' +
      '<button class="mini-btn" type="button" data-print-receipt>Print Receipt</button>' +
      '</div>';
  }

  if (service === "hallticket") {
    if (hasPendingFee(activeStudentProfile)) {
      panel.innerHTML =
        '<div class="service-box hall-ticket-box blocked-service-box">' +
        '<h3>Hall Ticket Blocked</h3>' +
        '<p><strong>Balance Due:</strong> ' + escapeHTML(activeStudentProfile.balance) + '</p>' +
        '<p>Hall ticket download is available only after remaining fee payment and office verification.</p>' +
        '<a class="mini-btn" href="payment.html?student=' + encodeURIComponent(activeStudentProfile.id) + '&amount=' + encodeURIComponent(activeStudentProfile.balance) + '">Pay Remaining Fee</a>' +
        '</div>';
      showFeeDuePrompt(activeStudentProfile);
      return;
    }
    panel.innerHTML =
      '<div class="service-box hall-ticket-box">' +
      '<h3>Semester Hall Ticket</h3>' +
      '<p><strong>Student:</strong> ' + escapeHTML(activeStudentProfile.name) + '</p>' +
      '<p><strong>Student ID:</strong> ' + escapeHTML(activeStudentProfile.id) + '</p>' +
      '<p><strong>Branch:</strong> ' + escapeHTML(activeStudentProfile.branch) + ' - Semester VI</p>' +
      '<p><strong>Exam Centre:</strong> JGS Group of Institutes, Mumbai Campus</p>' +
      '<p><strong>Status:</strong> Eligible after fee verification</p>' +
      '<button class="mini-btn" type="button" data-download-hallticket>Download Hall Ticket</button>' +
      '</div>';
  }

  if (service === "bonafide") {
    panel.innerHTML =
      '<form class="service-box portal-action-form">' +
      '<h3>Bonafide Request</h3>' +
      '<div class="field"><label>Purpose</label><select required><option>Scholarship</option><option>Bank Loan</option><option>Passport</option><option>Internship</option><option>Other</option></select></div>' +
      '<div class="field"><label>Required Date</label><input type="date" required></div>' +
      '<button class="mini-btn" type="submit">Submit Request</button>' +
      '</form>';
  }

  if (service === "portfolio") {
    panel.innerHTML =
      '<form class="service-box" id="portfolioUpdateForm">' +
      '<h3>Update Portfolio</h3>' +
      '<div class="field"><label>Portfolio Link</label><input id="portfolioInput" type="url" placeholder="https://github.com/your-name" required></div>' +
      '<button class="mini-btn" type="submit">Save Portfolio</button>' +
      '</form>';
  }

  var printButton = panel.querySelector("[data-print-receipt]");
  if (printButton) {
    printButton.addEventListener("click", function () {
      showInlineMessage(panel, "Receipt is ready for printing.");
    });
  }

  var hallTicketButton = panel.querySelector("[data-download-hallticket]");
  if (hallTicketButton) {
    hallTicketButton.addEventListener("click", function () {
      if (hasPendingFee(activeStudentProfile)) {
        showFeeDuePrompt(activeStudentProfile);
        showInlineMessage(panel, "Hall ticket cannot be downloaded until remaining fee is paid.");
        return;
      }
      downloadTextFile(
        "JGS-Hall-Ticket-" + activeStudentProfile.id + ".html",
        buildHallTicketHTML(activeStudentProfile),
        "text/html"
      );
      showInlineMessage(panel, "Hall ticket downloaded for " + activeStudentProfile.id + ".");
    });
  }

  var bonafideForm = panel.querySelector(".portal-action-form");
  if (bonafideForm) {
    bonafideForm.addEventListener("submit", function (event) {
      event.preventDefault();
      bonafideForm.reset();
      showInlineMessage(panel, "Bonafide request submitted successfully.");
    });
  }

  var portfolioForm = panel.querySelector("#portfolioUpdateForm");
  if (portfolioForm) {
    portfolioForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = document.querySelector("#portfolioInput").value;
      activeStudentProfile.portfolio = value.replace(/^https?:\/\//, "");
      renderStudentDashboard(activeStudentProfile);
      renderStudentService("portfolio");
      showInlineMessage(panel, "Portfolio link updated successfully.");
    });
  }
}

function setupStudentBacklogSteps() {
  var stepCards = document.querySelectorAll("[data-backlog-step]");
  var panel = document.querySelector("#backlogActionPanel");
  if (!stepCards.length || !panel) return;

  var stepDetails = {
    review: {
      title: "Result Review",
      badge: "Exam Cell",
      body: "Check the failed subject, internal marks, lab status, attendance percentage, and result remarks before creating the backlog case.",
      list: ["Confirm semester result", "Check whether revaluation is needed", "Meet mentor for improvement plan"],
      action: "Open Academic History"
    },
    remedial: {
      title: "Remedial Classes",
      badge: "Faculty Mentor",
      body: "Attend extra classes and weekly tests for the failed subject. The teacher records progress before recommending supplementary eligibility.",
      list: ["Attend topic-wise revision", "Submit lab/project corrections", "Complete practice test before exam form"],
      action: "Show Backlog Table"
    },
    apply: {
      title: "Apply for Supplementary Exam",
      badge: "Student Action",
      body: "Submit the supplementary exam form, pay the exam fee, and verify the application with the examination cell before the deadline.",
      list: ["Fill supplementary application", "Pay exam fee", "Collect verification receipt"],
      action: "Open Fee Receipt"
    },
    hallticket: {
      title: "Hall Ticket Download",
      badge: "Eligibility Check",
      body: "Hall ticket becomes available only after attendance, fee, application, and lab record verification are completed.",
      list: ["Attendance verified", "Exam fee paid", "Supplementary form approved"],
      action: "Download Hall Ticket"
    },
    reexam: {
      title: "Re-Exam",
      badge: "Exam Day",
      body: "Write the supplementary exam with valid hall ticket and required records. Lab/project backlogs need corrected records before the viva.",
      list: ["Carry hall ticket and college ID", "Submit corrected lab record if required", "Follow exam timetable"],
      action: "View Calendar"
    },
    update: {
      title: "Record Update",
      badge: "Controller Office",
      body: "Once the supplementary result is published, the backlog status is cleared and academic history is updated in the student dashboard.",
      list: ["Result published", "Backlog marked cleared", "CGPA and academic history updated"],
      action: "Refresh Academic Record"
    }
  };

  function openStep(card) {
    var detail = stepDetails[card.dataset.backlogStep];
    if (!detail) return;

    stepCards.forEach(function (item) {
      item.classList.remove("active");
    });
    card.classList.add("active");

    panel.innerHTML =
      '<div class="backlog-action-head">' +
      '<div><span>' + escapeHTML(detail.badge) + '</span><h3>' + escapeHTML(detail.title) + '</h3></div>' +
      '<button class="mini-btn" type="button" data-backlog-action="' + escapeHTML(card.dataset.backlogStep) + '">' + escapeHTML(detail.action) + '</button>' +
      '</div>' +
      '<p>' + escapeHTML(detail.body) + '</p>' +
      '<ul>' + detail.list.map(function (item) { return '<li>' + escapeHTML(item) + '</li>'; }).join("") + '</ul>';

    var actionButton = panel.querySelector("[data-backlog-action]");
    actionButton.addEventListener("click", function () {
      runBacklogAction(actionButton.dataset.backlogAction);
    });
    panel.classList.add("active");
    panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function runBacklogAction(step) {
    if (step === "review" || step === "update") {
      var academic = document.querySelector(".academic-history-card");
      if (academic) academic.scrollIntoView({ behavior: "smooth", block: "start" });
      if (academicSelect) {
        academicSelect.value = "Semester V";
        renderStudentAcademicRows(activeStudentProfile, "Semester V");
      }
      return;
    }

    if (step === "apply") {
      renderStudentService("receipt");
      var servicePanel = document.querySelector("#studentServicePanel");
      if (servicePanel) servicePanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    if (step === "hallticket") {
      renderStudentService("hallticket");
      var hallTicketPanel = document.querySelector("#studentServicePanel");
      if (hallTicketPanel) hallTicketPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      return;
    }

    if (step === "reexam") {
      var calendar = document.querySelector(".student-calendar-card");
      if (calendar) calendar.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    var table = document.querySelector("#studentBacklogRows");
    if (table) table.closest(".table-wrap").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  stepCards.forEach(function (card) {
    card.addEventListener("click", function () {
      openStep(card);
    });
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openStep(card);
      }
    });
  });
}

var adminListPanel = document.querySelector("#adminListPanel");
var adminListCards = document.querySelectorAll("[data-admin-list]");

var adminLists = {
  students: {
    title: "Student List",
    badge: "182 records",
    headers: ["Student ID", "Name", "Branch", "Quota", "Status"],
    rows: [
      ["22A31A0501", "Arjun Reddy", "AI&ML", "Free Seat", "Active"],
      ["22A31A0502", "Divya S", "AI&ML", "Management", "Active"],
      ["22A31C0104", "Meena K", "CS", "Free Seat", "Active"],
      ["22A31E0207", "Rahul P", "ECE", "Management", "Pending"],
      ["22A31M0309", "Sanjay T", "Mechanical", "Free Seat", "Active"],
      ["22A31EE011", "Kavya N", "EEE", "Management", "Active"]
    ]
  },
  capacity: {
    title: "Branch Capacity List",
    badge: "50 seats per branch",
    headers: ["Branch", "Filled", "Available", "Limit", "Status"],
    rows: [
      ["AI&ML", "32", "18", "50", "Open"],
      ["CS", "33", "17", "50", "Open"],
      ["Civil", "29", "21", "50", "Open"],
      ["ECE", "30", "20", "50", "Open"],
      ["Mechanical", "29", "21", "50", "Open"],
      ["EEE", "29", "21", "50", "Open"]
    ]
  },
  teachers: {
    title: "Teacher Assignment List",
    badge: "42 teachers",
    headers: ["Teacher ID", "Teacher Name", "Subject", "Branch", "Status"],
    rows: [
      ["JGS-FAC-204", "Dr. Anitha Rao", "Machine Learning", "AI&ML", "Assigned"],
      ["JGS-FAC-118", "Mr. Ravi Kumar", "Data Structures", "CS", "Assigned"],
      ["JGS-FAC-166", "Ms. Priya Menon", "Digital Electronics", "ECE", "Assigned"],
      ["JGS-FAC-142", "Mr. Suresh Naik", "Surveying", "Civil", "Assigned"],
      ["JGS-FAC-188", "Dr. Naveen Kumar", "Thermodynamics", "Mechanical", "Assigned"],
      ["JGS-FAC-175", "Ms. Kavya Reddy", "Power Systems", "EEE", "Assigned"]
    ]
  },
  applications: {
    title: "New Application List",
    badge: "24 pending",
    headers: ["Application ID", "Applicant", "Program", "Quota", "Status"],
    rows: [
      ["APP-1024", "Nikhil Varma", "B.Tech AI&ML", "Free Seat", "Verification"],
      ["APP-1025", "Sravya P", "B.Tech CS", "Management", "Documents Pending"],
      ["APP-1026", "Harsha K", "B.Tech ECE", "Free Seat", "Counselling"],
      ["APP-1027", "Lahari M", "B.Tech Civil", "Management", "Fee Review"],
      ["APP-1028", "Vamsi R", "B.Tech Mechanical", "Free Seat", "Verification"],
      ["APP-1029", "Sameera S", "B.Tech EEE", "Management", "Interview"]
    ]
  },
  backlogs: {
    title: "Failed Student / Backlog List",
    badge: "Live academic risk list",
    headers: ["Student ID", "Student Name", "Branch", "Failed Subject", "Process Stage", "Next Action"],
    rows: []
  }
};

var branchStudentCounts = {
  "AI&ML": 32,
  "CS": 33,
  "Civil": 29,
  "ECE": 30,
  "Mechanical": 29,
  "EEE": 29
};

var branchTeacherCounts = {
  "AI&ML": 7,
  "CS": 8,
  "Civil": 7,
  "ECE": 7,
  "Mechanical": 7,
  "EEE": 6
};

function formatIndianCurrency(amount) {
  if (amount >= 10000000) {
    return "Rs. " + (amount / 10000000).toFixed(2).replace(/\.00$/, "") + " Cr";
  }
  if (amount >= 100000) {
    return "Rs. " + (amount / 100000).toFixed(2).replace(/\.00$/, "") + " L";
  }
  return "Rs. " + amount.toLocaleString("en-IN");
}

function getBranchFinanceRows() {
  return Object.keys(branchStudentCounts).map(function (branch) {
    var students = branchStudentCounts[branch];
    var managementStudents = Math.ceil(students / 2);
    var freeSeatStudents = Math.floor(students / 2);
    var turnover = managementStudents * 85000 + freeSeatStudents * 65000;
    var collected = managementStudents * 55000 + freeSeatStudents * 20000;
    var remaining = managementStudents * 30000 + freeSeatStudents * 10000;

    return {
      branch: branch,
      students: students,
      turnover: turnover,
      collected: collected,
      remaining: remaining,
      pending: remaining > 0 ? students : 0
    };
  });
}

function renderAdminFinancePanel() {
  var table = document.querySelector("#adminFeeRows");
  if (!table) return;

  var rows = getBranchFinanceRows();
  var totals = rows.reduce(function (summary, row) {
    summary.students += row.students;
    summary.turnover += row.turnover;
    summary.collected += row.collected;
    summary.remaining += row.remaining;
    summary.pending += row.pending;
    return summary;
  }, { students: 0, turnover: 0, collected: 0, remaining: 0, pending: 0 });

  document.querySelector("#adminTotalTurnover").textContent = formatIndianCurrency(totals.turnover);
  document.querySelector("#adminCollectedAmount").textContent = formatIndianCurrency(totals.collected);
  document.querySelector("#adminRemainingBalance").textContent = formatIndianCurrency(totals.remaining);
  document.querySelector("#adminPendingStudents").textContent = totals.pending;

  var collectionPercent = totals.turnover ? Math.round((totals.collected / totals.turnover) * 100) : 0;
  setDonut("#adminCollectionDonut", collectionPercent, collectionPercent + "%");
  if (document.querySelector("#adminCollectionPercent")) {
    document.querySelector("#adminCollectionPercent").textContent = collectionPercent + "%";
  }

  var maxTurnover = Math.max.apply(null, rows.map(function (row) { return row.turnover; }).concat([1]));
  var branchChart = document.querySelector("#adminBranchTurnoverChart");
  if (branchChart) {
    branchChart.innerHTML = rows.map(function (row) {
      var width = Math.round((row.turnover / maxTurnover) * 100);
      return '<div class="horizontal-bar">' +
        '<span>' + escapeHTML(row.branch) + '</span>' +
        '<div><i style="width:' + width + '%"></i></div>' +
        '<em>' + formatIndianCurrency(row.turnover) + '</em>' +
        '</div>';
    }).join("");
  }

  table.innerHTML = rows.map(function (row) {
    return "<tr>" +
      "<td>" + escapeHTML(row.branch) + "</td>" +
      "<td>" + row.students + "</td>" +
      "<td>" + formatIndianCurrency(row.turnover) + "</td>" +
      "<td>" + formatIndianCurrency(row.collected) + "</td>" +
      "<td>" + formatIndianCurrency(row.remaining) + "</td>" +
      "<td>" + row.pending + "</td>" +
      "</tr>";
  }).join("");
}

function generateStudentRows() {
  var rows = [];
  var branchCodes = {
    "AI&ML": "AIML",
    "CS": "CS",
    "Civil": "CIV",
    "ECE": "ECE",
    "Mechanical": "MECH",
    "EEE": "EEE"
  };
  var quota = ["Free Seat", "Management"];
  var firstNames = ["Arjun", "Divya", "Kiran", "Meena", "Rahul", "Sravya", "Nikhil", "Lahari", "Vamsi", "Sameera"];
  var lastNames = ["Reddy", "Kumar", "Naik", "Varma", "K", "S", "P", "M", "T", "N"];

  Object.keys(branchStudentCounts).forEach(function (branch) {
    for (var i = 1; i <= branchStudentCounts[branch]; i++) {
      var number = String(i).padStart(3, "0");
      var id = "22JGS-" + branchCodes[branch] + "-" + number;
      var row = [
        id,
        firstNames[(i - 1) % firstNames.length] + " " + lastNames[(i - 1) % lastNames.length],
        branch,
        quota[i % quota.length],
        i % 11 === 0 ? "Backlog" : "Active"
      ];
      var override = getStudentOverride(id);
      if (override) {
        row[1] = override.name || row[1];
        row[2] = override.branch || row[2];
        row[3] = override.quota || row[3];
        row[4] = override.status || row[4];
      }
      rows.push(row);
    }
  });

  var overrides = readStudentOverrides();
  Object.keys(overrides).forEach(function (id) {
    var exists = rows.some(function (row) { return row[0] === id; });
    if (!exists) {
      rows.push([
        id,
        overrides[id].name || "New Student",
        overrides[id].branch || "AI&ML",
        overrides[id].quota || "Free Seat",
        overrides[id].status || "Active"
      ]);
    }
  });

  return rows;
}

function generateBacklogRows() {
  var subjectMap = {
    "AI&ML": "Engineering Mathematics III",
    CS: "Data Structures",
    Civil: "Strength of Materials",
    ECE: "Digital Electronics",
    Mechanical: "Thermodynamics",
    EEE: "Electrical Machines"
  };
  var rows = [];

  generateStudentRows().forEach(function (row) {
    if (row[4] !== "Backlog") return;
    var override = getStudentOverride(row[0]) || {};
    if (override.backlogs && override.backlogs[0] && override.backlogs[0][1] === "Clear") return;
    rows.push([
      row[0],
      row[1],
      row[2],
      override.failedSubject || subjectMap[row[2]] || "Engineering Mathematics",
      override.backlogs && override.backlogs[0] ? override.backlogs[0][2] : "Remedial + Supplementary",
      "Verify exam form, fee, teacher readiness, and hall ticket eligibility"
    ]);
  });

  return rows;
}

function generateTeacherRows() {
  var rows = [];
  var subjects = {
    "AI&ML": ["Machine Learning", "Python", "Deep Learning", "Data Analytics", "AI Project Lab", "Cloud Basics", "NLP"],
    "CS": ["Data Structures", "DBMS", "Operating Systems", "Web Technologies", "Computer Networks", "Java", "Cybersecurity", "Software Engineering"],
    "Civil": ["Surveying", "Structural Analysis", "Concrete Technology", "Geotechnical Engineering", "Transportation", "CAD Lab", "Environmental Engineering"],
    "ECE": ["Digital Electronics", "Signals", "VLSI", "Embedded Systems", "IoT", "Communication Systems", "Microprocessors"],
    "Mechanical": ["Thermodynamics", "Fluid Mechanics", "Machine Design", "Manufacturing", "CAD/CAM", "Automobile Engineering", "Workshop Practice"],
    "EEE": ["Power Systems", "Electrical Machines", "Control Systems", "Power Electronics", "Renewable Energy", "Electrical Drives"]
  };
  var names = ["Dr. Anitha Rao", "Mr. Ravi Kumar", "Ms. Priya Menon", "Mr. Suresh Naik", "Dr. Naveen Kumar", "Ms. Kavya Reddy", "Mr. Ajay Sharma", "Dr. Ramesh Babu"];
  var index = 1;

  Object.keys(branchTeacherCounts).forEach(function (branch) {
    for (var i = 0; i < branchTeacherCounts[branch]; i++) {
      rows.push([
        "JGS-FAC-" + String(index).padStart(3, "0"),
        names[i % names.length],
        subjects[branch][i % subjects[branch].length],
        branch,
        "Assigned"
      ]);
      index++;
    }
  });

  return rows;
}

function refreshAdminDataViews() {
  if (typeof adminLists === "undefined") return;
  adminLists.students.rows = generateStudentRows();
  adminLists.students.badge = adminLists.students.rows.length + " records";
  adminLists.teachers.rows = generateTeacherRows();
  adminLists.backlogs.rows = generateBacklogRows();
  adminLists.backlogs.badge = adminLists.backlogs.rows.length + " students";
  var countTarget = document.querySelector("#adminBacklogCount");
  if (countTarget) countTarget.textContent = adminLists.backlogs.rows.length;
  if (adminListPanel && document.querySelector("#adminListTitle")) {
    var activeCard = document.querySelector("[data-admin-list].active");
    if (activeCard) renderAdminList(activeCard.dataset.adminList);
  }
}

refreshAdminDataViews();

var adminBacklogCount = document.querySelector("#adminBacklogCount");
if (adminBacklogCount) {
  adminBacklogCount.textContent = adminLists.backlogs.rows.length;
}

function renderAdminList(type) {
  if (!adminListPanel || !adminLists[type]) return;

  var list = adminLists[type];
  var summary = "";
  if (type === "students") {
    summary = renderBranchSummary(branchStudentCounts);
  }
  if (type === "teachers") {
    summary = renderBranchSummary(branchTeacherCounts);
  }
  if (type === "backlogs") {
    summary = renderBranchSummary(countBacklogsByBranch());
  }

  document.querySelector("#adminListTitle").textContent = list.title;
  document.querySelector("#adminListBadge").textContent = list.badge;
  document.querySelector("#adminListContent").innerHTML =
    summary +
    '<table class="portal-table">' +
    "<thead><tr>" +
    list.headers.map(function (header) {
      return "<th>" + escapeHTML(header) + "</th>";
    }).join("") +
    "</tr></thead><tbody>" +
    list.rows.map(function (row) {
      return "<tr>" + row.map(function (cell) {
        return "<td>" + escapeHTML(cell) + "</td>";
      }).join("") + "</tr>";
    }).join("") +
    "</tbody></table>";

  adminListCards.forEach(function (card) {
    card.classList.toggle("active", card.dataset.adminList === type);
  });

  var branchCards = document.querySelectorAll("[data-branch-filter]");

  branchCards.forEach(function (card) {
    card.addEventListener("click", function () {
      renderFilteredAdminList(type, card.dataset.branchFilter);
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        renderFilteredAdminList(type, card.dataset.branchFilter);
      }
    });
  });
}

function renderBranchSummary(counts) {
  return '<div class="branch-summary">' +
    Object.keys(counts).map(function (branch) {
      return '<div class="branch-summary-card" tabindex="0" data-branch-filter="' + escapeHTML(branch) + '"><span>' + escapeHTML(branch) + '</span><strong>' + counts[branch] + '</strong></div>';
    }).join("") +
    '</div>';
}

function countBacklogsByBranch() {
  return adminLists.backlogs.rows.reduce(function (counts, row) {
    counts[row[2]] = (counts[row[2]] || 0) + 1;
    return counts;
  }, { "AI&ML": 0, CS: 0, Civil: 0, ECE: 0, Mechanical: 0, EEE: 0 });
}

function renderFilteredAdminList(type, branch) {
  if (!adminListPanel || !adminLists[type]) return;

  var list = adminLists[type];
  var branchColumn = type === "students" ? 2 : 3;
  if (type === "backlogs") branchColumn = 2;
  var filteredRows = list.rows.filter(function (row) {
    return row[branchColumn] === branch;
  });

  document.querySelector("#adminListTitle").textContent = list.title + " - " + branch;
  document.querySelector("#adminListBadge").textContent = filteredRows.length + " records";
  var summaryCounts = branchTeacherCounts;
  if (type === "students") summaryCounts = branchStudentCounts;
  if (type === "backlogs") summaryCounts = countBacklogsByBranch();
  document.querySelector("#adminListContent").innerHTML =
    renderBranchSummary(summaryCounts) +
    '<table class="portal-table">' +
    "<thead><tr>" +
    list.headers.map(function (header) {
      return "<th>" + escapeHTML(header) + "</th>";
    }).join("") +
    "</tr></thead><tbody>" +
    filteredRows.map(function (row) {
      return "<tr>" + row.map(function (cell) {
        return "<td>" + escapeHTML(cell) + "</td>";
      }).join("") + "</tr>";
    }).join("") +
    "</tbody></table>";

  document.querySelectorAll("[data-branch-filter]").forEach(function (card) {
    card.classList.toggle("active", card.dataset.branchFilter === branch);
    card.addEventListener("click", function () {
      renderFilteredAdminList(type, card.dataset.branchFilter);
    });
    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        renderFilteredAdminList(type, card.dataset.branchFilter);
      }
    });
  });
}

adminListCards.forEach(function (card) {
  card.addEventListener("click", function () {
    renderAdminList(card.dataset.adminList);
    adminListPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  card.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      renderAdminList(card.dataset.adminList);
      adminListPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

if (adminListPanel) {
  renderAdminList("students");
}

var courseStudentCards = document.querySelectorAll("[data-student-branch]");

courseStudentCards.forEach(function (card) {
  card.addEventListener("click", function () {
    renderFilteredAdminList("students", card.dataset.studentBranch);
    adminListPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  card.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      renderFilteredAdminList("students", card.dataset.studentBranch);
      adminListPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});

var registrationForm = document.querySelector("#registrationForm");

if (registrationForm) {
  registrationForm.addEventListener("submit", function (event) {
    event.preventDefault();
    document.querySelector("#registrationStatus").textContent =
      "Registration submitted successfully.";
    registrationForm.reset();
  });
}

var applicationForm = document.querySelector("#applicationForm");

if (applicationForm) {
  applicationForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var status = document.querySelector("#applicationStatus");
    var payload = {
      name: document.querySelector("#appName") ? document.querySelector("#appName").value : "",
      phone: document.querySelector("#appPhone") ? document.querySelector("#appPhone").value : "",
      email: document.querySelector("#appEmail") ? document.querySelector("#appEmail").value : "",
      dob: document.querySelector("#appDob") ? document.querySelector("#appDob").value : "",
      program: document.querySelector("#appProgram") ? document.querySelector("#appProgram").value : "",
      quota: document.querySelector("#appQuota") ? document.querySelector("#appQuota").value : "",
      previous: document.querySelector("#appPrevious") ? document.querySelector("#appPrevious").value : "",
      marks: document.querySelector("#appMarks") ? document.querySelector("#appMarks").value : "",
      address: document.querySelector("#appAddress") ? document.querySelector("#appAddress").value : ""
    };
    if (status) status.textContent = "Submitting application to admissions office...";
    apiRequest("/api/applications", {
      method: "POST",
      body: JSON.stringify(payload)
    }).then(function (record) {
      if (status) {
        status.textContent = "Application submitted successfully. Application No: " + record.applicationNo;
      }
      applicationForm.reset();
    }).catch(function () {
      if (status) {
        status.textContent = "Application saved on this device. Start the dynamic server to store applications centrally.";
      }
      applicationForm.reset();
    });
  });
}

function showInlineMessage(target, text) {
  if (!target) return;
  var message = target.querySelector(".inline-status");
  if (!message) {
    message = document.createElement("p");
    message.className = "inline-status section-lead";
    target.appendChild(message);
  }
  message.textContent = text;
}

function makeSlug(text) {
  return text
    .toLowerCase()
    .replace("&", " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

var clickableCards = document.querySelectorAll(".card, .image-card, .achievement-card");

clickableCards.forEach(function (card) {
  var heading = card.querySelector("h3");

  if (heading) {
    card.classList.add("clickable-card");
    card.setAttribute("tabindex", "0");

    card.addEventListener("click", function () {
      window.location.href = "details.html#" + makeSlug(heading.textContent);
    });

    card.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        window.location.href = "details.html#" + makeSlug(heading.textContent);
      }
    });
  }
});

var extraDetails = {
  "student-centered-campus": [
    "What it includes: academic classrooms, activity spaces, mentoring support, campus discipline, communication practice, and student guidance.",
    "Student benefit: learners feel supported throughout school, intermediate, and higher education instead of studying in disconnected environments.",
    "JGS support: faculty members monitor progress, encourage participation, and guide students toward academic and career goals."
  ],
  "guided-learning": [
    "What it includes: daily teaching, doubt clarification, revision classes, regular tests, and teacher feedback.",
    "Student benefit: concepts become easier to understand because students receive step-by-step guidance.",
    "JGS support: teachers track performance and help students improve weak areas before examinations."
  ],
  "mission": [
    "What it includes: quality education, discipline, practical learning, values, academic planning, and career preparation.",
    "Student benefit: students receive a complete foundation for higher studies, employment, and personal growth.",
    "JGS support: the group connects school, intermediate, and technical education under one academic vision."
  ],
  "mentorship": [
    "What it includes: personal guidance, progress reviews, study planning, counseling, and motivation.",
    "Student benefit: students get individual attention instead of only classroom teaching.",
    "JGS support: mentors help students improve confidence, attendance, learning habits, and academic consistency."
  ],
  "career-growth": [
    "What it includes: resume preparation, communication skills, aptitude practice, interviews, projects, and placement training.",
    "Student benefit: students become better prepared for jobs, higher studies, internships, and competitive opportunities.",
    "JGS support: placement and faculty teams help students build portfolios and career direction."
  ],
  "academic-results": [
    "What it includes: regular exams, revision sessions, performance tracking, parent updates, and improvement plans.",
    "Student benefit: students understand their progress clearly and can improve before final exams.",
    "JGS support: faculty review marks, attendance, and subject performance to guide each learner.",
    "Tracking method: unit tests, monthly assessments, pre-final exams, assignment reviews, and student progress reports."
  ],
  "modern-labs": [
    "What it includes: computer labs, science labs, electronics practice, civil engineering tools, and project work.",
    "Student benefit: students learn by doing practical experiments instead of only reading theory.",
    "JGS support: lab sessions connect classroom concepts with real-world applications.",
    "Lab activities: coding practice, circuit testing, science experiments, CAD basics, surveying practice, equipment handling, and project demonstrations."
  ],
  "placement-support": [
    "What it includes: mock interviews, aptitude tests, technical practice, resume support, and placement guidance.",
    "Student benefit: final-year students become more confident for campus drives and job interviews.",
    "JGS support: the placement cell helps students prepare for company expectations.",
    "Training modules: communication skills, group discussion practice, resume building, aptitude training, coding basics, interview preparation, and portfolio review."
  ],
  "science": [
    "Curriculum: Mathematics, Physics, Chemistry, Biology, English, laboratory record work, assignments, and board examination preparation.",
    "Practical learning: physics experiments, chemistry lab work, biology observation, formulas practice, diagrams, numericals, and weekly tests.",
    "Student benefit: this stream prepares students for engineering, medicine, pharmacy, agriculture, nursing, BSc, and other science careers.",
    "JGS support: subject-wise faculty guidance, entrance exam basics, revision classes, doubt sessions, and regular academic tracking."
  ],
  "commerce": [
    "Curriculum: Accountancy, Economics, Business Studies, Commerce, Statistics, English, business communication, and financial basics.",
    "Practical learning: account statements, ledger practice, balance sheets, business case studies, market examples, and commerce projects.",
    "Student benefit: this stream prepares students for BCom, BBA, CA Foundation, CMA, banking, finance, management, and entrepreneurship.",
    "JGS support: concept-based teaching, numerical practice, business examples, exam preparation, and career counseling."
  ],
  "arts": [
    "Curriculum: History, Political Science, Economics, Sociology, Public Administration, English, communication, and social awareness topics.",
    "Practical learning: debates, presentations, essay writing, current affairs discussions, project reports, and public speaking activities.",
    "Student benefit: this stream prepares students for BA, law, journalism, civil services, teaching, public administration, and social careers.",
    "JGS support: regular writing practice, discussion-based classes, general knowledge support, and counseling for competitive exams."
  ],
  "ai-ml": [
    "Curriculum: Programming, Python, Data Structures, Database Management, Mathematics for AI, Machine Learning, Deep Learning, Data Analytics, Cloud Basics, and AI project work.",
    "Labs and projects: Python lab, data analysis lab, machine learning mini projects, image or text classification, prediction models, and final-year AI application projects.",
    "Skills developed: coding, logical thinking, data handling, model training, problem solving, automation, and technical presentation.",
    "Career paths: AI engineer, machine learning developer, data analyst, Python developer, automation engineer, and research assistant. Branch capacity: 50 students."
  ],
  "cs": [
    "Curriculum: C Programming, Java, Python, Data Structures, Algorithms, DBMS, Operating Systems, Computer Networks, Web Technologies, Software Engineering, and Cybersecurity basics.",
    "Labs and projects: programming lab, database lab, web development projects, software mini projects, Git basics, and final-year application development.",
    "Skills developed: coding, debugging, database design, web design, teamwork, software planning, and problem solving.",
    "Career paths: software developer, web developer, database developer, testing engineer, system administrator, and IT support engineer. Branch capacity: 50 students."
  ],
  "civil": [
    "Curriculum: Engineering Drawing, Surveying, Building Materials, Strength of Materials, Structural Analysis, Concrete Technology, Transportation Engineering, Geotechnical Engineering, and Environmental Engineering.",
    "Labs and projects: surveying practice, material testing, concrete testing, CAD drawing, site planning, estimation work, and model or project preparation.",
    "Skills developed: measurement, planning, drawing, estimation, structural understanding, site supervision, and infrastructure problem solving.",
    "Career paths: site engineer, structural assistant, surveyor, planning assistant, quantity surveyor, contractor, and public works roles. Branch capacity: 50 students."
  ],
  "ece": [
    "Curriculum: Basic Electronics, Network Theory, Digital Electronics, Signals and Systems, Analog Communication, Digital Communication, Microprocessors, Embedded Systems, VLSI basics, and IoT fundamentals.",
    "Labs and projects: electronics lab, circuits lab, communication lab, microcontroller projects, sensor-based systems, embedded mini projects, and final-year hardware projects.",
    "Skills developed: circuit design, troubleshooting, soldering basics, embedded programming, signal understanding, and communication technology knowledge.",
    "Career paths: electronics engineer, embedded developer, telecom engineer, IoT technician, hardware testing engineer, and VLSI trainee. Branch capacity: 50 students."
  ],
  "mechanical": [
    "Curriculum: Engineering Mechanics, Engineering Drawing, Thermodynamics, Fluid Mechanics, Strength of Materials, Manufacturing Technology, Machine Design, Heat Transfer, Automobile Engineering, and Industrial Engineering.",
    "Labs and projects: workshop practice, thermal lab, fluid mechanics lab, manufacturing lab, CAD modeling, machine design projects, engine demonstrations, and final-year mechanical projects.",
    "Skills developed: machine understanding, design thinking, manufacturing knowledge, CAD basics, problem solving, maintenance planning, and industrial process awareness.",
    "Career paths: mechanical engineer, production engineer, design trainee, maintenance engineer, automobile technician, quality engineer, and manufacturing supervisor. Branch capacity: 50 students."
  ],
  "eee": [
    "Curriculum: Electrical Circuits, Electrical Machines, Power Systems, Control Systems, Power Electronics, Digital Electronics, Measurements, Renewable Energy Systems, and Electrical Drives.",
    "Labs and projects: electrical machines lab, circuits lab, power electronics lab, control systems practice, wiring projects, renewable energy mini projects, and final-year electrical projects.",
    "Skills developed: circuit analysis, power system understanding, machine testing, electrical safety, troubleshooting, control logic, and energy management.",
    "Career paths: electrical engineer, power systems engineer, maintenance engineer, control engineer, energy technician, substation operator, and electrical design trainee. Branch capacity: 50 students."
  ]
};

function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getStoredDetails(key) {
  try {
    var saved = localStorage.getItem("jgs-details-" + key);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

function saveStoredDetails(key, items) {
  localStorage.setItem("jgs-details-" + key, JSON.stringify(items));
}

function renderCustomDetails(selectedDetail, key) {
  var list = selectedDetail.querySelector(".custom-detail-list");
  var items = getStoredDetails(key);

  if (!list) {
    return;
  }

  list.innerHTML = items.map(function (item) {
    return (
      '<div class="custom-detail-item">' +
      "<strong>" + escapeHTML(item.title) + "</strong>" +
      "<p>" + escapeHTML(item.text) + "</p>" +
      "</div>"
    );
  }).join("");
}

function setupCustomDetailForm(selectedDetail, key) {
  var form = selectedDetail.querySelector(".custom-detail-form");

  if (!form || form.dataset.ready === "true") {
    return;
  }

  form.dataset.ready = "true";
  renderCustomDetails(selectedDetail, key);

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var titleInput = form.querySelector(".custom-title");
    var textInput = form.querySelector(".custom-text");
    var items = getStoredDetails(key);

    items.push({
      title: titleInput.value,
      text: textInput.value
    });

    saveStoredDetails(key, items);
    renderCustomDetails(selectedDetail, key);
    form.reset();
  });
}

function addMoreDetail(selectedDetail) {
  if (selectedDetail.querySelector(".more-detail")) {
    setupCustomDetailForm(selectedDetail, selectedDetail.id);
    return;
  }

  var key = selectedDetail.id;
  var title = selectedDetail.querySelector("h2").textContent;
  var points = extraDetails[key] || [
    "What it includes: structured academic information, practical support, student guidance, and regular progress monitoring.",
    "Student benefit: this helps students and parents clearly understand the purpose, value, and available support for " + title + ".",
    "JGS support: the institution provides faculty guidance, organized records, and student-focused academic planning."
  ];

  var detailBox = document.createElement("div");
  detailBox.className = "more-detail";
  detailBox.innerHTML =
    "<h3>Course Details and Curriculum</h3>" +
    '<div class="curriculum-list">' +
    points.map(function (point) {
      var parts = point.split(":");
      var heading = parts.shift();
      var body = parts.join(":").trim();
      return '<div class="curriculum-item"><strong>' + heading + '</strong><p>' + body + '</p></div>';
    }).join("") +
    "</div>" +
    '<div class="dynamic-detail-panel">' +
    "<h3>Add More Information</h3>" +
    '<form class="custom-detail-form">' +
    '<div class="field"><label>Title</label><input class="custom-title" type="text" placeholder="Example: Extra facility" required></div>' +
    '<div class="field"><label>Details</label><textarea class="custom-text" rows="3" placeholder="Add your own matter here" required></textarea></div>' +
    '<button class="btn" type="submit">Add Detail</button>' +
    "</form>" +
    '<div class="custom-detail-list"></div>' +
    "</div>" +
    '<a class="btn secondary" href="javascript:history.back()">Back</a>';

  selectedDetail.appendChild(detailBox);
  setupCustomDetailForm(selectedDetail, key);
}

function scrollToSelectedDetail() {
  if (window.location.hash) {
    var selectedDetail = document.querySelector(window.location.hash);
    var allDetails = document.querySelectorAll(".detail-panel");

    if (selectedDetail) {
      document.body.classList.add("detail-focused");

      allDetails.forEach(function (detail) {
        detail.style.display = "none";
        detail.classList.remove("single-detail");
      });

      selectedDetail.style.display = "block";
      selectedDetail.classList.add("single-detail");
      addMoreDetail(selectedDetail);
      if (!selectedDetail.querySelector(".more-detail")) {
        selectedDetail.innerHTML +=
          '<div class="more-detail">' +
          "<h3>Course Details and Curriculum</h3>" +
          '<div class="curriculum-list">' +
          '<div class="curriculum-item"><strong>Overview</strong><p>This section explains the selected topic in more depth for students and parents.</p></div>' +
          '<div class="curriculum-item"><strong>Support</strong><p>It shows how the JGS Group supports this area through teaching, guidance, facilities, and academic planning.</p></div>' +
          '<div class="curriculum-item"><strong>Benefit</strong><p>The goal is to help visitors understand the value, purpose, and student benefit of this card.</p></div>' +
          "</div>" +
          '<a class="btn secondary" href="javascript:history.back()">Back</a>' +
          "</div>";
      }
      window.scrollTo(0, 0);
    }
  }
}

var engineeringCourseData = {
  aiml: {
    code: "B.Tech AI&ML",
    title: "Artificial Intelligence & Machine Learning Curriculum",
    intro: "A semester-wise pathway covering programming, data science, machine learning, deep learning, NLP, computer vision, and AI project development.",
    focus: "AI + Data Science",
    lab: "Students work in Python labs, data analytics labs, AI model building sessions, cloud notebooks, and project studios.",
    career: "AI&ML graduates can enter machine learning engineering, data science, analytics, AI application development, research support, and cloud AI roles.",
    semesters: [
      ["Engineering Foundation", ["Engineering Mathematics I", "Engineering Physics", "Programming for Problem Solving", "Basic Electrical Engineering", "Engineering Graphics", "Programming Lab"]],
      ["Computing Basics", ["Engineering Mathematics II", "Engineering Chemistry", "Data Structures", "Digital Logic Design", "Environmental Science", "Data Structures Lab"]],
      ["AI Foundation", ["Discrete Mathematics", "Object Oriented Programming", "Database Management Systems", "Probability and Statistics", "Python for Data Science", "DBMS / Python Lab"]],
      ["Machine Learning Core", ["Design and Analysis of Algorithms", "Operating Systems", "Machine Learning", "Computer Organization", "Software Engineering", "Machine Learning Lab"]],
      ["Advanced AI Systems", ["Deep Learning", "Natural Language Processing", "Computer Networks", "Data Mining", "Cloud Computing", "Deep Learning Lab"]],
      ["Applied Intelligence", ["Computer Vision", "Big Data Analytics", "Reinforcement Learning Basics", "Professional Elective I", "Open Elective I", "Mini Project"]],
      ["Industry Specialization", ["MLOps", "Generative AI Basics", "Professional Elective II", "Open Elective II", "Industrial Internship", "Major Project Phase I"]],
      ["Career Readiness", ["AI Ethics and Governance", "Professional Elective III", "Seminar", "Major Project Phase II", "Placement Training", "Technical Portfolio Review"]]
    ]
  },
  cs: {
    code: "B.Tech CS",
    title: "Computer Science Engineering Curriculum",
    intro: "A full-stack computer science path from programming fundamentals to algorithms, systems, cloud, cybersecurity, and software project delivery.",
    focus: "Software + Systems",
    lab: "Students practice coding, databases, web development, operating systems, networks, cloud deployment, and software testing.",
    career: "CS graduates can work as software engineers, full-stack developers, cloud engineers, QA analysts, cybersecurity trainees, and database developers.",
    semesters: [
      ["Engineering Foundation", ["Engineering Mathematics I", "Engineering Physics", "Programming for Problem Solving", "Basic Electrical Engineering", "Engineering Graphics", "Programming Lab"]],
      ["Programming Core", ["Engineering Mathematics II", "Engineering Chemistry", "Data Structures", "Digital Logic Design", "Environmental Science", "Data Structures Lab"]],
      ["Systems Basics", ["Discrete Mathematics", "Object Oriented Programming", "Database Management Systems", "Computer Organization", "Java / DBMS Lab", "Professional Communication"]],
      ["Core Computing", ["Design and Analysis of Algorithms", "Operating Systems", "Computer Networks", "Software Engineering", "Web Technologies", "OS / Web Lab"]],
      ["Application Development", ["Compiler Design", "Cloud Computing", "Cybersecurity Basics", "Mobile Application Development", "Data Mining", "Cloud / Mobile Lab"]],
      ["Modern Software", ["Artificial Intelligence", "DevOps Fundamentals", "Distributed Systems", "Professional Elective I", "Open Elective I", "Mini Project"]],
      ["Specialization", ["Machine Learning", "Blockchain Basics", "Professional Elective II", "Open Elective II", "Industrial Internship", "Major Project Phase I"]],
      ["Project and Placement", ["Software Project Management", "Professional Elective III", "Seminar", "Major Project Phase II", "Aptitude and Coding Practice", "Portfolio Review"]]
    ]
  },
  civil: {
    code: "B.Tech Civil",
    title: "Civil Engineering Curriculum",
    intro: "A civil engineering roadmap covering surveying, structures, concrete, geotechnical, transportation, water resources, and smart infrastructure.",
    focus: "Structures + Infrastructure",
    lab: "Students use surveying equipment, concrete testing, geotechnical tools, CAD drafting, structural software, and field project methods.",
    career: "Civil graduates can work in construction, site engineering, structural drafting, quantity surveying, transportation, water resources, and government exams.",
    semesters: [
      ["Engineering Foundation", ["Engineering Mathematics I", "Engineering Physics", "Basic Civil Engineering", "Engineering Mechanics", "Engineering Graphics", "Workshop Practice"]],
      ["Materials Basics", ["Engineering Mathematics II", "Engineering Chemistry", "Building Materials", "Surveying I", "Environmental Science", "Surveying Lab"]],
      ["Civil Core", ["Strength of Materials", "Fluid Mechanics", "Surveying II", "Concrete Technology", "Engineering Geology", "Materials Testing Lab"]],
      ["Structural Foundation", ["Structural Analysis I", "Hydraulics", "Geotechnical Engineering I", "Transportation Engineering I", "CAD for Civil Engineering", "Hydraulics Lab"]],
      ["Advanced Civil Systems", ["Structural Analysis II", "Design of Reinforced Concrete", "Geotechnical Engineering II", "Water Resources Engineering", "Transportation Engineering II", "Soil Mechanics Lab"]],
      ["Design and Planning", ["Steel Structures", "Estimation and Costing", "Construction Planning and Management", "Professional Elective I", "Open Elective I", "Mini Project"]],
      ["Field Specialization", ["Environmental Engineering", "Foundation Engineering", "Professional Elective II", "Open Elective II", "Industrial Training", "Major Project Phase I"]],
      ["Professional Practice", ["Smart Infrastructure Basics", "Professional Elective III", "Seminar", "Major Project Phase II", "Site Safety and Quality", "Career Preparation"]]
    ]
  },
  ece: {
    code: "B.Tech ECE",
    title: "Electronics & Communication Curriculum",
    intro: "Semester-wise subjects from first year fundamentals to final-year communication, embedded systems, VLSI, IoT, and project work.",
    focus: "Circuits + Communication",
    lab: "Students work with circuits, communication kits, microcontrollers, embedded systems, sensors, IoT modules, and simulation tools.",
    career: "ECE graduates can pursue embedded systems, telecom, VLSI, IoT, electronics testing, hardware support, software roles, and higher studies.",
    semesters: [
      ["Engineering Foundation", ["Engineering Mathematics I", "Engineering Physics", "Basic Electrical Engineering", "Programming for Problem Solving", "Engineering Graphics", "Physics Lab / Programming Lab"]],
      ["Core Basics", ["Engineering Mathematics II", "Engineering Chemistry", "Basic Electronics Engineering", "Network Analysis", "Environmental Science", "Electronics Workshop Lab"]],
      ["Electronics Core", ["Electronic Devices and Circuits", "Digital Logic Design", "Signals and Systems", "Probability and Random Processes", "Analog Electronics Lab", "Digital Electronics Lab"]],
      ["Communication Foundation", ["Analog Communication", "Electromagnetic Fields", "Linear Integrated Circuits", "Microprocessors and Microcontrollers", "Control Systems", "Communication Lab"]],
      ["Advanced Systems", ["Digital Communication", "Digital Signal Processing", "Antennas and Wave Propagation", "Embedded Systems", "VLSI Design Basics", "DSP / Embedded Lab"]],
      ["Industry Skills", ["Wireless Communication", "Information Theory and Coding", "Computer Networks", "IoT Fundamentals", "Professional Elective I", "Mini Project"]],
      ["Specialization", ["Microwave Engineering", "Optical Communication", "Professional Elective II", "Open Elective I", "Industrial Training / Internship", "Major Project Phase I"]],
      ["Project and Career Readiness", ["Satellite Communication", "Professional Elective III", "Open Elective II", "Seminar", "Major Project Phase II", "Placement and Technical Review"]]
    ]
  },
  mechanical: {
    code: "B.Tech Mechanical",
    title: "Mechanical Engineering Curriculum",
    intro: "A hands-on mechanical engineering plan covering mechanics, thermodynamics, manufacturing, CAD/CAM, machine design, and industrial automation.",
    focus: "Design + Manufacturing",
    lab: "Students practice workshop skills, thermal experiments, fluid machinery, CAD modelling, manufacturing processes, and mechanical testing.",
    career: "Mechanical graduates can enter design, production, maintenance, quality control, automobile, HVAC, CAD/CAM, and manufacturing roles.",
    semesters: [
      ["Engineering Foundation", ["Engineering Mathematics I", "Engineering Physics", "Engineering Mechanics", "Basic Electrical Engineering", "Engineering Graphics", "Workshop Practice"]],
      ["Mechanical Basics", ["Engineering Mathematics II", "Engineering Chemistry", "Material Science", "Basic Thermodynamics", "Environmental Science", "Workshop / Chemistry Lab"]],
      ["Core Mechanics", ["Strength of Materials", "Fluid Mechanics", "Manufacturing Processes", "Kinematics of Machines", "Machine Drawing", "Manufacturing Lab"]],
      ["Thermal and Design", ["Thermodynamics", "Dynamics of Machines", "Metrology and Measurements", "Production Technology", "CAD Basics", "Thermal Engineering Lab"]],
      ["Machine Systems", ["Heat Transfer", "Machine Design I", "Fluid Machinery", "Industrial Engineering", "CAD/CAM", "Fluid Machinery Lab"]],
      ["Advanced Manufacturing", ["Finite Element Methods", "Machine Design II", "Automobile Engineering", "Professional Elective I", "Open Elective I", "Mini Project"]],
      ["Industry Practice", ["Refrigeration and Air Conditioning", "Robotics and Automation", "Professional Elective II", "Open Elective II", "Industrial Training", "Major Project Phase I"]],
      ["Project and Career", ["Operations Research", "Professional Elective III", "Seminar", "Major Project Phase II", "Quality and Safety", "Placement Preparation"]]
    ]
  },
  eee: {
    code: "B.Tech EEE",
    title: "Electrical & Electronics Engineering Curriculum",
    intro: "A complete EEE curriculum covering circuits, machines, power systems, control, renewable energy, power electronics, and electrical drives.",
    focus: "Power + Control",
    lab: "Students use electrical machines, power electronics kits, circuit simulation, control systems, renewable energy models, and measurement tools.",
    career: "EEE graduates can work in power plants, electrical maintenance, renewable energy, automation, drives, utilities, testing, and core engineering roles.",
    semesters: [
      ["Engineering Foundation", ["Engineering Mathematics I", "Engineering Physics", "Basic Electrical Engineering", "Programming for Problem Solving", "Engineering Graphics", "Electrical Workshop"]],
      ["Circuit Basics", ["Engineering Mathematics II", "Engineering Chemistry", "Electrical Circuit Analysis", "Basic Electronics", "Environmental Science", "Circuits Lab"]],
      ["Electrical Core", ["Electrical Machines I", "Electromagnetic Fields", "Analog Electronics", "Signals and Systems", "Network Theory", "Machines I Lab"]],
      ["Power Foundation", ["Electrical Machines II", "Power Systems I", "Control Systems", "Digital Electronics", "Measurements and Instrumentation", "Control Systems Lab"]],
      ["Power Electronics", ["Power Systems II", "Power Electronics", "Microprocessors and Microcontrollers", "Electrical Drives", "Renewable Energy Basics", "Power Electronics Lab"]],
      ["Industrial Electrical", ["Switchgear and Protection", "High Voltage Engineering", "Utilization of Electrical Energy", "Professional Elective I", "Open Elective I", "Mini Project"]],
      ["Specialized Systems", ["Smart Grid Technology", "Power System Operation and Control", "Professional Elective II", "Open Elective II", "Industrial Internship", "Major Project Phase I"]],
      ["Project and Placement", ["Energy Management", "Professional Elective III", "Seminar", "Major Project Phase II", "Electrical Safety", "Placement and Technical Review"]]
    ]
  }
};

var branchPlacementSlides = {
  aiml: [
    ["AI Product Internships", "Students build ML solutions, dashboards, recommendation models, and AI chat workflows for portfolio-ready demonstrations."],
    ["Data Science Training", "Aptitude, Python, SQL, statistics, model evaluation, resume writing, and mock interviews are included in placement preparation."],
    ["Hiring Tracks", "Common roles include ML trainee, data analyst, AI application developer, cloud AI associate, and Python developer."]
  ],
  cs: [
    ["Coding Placement Track", "Weekly DSA practice, coding contests, GitHub portfolio reviews, and full-stack project evaluations support CS placements."],
    ["Software Companies", "Training focuses on Java, Python, web development, databases, operating systems, networks, and interview problem solving."],
    ["Hiring Tracks", "Common roles include software engineer trainee, full-stack developer, QA engineer, cloud associate, and support engineer."]
  ],
  civil: [
    ["Site Engineering Track", "Students prepare for site roles through estimation, surveying, safety, drawing reading, and project documentation practice."],
    ["Core Company Preparation", "AutoCAD, STAAD basics, quantity surveying, concrete testing, and interview communication are covered before drives."],
    ["Hiring Tracks", "Common roles include site engineer, CAD trainee, QA/QC assistant, planning trainee, and construction supervisor."]
  ],
  ece: [
    ["Embedded and IoT Track", "Students build microcontroller, sensor, IoT, and communication projects for practical placement discussion."],
    ["Electronics Core Training", "Preparation includes digital electronics, networks, microprocessors, communication systems, VLSI basics, and mock interviews."],
    ["Hiring Tracks", "Common roles include embedded trainee, telecom associate, electronics testing engineer, IoT developer, and software trainee."]
  ],
  mechanical: [
    ["Design and Production Track", "Students prepare with CAD models, manufacturing process reviews, workshop practice, quality basics, and project presentations."],
    ["Core Industry Preparation", "Training covers machine design, thermodynamics, production, automobile basics, aptitude, and technical interview practice."],
    ["Hiring Tracks", "Common roles include production trainee, design trainee, quality engineer, maintenance associate, and CAD/CAM trainee."]
  ],
  eee: [
    ["Power and Automation Track", "Students practice power systems, electrical machines, drives, protection, renewable energy, and PLC basics for core interviews."],
    ["Electrical Safety Preparation", "Training includes wiring standards, panel basics, testing methods, safety procedures, and technical viva sessions."],
    ["Hiring Tracks", "Common roles include electrical maintenance trainee, power systems associate, automation trainee, testing engineer, and utility roles."]
  ]
};

function renderCourseCurriculumPage() {
  var grid = document.querySelector("#semesterCurriculumGrid");
  if (!grid) return;

  var params = new URLSearchParams(window.location.search);
  var branchKey = params.get("branch") || "ece";
  var data = engineeringCourseData[branchKey] || engineeringCourseData.ece;
  var placements = branchPlacementSlides[branchKey] || branchPlacementSlides.ece;

  document.title = data.title + " - JGS Group of Institutes";
  document.querySelector("#courseCode").textContent = data.code;
  document.querySelector("#courseTitle").textContent = data.title;
  document.querySelector("#courseIntro").textContent = data.intro;
  document.querySelector("#courseProgram").textContent = data.code;
  document.querySelector("#courseFocus").textContent = data.focus;
  document.querySelector("#curriculumHeading").textContent = data.code + " Subjects from 1st to 8th Semester";
  document.querySelector("#applyCourseButton").textContent = "Apply for " + data.code.replace("B.Tech ", "");
  document.querySelector("#labEyebrow").textContent = data.code.replace("B.Tech ", "") + " Labs";
  document.querySelector("#labDescription").textContent = data.lab;
  document.querySelector("#careerHeading").textContent = "Career paths after " + data.code.replace("B.Tech ", "") + ".";
  document.querySelector("#careerDescription").textContent = data.career;

  grid.innerHTML = data.semesters.map(function (semester, index) {
    return '<article class="semester-card"><span>Semester ' + (index + 1) + '</span><h3>' + semester[0] + '</h3><ul>' +
      semester[1].map(function (subject) {
        return "<li>" + subject + "</li>";
      }).join("") +
      "</ul></article>";
  }).join("");

  var slider = document.querySelector("#placementSlider");
  slider.innerHTML = placements.map(function (slide, index) {
    return '<article class="placement-slide"><span>Placement ' + (index + 1) + '</span><h3>' + slide[0] + '</h3><p>' + slide[1] + '</p></article>';
  }).join("");

  setupPlacementSlider(slider);
}

function setupPlacementSlider(slider) {
  var next = document.querySelector("#placementNext");
  var prev = document.querySelector("#placementPrev");
  if (!slider || !next || !prev) return;

  function moveSlider(direction) {
    slider.scrollBy({ left: direction * Math.max(280, slider.clientWidth * 0.75), behavior: "smooth" });
  }

  next.addEventListener("click", function () { moveSlider(1); });
  prev.addEventListener("click", function () { moveSlider(-1); });

  setInterval(function () {
    if (!document.body.contains(slider)) return;
    var nearEnd = slider.scrollLeft + slider.clientWidth >= slider.scrollWidth - 8;
    if (nearEnd) slider.scrollTo({ left: 0, behavior: "smooth" });
    else moveSlider(1);
  }, 4500);
}

function renderAdminYearCalendar() {
  var calendar = document.querySelector("#adminYearCalendar");
  var detail = document.querySelector("#adminEventDetail");
  if (!calendar || !detail) return;

  var events = [
    ["Jun", "Admissions Opening", "School, Intermediate, and B.Tech applications open with document verification and counselling desk setup."],
    ["Jul", "Class Commencement", "Timetables, faculty loads, ID cards, attendance registers, and branch-wise orientation are finalized."],
    ["Aug", "Internal Assessment 1", "Internal exams, lab records, attendance audit, and first academic counselling review."],
    ["Sep", "Innovation Month", "Hackathon, project expo, industry talks, club events, and department-level student development activities."],
    ["Oct", "Fee Review", "Second fee collection review, pending-student list, scholarship follow-up, and exam eligibility tracking."],
    ["Nov", "Semester Exams", "Practical exams, hall ticket release, end-semester theory exams, and invigilation schedule."],
    ["Dec", "Result Review", "Semester results, failed-student list, remedial plans, mentor allocation, and parent communication."],
    ["Jan", "Placement Training", "Aptitude bootcamp, resume verification, mock interviews, coding tests, and company readiness review."],
    ["Feb", "Campus Drives", "Recruiter visits, interview schedules, internship shortlist, and offer-letter documentation."],
    ["Mar", "Supplementary Window", "Backlog applications, fee verification, teacher readiness, hall ticket release, and re-exam preparation."],
    ["Apr", "Project Viva", "Major project review, lab corrections, external viva preparation, and final academic audit."],
    ["May", "Annual Closure", "Placement reports, fee balance closure, academic promotion list, and next-year planning."]
  ];

  calendar.innerHTML = events.map(function (event, index) {
    return '<button type="button" style="--motion-order:' + (index % 10) + '" data-admin-event-title="' + escapeHTML(event[1]) + '" data-admin-event-detail="' + escapeHTML(event[2]) + '">' +
      '<span>' + escapeHTML(event[0]) + '</span><strong>' + escapeHTML(event[1]) + '</strong><em>2026-27</em></button>';
  }).join("");

  calendar.querySelectorAll("button").forEach(function (button) {
    button.addEventListener("click", function () {
      calendar.querySelectorAll("button").forEach(function (item) {
        item.classList.remove("active");
      });
      button.classList.add("active");
      detail.innerHTML =
        "<strong>" + escapeHTML(button.dataset.adminEventTitle) + "</strong>" +
        "<p>" + escapeHTML(button.dataset.adminEventDetail) + "</p>";
      detail.classList.add("active");
    });
  });
}

var currentDetailHash = "";

window.addEventListener("load", function () {
  setActiveNavigation();
  addDynamicNotice();
  animateCounters();
  setupCardTilt();
  setupCursorGlow();
  setupMotionLayer();
  setupVideoControls();
  setupMusicControls();
  setupGlobalMusicPlayer();
  setupTopPackageSlider();
  setupCompanySlider();
  loadDynamicSiteContent();
  setupHomeEnhancements();
  setupCourseFinder();
  setupApplicationStatusTracker();
  setupTeacherAttendanceCalendar();
  setupStudentCalendar();
  setupStudentBacklogSteps();
  renderAdminFinancePanel();
  renderAdminYearCalendar();
  renderCourseCurriculumPage();
  restorePortalSession();
  setupLoginEnhancements();
  setupPortalActionWidgets();
  setupPaymentPage();
  setTimeout(scrollToSelectedDetail, 250);
  currentDetailHash = window.location.hash;
});

window.addEventListener("hashchange", function () {
  scrollToSelectedDetail();
  currentDetailHash = window.location.hash;
});

setInterval(function () {
  if (document.querySelectorAll(".detail-panel").length > 0 && window.location.hash !== currentDetailHash) {
    currentDetailHash = window.location.hash;
    scrollToSelectedDetail();
  }
}, 250);

