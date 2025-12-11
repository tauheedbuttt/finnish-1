// ========================================
// Finnish Partitive Quiz - JavaScript
// ========================================

class PartitiveQuiz {
  constructor() {
    this.questions = [];
    this.subtopics = [];
    this.selectedSubtopics = [];
    this.currentQuestions = [];
    this.currentQuestionIndex = 0;
    this.score = 0;
    this.answers = [];
    this.mode = "mcq"; // 'mcq' or 'written'
    this.questionsPerQuiz = 10;

    this.init();
  }

  async init() {
    await this.loadQuestions();
    this.setupEventListeners();
    this.updateQuestionCount();
  }

  async loadQuestions() {
    try {
      const response = await fetch("questions.json");
      const data = await response.json();
      this.questions = data.questions;
      this.subtopics = data.subtopics;

      // Set topic info
      document.getElementById("topicTitle").textContent = data.description;
      document.getElementById("quizTitle").textContent = data.topic;
      document.getElementById("quizDescription").textContent = data.description;

      // Populate subtopic checkboxes
      this.populateSubtopicCheckboxes();

      // Select all by default
      this.selectAllSubtopics();
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  }

  populateSubtopicCheckboxes() {
    const container = document.getElementById("subtopicCheckboxes");
    container.innerHTML = "";

    this.subtopics
      .filter((s) => s.id !== "all")
      .forEach((subtopic) => {
        const label = document.createElement("label");
        label.className = "subtopic-checkbox checked";
        label.innerHTML = `
          <input type="checkbox" value="${subtopic.id}" checked>
          <span class="checkbox-icon">${subtopic.icon}</span>
          <span class="checkbox-label">${subtopic.name}</span>
        `;

        const checkbox = label.querySelector("input");
        checkbox.addEventListener("change", () => {
          this.toggleSubtopic(subtopic.id, checkbox.checked);
          label.classList.toggle("checked", checkbox.checked);
        });

        container.appendChild(label);
      });
  }

  toggleSubtopic(subtopicId, isChecked) {
    if (isChecked) {
      if (!this.selectedSubtopics.includes(subtopicId)) {
        this.selectedSubtopics.push(subtopicId);
      }
    } else {
      this.selectedSubtopics = this.selectedSubtopics.filter(
        (id) => id !== subtopicId
      );
    }
    this.updateQuestionCount();
  }

  selectAllSubtopics() {
    this.selectedSubtopics = this.subtopics
      .filter((s) => s.id !== "all")
      .map((s) => s.id);

    document.querySelectorAll(".subtopic-checkbox").forEach((label) => {
      const checkbox = label.querySelector("input");
      checkbox.checked = true;
      label.classList.add("checked");
    });

    this.updateQuestionCount();
  }

  clearAllSubtopics() {
    this.selectedSubtopics = [];

    document.querySelectorAll(".subtopic-checkbox").forEach((label) => {
      const checkbox = label.querySelector("input");
      checkbox.checked = false;
      label.classList.remove("checked");
    });

    this.updateQuestionCount();
  }

  getFilteredQuestions() {
    if (this.selectedSubtopics.length === 0) {
      return [];
    }
    return this.questions.filter((q) =>
      this.selectedSubtopics.includes(q.subtopic)
    );
  }

  updateQuestionCount() {
    const filtered = this.getFilteredQuestions();
    const countEl = document.getElementById("questionCount");
    countEl.textContent = `${filtered.length} questions available`;

    const startBtn = document.getElementById("startBtn");
    startBtn.disabled = filtered.length === 0;
    startBtn.style.opacity = filtered.length === 0 ? "0.5" : "1";
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
      });
    });

    // Select All / Clear All buttons
    document.getElementById("selectAllBtn").addEventListener("click", () => {
      this.selectAllSubtopics();
    });

    document.getElementById("clearAllBtn").addEventListener("click", () => {
      this.clearAllSubtopics();
    });

    // Start button
    document.getElementById("startBtn").addEventListener("click", () => {
      this.startQuiz();
    });

    // Next button
    document.getElementById("nextBtn").addEventListener("click", () => {
      this.nextQuestion();
    });

    // Written mode submit
    document
      .getElementById("submitWrittenBtn")
      .addEventListener("click", () => {
        this.checkWrittenAnswer();
      });

    // Enter key for written input
    document
      .getElementById("writtenInput")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.checkWrittenAnswer();
        }
      });

    // Retry button
    document.getElementById("retryBtn").addEventListener("click", () => {
      this.showScreen("startScreen");
    });

    // Review button
    document.getElementById("reviewBtn").addEventListener("click", () => {
      this.showReview();
    });
  }

  startQuiz() {
    const filtered = this.getFilteredQuestions();
    if (filtered.length === 0) return;

    // Shuffle and select questions
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    this.currentQuestions = shuffled.slice(
      0,
      Math.min(this.questionsPerQuiz, shuffled.length)
    );

    this.currentQuestionIndex = 0;
    this.score = 0;
    this.answers = [];

    // Update mode indicator
    document.getElementById("currentModeIcon").textContent =
      this.mode === "mcq" ? "📝" : "✍️";
    document.getElementById("currentModeText").textContent =
      this.mode === "mcq" ? "MCQ Mode" : "Written Mode";

    this.showScreen("quizScreen");
    this.showQuestion();
  }

  showQuestion() {
    const question = this.currentQuestions[this.currentQuestionIndex];

    // Update progress
    const progress =
      ((this.currentQuestionIndex + 1) / this.currentQuestions.length) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${
      this.currentQuestionIndex + 1
    } / ${this.currentQuestions.length}`;

    // Update visual component
    document.getElementById("wordDisplay").textContent = question.word;
    document.getElementById("contextDisplay").textContent = question.context;
    document.getElementById("ruleDisplay").textContent = question.rule;

    // Update question text
    document.getElementById("questionText").textContent = `${question.english}`;

    // Hide feedback and next button
    document.getElementById("feedback").classList.add("hidden");
    document.getElementById("nextBtn").classList.add("hidden");

    if (this.mode === "mcq") {
      this.showMCQOptions(question);
    } else {
      this.showWrittenInput(question);
    }
  }

  showMCQOptions(question) {
    document.getElementById("optionsContainer").classList.remove("hidden");
    document.getElementById("writtenContainer").classList.add("hidden");

    const container = document.getElementById("optionsContainer");
    const options = this.generateOptions(question);

    container.innerHTML = options
      .map(
        (opt, idx) =>
          `<button class="option-btn" data-index="${idx}" data-answer="${opt}">${opt}</button>`
      )
      .join("");

    container.querySelectorAll(".option-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.checkMCQAnswer(btn.dataset.answer, question.answer);
      });
    });
  }

  generateOptions(question) {
    const correct = question.answer;
    const options = [correct];

    // Generate wrong options based on the word
    const word = question.word;
    const wrongOptions = this.generateWrongPartitives(word, correct);

    while (options.length < 4 && wrongOptions.length > 0) {
      const idx = Math.floor(Math.random() * wrongOptions.length);
      const wrong = wrongOptions.splice(idx, 1)[0];
      if (!options.includes(wrong)) {
        options.push(wrong);
      }
    }

    // Fill remaining with random if needed
    const fillers = [
      word + "a",
      word + "ä",
      word + "ta",
      word + "tä",
      word + "tta",
      word + "ttä",
    ];
    while (options.length < 4) {
      const filler = fillers[Math.floor(Math.random() * fillers.length)];
      if (!options.includes(filler)) {
        options.push(filler);
      }
    }

    return options.sort(() => Math.random() - 0.5);
  }

  generateWrongPartitives(word, correct) {
    const wrongs = [];
    const endings = ["a", "ä", "ta", "tä", "tta", "ttä", "sta", "stä"];

    endings.forEach((ending) => {
      let wrong;
      if (word.endsWith("nen")) {
        wrong = word.slice(0, -3) + ending;
      } else {
        wrong = word + ending;
      }
      if (wrong !== correct) {
        wrongs.push(wrong);
      }
    });

    // Add some with stem modifications
    wrongs.push(word.slice(0, -1) + "a");
    wrongs.push(word.slice(0, -1) + "ä");

    return wrongs.filter((w) => w !== correct);
  }

  showWrittenInput(question) {
    document.getElementById("optionsContainer").classList.add("hidden");
    document.getElementById("writtenContainer").classList.remove("hidden");

    const input = document.getElementById("writtenInput");
    input.value = "";
    input.disabled = false;
    input.classList.remove("correct", "incorrect");
    input.focus();

    document.getElementById("writtenHint").classList.add("hidden");
    document.getElementById("submitWrittenBtn").disabled = false;
  }

  checkMCQAnswer(selected, correct) {
    const buttons = document.querySelectorAll(".option-btn");
    buttons.forEach((btn) => {
      btn.disabled = true;
      if (btn.dataset.answer === correct) {
        btn.classList.add("correct");
      } else if (btn.dataset.answer === selected) {
        btn.classList.add("incorrect");
      }
    });

    const isCorrect = selected === correct;
    this.recordAnswer(isCorrect, selected, correct);
    this.showFeedback(isCorrect);
  }

  checkWrittenAnswer() {
    const input = document.getElementById("writtenInput");
    const userAnswer = input.value.trim().toLowerCase();
    const question = this.currentQuestions[this.currentQuestionIndex];
    const correct = question.answer.toLowerCase();

    if (!userAnswer) return;

    input.disabled = true;
    document.getElementById("submitWrittenBtn").disabled = true;

    // Check with fuzzy matching
    const isCorrect = this.fuzzyMatch(userAnswer, correct);

    input.classList.add(isCorrect ? "correct" : "incorrect");

    if (!isCorrect) {
      document.getElementById("writtenHint").classList.remove("hidden");
      document.getElementById(
        "hintText"
      ).textContent = `Oikea vastaus: ${question.answer}`;
    }

    this.recordAnswer(isCorrect, userAnswer, question.answer);
    this.showFeedback(isCorrect);
  }

  fuzzyMatch(input, correct) {
    if (input === correct) return true;

    // Allow small typos
    const distance = this.levenshteinDistance(input, correct);
    const threshold = Math.max(1, Math.floor(correct.length * 0.15));
    return distance <= threshold;
  }

  levenshteinDistance(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  recordAnswer(isCorrect, userAnswer, correctAnswer) {
    if (isCorrect) this.score++;
    this.answers.push({
      question: this.currentQuestions[this.currentQuestionIndex],
      userAnswer,
      correctAnswer,
      isCorrect,
    });
  }

  showFeedback(isCorrect) {
    const feedback = document.getElementById("feedback");
    const question = this.currentQuestions[this.currentQuestionIndex];

    feedback.classList.remove("hidden", "correct", "incorrect");
    feedback.classList.add(isCorrect ? "correct" : "incorrect");

    document.getElementById("feedbackIcon").textContent = isCorrect ? "✓" : "✗";
    document.getElementById("feedbackText").textContent = question.explanation;

    document.getElementById("nextBtn").classList.remove("hidden");
  }

  nextQuestion() {
    this.currentQuestionIndex++;

    if (this.currentQuestionIndex >= this.currentQuestions.length) {
      this.showResults();
    } else {
      this.showQuestion();
    }
  }

  showResults() {
    const percent = Math.round(
      (this.score / this.currentQuestions.length) * 100
    );
    document.getElementById("scorePercent").textContent = `${percent}%`;
    document.getElementById("correctCount").textContent = this.score;
    document.getElementById("totalCount").textContent =
      this.currentQuestions.length;

    let message;
    if (percent >= 90) message = "Erinomaista! 🌟";
    else if (percent >= 70) message = "Hyvä työ! 👍";
    else if (percent >= 50) message = "Ihan ok! 📚";
    else message = "Harjoittele lisää! 💪";

    document.getElementById("gradeMessage").textContent = message;
    document.getElementById("reviewSection").classList.add("hidden");

    this.showScreen("resultsScreen");
  }

  showReview() {
    const section = document.getElementById("reviewSection");
    const container = document.getElementById("reviewContainer");

    container.innerHTML = this.answers
      .map(
        (ans) => `
      <div class="review-item ${ans.isCorrect ? "correct" : "incorrect"}">
        <div class="review-question">
          ${ans.question.word} → ${ans.question.context}
        </div>
        <div class="review-answer">
          Sinun vastaus: ${ans.userAnswer} | 
          Oikea: ${ans.correctAnswer}
        </div>
      </div>
    `
      )
      .join("");

    section.classList.remove("hidden");
  }

  showScreen(screenId) {
    document
      .querySelectorAll(".screen")
      .forEach((s) => s.classList.add("hidden"));
    document.getElementById(screenId).classList.remove("hidden");
  }
}

// Initialize quiz
document.addEventListener("DOMContentLoaded", () => {
  new PartitiveQuiz();
});
