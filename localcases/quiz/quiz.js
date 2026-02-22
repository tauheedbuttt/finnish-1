/* ========================================
   Local Cases Quiz (Missä) - JavaScript
======================================== */

class LocalCasesQuiz {
  constructor() {
    this.questions = [];
    this.subtopics = [];
    this.rules = {};
    this.selectedQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.questionsPerQuiz = 10;
    this.selectedSubtopics = new Set(["all"]);
    this.mode = "mcq";

    this.init();
  }

  async init() {
    await this.loadQuestions();
    this.setupEventListeners();
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
      if (checkbox.checked) {
        this.selectedSubtopics.delete("all");
        this.selectedSubtopics.add(value);
        document.querySelector('.subtopic-checkbox[value="all"]').checked =
          false;
      } else {
        this.selectedSubtopics.delete(value);
      }

      if (this.selectedSubtopics.size === 0) {
        this.selectedSubtopics.add("all");
        document.querySelector('.subtopic-checkbox[value="all"]').checked =
          true;
      }
    }

    this.updateQuestionCount();
  }

  getFilteredQuestions() {
    if (this.selectedSubtopics.has("all")) {
      return this.questions;
    }
    return this.questions.filter((q) =>
      this.selectedSubtopics.has(q.subtopic)
    );
  }

  updateQuestionCount() {
    const filtered = this.getFilteredQuestions();
    const countEl = document.getElementById("availableCount");
    if (countEl) {
      countEl.textContent = `(${filtered.length} available)`;
    }
  }

  setupEventListeners() {
    // Mode tabs
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".mode-tab").forEach((t) =>
          t.classList.remove("active")
        );
        tab.classList.add("active");
        this.mode = tab.dataset.mode;
      });
    });

    // Start button
    document.getElementById("startBtn").addEventListener("click", () => {
      this.startQuiz();
    });

    // Next button
    document.getElementById("nextBtn").addEventListener("click", () => {
      this.nextQuestion();
    });

    // Submit written answer
    document.getElementById("submitAnswer").addEventListener("click", () => {
      this.checkWrittenAnswer();
    });

    // Enter key for written answer
    document.getElementById("writtenAnswer").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.checkWrittenAnswer();
      }
    });

    // Retry button
    document.getElementById("retryBtn").addEventListener("click", () => {
      this.showScreen("startScreen");
    });

    // Home button
    document.getElementById("homeBtn").addEventListener("click", () => {
      window.location.href = "../../";
    });
  }

  startQuiz() {
    const countSelect = document.getElementById("questionCount");
    const filtered = this.getFilteredQuestions();

    if (countSelect.value === "all") {
      this.questionsPerQuiz = filtered.length;
    } else {
      this.questionsPerQuiz = Math.min(
        parseInt(countSelect.value),
        filtered.length
      );
    }

    this.selectedQuestions = this.shuffleArray([...filtered]).slice(
      0,
      this.questionsPerQuiz
    );
    this.currentIndex = 0;
    this.score = 0;

    this.showScreen("quizScreen");
    this.displayQuestion();
  }

  displayQuestion() {
    const question = this.selectedQuestions[this.currentIndex];

    // Update progress
    const progress = ((this.currentIndex + 1) / this.questionsPerQuiz) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${
      this.currentIndex + 1
    }/${this.questionsPerQuiz}`;

    // Update question display based on type
    this.displayQuestionContent(question);

    // Reset feedback
    document.getElementById("feedback").classList.add("hidden");
    document.getElementById("feedback").classList.remove("correct", "incorrect");
    document.getElementById("nextBtn").classList.add("hidden");

    // Show appropriate input
    if (this.mode === "mcq") {
      document.getElementById("optionsContainer").classList.remove("hidden");
      document.getElementById("writtenContainer").classList.add("hidden");
      this.displayOptions(question);
    } else {
      document.getElementById("optionsContainer").classList.add("hidden");
      document.getElementById("writtenContainer").classList.remove("hidden");
      document.getElementById("writtenAnswer").value = "";
      document.getElementById("writtenAnswer").focus();
    }
  }

  displayQuestionContent(question) {
    const wordDisplay = document.getElementById("wordDisplay");
    const endingDisplay = document.getElementById("endingDisplay");
    const questionEnglish = document.getElementById("questionEnglish");
    const questionType = document.getElementById("questionType");

    if (question.type === "ending" || question.type === "special") {
      questionType.textContent = question.subtopic === "s-case" ? "S-Case (-ssa/-ssä)" : 
                                  question.subtopic === "l-case" ? "L-Case (-lla/-llä)" :
                                  question.subtopic === "special" ? "Special Form" :
                                  question.subtopic === "cities" ? "Cities & Countries" : "Missä?";
      wordDisplay.textContent = question.word;
      endingDisplay.textContent = "+ ?";
      questionEnglish.textContent = question.english;
    } else if (question.type === "sentence") {
      questionType.textContent = "Translate";
      wordDisplay.textContent = "🇬🇧";
      endingDisplay.textContent = "";
      questionEnglish.textContent = question.sentence;
    }
  }

  displayOptions(question) {
    const container = document.getElementById("optionsContainer");
    container.innerHTML = "";

    const options = this.generateOptions(question);

    options.forEach((option) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = option;
      btn.addEventListener("click", () => {
        this.checkAnswer(option, question.answer, btn);
      });
      container.appendChild(btn);
    });
  }

  generateOptions(question) {
    const correct = question.answer;
    const options = [correct];

    // Get similar answers from same subtopic
    const similarQuestions = this.questions.filter(
      (q) =>
        q.id !== question.id &&
        (q.subtopic === question.subtopic || q.word === question.word)
    );

    // Add wrong answers
    const wrongAnswers = similarQuestions
      .map((q) => q.answer)
      .filter((a) => a !== correct && !options.includes(a));

    // Shuffle and take up to 3 wrong answers
    const shuffledWrong = this.shuffleArray(wrongAnswers).slice(0, 3);
    options.push(...shuffledWrong);

    // If we don't have enough, generate variations
    while (options.length < 4) {
      const variation = this.generateVariation(question, options);
      if (variation && !options.includes(variation)) {
        options.push(variation);
      } else {
        break;
      }
    }

    return this.shuffleArray(options);
  }

  generateVariation(question, existing) {
    const word = question.word;
    const endings = ["ssa", "ssä", "lla", "llä", "ssa", "sta", "lta"];
    
    // Get base without common endings
    let base = word;
    if (word.endsWith("i")) {
      base = word.slice(0, -1);
    }
    
    for (const ending of this.shuffleArray(endings)) {
      const variation = base + ending;
      if (!existing.includes(variation) && variation !== question.answer) {
        return variation;
      }
    }
    return null;
  }

  checkAnswer(selected, correct, button) {
    const buttons = document.querySelectorAll(".option-btn");
    buttons.forEach((btn) => {
      btn.classList.add("disabled");
      if (btn.textContent === correct) {
        btn.classList.add("correct");
      }
    });

    const isCorrect = selected.toLowerCase().trim() === correct.toLowerCase().trim();

    if (isCorrect) {
      button.classList.add("correct");
      this.score++;
      this.showFeedback(true, this.selectedQuestions[this.currentIndex]);
    } else {
      button.classList.add("incorrect");
      this.showFeedback(false, this.selectedQuestions[this.currentIndex]);
    }
  }

  checkWrittenAnswer() {
    const input = document.getElementById("writtenAnswer");
    const answer = input.value.trim().toLowerCase();
    const question = this.selectedQuestions[this.currentIndex];
    const correct = question.answer.toLowerCase();

    const isCorrect = answer === correct;

    if (isCorrect) {
      this.score++;
      input.style.borderColor = "#4caf50";
      input.style.background = "#e8f5e9";
    } else {
      input.style.borderColor = "#f44336";
      input.style.background = "#ffebee";
    }

    document.getElementById("submitAnswer").disabled = true;
    this.showFeedback(isCorrect, question);
  }

  showFeedback(isCorrect, question) {
    const feedback = document.getElementById("feedback");
    const icon = document.getElementById("feedbackIcon");
    const text = document.getElementById("feedbackText");
    const explanation = document.getElementById("feedbackExplanation");

    feedback.classList.remove("hidden", "correct", "incorrect");
    feedback.classList.add(isCorrect ? "correct" : "incorrect");

    icon.textContent = isCorrect ? "✓" : "✗";
    text.textContent = isCorrect ? "Oikein! 🎉" : `Väärin! Oikea vastaus: ${question.answer}`;
    explanation.textContent = question.explanation || "";

    document.getElementById("nextBtn").classList.remove("hidden");
  }

  nextQuestion() {
    this.currentIndex++;

    // Reset written input styles
    const writtenInput = document.getElementById("writtenAnswer");
    writtenInput.style.borderColor = "";
    writtenInput.style.background = "";
    document.getElementById("submitAnswer").disabled = false;

    if (this.currentIndex >= this.questionsPerQuiz) {
      this.showResults();
    } else {
      this.displayQuestion();
    }
  }

  showResults() {
    this.showScreen("resultsScreen");

    const percentage = Math.round((this.score / this.questionsPerQuiz) * 100);

    document.getElementById("finalScore").textContent = this.score;
    document.getElementById("totalQuestions").textContent = this.questionsPerQuiz;
    document.getElementById("scorePercentage").textContent = `${percentage}%`;

    let message = "";
    if (percentage === 100) {
      message = "Täydellinen! Olet mestari! 🏆";
    } else if (percentage >= 80) {
      message = "Erinomainen! Hienoa työtä! 🌟";
    } else if (percentage >= 60) {
      message = "Hyvä! Jatka harjoittelua! 💪";
    } else if (percentage >= 40) {
      message = "Ihan ok! Harjoittele lisää! 📚";
    } else {
      message = "Jatka yrittämistä! Oppiminen vie aikaa! 🌱";
    }

    document.getElementById("scoreMessage").textContent = message;
  }

  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.add("hidden");
    });
    document.getElementById(screenId).classList.remove("hidden");
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Initialize quiz when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new LocalCasesQuiz();
});
