
"use strict";

// ===== CONFIGURATION =====

const STORAGE_KEY = "resumeStudioDraftV1";

let currentStep = 1;
let selectedTemplate = "classic";
let entryIdCounter = 0;

let experienceEntries = [];
let internshipEntries = [];
let educationEntries = [];
let projectEntries = [];
let certificationEntries = [];
let skillsList = [];

const $ = (id) => document.getElementById(id);

const fieldIds = [
  "fullName", "jobTitle", "email", "phone", "location",
  "linkedin", "github", "portfolio", "summary",
  "skillsInput", "targetJD"
];

const emailPattern = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const phonePattern = /^[6-9][0-9]{9}$/;


// ===== SAFE HTML HELPERS =====

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeURL(value) {
  try {
    const url = new URL(value);

    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.href;
    }
  } catch (error) {
    // Invalid URL
  }

  return "";
}

function safeLink(value, label) {
  const url = safeURL(value);

  if (!url) return "";

  return `<a href="${escapeHTML(url)}" target="_blank"
    rel="noopener noreferrer">${escapeHTML(label)}</a>`;
}


// ===== VALIDATION =====

function setError(inputId, errorId, message) {
  const input = $(inputId);
  const error = $(errorId);

  if (!input || !error) return;

  error.textContent = message;
  input.classList.toggle("invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
}

function validateName() {
  const valid = $("fullName").value.trim().length > 0;

  setError(
    "fullName",
    "nameError",
    valid ? "" : "Please enter your full name."
  );

  return valid;
}

function validateEmail() {
  const email = $("email").value.trim();
  const valid = emailPattern.test(email);

  setError(
    "email",
    "emailError",
    valid ? "" : "Enter a valid email, e.g. name@gmail.com."
  );

  return valid;
}

function validatePhone() {
  const phone = $("phone").value.trim();
  const valid = phonePattern.test(phone);

  setError(
    "phone",
    "phoneError",
    valid ? "" : "Enter a valid 10-digit Indian mobile number."
  );

  return valid;
}

function validatePersonalInfo() {
  const nameValid = validateName();
  const emailValid = validateEmail();
  const phoneValid = validatePhone();

  return nameValid && emailValid && phoneValid;
}

$("fullName").addEventListener("input", validateName);
$("email").addEventListener("input", validateEmail);

$("phone").addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "").slice(0, 10);
  validatePhone();
});


// ===== STEP NAVIGATION =====

function goToStep(stepNumber) {
  const number = Number(stepNumber);

  if (!Number.isInteger(number) || number < 1 || number > 7) {
    return;
  }

  // Validate personal details before leaving Step 1.
  if (number > currentStep && currentStep === 1) {
    if (!validatePersonalInfo()) {
      if (!$("nameError").textContent) {
        $("fullName").focus();
      } else if (!$("emailError").textContent) {
        $("email").focus();
      } else {
        $("phone").focus();
      }

      return;
    }
  }

  currentStep = number;

  document.querySelectorAll(".form-step").forEach((section) => {
    section.classList.toggle(
      "active",
      section.id === "step" + currentStep
    );
  });

  document.querySelectorAll(".step-indicator").forEach((indicator) => {
    indicator.classList.toggle(
      "active",
      Number(indicator.dataset.step) === currentStep
    );
  });

  if (currentStep === 7) {
    renderResumePreview();
  }

  saveDraft();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

// Continue buttons
document.querySelectorAll(".btn-next").forEach((button) => {
  button.addEventListener("click", function (event) {
    event.preventDefault();
    goToStep(this.dataset.next);
  });
});

// Back buttons
document.querySelectorAll(".btn-prev").forEach((button) => {
  button.addEventListener("click", function (event) {
    event.preventDefault();
    goToStep(this.dataset.prev);
  });
});


// ===== OPTIONAL LINKS =====

$("addLinksToggle").addEventListener("change", function () {
  $("linksFields").classList.toggle("hidden", !this.checked);
  saveDraft();
});


// ===== FRESHER / EXPERIENCED =====

function updateExperienceMode() {
  const status = document.querySelector(
    'input[name="expStatus"]:checked'
  )?.value || "fresher";

  $("experienceSection").classList.toggle(
    "hidden",
    status !== "experienced"
  );

  $("fresherSection").classList.toggle(
    "hidden",
    status !== "fresher"
  );

  updateInternshipMode();
}

function updateInternshipMode() {
  const status = document.querySelector(
    'input[name="internshipStatus"]:checked'
  )?.value || "no";

  const isFresher = document.querySelector(
    'input[name="expStatus"]:checked'
  )?.value === "fresher";

  $("internshipSection").classList.toggle(
    "hidden",
    !(isFresher && status === "yes")
  );
}

document.querySelectorAll('input[name="expStatus"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    updateExperienceMode();
    saveDraft();
  });
});

document.querySelectorAll('input[name="internshipStatus"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    updateInternshipMode();
    saveDraft();
  });
});


// ===== DYNAMIC ENTRY CONFIGURATION =====

function createEntry(type, fields) {
  const entry = {
    id: type + "-" + (++entryIdCounter),
    type
  };

  fields.forEach((field) => {
    entry[field] = "";
  });

  return entry;
}

const entryConfigs = {
  experience: {
    container: "experienceList",
    array: () => experienceEntries,
    setArray: (arr) => {
      experienceEntries = arr;
    },
    fields: [
      ["role", "Job Title", "e.g. Software Developer"],
      ["company", "Company", "e.g. ABC Technologies"],
      ["duration", "Duration", "e.g. Jan 2025 - Present"],
      ["description", "Responsibilities / Achievements",
        "Describe your work and achievements...", true]
    ]
  },

  internship: {
    container: "internshipList",
    array: () => internshipEntries,
    setArray: (arr) => {
      internshipEntries = arr;
    },
    fields: [
      ["role", "Internship Role", "e.g. Web Development Intern"],
      ["company", "Company", "e.g. ABC Solutions"],
      ["duration", "Duration", "e.g. Jun 2026 - Jul 2026"],
      ["description", "Work Description",
        "Describe what you learned and completed...", true]
    ]
  },

  education: {
    container: "educationList",
    array: () => educationEntries,
    setArray: (arr) => {
      educationEntries = arr;
    },
    fields: [
      ["degree", "Degree / Course", "e.g. BCA"],
      ["institution", "Institution", "College or school name"],
      ["cgpa", "CGPA / Percentage", "e.g. 8.0 or 80%"],
      ["year", "Year", "e.g. 2024 - 2027"]
    ]
  },

  project: {
    container: "projectsList",
    array: () => projectEntries,
    setArray: (arr) => {
      projectEntries = arr;
    },
    fields: [
      ["title", "Project Name", "e.g. Resume Builder"],
      ["year", "Year", "e.g. 2026"],
      ["techStack", "Technologies Used", "e.g. HTML, CSS, JavaScript"],
      ["description", "Project Description",
        "Explain the purpose and features...", true]
    ]
  },

  certification: {
    container: "certificationsList",
    array: () => certificationEntries,
    setArray: (arr) => {
      certificationEntries = arr;
    },
    fields: [
      ["name", "Certificate Name", "e.g. Web Development"],
      ["issuer", "Issued By", "Organization name"],
      ["year", "Year", "e.g. 2026"]
    ]
  }
};


// ===== RENDER DYNAMIC ENTRIES =====

function renderEntries(type) {
  const config = entryConfigs[type];
  const container = $(config.container);

  if (!container) return;

  container.replaceChildren();

  config.array().forEach((entry) => {
    const block = document.createElement("div");
    block.className = "entry-block";

    config.fields.forEach(([field, label, placeholder, isTextarea]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "field";

      const labelElement = document.createElement("label");
      labelElement.textContent = label;
      labelElement.htmlFor = entry.id + "-" + field;

      const input = document.createElement(
        isTextarea ? "textarea" : "input"
      );

      if (!isTextarea) {
        input.type = "text";
      }

      if (isTextarea) {
        input.rows = 3;
      }

      input.id = entry.id + "-" + field;
      input.value = entry[field] || "";
      input.placeholder = placeholder;

      input.addEventListener("input", () => {
        entry[field] = input.value;
        saveDraft();
      });

      wrapper.append(labelElement, input);
      block.appendChild(wrapper);
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-entry";
    removeButton.textContent = "Remove";

    removeButton.addEventListener("click", () => {
      if (!confirm("Are you sure you want to remove this entry?")) {
        return;
      }

      config.setArray(
        config.array().filter((item) => item.id !== entry.id)
      );

      renderEntries(type);
      renderResumePreview();
      saveDraft();
    });

    block.appendChild(removeButton);
    container.appendChild(block);
  });
}

function addEntry(type) {
  const config = entryConfigs[type];

  const entry = createEntry(
    type,
    config.fields.map((field) => field[0])
  );

  config.setArray([...config.array(), entry]);

  renderEntries(type);
  saveDraft();
}


// Add buttons
$("addExperience").addEventListener("click", () => {
  addEntry("experience");
});

$("addInternship").addEventListener("click", () => {
  addEntry("internship");
});

$("addEducation").addEventListener("click", () => {
  addEntry("education");
});

$("addProject").addEventListener("click", () => {
  addEntry("project");
});

$("addCertification").addEventListener("click", () => {
  addEntry("certification");
});


// ===== SKILLS =====

function renderSkillsPreview() {
  const preview = $("skillsPreview");

  preview.replaceChildren();

  skillsList.forEach((skill) => {
    const tag = document.createElement("span");
    tag.className = "skill-tag";
    tag.textContent = skill;

    preview.appendChild(tag);
  });
}

$("skillsInput").addEventListener("input", () => {
  skillsList = [...new Set(
    $("skillsInput").value
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean)
  )];

  renderSkillsPreview();
  saveDraft();
});


// ===== ATS KEYWORD CHECKER =====

$("checkAts").addEventListener("click", (event) => {
  event.preventDefault();

  const jd = $("targetJD").value.trim();
  const result = $("atsResult");

  result.replaceChildren();
  result.classList.remove("hidden");

  if (!jd) {
    result.textContent = "Please paste a job description first.";
    return;
  }

  if (skillsList.length === 0) {
    result.textContent = "Please enter your skills first.";
    return;
  }

  const stopWords = new Set([
    "and", "the", "for", "with", "you", "your", "are", "will",
    "our", "this", "that", "from", "have", "has", "who", "can",
    "all", "not", "but", "job", "work", "into", "their", "they",
    "its", "was", "been", "being", "also", "such", "about", "any"
  ]);

  const normalize = (text) => text.toLowerCase()
    .replace(/[^a-z0-9+#.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const jdWords = [...new Set(
    normalize(jd).split(" ").filter(
      (word) => word.length > 1 && !stopWords.has(word)
    )
  )];

  const skillWords = skillsList.map(normalize);

  const matched = jdWords.filter((word) =>
    skillWords.some((skill) =>
      skill === word ||
      skill.split(" ").includes(word) ||
      (word.length > 2 && skill.includes(word))
    )
  );

  const missing = jdWords.filter((word) => !matched.includes(word));

  const score = jdWords.length
    ? Math.round((matched.length / jdWords.length) * 100)
    : 0;

  const heading = document.createElement("div");
  heading.className = "ats-score";
  heading.textContent = "Keyword Overlap: " + score + "%";

  const note = document.createElement("p");
  note.textContent =
    "Basic keyword comparison only. This is not an official ATS score.";

  const matchedText = document.createElement("p");
  matchedText.textContent = "Matched keywords: " + matched.length;

  const missingHeading = document.createElement("strong");
  missingHeading.textContent = "Keywords to review:";

  const keywordList = document.createElement("div");
  keywordList.className = "keyword-list";

  missing.slice(0, 20).forEach((word) => {
    const tag = document.createElement("span");
    tag.className = "keyword-tag";
    tag.textContent = word;
    keywordList.appendChild(tag);
  });

  if (missing.length === 0) {
    keywordList.textContent = "All checked keywords matched.";
  }

  result.append(
    heading,
    note,
    matchedText,
    missingHeading,
    keywordList
  );

  saveDraft();
});


// ===== RESUME PREVIEW =====

function addResumeSection(title, content) {
  if (!content) return "";

  return `
    <section class="r-section">
      <h3>${escapeHTML(title)}</h3>
      ${content}
    </section>
  `;
}

function renderEntriesForResume(entries, type) {
  return entries.map((entry) => {
    const values = (field) => escapeHTML(entry[field] || "");

    let heading = "";
    let details = "";

    if (type === "experience" || type === "internship") {
      heading = values("role");

      details = [
        values("company"),
        values("duration")
      ].filter(Boolean).join(" | ");

    } else if (type === "education") {
      heading = values("degree");

      details = [
        values("institution"),
        entry.cgpa ? "CGPA / Percentage: " + values("cgpa") : "",
        values("year")
      ].filter(Boolean).join(" | ");

    } else if (type === "project") {
      heading = values("title");

      details = [
        entry.year ? "Year: " + values("year") : "",
        entry.techStack ? "Technologies: " + values("techStack") : ""
      ].filter(Boolean).join(" | ");

    } else if (type === "certification") {
      heading = values("name");

      details = [
        values("issuer"),
        values("year")
      ].filter(Boolean).join(" | ");
    }

    const description = entry.description
      ? `<p>${values("description").replace(/\n/g, "<br>")}</p>`
      : "";

    return `
      <div class="resume-entry">
        ${heading ? `<p><strong>${heading}</strong></p>` : ""}
        ${details ? `<p class="muted">${details}</p>` : ""}
        ${description}
      </div>
    `;
  }).join("");
}

function renderResumePreview() {
  const fullName = $("fullName").value.trim() || "Your Name";
  const jobTitle = $("jobTitle").value.trim();
  const email = $("email").value.trim();
  const phone = $("phone").value.trim();
  const location = $("location").value.trim();
  const summary = $("summary").value.trim();

  let html = `
    <h2>${escapeHTML(fullName)}</h2>

    ${jobTitle
      ? `<p class="resume-role">${escapeHTML(jobTitle)}</p>`
      : ""}

    <p class="contact-line">
      ${[email, phone, location].filter(Boolean).map(escapeHTML).join(" | ")}
    </p>
  `;

  const links = [
    safeLink($("linkedin").value.trim(), "LinkedIn"),
    safeLink($("github").value.trim(), "GitHub"),
    safeLink($("portfolio").value.trim(), "Portfolio")
  ].filter(Boolean);

  if (links.length) {
    html += `<div class="r-links">${links.join(" ")}</div>`;
  }

  if (summary) {
    html += addResumeSection(
      "Profile Summary",
      `<p>${escapeHTML(summary).replace(/\n/g, "<br>")}</p>`
    );
  }

  const expStatus = document.querySelector(
    'input[name="expStatus"]:checked'
  )?.value;

  if (expStatus === "experienced" && experienceEntries.length) {
    html += addResumeSection(
      "Work Experience",
      renderEntriesForResume(experienceEntries, "experience")
    );
  }

  if (
    expStatus === "fresher" &&
    !$("internshipSection").classList.contains("hidden") &&
    internshipEntries.length
  ) {
    html += addResumeSection(
      "Internships",
      renderEntriesForResume(internshipEntries, "internship")
    );
  }

  if (educationEntries.length) {
    html += addResumeSection(
      "Education",
      renderEntriesForResume(educationEntries, "education")
    );
  }

  if (projectEntries.length) {
    html += addResumeSection(
      "Projects",
      renderEntriesForResume(projectEntries, "project")
    );
  }

  if (skillsList.length) {
    html += addResumeSection(
      "Skills",
      `<p>${skillsList.map(escapeHTML).join(", ")}</p>`
    );
  }

  if (certificationEntries.length) {
    html += addResumeSection(
      "Certifications",
      renderEntriesForResume(certificationEntries, "certification")
    );
  }

  $("resumePreview").className =
    "resume-preview " + selectedTemplate;

  $("resumePreview").innerHTML = html;
}


// ===== TEMPLATE SELECTION =====

document.querySelectorAll(".template-option").forEach((button) => {
  button.addEventListener("click", (event) => {
    event.preventDefault();

    selectedTemplate = button.dataset.template;

    document.querySelectorAll(".template-option").forEach((item) => {
      item.classList.toggle("active", item === button);
    });

    renderResumePreview();
    saveDraft();
  });
});


// ===== DRAFT STORAGE =====

function collectDraft() {
  const fields = {};

  fieldIds.forEach((id) => {
    fields[id] = $(id).value;
  });

  return {
    version: 1,
    fields,
    addLinks: $("addLinksToggle").checked,

    expStatus: document.querySelector(
      'input[name="expStatus"]:checked'
    )?.value || "fresher",

    internshipStatus: document.querySelector(
      'input[name="internshipStatus"]:checked'
    )?.value || "no",

    experienceEntries,
    internshipEntries,
    educationEntries,
    projectEntries,
    certificationEntries,
    skillsList,
    selectedTemplate,
    currentStep,
    entryIdCounter
  };
}

function saveDraft() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(collectDraft())
    );

    $("saveStatus").textContent = "Draft saved in this browser";

  } catch (error) {
    $("saveStatus").textContent = "Draft could not be saved";
  }
}

function restoreDraft() {
  let draft;

  try {
    draft = JSON.parse(
      localStorage.getItem(STORAGE_KEY) || "null"
    );
  } catch (error) {
    return;
  }

  if (!draft || draft.version !== 1) return;

  // Restore text fields
  fieldIds.forEach((id) => {
    if (typeof draft.fields?.[id] === "string") {
      $(id).value = draft.fields[id];
    }
  });

  // Restore optional links
  $("addLinksToggle").checked = Boolean(draft.addLinks);

  $("linksFields").classList.toggle(
    "hidden",
    !draft.addLinks
  );

  // Restore experience status
  const expStatus =
    draft.expStatus === "experienced"
      ? "experienced"
      : "fresher";

  const expRadio = document.querySelector(
    `input[name="expStatus"][value="${expStatus}"]`
  );

  if (expRadio) {
    expRadio.checked = true;
  }

  // Restore internship status
  const internStatus =
    draft.internshipStatus === "yes" ? "yes" : "no";

  const internRadio = document.querySelector(
    `input[name="internshipStatus"][value="${internStatus}"]`
  );

  if (internRadio) {
    internRadio.checked = true;
  }

  // Clean and restore dynamic entries
  function cleanEntries(entries, type) {
    if (!Array.isArray(entries)) return [];

    const fields = entryConfigs[type].fields.map(
      (item) => item[0]
    );

    return entries.slice(0, 50).map((entry) => {
      const safe = {
        id: typeof entry.id === "string"
          ? entry.id
          : type + "-" + (++entryIdCounter),
        type
      };

      fields.forEach((field) => {
        safe[field] = typeof entry[field] === "string"
          ? entry[field].slice(0, 10000)
          : "";
      });

      return safe;
    });
  }

  experienceEntries = cleanEntries(
    draft.experienceEntries,
    "experience"
  );

  internshipEntries = cleanEntries(
    draft.internshipEntries,
    "internship"
  );

  educationEntries = cleanEntries(
    draft.educationEntries,
    "education"
  );

  projectEntries = cleanEntries(
    draft.projectEntries,
    "project"
  );

  certificationEntries = cleanEntries(
    draft.certificationEntries,
    "certification"
  );

  // Restore skills
  skillsList = Array.isArray(draft.skillsList)
    ? draft.skillsList
        .filter((item) => typeof item === "string")
        .slice(0, 100)
    : [];

  // Restore template
  selectedTemplate = [
    "classic",
    "modern",
    "minimal"
  ].includes(draft.selectedTemplate)
    ? draft.selectedTemplate
    : "classic";

  entryIdCounter = Math.max(
    Number(draft.entryIdCounter) || 0,
    entryIdCounter
  );

  // Render restored data
  Object.keys(entryConfigs).forEach(renderEntries);

  renderSkillsPreview();
  updateExperienceMode();

  document.querySelectorAll(".template-option").forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.template === selectedTemplate
    );
  });

  // Always start at Step 1 when the page opens.
  goToStep(1);
}


// ===== PRINT / SAVE AS PDF =====

$("downloadPdf").addEventListener("click", (event) => {
  event.preventDefault();

  if (!validatePersonalInfo()) {
    goToStep(1);
    return;
  }

  renderResumePreview();

  const oldTitle = document.title;

  document.title = (
    $("fullName").value.trim().replace(/[^a-z0-9_-]/gi, "_")
    || "Resume"
  ) + "_Resume";

  window.print();

  setTimeout(() => {
    document.title = oldTitle;
  }, 1000);
});


// ===== CLEAR SAVED DRAFT =====

$("clearDraft").addEventListener("click", (event) => {
  event.preventDefault();

  if (!confirm("Clear the saved draft and reset all resume details?")) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
});


// ===== AUTO-SAVE PERSONAL FIELDS =====

fieldIds.forEach((id) => {
  $(id).addEventListener("input", () => {
    saveDraft();

    if (currentStep === 7) {
      renderResumePreview();
    }
  });
});


// ===== INITIALIZE =====

restoreDraft();
updateExperienceMode();
renderSkillsPreview();
renderResumePreview();
