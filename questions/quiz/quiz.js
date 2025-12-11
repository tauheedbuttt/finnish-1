// Finnish Questions Quiz - JavaScript

class QuestionsQuiz {
  constructor() {
    this.questions = [];
    this.allQuestions = [];
    this.subtopics = [];
    this.currentQuestion = 0;
    this.score = 0;
    this.answers = [];
    this.mode = "mcq"; // 'mcq' or 'written'
    this.selectedSubtopics = new Set();
    this.questionsPerQuiz = 10;

    this.init();
  }

  async init() {
    await this.loadQuestions();
    this.setupEventListeners();
    this.setupModeToggle();
    this.setupSubtopicCheckboxes();
  }

  async loadQuestions() {
    try {
      const response = await fetch("questions.json");
      const data = await response.json();
      this.allQuestions = data.questions;
      this.subtopics = data.subtopics;

      // Update UI with quiz info
      document.getElementById("quizTitle").textContent = data.topic;
      document.getElementById("topicTitle").textContent = data.description;
      document.getElementById("quizDescription").textContent = data.description;

      // Select all subtopics by default (except 'all')
      this.subtopics.forEach((st) => {
        if (st.id !== "all") {
          this.selectedSubtopics.add(st.id);
        }
      });
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  }

  setupSubtopicCheckboxes() {
    const container = document.getElementById("subtopicCheckboxes");
    container.innerHTML = "";

    this.subtopics.forEach((subtopic) => {
      if (subtopic.id === "all") return; // Skip 'all' option for checkboxes

      const isChecked = this.selectedSubtopics.has(subtopic.id);
      const checkboxHtml = `
        <input type="checkbox" 
               id="subtopic-${subtopic.id}" 
               class="subtopic-checkbox" 
               value="${subtopic.id}"
               ${isChecked ? "checked" : ""}>
        <label for="subtopic-${subtopic.id}" class="subtopic-label">
          <span class="checkbox-icon">${isChecked ? "✓" : ""}</span>
          <span>${subtopic.icon} ${subtopic.name}</span>
        </label>
      `;
      container.insertAdjacentHTML("beforeend", checkboxHtml);
    });

    // Add event listeners to checkboxes
    container.querySelectorAll(".subtopic-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        const subtopicId = e.target.value;
        const label = e.target.nextElementSibling;
        const icon = label.querySelector(".checkbox-icon");

        if (e.target.checked) {
          this.selectedSubtopics.add(subtopicId);
          icon.textContent = "✓";
        } else {
          this.selectedSubtopics.delete(subtopicId);
          icon.textContent = "";
        }
        this.updateQuestionCount();
      });
    });

    // Select All / Clear All buttons
    document.getElementById("selectAllBtn").addEventListener("click", () => {
      this.subtopics.forEach((st) => {
        if (st.id !== "all") {
          this.selectedSubtopics.add(st.id);
        }
      });
      this.updateCheckboxUI();
      this.updateQuestionCount();
    });

    document.getElementById("clearAllBtn").addEventListener("click", () => {
      this.selectedSubtopics.clear();
      this.updateCheckboxUI();
      this.updateQuestionCount();
    });

    this.updateQuestionCount();
  }

  updateCheckboxUI() {
    document.querySelectorAll(".subtopic-checkbox").forEach((checkbox) => {
      const isChecked = this.selectedSubtopics.has(checkbox.value);
      checkbox.checked = isChecked;
      const icon = checkbox.nextElementSibling.querySelector(".checkbox-icon");
      icon.textContent = isChecked ? "✓" : "";
    });
  }

  updateQuestionCount() {
    const filtered = this.allQuestions.filter((q) =>
      this.selectedSubtopics.has(q.subtopic)
    );
    const count = filtered.length;
    const countEl = document.getElementById("questionCount");
    countEl.textContent = `${count} question${
      count !== 1 ? "s" : ""
    } available`;

    // Disable start button if no questions
    const startBtn = document.getElementById("startBtn");
    if (count === 0) {
      startBtn.disabled = true;
      startBtn.style.opacity = "0.5";
    } else {
      startBtn.disabled = false;
      startBtn.style.opacity = "1";
    }
  }

  setupModeToggle() {
    const modeTabs = document.querySelectorAll(".mode-tab");
    modeTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        modeTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.mode = tab.dataset.mode;
      });
    });
  }

  setupEventListeners() {
    document
      .getElementById("startBtn")
      .addEventListener("click", () => this.startQuiz());
    document
      .getElementById("nextBtn")
      .addEventListener("click", () => this.nextQuestion());
    document
      .getElementById("retryBtn")
      .addEventListener("click", () => this.resetQuiz());
    document
      .getElementById("reviewBtn")
      .addEventListener("click", () => this.showReview());
    document
      .getElementById("submitWrittenBtn")
      .addEventListener("click", () => this.checkWrittenAnswer());

    // Enter key for written input
    document
      .getElementById("writtenInput")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.checkWrittenAnswer();
        }
      });
  }

  startQuiz() {
    // Filter questions based on selected subtopics
    const filteredQuestions = this.allQuestions.filter((q) =>
      this.selectedSubtopics.has(q.subtopic)
    );

    if (filteredQuestions.length === 0) {
      alert("Valitse ainakin yksi aihe!");
      return;
    }

    // Shuffle and pick questions
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    this.questions = shuffled.slice(
      0,
      Math.min(this.questionsPerQuiz, shuffled.length)
    );

    this.currentQuestion = 0;
    this.score = 0;
    this.answers = [];

    // Update mode indicator
    this.updateModeIndicator();

    document.getElementById("startScreen").classList.add("hidden");
    document.getElementById("quizScreen").classList.remove("hidden");

    this.showQuestion();
  }

  updateModeIndicator() {
    const icon = document.getElementById("currentModeIcon");
    const text = document.getElementById("currentModeText");

    if (this.mode === "mcq") {
      icon.textContent = "📝";
      text.textContent = "MCQ Mode";
    } else {
      icon.textContent = "✍️";
      text.textContent = "Written Mode";
    }
  }

  showQuestion() {
    const question = this.questions[this.currentQuestion];

    // Update progress
    const progress = ((this.currentQuestion + 1) / this.questions.length) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${
      this.currentQuestion + 1
    } / ${this.questions.length}`;

    // Update visual component
    this.updateVisual(question);

    // Update question text
    document.getElementById("questionText").textContent = question.question;

    // Show appropriate input mode
    if (this.mode === "mcq") {
      document.getElementById("optionsContainer").classList.remove("hidden");
      document.getElementById("writtenContainer").classList.add("hidden");
      this.showOptions(question);
    } else {
      document.getElementById("optionsContainer").classList.add("hidden");
      document.getElementById("writtenContainer").classList.remove("hidden");
      this.setupWrittenMode(question);
    }

    // Hide feedback and next button
    document.getElementById("feedback").classList.add("hidden");
    document.getElementById("nextBtn").classList.add("hidden");
  }

  updateVisual(question) {
    const promptDisplay = document.getElementById("promptDisplay");
    const structureDisplay = document.getElementById("structureDisplay");

    // Extract the main content for display
    let prompt = question.question;
    if (prompt.includes(":")) {
      prompt = prompt.split(":")[1].trim().replace(/['"]/g, "");
    }
    promptDisplay.textContent =
      prompt.substring(0, 50) + (prompt.length > 50 ? "..." : "");

    // Show structure hint based on subtopic
    if (question.subtopic === "ko-questions") {
      structureDisplay.textContent = "verb + ko/kö + subject + ...?";
    } else if (question.subtopic === "mika-mita") {
      structureDisplay.textContent = "mikä (olla) / mitä (other verbs)";
    } else if (question.subtopic === "minka-inen") {
      structureDisplay.textContent = "minkä + quality + inen";
    } else {
      structureDisplay.textContent = "question word + verb + subject?";
    }
  }

  showOptions(question) {
    const container = document.getElementById("optionsContainer");
    container.innerHTML = "";

    // Shuffle options
    const options = [...question.options].sort(() => Math.random() - 0.5);

    options.forEach((option) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = option;
      btn.addEventListener("click", () => this.checkAnswer(option, question));
      container.appendChild(btn);
    });
  }

  setupWrittenMode(question) {
    const input = document.getElementById("writtenInput");
    input.value = "";
    input.className = "written-input";
    input.disabled = false;
    input.focus();

    document.getElementById("writtenHint").classList.add("hidden");
    document.getElementById("submitWrittenBtn").disabled = false;
  }

  checkAnswer(selectedOption, question) {
    const buttons = document.querySelectorAll(".option-btn");
    const isCorrect = selectedOption === question.correct;

    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.textContent === question.correct) {
        btn.classList.add("correct");
      } else if (btn.textContent === selectedOption && !isCorrect) {
        btn.classList.add("incorrect");
      }
    });

    this.processAnswer(isCorrect, selectedOption, question);
  }

  checkWrittenAnswer() {
    const input = document.getElementById("writtenInput");
    const userAnswer = input.value.trim();
    const question = this.questions[this.currentQuestion];

    if (!userAnswer) return;

    input.disabled = true;
    document.getElementById("submitWrittenBtn").disabled = true;

    // Normalize answers for comparison
    const normalizedUser = this.normalizeAnswer(userAnswer);
    const normalizedCorrect = this.normalizeAnswer(question.correct);

    // Allow some flexibility (fuzzy matching)
    const isCorrect = this.fuzzyMatch(normalizedUser, normalizedCorrect);

    if (isCorrect) {
      input.classList.add("correct");
    } else {
      input.classList.add("incorrect");
      // Show hint
      document.getElementById("writtenHint").classList.remove("hidden");
      document.getElementById(
        "hintText"
      ).textContent = `Oikea vastaus: ${question.correct}`;
    }

    this.processAnswer(isCorrect, userAnswer, question);
  }

  normalizeAnswer(answer) {
    return answer
      .toLowerCase()
      .trim()
      .replace(/[.,!?]/g, "")
      .replace(/\s+/g, " ");
  }

  fuzzyMatch(userAnswer, correctAnswer) {
    // Exact match
    if (userAnswer === correctAnswer) return true;

    // Allow minor typos using Levenshtein distance
    const distance = this.levenshteinDistance(userAnswer, correctAnswer);
    const maxLength = Math.max(userAnswer.length, correctAnswer.length);
    const similarity = 1 - distance / maxLength;

    return similarity >= 0.85; // 85% similarity threshold
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

  processAnswer(isCorrect, userAnswer, question) {
    if (isCorrect) {
      this.score++;
    }

    this.answers.push({
      question: question.question,
      userAnswer: userAnswer,
      correctAnswer: question.correct,
      isCorrect: isCorrect,
      explanation: question.explanation,
    });

    // Show feedback
    const feedback = document.getElementById("feedback");
    const feedbackIcon = document.getElementById("feedbackIcon");
    const feedbackText = document.getElementById("feedbackText");

    feedback.classList.remove("hidden", "correct", "incorrect");

    if (isCorrect) {
      feedback.classList.add("correct");
      feedbackIcon.textContent = "✓";
      feedbackText.textContent = question.explanation || "Oikein! Hienoa!";
    } else {
      feedback.classList.add("incorrect");
      feedbackIcon.textContent = "✗";
      feedbackText.textContent = `${question.explanation || "Oikea vastaus:"} ${
        question.correct
      }`;
    }

    document.getElementById("nextBtn").classList.remove("hidden");
  }

  nextQuestion() {
    this.currentQuestion++;

    if (this.currentQuestion >= this.questions.length) {
      this.showResults();
    } else {
      this.showQuestion();
    }
  }

  showResults() {
    document.getElementById("quizScreen").classList.add("hidden");
    document.getElementById("resultsScreen").classList.remove("hidden");

    const percent = Math.round((this.score / this.questions.length) * 100);

    document.getElementById("scorePercent").textContent = `${percent}%`;
    document.getElementById("correctCount").textContent = this.score;
    document.getElementById("totalCount").textContent = this.questions.length;

    // Grade message
    let message;
    if (percent === 100) {
      message = "Täydellinen! 🏆";
    } else if (percent >= 80) {
      message = "Erinomaista! 🌟";
    } else if (percent >= 60) {
      message = "Hyvä työ! 👍";
    } else if (percent >= 40) {
      message = "Jatka harjoittelua! 💪";
    } else {
      message = "Harjoittele lisää! 📚";
    }
    document.getElementById("gradeMessage").textContent = message;
  }

  showReview() {
    const reviewSection = document.getElementById("reviewSection");
    const container = document.getElementById("reviewContainer");

    reviewSection.classList.toggle("hidden");

    if (!reviewSection.classList.contains("hidden")) {
      container.innerHTML = "";

      this.answers.forEach((answer, index) => {
        const item = document.createElement("div");
        item.className = `review-item ${
          answer.isCorrect ? "correct" : "incorrect"
        }`;

        item.innerHTML = `
          <div class="review-question">${index + 1}. ${answer.question}</div>
          <div class="review-answer">
            Sinun vastaus: <strong>${answer.userAnswer}</strong><br>
            ${
              !answer.isCorrect
                ? `Oikea vastaus: <strong>${answer.correctAnswer}</strong>`
                : ""
            }
          </div>
        `;

        container.appendChild(item);
      });
    }
  }

  resetQuiz() {
    document.getElementById("resultsScreen").classList.add("hidden");
    document.getElementById("reviewSection").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");

    this.currentQuestion = 0;
    this.score = 0;
    this.answers = [];
  }
}

// Initialize quiz when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new QuestionsQuiz();
});
