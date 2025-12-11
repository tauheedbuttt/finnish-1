/* ========================================
   Finnish Weather Quiz - JavaScript
======================================== */

class WeatherQuiz {
  constructor() {
    this.questions = [];
    this.subtopics = [];
    this.vocabulary = {};
    this.dialogues = [];
    this.selectedQuestions = [];
    this.currentIndex = 0;
    this.questionsPerQuiz = 10;
    this.selectedSubtopic = "all";

    this.init();
  }

  async init() {
    await this.loadQuestions();
    this.setupEventListeners();
    this.populateVocabulary();
    this.populateDialogues();
  }

  async loadQuestions() {
    try {
      const response = await fetch("questions.json");
      const data = await response.json();
      this.questions = data.questions;
      this.subtopics = data.subtopics || [];
      this.vocabulary = data.vocabulary || {};
      this.dialogues = data.dialogues || [];
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

  populateVocabulary() {
    const grid = document.getElementById("vocabGrid");
    grid.innerHTML = "";

    // Weather types
    if (this.vocabulary.weather_types) {
      grid.innerHTML += this.createVocabSection(
        "🌤️ Weather Types",
        this.vocabulary.weather_types
      );
    }

    // Precipitation
    if (this.vocabulary.precipitation) {
      grid.innerHTML += this.createVocabSection(
        "🌧️ Precipitation",
        this.vocabulary.precipitation
      );
    }

    // Temperature
    if (this.vocabulary.temperature) {
      grid.innerHTML += this.createVocabSection(
        "🌡️ Temperature",
        this.vocabulary.temperature
      );
    }

    // Degrees
    if (this.vocabulary.degrees) {
      grid.innerHTML += this.createVocabSection(
        "🔢 Degrees",
        this.vocabulary.degrees
      );
    }

    // Adjectives
    if (this.vocabulary.adjectives) {
      grid.innerHTML += this.createVocabSection(
        "✨ Adjectives",
        this.vocabulary.adjectives
      );
    }
  }

  populateDialogues() {
    const container = document.getElementById("dialogueContainer");
    if (!container || !this.dialogues.length) return;

    container.innerHTML = "";

    this.dialogues.forEach((dialogue) => {
      dialogue.lines.forEach((line) => {
        const speakerClass = line.speaker === "A" ? "speaker-a" : "speaker-b";
        container.innerHTML += `
          <div class="dialogue-line ${speakerClass}">
            <span class="speaker-label">${line.speaker}</span>
            <span class="dialogue-bubble">${line.line}</span>
          </div>
        `;
      });
    });
  }

  createVocabSection(title, items) {
    const itemsHtml = items
      .map(
        (item) => `
        <span class="vocab-item">
          <span class="finnish">${item.finnish}</span>
          <span class="english"> - ${item.english}</span>
        </span>
      `
      )
      .join("");

    return `
      <div class="vocab-section">
        <h4>${title}</h4>
        <div class="vocab-list">${itemsHtml}</div>
      </div>
    `;
  }

  updateQuestionCount() {
    const filtered = this.getFilteredQuestions();
    const countEl = document.getElementById("questionCount");
    countEl.textContent = `${filtered.length} questions available`;

    const startBtn = document.getElementById("startBtn");
    if (filtered.length === 0) {
      startBtn.disabled = true;
    } else {
      startBtn.disabled = false;
    }
  }

  getFilteredQuestions() {
    if (this.selectedSubtopic === "all") {
      return this.questions;
    }
    return this.questions.filter((q) => q.subtopic === this.selectedSubtopic);
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
      .addEventListener("click", () => this.retryQuiz());
    document
      .getElementById("reviewVocabBtn")
      .addEventListener("click", () => this.retryQuiz());
    document
      .getElementById("showHintsBtn")
      .addEventListener("click", () => this.toggleHints());
    document
      .getElementById("submitBtn")
      .addEventListener("click", () => this.submitAnswer());

    // Subtopic filter
    document
      .getElementById("subtopicFilter")
      .addEventListener("change", (e) => {
        this.selectedSubtopic = e.target.value;
        this.updateQuestionCount();
      });

    // Track input changes
    ["sentence1", "sentence2", "sentence3"].forEach((id) => {
      document.getElementById(id).addEventListener("input", (e) => {
        if (e.target.value.trim()) {
          e.target.classList.add("filled");
        } else {
          e.target.classList.remove("filled");
        }
      });
    });
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
    const progress =
      ((this.currentIndex + 1) / this.selectedQuestions.length) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressText").textContent = `${
      this.currentIndex + 1
    } / ${this.selectedQuestions.length}`;

    // Update weather display
    this.updateWeatherDisplay(question);

    // Update prompt
    document.getElementById("questionText").textContent = question.prompt;

    // Reset inputs
    ["sentence1", "sentence2", "sentence3"].forEach((id) => {
      const input = document.getElementById(id);
      input.value = "";
      input.disabled = false;
      input.classList.remove("filled");
    });

    // Reset hints
    document.getElementById("hintsContainer").classList.add("hidden");
    document.getElementById("showHintsBtn").textContent = "💡 Show Hints";
    this.populateHints(question.hints);

    // Reset buttons
    document.getElementById("submitBtn").classList.remove("hidden");
    document.getElementById("submitBtn").disabled = false;
    document.getElementById("nextBtn").classList.add("hidden");
    document.getElementById("exampleSection").classList.add("hidden");
  }

  updateWeatherDisplay(question) {
    const display = document.querySelector(".weather-display");
    const iconEl = document.getElementById("weatherIcon");
    const cityEl = document.getElementById("weatherCity");
    const tempEl = document.getElementById("weatherTemp");

    // Set icon based on weather type
    const icons = {
      sunny: "☀️",
      "partly-cloudy": "⛅",
      cloudy: "☁️",
      rainy: "🌧️",
      snowy: "🌨️",
      stormy: "⛈️",
      thunder: "🌩️",
      foggy: "🌫️",
      windy: "💨",
      sleet: "🌨️",
      slushy: "🌧️",
    };

    iconEl.textContent = icons[question.weatherIcon] || "🌤️";
    cityEl.textContent = question.city;
    tempEl.textContent = `${question.temperature}°`;

    // Update display style based on subtopic
    display.className = "weather-display";
    if (question.subtopic === "sunny" || question.subtopic === "warm") {
      display.classList.add("sunny");
    } else if (question.subtopic === "cloudy") {
      display.classList.add("cloudy");
    } else if (question.subtopic === "rainy") {
      display.classList.add("rainy");
    } else if (question.subtopic === "snowy") {
      display.classList.add("snowy");
    } else if (question.subtopic === "stormy") {
      display.classList.add("stormy");
    } else if (question.subtopic === "cold") {
      display.classList.add("cold");
    }
  }

  populateHints(hints) {
    const list = document.getElementById("hintsList");
    list.innerHTML = hints
      .map((hint) => `<span class="hint-chip">${hint}</span>`)
      .join("");
  }

  toggleHints() {
    const container = document.getElementById("hintsContainer");
    const btn = document.getElementById("showHintsBtn");

    if (container.classList.contains("hidden")) {
      container.classList.remove("hidden");
      btn.textContent = "🙈 Hide Hints";
    } else {
      container.classList.add("hidden");
      btn.textContent = "💡 Show Hints";
    }
  }

  submitAnswer() {
    const question = this.selectedQuestions[this.currentIndex];

    // Disable inputs
    ["sentence1", "sentence2", "sentence3"].forEach((id) => {
      document.getElementById(id).disabled = true;
    });

    // Hide submit, show next
    document.getElementById("submitBtn").classList.add("hidden");
    document.getElementById("nextBtn").classList.remove("hidden");
    document.getElementById("nextBtn").textContent =
      this.currentIndex < this.selectedQuestions.length - 1
        ? "Seuraava →"
        : "Näytä tulokset";

    // Show example sentences
    this.showExamples(question.exampleSentences);
  }

  showExamples(sentences) {
    const section = document.getElementById("exampleSection");
    const container = document.getElementById("exampleSentences");

    container.innerHTML = sentences
      .map(
        (sentence, i) =>
          `<div class="example-sentence">${i + 1}. ${sentence}</div>`
      )
      .join("");

    section.classList.remove("hidden");
  }

  nextQuestion() {
    this.currentIndex++;

    if (this.currentIndex < this.selectedQuestions.length) {
      this.displayQuestion();
    } else {
      this.showResults();
    }
  }

  showResults() {
    this.showScreen("resultsScreen");
    document.getElementById("completedCount").textContent =
      this.selectedQuestions.length;
  }

  retryQuiz() {
    this.showScreen("startScreen");
  }
}

// Initialize quiz when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new WeatherQuiz();
});
