/* ========================================
   Finnish Family Quiz - JavaScript
======================================== */

class FamilyQuiz {
  constructor() {
    this.questions = [];
    this.subtopics = [];
    this.vocabulary = {};
    this.selectedQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.userAnswers = [];
    this.questionsPerQuiz = 10;
    this.mode = "mcq";
    this.selectedSubtopic = "all";

    // Family member icons mapping
    this.familyIcons = {
      // Immediate family
      "äiti": "👩",
      "isä": "👨",
      "vanhemmat": "👨‍👩‍👧",
      "vanhempi": "🧑",
      "lapsi": "🧒",
      "lapset": "👧👦",
      "tytär": "👧",
      "poika": "👦",
      "sisko": "👧",
      "veli": "👦",
      "sisarus": "🧒",
      "vauva": "👶",
      "vaimo": "👩",
      "mies": "👨",
      // Extended family
      "isovanhemmat": "👴👵",
      "isoäiti": "👵",
      "mummi": "👵",
      "mummo": "👵",
      "isoisä": "👴",
      "ukki": "👴",
      "vaari": "👴",
      "täti": "👩",
      "setä": "👨",
      "eno": "👨",
      "serkku": "🧑",
      // Step family
      "isäpuoli": "👨",
      "äitipuoli": "👩",
      "sisarpuoli": "👧",
      "velipuoli": "👦"
    };

    this.init();
  }

  async init() {
    await this.loadQuestions();
    this.setupEventListeners();
    this.updateStartScreen();
  }

  async loadQuestions() {
    try {
      const response = await fetch("questions.json");
      const data = await response.json();
      this.questions = data.questions;
      this.subtopics = data.subtopics || [];
      this.vocabulary = data.vocabulary || {};
      this.topicTitle = data.title;
      this.topicDescription = data.description;

      document.getElementById("topicTitle").textContent = data.title;
      document.getElementById("quizTitle").textContent = data.title;
      document.getElementById("quizDescription").textContent = data.description;

      this.populateSubtopicFilter();
      this.updateQuestionCount();
    } catch (error) {
      console.error("Error loading questions:", error);
      document.getElementById("quizTitle").textContent = "Error Loading Quiz";
      document.getElementById("quizDescription").textContent =
        "Could not load questions. Please check the questions.json file.";
    }
  }

  populateSubtopicFilter() {
    const select = document.getElementById("subtopicFilter");
    select.innerHTML = "";

    this.subtopics.forEach((subtopic) => {
      const option = document.createElement("option");
      option.value = subtopic.id;
      option.textContent = `${subtopic.icon} ${subtopic.name}`;
      select.appendChild(option);
    });
  }

  updateQuestionCount() {
    const filtered = this.getFilteredQuestions();
    const countEl = document.getElementById("questionCount");
    countEl.textContent = `${filtered.length} questions available`;

    const startBtn = document.getElementById("startBtn");
    if (filtered.length === 0) {
      startBtn.disabled = true;
      countEl.classList.add("warning");
    } else {
      startBtn.disabled = false;
      countEl.classList.remove("warning");
    }
  }

  getFilteredQuestions() {
    if (this.selectedSubtopic === "all") {
      return this.questions;
    }
    return this.questions.filter((q) => q.subtopic === this.selectedSubtopic);
  }

  setupEventListeners() {
    document.getElementById("startBtn").addEventListener("click", () => this.startQuiz());
    document.getElementById("nextBtn").addEventListener("click", () => this.nextQuestion());
    document.getElementById("retryBtn").addEventListener("click", () => this.retryQuiz());
    document.getElementById("reviewBtn").addEventListener("click", () => this.toggleReview());

    // Mode tabs
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => this.switchMode(e.currentTarget.dataset.mode));
    });

    // Written mode submit
    document.getElementById("submitWrittenBtn").addEventListener("click", () => this.checkWrittenAnswer());

    // Enter key for written input
    document.getElementById("writtenInput").addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.checkWrittenAnswer();
      }
    });

    // Subtopic filter
    document.getElementById("subtopicFilter").addEventListener("change", (e) => {
      this.selectedSubtopic = e.target.value;
      this.updateQuestionCount();
    });
  }

  switchMode(mode) {
    this.mode = mode;
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.mode === mode);
    });
  }

  updateStartScreen() {
    // Dynamic content updates if needed
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  selectRandomQuestions() {
    const filtered = this.getFilteredQuestions();
    const shuffled = this.shuffleArray(filtered);
    const count = Math.min(this.questionsPerQuiz, shuffled.length);
    this.selectedQuestions = shuffled.slice(0, count);
  }

  startQuiz() {
    this.selectRandomQuestions();
    this.currentIndex = 0;
    this.score = 0;
    this.userAnswers = [];

    const modeIcon = document.getElementById("currentModeIcon");
    const modeText = document.getElementById("currentModeText");
    if (this.mode === "mcq") {
      modeIcon.textContent = "📝";
      modeText.textContent = "MCQ Mode";
    } else {
      modeIcon.textContent = "✍️";
      modeText.textContent = "Written Mode";
    }

    this.showScreen("quizScreen");
    this.displayQuestion();
  }

  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.add("hidden");
    });
    document.getElementById(screenId).classList.remove("hidden");
  }

  displayQuestion() {
    const question = this.selectedQuestions[this.currentIndex];

    // Update progress
    const progress = ((this.currentIndex + 1) / this.selectedQuestions.length) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${this.currentIndex + 1} / ${this.selectedQuestions.length}`;

    // Hide feedback and next button
    document.getElementById("feedback").classList.add("hidden");
    document.getElementById("nextBtn").classList.add("hidden");

    // Display family visual based on question
    this.displayFamilyVisual(question);

    // Display question text
    document.getElementById("questionText").textContent = question.question;

    // Display options or written input based on mode
    if (this.mode === "mcq") {
      document.getElementById("optionsContainer").classList.remove("hidden");
      document.getElementById("writtenContainer").classList.add("hidden");
      this.displayOptions(question);
    } else {
      document.getElementById("optionsContainer").classList.add("hidden");
      document.getElementById("writtenContainer").classList.remove("hidden");
      this.displayWrittenInput(question);
    }
  }

  displayFamilyVisual(question) {
    const familyComponent = document.getElementById("familyComponent");
    const familyIcon = document.getElementById("familyIcon");
    const familyWord = document.getElementById("familyWord");
    const familyCategory = document.getElementById("familyCategory");

    // Reset classes
    familyComponent.className = "family-component";

    // Determine the family member from the question
    const correctAnswer = question.options[question.correct];
    const searchText = `${question.question} ${correctAnswer}`.toLowerCase();

    // Find matching family word
    let displayWord = "";
    let icon = "👨‍👩‍👧‍👦";

    // Check vocabulary for matches
    for (const [word, emoji] of Object.entries(this.familyIcons)) {
      if (searchText.includes(word.toLowerCase())) {
        displayWord = word;
        icon = emoji;
        break;
      }
    }

    // If no match, try the correct answer
    if (!displayWord && this.familyIcons[correctAnswer.toLowerCase()]) {
      displayWord = correctAnswer;
      icon = this.familyIcons[correctAnswer.toLowerCase()];
    }

    familyIcon.textContent = icon || "👨‍👩‍👧‍👦";
    familyWord.textContent = displayWord || "perhe";

    // Set category based on subtopic
    const categoryLabels = {
      "immediate": "lähiperhe",
      "extended": "sukulaiset",
      "step": "uusperhe",
      "questions": "kysymykset"
    };
    familyCategory.textContent = categoryLabels[question.subtopic] || "sukulaiset";
    familyComponent.classList.add(question.subtopic);
  }

  displayWrittenInput(question) {
    const input = document.getElementById("writtenInput");
    const hintContainer = document.getElementById("writtenHint");
    const submitBtn = document.getElementById("submitWrittenBtn");

    input.value = "";
    input.disabled = false;
    input.focus();
    submitBtn.disabled = false;
    submitBtn.classList.remove("hidden");
    hintContainer.classList.add("hidden");

    const correctAnswer = question.options[question.correct];
    const hintLength = Math.min(3, Math.floor(correctAnswer.length / 3));
    document.getElementById("hintText").textContent = correctAnswer.substring(0, hintLength) + "...";
  }

  checkWrittenAnswer() {
    const question = this.selectedQuestions[this.currentIndex];
    const input = document.getElementById("writtenInput");
    const userAnswer = input.value.trim().toLowerCase();
    const correctAnswer = question.options[question.correct].toLowerCase();

    const normalize = (str) => str.toLowerCase().replace(/\s+/g, " ").trim();

    const normalizedUser = normalize(userAnswer);
    const normalizedCorrect = normalize(correctAnswer);

    const isCorrect = normalizedUser === normalizedCorrect || this.fuzzyMatch(normalizedUser, normalizedCorrect);

    this.userAnswers.push({
      question: question,
      selected: userAnswer,
      selectedText: userAnswer,
      correct: isCorrect,
      isWritten: true,
    });

    if (isCorrect) {
      this.score++;
    }

    input.disabled = true;
    document.getElementById("submitWrittenBtn").disabled = true;

    input.classList.add(isCorrect ? "correct" : "incorrect");

    if (!isCorrect) {
      const correctDisplay = document.createElement("div");
      correctDisplay.className = "correct-answer-display";
      correctDisplay.innerHTML = `<strong>Oikea vastaus:</strong> ${question.options[question.correct]}`;
      document.getElementById("writtenContainer").appendChild(correctDisplay);
    }

    const feedback = document.getElementById("feedback");
    feedback.classList.remove("hidden", "correct", "incorrect");
    feedback.classList.add(isCorrect ? "correct" : "incorrect");

    document.getElementById("feedbackIcon").textContent = isCorrect ? "✓ Oikein!" : "✗ Väärin!";
    document.getElementById("feedbackText").textContent = question.explanation;

    document.getElementById("nextBtn").classList.remove("hidden");
    document.getElementById("nextBtn").textContent =
      this.currentIndex < this.selectedQuestions.length - 1 ? "Seuraava →" : "Näytä tulokset";
  }

  fuzzyMatch(userAnswer, correctAnswer) {
    if (correctAnswer.length < 5) {
      return userAnswer === correctAnswer;
    }

    const distance = this.levenshteinDistance(userAnswer, correctAnswer);
    const threshold = Math.max(2, Math.floor(correctAnswer.length * 0.15));
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

  displayOptions(question) {
    const container = document.getElementById("optionsContainer");
    container.innerHTML = "";

    const letters = ["A", "B", "C", "D"];

    question.options.forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "option-btn";
      button.innerHTML = `<span class="option-letter">${letters[index]}</span>${option}`;
      button.addEventListener("click", () => this.selectAnswer(index));
      container.appendChild(button);
    });
  }

  selectAnswer(selectedIndex) {
    const question = this.selectedQuestions[this.currentIndex];
    const options = document.querySelectorAll(".option-btn");
    const isCorrect = selectedIndex === question.correct;

    this.userAnswers.push({
      question: question,
      selected: selectedIndex,
      correct: isCorrect,
    });

    if (isCorrect) {
      this.score++;
    }

    options.forEach((option, index) => {
      option.classList.add("disabled");
      if (index === question.correct) {
        option.classList.add("correct");
      } else if (index === selectedIndex && !isCorrect) {
        option.classList.add("incorrect");
      }
    });

    const feedback = document.getElementById("feedback");
    feedback.classList.remove("hidden", "correct", "incorrect");
    feedback.classList.add(isCorrect ? "correct" : "incorrect");

    document.getElementById("feedbackIcon").textContent = isCorrect ? "✓ Oikein!" : "✗ Väärin!";
    document.getElementById("feedbackText").textContent = question.explanation;

    document.getElementById("nextBtn").classList.remove("hidden");
    document.getElementById("nextBtn").textContent =
      this.currentIndex < this.selectedQuestions.length - 1 ? "Seuraava →" : "Näytä tulokset";
  }

  nextQuestion() {
    const writtenInput = document.getElementById("writtenInput");
    writtenInput.classList.remove("correct", "incorrect");
    const correctDisplay = document.querySelector(".correct-answer-display");
    if (correctDisplay) {
      correctDisplay.remove();
    }

    this.currentIndex++;

    if (this.currentIndex < this.selectedQuestions.length) {
      this.displayQuestion();
    } else {
      this.showResults();
    }
  }

  showResults() {
    this.showScreen("resultsScreen");

    const percent = Math.round((this.score / this.selectedQuestions.length) * 100);
    document.getElementById("scorePercent").textContent = `${percent}%`;
    document.getElementById("correctCount").textContent = this.score;
    document.getElementById("totalCount").textContent = this.selectedQuestions.length;

    const gradeMessage = document.getElementById("gradeMessage");
    gradeMessage.className = "grade-message";

    if (percent >= 90) {
      gradeMessage.textContent = "🌟 Erinomainen! (Excellent!)";
      gradeMessage.classList.add("excellent");
    } else if (percent >= 70) {
      gradeMessage.textContent = "👍 Hyvä työ! (Good job!)";
      gradeMessage.classList.add("good");
    } else if (percent >= 50) {
      gradeMessage.textContent = "📚 Jatka harjoittelua! (Keep practicing!)";
      gradeMessage.classList.add("ok");
    } else {
      gradeMessage.textContent = "💪 Tarvitset lisää harjoitusta! (You need more practice!)";
      gradeMessage.classList.add("needs-work");
    }

    document.getElementById("reviewSection").classList.add("hidden");
  }

  toggleReview() {
    const reviewSection = document.getElementById("reviewSection");
    const isHidden = reviewSection.classList.contains("hidden");

    if (isHidden) {
      this.buildReviewSection();
      reviewSection.classList.remove("hidden");
      document.getElementById("reviewBtn").textContent = "Piilota vastaukset";
    } else {
      reviewSection.classList.add("hidden");
      document.getElementById("reviewBtn").textContent = "Tarkista vastaukset";
    }
  }

  buildReviewSection() {
    const container = document.getElementById("reviewContainer");
    container.innerHTML = "";

    this.userAnswers.forEach((answer, index) => {
      const div = document.createElement("div");
      div.className = `review-item ${answer.correct ? "correct" : "incorrect"}`;

      const statusIcon = answer.correct ? "✓" : "✗";
      const correctAnswer = answer.question.options[answer.question.correct];

      let yourAnswer;
      if (answer.isWritten) {
        yourAnswer = answer.selectedText || "(tyhjä)";
      } else {
        yourAnswer = answer.question.options[answer.selected];
      }

      div.innerHTML = `
        <div class="review-question">${statusIcon} ${index + 1}. ${answer.question.question}</div>
        <div class="review-answers">
          ${!answer.correct ? `<span class="your-answer">Sinun vastaus: ${yourAnswer}</span>` : ""}
          <span class="correct-answer">Oikea vastaus: ${correctAnswer}</span>
          <span style="color: #666; font-style: italic; margin-top: 5px;">${answer.question.explanation}</span>
        </div>
      `;

      container.appendChild(div);
    });
  }

  retryQuiz() {
    this.showScreen("startScreen");
  }
}

// Initialize quiz when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new FamilyQuiz();
});
