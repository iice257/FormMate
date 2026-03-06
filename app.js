const sampleQuestions = [
  "Tell us about your professional background.",
  "Why are you interested in this opportunity?",
  "Describe a project where you solved a difficult problem.",
  "Share any constraints or accommodation needs.",
];

const aiStarterAnswers = [
  "I have 5+ years of experience in product-focused software work, blending frontend development with user research.",
  "This role aligns with my interest in building accessible tools that reduce repetitive administrative work.",
  "I led a form automation redesign where I mapped dynamic fields, reducing average completion time by 38%.",
  "I work best with clear milestones and asynchronous communication; no additional accommodations are currently needed.",
];

const state = {
  questions: [],
  darkMode: false,
};

const el = {
  themeToggle: document.querySelector("#themeToggle"),
  formUrl: document.querySelector("#formUrl"),
  loadForm: document.querySelector("#loadForm"),
  urlStatus: document.querySelector("#urlStatus"),
  chatLog: document.querySelector("#chatLog"),
  chatInput: document.querySelector("#chatInput"),
  sendMessage: document.querySelector("#sendMessage"),
  voiceInput: document.querySelector("#voiceInput"),
  questionList: document.querySelector("#questionList"),
  questionTemplate: document.querySelector("#questionTemplate"),
  regenerateAll: document.querySelector("#regenerateAll"),
  reviewAnswers: document.querySelector("#reviewAnswers"),
  fillForm: document.querySelector("#fillForm"),
  actionStatus: document.querySelector("#actionStatus"),
};

const pushMessage = (text, role = "system") => {
  const message = document.createElement("p");
  message.className = `message ${role}`;
  message.textContent = text;
  el.chatLog.appendChild(message);
  el.chatLog.scrollTop = el.chatLog.scrollHeight;
};

const buildAnswers = () => {
  state.questions = sampleQuestions.map((question, index) => ({
    question,
    answer: aiStarterAnswers[index],
    approved: false,
  }));
  renderQuestions();
};

const renderQuestions = () => {
  el.questionList.innerHTML = "";

  state.questions.forEach((item, index) => {
    const node = el.questionTemplate.content.firstElementChild.cloneNode(true);
    const label = node.querySelector(".question-label");
    const textarea = node.querySelector("textarea");
    const regenerateBtn = node.querySelector('[data-action="regenerate"]');
    const approveBtn = node.querySelector('[data-action="approve"]');

    label.textContent = item.question;
    textarea.value = item.answer;

    textarea.addEventListener("input", (event) => {
      state.questions[index].answer = event.target.value;
    });

    regenerateBtn.addEventListener("click", () => {
      state.questions[index].answer = `${aiStarterAnswers[index]} (refined for your context)`;
      renderQuestions();
      el.actionStatus.textContent = `Regenerated answer for question ${index + 1}.`;
    });

    approveBtn.addEventListener("click", () => {
      state.questions[index].approved = !state.questions[index].approved;
      approveBtn.textContent = state.questions[index].approved ? "Approved ✅" : "Approve";
      el.actionStatus.textContent = state.questions[index].approved
        ? `Question ${index + 1} marked approved.`
        : `Question ${index + 1} approval removed.`;
    });

    if (item.approved) {
      approveBtn.textContent = "Approved ✅";
    }

    el.questionList.appendChild(node);
  });
};

el.themeToggle.addEventListener("click", () => {
  state.darkMode = !state.darkMode;
  document.body.classList.toggle("dark", state.darkMode);
  el.themeToggle.textContent = state.darkMode ? "☀️ Light mode" : "🌙 Dark mode";
});

el.loadForm.addEventListener("click", () => {
  const urlValue = el.formUrl.value.trim();
  if (!urlValue) {
    el.urlStatus.textContent = "Please enter a valid form URL first.";
    return;
  }

  buildAnswers();
  pushMessage(`Loaded form: ${urlValue}`);
  pushMessage("I found 4 likely text fields and generated starter responses.");
  el.urlStatus.textContent = "Questions loaded successfully.";
  el.urlStatus.classList.add("success");
  el.actionStatus.textContent = "Review or edit each answer before filling fields.";
});

el.sendMessage.addEventListener("click", () => {
  const text = el.chatInput.value.trim();
  if (!text) {
    return;
  }

  pushMessage(text, "user");
  pushMessage("Got it — I'll use that context to improve your answer suggestions.");
  el.chatInput.value = "";
});

el.chatInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    el.sendMessage.click();
  }
});

el.regenerateAll.addEventListener("click", () => {
  if (!state.questions.length) {
    el.actionStatus.textContent = "Load a form first to regenerate answers.";
    return;
  }

  state.questions = state.questions.map((item, index) => ({
    ...item,
    answer: `${aiStarterAnswers[index]} (updated with your latest chat context)`,
    approved: false,
  }));

  renderQuestions();
  el.actionStatus.textContent = "Regenerated all answers.";
});

el.reviewAnswers.addEventListener("click", () => {
  if (!state.questions.length) {
    el.actionStatus.textContent = "Load a form first to review answers.";
    return;
  }

  const approvedCount = state.questions.filter((item) => item.approved).length;
  el.actionStatus.textContent = `Review complete: ${approvedCount}/${state.questions.length} answers approved.`;
});

el.fillForm.addEventListener("click", () => {
  if (!state.questions.length) {
    el.actionStatus.textContent = "Nothing to fill yet. Start by loading a form URL.";
    return;
  }

  const hasEmpty = state.questions.some((item) => !item.answer.trim());
  if (hasEmpty) {
    el.actionStatus.textContent = "Some answers are empty. Please complete them before filling.";
    return;
  }

  el.actionStatus.textContent = "Ready to fill fields. (Submission remains user-initiated.)";
  el.actionStatus.classList.add("success");
});

el.voiceInput.addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    pushMessage("Voice input isn't supported in this browser; type your context instead.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.start();
  pushMessage("Listening… speak now.");

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    el.chatInput.value = transcript;
    pushMessage(`Transcribed: ${transcript}`);
  };

  recognition.onerror = () => {
    pushMessage("Voice capture failed. Please try again or type your message.");
  };
});

pushMessage("Welcome to FormMate. Paste a form URL to get started.");
