/* ========================================
   Word Types Quiz - JavaScript
======================================== */

class WordTypesQuiz {
  constructor() {
    this.questions = [];
    this.questionSets = [];
    this.subtopics = [];
    this.rules = {};
    this.selectedQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.questionsPerQuiz = 10;
    this.selectedSubtopics = new Set(["all"]);
    this.mode = "mcq";
    this.exerciseMode = "questions"; // "questions" or "question_sets"
    this.selectedSetId = null;

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
      this.questions = data.questions || [];
      this.questionSets = data.question_sets || [];
      this.subtopics = data.subtopics || [];
      this.rules = data.rules || {};

      document.getElementById("topicTitle").textContent = data.description;
      document.getElementById("quizTitle").textContent = data.title;
      document.getElementById("quizDescription").textContent =
        data.instructions;

      this.populateSubtopicCheckboxes();
      this.populateSetList();
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

  populateSetList() {
    const container = document.getElementById("setList");
    if (!container) return;
    container.innerHTML = "";

    const typeIcons = {
      reading_perusmuoto: "📖",
      missä_transformation: "📍",
      missing_forms_table: "📊",
      sentence_transformation: "✏️",
    };

    const typeLabels = {
      reading_perusmuoto: "Reading – Basic Forms",
      missä_transformation: "Missä? Transformation",
      missing_forms_table: "Fill-in-the-Table",
      sentence_transformation: "Sentence Transformation",
    };

    this.questionSets.forEach((set) => {
      const btn = document.createElement("button");
      btn.className = "set-btn";
      btn.dataset.setId = set.id;
      if (set.id === this.selectedSetId) btn.classList.add("selected");

      const icon = typeIcons[set.type] || "📝";
      const typeLabel = typeLabels[set.type] || set.type;

      btn.innerHTML = `
        <span class="set-icon">${icon}</span>
        <div class="set-info">
          <strong>${set.title}</strong>
          <span class="set-type-label">${typeLabel} · ${this.getSetSubtopicLabel(set.subtopic)}</span>
        </div>
      `;

      btn.addEventListener("click", () => {
        document
          .querySelectorAll(".set-btn")
          .forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.selectedSetId = set.id;
      });

      container.appendChild(btn);
    });

    // Auto-select first
    if (this.questionSets.length > 0) {
      this.selectedSetId = this.questionSets[0].id;
      container.querySelector(".set-btn")?.classList.add("selected");
    }
  }

  getSetSubtopicLabel(subtopicId) {
    const map = {
      all: "All Types",
      "i-type": "I-Type",
      "e-type": "E-Type",
      "nen-type": "NEN-Type",
      possessive: "Possessive",
    };
    return map[subtopicId] || subtopicId;
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
    if (this.selectedSubtopics.has("all")) return this.questions;
    return this.questions.filter((q) => this.selectedSubtopics.has(q.subtopic));
  }

  updateQuestionCount() {
    const filtered = this.getFilteredQuestions();
    const countEl = document.getElementById("availableCount");
    if (countEl) countEl.textContent = `(${filtered.length} available)`;
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

    // Exercise type radio buttons
    document.querySelectorAll('input[name="exerciseType"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.exerciseMode = e.target.value;
        if (e.target.value === "questions") {
          document.getElementById("standardOptions").classList.remove("hidden");
          document.getElementById("setOptions").classList.add("hidden");
          document
            .querySelectorAll(".mode-tab")
            .forEach((t) => (t.style.display = ""));
        } else {
          document.getElementById("standardOptions").classList.add("hidden");
          document.getElementById("setOptions").classList.remove("hidden");
          document
            .querySelectorAll(".mode-tab")
            .forEach((t) => (t.style.display = "none"));
        }
      });
    });

    // Start button
    document.getElementById("startBtn").addEventListener("click", () => {
      if (this.exerciseMode === "questions") {
        this.startQuiz();
      } else {
        this.startExerciseSet();
      }
    });

    // Back to start
    document.getElementById("backToStartBtn").addEventListener("click", () => {
      this.showScreen("startScreen");
    });

    // Next button
    document.getElementById("nextBtn").addEventListener("click", () => {
      this.nextQuestion();
    });

    // Submit written answer
    document.getElementById("submitAnswer").addEventListener("click", () => {
      this.checkWrittenAnswer();
    });

    document
      .getElementById("writtenAnswer")
      .addEventListener("keypress", (e) => {
        if (e.key === "Enter") this.checkWrittenAnswer();
      });

    // Results buttons
    document.getElementById("retryBtn").addEventListener("click", () => {
      this.showScreen("startScreen");
    });

    document.getElementById("homeBtn").addEventListener("click", () => {
      window.location.href = "../../";
    });

    // Exercise check buttons
    document.getElementById("checkReadingBtn").addEventListener("click", () => {
      this.checkReadingAnswers();
    });

    document.getElementById("checkMissaBtn").addEventListener("click", () => {
      this.checkMissaAnswers();
    });

    document.getElementById("checkTableBtn").addEventListener("click", () => {
      this.checkTableAnswers();
    });

    document
      .getElementById("checkSentenceBtn")
      .addEventListener("click", () => {
        this.checkSentenceAnswers();
      });
  }

  /* ========================================
     STANDARD QUIZ MODE
  ======================================== */

  startQuiz() {
    const countSelect = document.getElementById("questionCount");
    const filtered = this.getFilteredQuestions();

    if (countSelect.value === "all") {
      this.questionsPerQuiz = filtered.length;
    } else {
      this.questionsPerQuiz = Math.min(
        parseInt(countSelect.value),
        filtered.length,
      );
    }

    this.selectedQuestions = this.shuffleArray([...filtered]).slice(
      0,
      this.questionsPerQuiz,
    );
    this.currentIndex = 0;
    this.score = 0;

    this.showScreen("quizScreen");
    this.displayQuestion();
  }

  displayQuestion() {
    const question = this.selectedQuestions[this.currentIndex];

    const progress = ((this.currentIndex + 1) / this.questionsPerQuiz) * 100;
    document.getElementById("progressFill").style.width = `${progress}%`;
    document.getElementById("progressText").textContent =
      `${this.currentIndex + 1}/${this.questionsPerQuiz}`;

    this.displayQuestionContent(question);

    document.getElementById("feedback").classList.add("hidden");
    document
      .getElementById("feedback")
      .classList.remove("correct", "incorrect");
    document.getElementById("nextBtn").classList.add("hidden");

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

    if (
      [
        "genitive",
        "inessive",
        "adessive",
        "partitive",
        "illative",
        "elative",
      ].includes(question.type)
    ) {
      questionType.textContent =
        question.type.charAt(0).toUpperCase() + question.type.slice(1);
      wordDisplay.textContent = question.word;
      endingDisplay.textContent = question.ending || "+ ?";
      questionEnglish.textContent = question.english;
    } else if (question.type === "sentence") {
      questionType.textContent = "Translate";
      wordDisplay.textContent = "🇬🇧";
      endingDisplay.textContent = "";
      questionEnglish.textContent = question.sentence || question.english;
    } else if (question.type === "identify") {
      questionType.textContent = "Identify Word Type";
      wordDisplay.textContent = question.word;
      endingDisplay.textContent = "";
      questionEnglish.textContent = question.question;
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

    if (question.type === "identify") {
      return this.shuffleArray(["yes", "no"]);
    }

    const similarQuestions = this.questions.filter(
      (q) =>
        q.id !== question.id &&
        q.type === question.type &&
        q.subtopic === question.subtopic,
    );

    const wrongAnswers = similarQuestions
      .map((q) => q.answer)
      .filter((a) => a !== correct && !options.includes(a));

    const shuffledWrong = this.shuffleArray(wrongAnswers).slice(0, 3);
    options.push(...shuffledWrong);

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
    if (!word) return null;

    const variations = [];

    if (word.endsWith("i")) {
      variations.push(word + "n");
      const base = word.slice(0, -1);
      variations.push(base + "en");
      variations.push(base + "an");
      variations.push(base + "in");
    }

    for (const v of this.shuffleArray(variations)) {
      if (!existing.includes(v) && v !== question.answer) {
        return v;
      }
    }
    return null;
  }

  checkAnswer(selected, correct, button) {
    const buttons = document.querySelectorAll(".option-btn");
    buttons.forEach((btn) => {
      btn.classList.add("disabled");
      if (btn.textContent === correct) btn.classList.add("correct");
    });

    const isCorrect =
      selected.toLowerCase().trim() === correct.toLowerCase().trim();

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
    text.textContent = isCorrect
      ? "Oikein! 🎉"
      : `Väärin! Oikea vastaus: ${question.answer}`;
    explanation.textContent = question.explanation || "";

    document.getElementById("nextBtn").classList.remove("hidden");
  }

  nextQuestion() {
    this.currentIndex++;

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
    document.getElementById("totalQuestions").textContent =
      this.questionsPerQuiz;
    document.getElementById("scorePercentage").textContent = `${percentage}%`;

    let message = "";
    if (percentage === 100) message = "Täydellinen! Olet mestari! 🏆";
    else if (percentage >= 80) message = "Erinomainen! Hienoa työtä! 🌟";
    else if (percentage >= 60) message = "Hyvä! Jatka harjoittelua! 💪";
    else if (percentage >= 40) message = "Ihan ok! Harjoittele lisää! 📚";
    else message = "Jatka yrittämistä! Oppiminen vie aikaa! 🌱";

    document.getElementById("scoreMessage").textContent = message;
  }

  /* ========================================
     EXERCISE SET MODE
  ======================================== */

  startExerciseSet() {
    if (!this.selectedSetId) {
      alert("Please select an exercise set first.");
      return;
    }

    const set = this.questionSets.find((s) => s.id === this.selectedSetId);
    if (!set) return;

    // Reset all exercise blocks
    [
      "exerciseReading",
      "exerciseMissa",
      "exerciseTable",
      "exerciseSentence",
    ].forEach((id) => {
      document.getElementById(id).classList.add("hidden");
    });

    // Set header info
    document.getElementById("exerciseSetTitle").textContent = set.title;
    document.getElementById("exerciseSetInstructions").innerHTML =
      `<strong>${set.instructions_fi}</strong><br>${set.instructions_en}`;

    this.showScreen("exerciseSetScreen");

    switch (set.type) {
      case "reading_perusmuoto":
        this.renderReadingExercise(set);
        break;
      case "missä_transformation":
        this.renderMissaExercise(set);
        break;
      case "missing_forms_table":
        this.renderTableExercise(set);
        break;
      case "sentence_transformation":
        this.renderSentenceExercise(set);
        break;
    }
  }

  /* --- Reading / Perusmuoto --- */

  renderReadingExercise(set) {
    const block = document.getElementById("exerciseReading");
    block.classList.remove("hidden");

    document.getElementById("passageTitle").textContent = set.passage.title;

    // Build passage HTML with numbered highlights
    let passageHtml = set.passage.text.replace(
      /(\d+)\.\[([^\]]+)\]/g,
      (match, num, word) =>
        `<strong class="highlighted-word">${num}. <em>${word}</em></strong>`,
    );
    document.getElementById("passageText").innerHTML = passageHtml;

    // Build answer inputs
    const answersContainer = document.getElementById("readingAnswers");
    answersContainer.innerHTML = "";

    const grid = document.createElement("div");
    grid.className = "reading-answer-grid";

    set.passage.italicised_words.forEach((item) => {
      const row = document.createElement("div");
      row.className = "reading-answer-row";

      const label = document.createElement("label");
      label.textContent = `${item.number}.`;
      label.className = "answer-number-label";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "reading-input";
      input.dataset.answer = item.answer;
      input.dataset.number = item.number;
      input.placeholder = "perusmuoto...";
      input.autocomplete = "off";
      input.autocapitalize = "none";

      input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          const inputs = grid.querySelectorAll(".reading-input");
          const idx = Array.from(inputs).indexOf(input);
          if (idx < inputs.length - 1) inputs[idx + 1].focus();
        }
      });

      row.appendChild(label);
      row.appendChild(input);
      grid.appendChild(row);
    });

    answersContainer.appendChild(grid);

    // Reset score
    document.getElementById("readingScore").classList.add("hidden");
    document.getElementById("checkReadingBtn").disabled = false;
    document.getElementById("checkReadingBtn").style.display = "";
  }

  checkReadingAnswers() {
    const inputs = document.querySelectorAll("#exerciseReading .reading-input");
    let correct = 0;
    let total = inputs.length;

    inputs.forEach((input) => {
      const userAnswer = input.value.trim().toLowerCase();
      const correctAnswer = input.dataset.answer.toLowerCase();
      const isCorrect = userAnswer === correctAnswer;

      input.disabled = true;
      input.classList.remove("input-correct", "input-incorrect");
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");

      if (!isCorrect) {
        // Show correct answer inline
        let hint = input.parentElement.querySelector(".correct-hint");
        if (!hint) {
          hint = document.createElement("span");
          hint.className = "correct-hint";
          input.parentElement.appendChild(hint);
        }
        hint.textContent = `→ ${input.dataset.answer}`;
      }

      if (isCorrect) correct++;
    });

    const scoreEl = document.getElementById("readingScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, total);
    document.getElementById("checkReadingBtn").style.display = "none";
  }

  /* --- Missä Transformation --- */

  renderMissaExercise(set) {
    const block = document.getElementById("exerciseMissa");
    block.classList.remove("hidden");

    // Model example
    const modelBox = document.getElementById("modelExampleBox");
    if (set.model_example) {
      modelBox.classList.remove("hidden");
      modelBox.innerHTML = `
        <strong>Malli:</strong>
        <span class="model-prompt">${set.model_example.prompt}</span>
        <span class="model-arrow">→</span>
        <span class="model-answer">${set.model_example.answer}</span>
      `;
    } else {
      modelBox.classList.add("hidden");
    }

    // Note
    const noteBox = document.getElementById("missaNoteBox");
    if (set.note) {
      noteBox.classList.remove("hidden");
      noteBox.textContent = set.note;
    } else {
      noteBox.classList.add("hidden");
    }

    // Items
    const itemsContainer = document.getElementById("missaItems");
    itemsContainer.innerHTML = "";

    set.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "transformation-row";

      const numLabel = document.createElement("span");
      numLabel.className = "item-number";
      numLabel.textContent = `${item.number}.`;

      const prompt = document.createElement("span");
      prompt.className = "item-prompt";
      prompt.textContent = item.prompt;

      const arrow = document.createElement("span");
      arrow.className = "item-arrow";
      arrow.textContent = "→";

      const input = document.createElement("input");
      input.type = "text";
      input.className = "transformation-input";
      input.dataset.answer = item.answer;
      input.placeholder = "Kirjoita vastaus...";
      input.autocomplete = "off";
      input.autocapitalize = "none";

      row.appendChild(numLabel);
      row.appendChild(prompt);
      row.appendChild(arrow);
      row.appendChild(input);
      itemsContainer.appendChild(row);
    });

    document.getElementById("missaScore").classList.add("hidden");
    document.getElementById("checkMissaBtn").disabled = false;
    document.getElementById("checkMissaBtn").style.display = "";
  }

  checkMissaAnswers() {
    const inputs = document.querySelectorAll(
      "#exerciseMissa .transformation-input",
    );
    let correct = 0;

    inputs.forEach((input) => {
      const userAnswer = input.value.trim().toLowerCase();
      const correctAnswer = input.dataset.answer.toLowerCase();
      const isCorrect = userAnswer === correctAnswer;

      input.disabled = true;
      input.classList.remove("input-correct", "input-incorrect");
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");

      if (!isCorrect) {
        let hint = input.parentElement.querySelector(".correct-hint");
        if (!hint) {
          hint = document.createElement("span");
          hint.className = "correct-hint";
          input.parentElement.appendChild(hint);
        }
        hint.textContent = input.dataset.answer;
      }

      if (isCorrect) correct++;
    });

    const scoreEl = document.getElementById("missaScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, inputs.length);
    document.getElementById("checkMissaBtn").style.display = "none";
  }

  /* --- Missing Forms Table --- */

  renderTableExercise(set) {
    const block = document.getElementById("exerciseTable");
    block.classList.remove("hidden");

    const noteBox = document.getElementById("tableNoteBox");
    if (set.note) {
      noteBox.classList.remove("hidden");
      noteBox.textContent = set.note;
    } else {
      noteBox.classList.add("hidden");
    }

    const table = document.getElementById("declensionTable");
    table.innerHTML = "";

    // Header row with column count
    const numCols = set.rows[0].cells.length;
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const thLabel = document.createElement("th");
    thLabel.textContent = "Muoto";
    headerRow.appendChild(thLabel);
    for (let i = 0; i < numCols; i++) {
      const th = document.createElement("th");
      th.textContent = `Sana ${i + 1}`;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement("tbody");
    set.rows.forEach((row) => {
      const tr = document.createElement("tr");

      const labelCell = document.createElement("td");
      labelCell.className = "row-label";
      labelCell.textContent = row.label;
      tr.appendChild(labelCell);

      row.cells.forEach((cell) => {
        const td = document.createElement("td");

        if (cell.given) {
          td.className = "cell-given";
          td.textContent = cell.word;
        } else {
          const input = document.createElement("input");
          input.type = "text";
          input.className = "table-input";
          input.dataset.answer = cell.word;
          input.placeholder = "...";
          input.autocomplete = "off";
          input.autocapitalize = "none";
          td.appendChild(input);
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);

    document.getElementById("tableScore").classList.add("hidden");
    document.getElementById("checkTableBtn").disabled = false;
    document.getElementById("checkTableBtn").style.display = "";
  }

  checkTableAnswers() {
    const inputs = document.querySelectorAll("#exerciseTable .table-input");
    let correct = 0;

    inputs.forEach((input) => {
      const userAnswer = input.value.trim().toLowerCase();
      const correctAnswer = input.dataset.answer.toLowerCase();
      const isCorrect = userAnswer === correctAnswer;

      input.disabled = true;
      input.classList.remove("input-correct", "input-incorrect");
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");

      if (!isCorrect) {
        input.title = `Oikea: ${input.dataset.answer}`;
        // Show correct answer below
        let hint = input.parentElement.querySelector(".cell-hint");
        if (!hint) {
          hint = document.createElement("div");
          hint.className = "cell-hint correct-hint";
          input.parentElement.appendChild(hint);
        }
        hint.textContent = input.dataset.answer;
      }

      if (isCorrect) correct++;
    });

    const scoreEl = document.getElementById("tableScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, inputs.length);
    document.getElementById("checkTableBtn").style.display = "none";
  }

  /* --- Sentence Transformation --- */

  renderSentenceExercise(set) {
    const block = document.getElementById("exerciseSentence");
    block.classList.remove("hidden");

    // Model example
    const modelBox = document.getElementById("sentenceModelBox");
    if (set.model_example) {
      modelBox.classList.remove("hidden");
      modelBox.innerHTML = `
        <strong>Malli:</strong>
        <span class="model-prompt">${set.model_example.prompt}</span>
        <span class="model-arrow">→</span>
        <span class="model-answer">${set.model_example.answer}</span>
      `;
    } else {
      modelBox.classList.add("hidden");
    }

    const groupsContainer = document.getElementById("sentenceGroups");
    groupsContainer.innerHTML = "";

    set.groups.forEach((group) => {
      const groupDiv = document.createElement("div");
      groupDiv.className = "sentence-group";

      const caseLabel = document.createElement("h4");
      caseLabel.className = "case-label";
      caseLabel.textContent = group.case;
      groupDiv.appendChild(caseLabel);

      group.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "sentence-row";

        const numLabel = document.createElement("span");
        numLabel.className = "item-number";
        numLabel.textContent = `${item.number}.`;

        const prompt = document.createElement("span");
        prompt.className = "sentence-prompt";
        prompt.textContent = item.prompt;

        const input = document.createElement("input");
        input.type = "text";
        input.className = "sentence-input";
        input.dataset.answer = item.answer;
        input.placeholder = "Kirjoita vastaus...";
        input.autocomplete = "off";
        input.autocapitalize = "none";

        row.appendChild(numLabel);
        row.appendChild(prompt);
        groupDiv.appendChild(row);
        groupDiv.appendChild(input);
      });

      groupsContainer.appendChild(groupDiv);
    });

    document.getElementById("sentenceScore").classList.add("hidden");
    document.getElementById("checkSentenceBtn").disabled = false;
    document.getElementById("checkSentenceBtn").style.display = "";
  }

  checkSentenceAnswers() {
    const inputs = document.querySelectorAll(
      "#exerciseSentence .sentence-input",
    );
    let correct = 0;

    inputs.forEach((input) => {
      const userAnswer = input.value.trim().toLowerCase();
      const correctAnswer = input.dataset.answer.toLowerCase();
      const isCorrect = userAnswer === correctAnswer;

      input.disabled = true;
      input.classList.remove("input-correct", "input-incorrect");
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");

      if (!isCorrect) {
        let hint = input.parentElement.querySelector(".correct-hint");
        if (!hint) {
          hint = document.createElement("span");
          hint.className = "correct-hint";
          input.parentElement.appendChild(hint);
        }
        hint.textContent = `→ ${input.dataset.answer}`;
      }

      if (isCorrect) correct++;
    });

    const scoreEl = document.getElementById("sentenceScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, inputs.length);
    document.getElementById("checkSentenceBtn").style.display = "none";
  }

  /* ========================================
     UTILITIES
  ======================================== */

  buildScoreHtml(correct, total) {
    const pct = Math.round((correct / total) * 100);
    let emoji = "🌱";
    if (pct === 100) emoji = "🏆";
    else if (pct >= 80) emoji = "🌟";
    else if (pct >= 60) emoji = "💪";

    let message = "";
    if (pct === 100) message = "Täydellinen! Olet mestari!";
    else if (pct >= 80) message = "Erinomainen! Hienoa työtä!";
    else if (pct >= 60) message = "Hyvä! Jatka harjoittelua!";
    else if (pct >= 40) message = "Ihan ok! Harjoittele lisää!";
    else message = "Jatka yrittämistä! Oppiminen vie aikaa!";

    return `
      <div class="score-result">
        <span class="score-emoji">${emoji}</span>
        <span class="score-fraction">${correct}/${total}</span>
        <span class="score-pct">(${pct}%)</span>
        <span class="score-msg">${message}</span>
      </div>
    `;
  }

  showScreen(screenId) {
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.add("hidden");
    });
    document.getElementById(screenId).classList.remove("hidden");
    window.scrollTo(0, 0);
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
  new WordTypesQuiz();
});
