/* ========================================
   KPT Consonant Gradation Quiz - JavaScript
======================================== */

class KPTQuiz {
  constructor() {
    this.questions = [];
    this.subtopics = [];
    this.rules = {};
    this.selectedQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.questionsPerQuiz = 10;
    this.selectedSubtopics = new Set(["all"]); // Multi-select support
    this.mode = "mcq";

    this.init();
  }

  async init() {
    await this.loadQuestions();
    this.setupEventListeners();
    this.populateRules();
  }

  async loadQuestions() {
    try {
      const response = await fetch("questions.json");
      const data = await response.json();
      this.questions = data.questions;
      this.subtopics = data.subtopics || [];
      this.rules = data.rules || {};

      document.getElementById("topicTitle").textContent = data.description;
      document.getElementById("quizTitle").textContent = data.title;
      document.getElementById("quizDescription").textContent =
        data.instructions;

      this.populateSubtopicCheckboxes();
      this.updateQuestionCount();
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  }

  populateSubtopicCheckboxes() {
    const container = document.getElementById("subtopicCheckboxes");
    if (!container) return;

    container.innerHTML = "";

    this.subtopics.forEach((subtopic) => {
      const label = document.createElement("label");
      label.className = "subtopic-checkbox-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = subtopic.id;
      checkbox.className = "subtopic-checkbox";
      checkbox.checked = subtopic.id === "all";

      checkbox.addEventListener("change", (e) => {
        this.handleSubtopicChange(e.target);
      });

      const span = document.createElement("span");
      span.textContent = `${subtopic.icon} ${subtopic.name}`;

      label.appendChild(checkbox);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  handleSubtopicChange(checkbox) {
    const value = checkbox.value;

    if (value === "all") {
      // If "All" is checked, uncheck everything else
      if (checkbox.checked) {
        this.selectedSubtopics.clear();
        this.selectedSubtopics.add("all");
        document.querySelectorAll(".subtopic-checkbox").forEach((cb) => {
          cb.checked = cb.value === "all";
        });
      } else {
        this.selectedSubtopics.delete("all");
      }
    } else {
      // If any specific subtopic is checked, uncheck "All"
      const allCheckbox = document.querySelector(
        '.subtopic-checkbox[value="all"]'
      );
      if (allCheckbox) {
        allCheckbox.checked = false;
        this.selectedSubtopics.delete("all");
      }

      if (checkbox.checked) {
        this.selectedSubtopics.add(value);
      } else {
        this.selectedSubtopics.delete(value);
      }

      // If nothing selected, select "All"
      if (this.selectedSubtopics.size === 0) {
        this.selectedSubtopics.add("all");
        if (allCheckbox) allCheckbox.checked = true;
      }
    }

    this.updateQuestionCount();
  }

  selectAllSubtopics() {
    this.selectedSubtopics.clear();
    this.selectedSubtopics.add("all");
    document.querySelectorAll(".subtopic-checkbox").forEach((cb) => {
      cb.checked = cb.value === "all";
    });
    this.updateQuestionCount();
  }

  clearAllSubtopics() {
    // Clear all but keep "all" selected as fallback
    this.selectedSubtopics.clear();
    this.selectedSubtopics.add("all");
    document.querySelectorAll(".subtopic-checkbox").forEach((cb) => {
      cb.checked = cb.value === "all";
    });
    this.updateQuestionCount();
  }

  populateRules() {
    const grid = document.getElementById("rulesGrid");
    if (!grid || !this.rules.strong_to_weak) return;

    grid.innerHTML = this.rules.strong_to_weak
      .map(
        (rule) => `
        <div class="rule-item">
          <span class="rule-strong">${rule.strong}</span>
          <span class="rule-arrow">→</span>
          <span class="rule-weak">${rule.weak}</span>
        </div>
      `
      )
      .join("");
  }

  updateQuestionCount() {
    const filtered = this.getFilteredQuestions();
    const countEl = document.getElementById("questionCount");
    countEl.textContent = `${filtered.length} questions available`;
  }

  getFilteredQuestions() {
    if (this.selectedSubtopics.has("all")) {
      return this.questions;
    }
    return this.questions.filter((q) => this.selectedSubtopics.has(q.subtopic));
  }

  setupEventListeners() {
    // Mode tabs
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document
          .querySelectorAll(".mode-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.mode = tab.dataset.mode;
        document.getElementById("modeDisplay").textContent =
          this.mode === "mcq" ? "📝 Multiple Choice" : "✍️ Written";
      });
    });

    // Select All / Clear All buttons
    const selectAllBtn = document.getElementById("selectAllBtn");
    if (selectAllBtn) {
      selectAllBtn.addEventListener("click", () => this.selectAllSubtopics());
    }

    const clearAllBtn = document.getElementById("clearAllBtn");
    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", () => this.clearAllSubtopics());
    }

    // Start button
    document.getElementById("startBtn").addEventListener("click", () => {
      this.startQuiz();
    });

    // Submit written answer
    document
      .getElementById("submitWrittenBtn")
      .addEventListener("click", () => {
        this.checkWrittenAnswer();
      });

    // Enter key for written input
    document
      .getElementById("writtenAnswer")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.checkWrittenAnswer();
        }
      });

    // Next button
    document.getElementById("nextBtn").addEventListener("click", () => {
      this.nextQuestion();
    });

    // Retry button
    document.getElementById("retryBtn").addEventListener("click", () => {
      this.showScreen("startScreen");
    });
  }

  startQuiz() {
    const filtered = this.getFilteredQuestions();
    this.selectedQuestions = this.shuffleArray([...filtered]).slice(
      0,
      this.questionsPerQuiz
    );
    this.currentIndex = 0;
    this.score = 0;

    this.showScreen("quizScreen");
    this.showQuestion();
  }

  showQuestion() {
    const question = this.selectedQuestions[this.currentIndex];

    // Update progress
    const progress =
      ((this.currentIndex + 1) / this.selectedQuestions.length) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${
      this.currentIndex + 1
    } / ${this.selectedQuestions.length}`;

    // Update KPT display
    document.getElementById("wordText").textContent = question.word;
    document.getElementById("endingText").textContent = question.ending;
    document.getElementById(
      "ruleHint"
    ).innerHTML = `<span class="rule-badge">${question.rule}</span>`;

    // Update question text
    document.getElementById(
      "questionText"
    ).textContent = `What is ${question.word} ${question.ending}?`;
    document.getElementById(
      "englishHint"
    ).textContent = `(${question.english})`;

    // Reset UI
    document.getElementById("feedback").classList.add("hidden");
    document.getElementById("nextBtn").classList.add("hidden");

    if (this.mode === "mcq") {
      document.getElementById("mcqContainer").classList.remove("hidden");
      document.getElementById("writtenContainer").classList.add("hidden");
      this.showMCQOptions(question);
    } else {
      document.getElementById("mcqContainer").classList.add("hidden");
      document.getElementById("writtenContainer").classList.remove("hidden");
      const input = document.getElementById("writtenAnswer");
      input.value = "";
      input.classList.remove("correct", "incorrect");
      input.disabled = false;
      input.focus();
      document.getElementById("submitWrittenBtn").classList.remove("hidden");
    }
  }

  showMCQOptions(question) {
    const container = document.getElementById("mcqContainer");
    const options = this.generateOptions(question);

    container.innerHTML = options
      .map(
        (option, index) => `
        <button class="option-btn" data-answer="${option}" data-index="${index}">
          ${option}
        </button>
      `
      )
      .join("");

    container.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.checkMCQAnswer(btn, question);
      });
    });
  }

  generateOptions(question) {
    const correct = question.answer;
    const options = [correct];

    // Generate wrong options based on KPT patterns
    const wrongOptions = this.generateWrongOptions(question);

    while (options.length < 4 && wrongOptions.length > 0) {
      const wrong = wrongOptions.shift();
      if (!options.includes(wrong)) {
        options.push(wrong);
      }
    }

    // Fill with variations if needed
    while (options.length < 4) {
      const variation = this.createVariation(correct, options);
      if (variation && !options.includes(variation)) {
        options.push(variation);
      }
    }

    return this.shuffleArray(options);
  }

  generateWrongOptions(question) {
    const word = question.word.toLowerCase();
    const answer = question.answer;
    const wrongOptions = [];

    // Common KPT mistakes
    const kptPatterns = {
      "pp-p": [
        word + "n", // no change
        word.replace(/pp/g, "p") + "n",
      ],
      "tt-t": [word + "n", word.replace(/tt/g, "t") + "n"],
      "kk-k": [word + "n", word.replace(/kk/g, "k") + "n"],
      "p-v": [word + "n", word.replace(/p([aeiouäö])/g, "b$1") + "n"],
      "t-d": [word + "n", word.replace(/t([aeiouäö])/g, "tt$1") + "n"],
      "k-removed": [word + "n", word.replace(/k/g, "g") + "n"],
      "nk-ng": [word + "n", word.replace(/nk/g, "n") + "n"],
      "mp-mm": [word + "n", word.replace(/mp/g, "m") + "n"],
      "nt-nn": [word + "n", word.replace(/nt/g, "n") + "n"],
      "lt-ll": [word + "n", word.replace(/lt/g, "l") + "n"],
      "rt-rr": [word + "n", word.replace(/rt/g, "r") + "n"],
    };

    // Add patterns for this question type
    if (kptPatterns[question.subtopic]) {
      wrongOptions.push(...kptPatterns[question.subtopic]);
    }

    // Add some general wrong answers
    wrongOptions.push(
      word + "n",
      answer.slice(0, -1) + "a",
      answer.slice(0, -1) + "ä",
      answer + "n"
    );

    return wrongOptions.filter((opt) => opt !== answer && opt.length > 2);
  }

  createVariation(correct, existing) {
    const variations = [
      correct.slice(0, -1) + "a",
      correct.slice(0, -1) + "ä",
      correct.slice(0, -1) + "n",
      correct + "n",
      correct.slice(0, -2) + correct.slice(-1),
    ];

    for (const v of variations) {
      if (!existing.includes(v) && v !== correct && v.length > 2) {
        return v;
      }
    }
    return null;
  }

  checkMCQAnswer(btn, question) {
    const answer = btn.dataset.answer;
    const isCorrect = answer.toLowerCase() === question.answer.toLowerCase();

    // Disable all buttons
    document.querySelectorAll(".option-btn").forEach((b) => {
      b.disabled = true;
      if (b.dataset.answer.toLowerCase() === question.answer.toLowerCase()) {
        b.classList.add("correct");
      }
    });

    if (isCorrect) {
      this.score++;
      btn.classList.add("correct");
    } else {
      btn.classList.add("incorrect");
    }

    this.showFeedback(isCorrect, question);
  }

  checkWrittenAnswer() {
    const input = document.getElementById("writtenAnswer");
    const userAnswer = input.value.trim();
    const question = this.selectedQuestions[this.currentIndex];

    if (!userAnswer) return;

    const isCorrect = this.fuzzyMatch(userAnswer, question.answer);

    input.disabled = true;
    document.getElementById("submitWrittenBtn").classList.add("hidden");

    if (isCorrect) {
      this.score++;
      input.classList.add("correct");
    } else {
      input.classList.add("incorrect");
    }

    this.showFeedback(isCorrect, question);
  }

  fuzzyMatch(input, correct) {
    const normalizedInput = input.toLowerCase().trim();
    const normalizedCorrect = correct.toLowerCase().trim();

    if (normalizedInput === normalizedCorrect) return true;

    // Calculate Levenshtein distance
    const distance = this.levenshteinDistance(
      normalizedInput,
      normalizedCorrect
    );
    const maxLength = Math.max(
      normalizedInput.length,
      normalizedCorrect.length
    );
    const similarity = 1 - distance / maxLength;

    return similarity >= 0.85;
  }

  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  showFeedback(isCorrect, question) {
    const feedback = document.getElementById("feedback");
    feedback.classList.remove("hidden", "correct", "incorrect");
    feedback.classList.add(isCorrect ? "correct" : "incorrect");

    feedback.querySelector(".feedback-icon").textContent = isCorrect
      ? "✅"
      : "❌";
    feedback.querySelector(".feedback-text").textContent = isCorrect
      ? "Oikein! Correct!"
      : `Väärin! The answer is: ${question.answer}`;

    document.getElementById("explanationText").textContent =
      question.explanation;
    document.getElementById("nextBtn").classList.remove("hidden");
  }

  nextQuestion() {
    this.currentIndex++;

    if (this.currentIndex >= this.selectedQuestions.length) {
      this.showResults();
    } else {
      this.showQuestion();
    }
  }

  showResults() {
    this.showScreen("resultsScreen");

    const percentage = Math.round(
      (this.score / this.selectedQuestions.length) * 100
    );

    document.getElementById("scoreNumber").textContent = this.score;
    document.getElementById("scoreTotal").textContent =
      this.selectedQuestions.length;
    document.getElementById("scorePercentage").textContent = `${percentage}%`;

    let message, icon;
    if (percentage >= 90) {
      message = "Erinomaista! Excellent!";
      icon = "🏆";
    } else if (percentage >= 70) {
      message = "Hyvä työ! Good job!";
      icon = "🎉";
    } else if (percentage >= 50) {
      message = "Ihan hyvä! Not bad!";
      icon = "👍";
    } else {
      message = "Harjoittele lisää! Keep practicing!";
      icon = "💪";
    }

    document.getElementById("scoreMessage").textContent = message;
    document.getElementById("resultsIcon").textContent = icon;
  }

  showScreen(screenId) {
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.add("hidden"));
    document.getElementById(screenId).classList.remove("hidden");
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}

// Initialize quiz
document.addEventListener("DOMContentLoaded", () => {
  new KPTQuiz();
});
