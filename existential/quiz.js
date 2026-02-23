/* ========================================
   Existential Sentences Quiz - JavaScript
======================================== */

class ExistentialQuiz {
  constructor() {
    this.questions = [];
    this.questionSets = [];
    this.subtopics = [];
    this.selectedQuestions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.questionsPerQuiz = 10;
    this.selectedSubtopics = new Set(["all"]);
    this.mode = "mcq";
    this.exerciseMode = "questions";
    this.selectedSetId = null;

    this.init();
  }

  async init() {
    await this.loadData();
    this.setupEventListeners();
  }

  async loadData() {
    try {
      const response = await fetch("questions.json");
      const data = await response.json();
      this.questions = data.questions || [];
      this.questionSets = data.question_sets || [];
      this.subtopics = data.subtopics || [];

      document.getElementById("topicTitle").textContent = data.description;
      document.getElementById("quizTitle").textContent = data.title;
      document.getElementById("quizDescription").textContent = data.instructions;

      this.populateSubtopicCheckboxes();
      this.populateSetList();
      this.updateAvailableCount();
    } catch (err) {
      console.error("Error loading questions:", err);
    }
  }

  populateSubtopicCheckboxes() {
    const container = document.getElementById("subtopicCheckboxes");
    if (!container) return;
    container.innerHTML = "";

    this.subtopics.forEach((sub) => {
      const label = document.createElement("label");
      label.className = "subtopic-checkbox-label";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.value = sub.id;
      cb.className = "subtopic-checkbox";
      cb.checked = sub.id === "all";
      cb.addEventListener("change", (e) => this.handleSubtopicChange(e.target));

      const span = document.createElement("span");
      span.textContent = `${sub.icon} ${sub.name}`;

      label.appendChild(cb);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  populateSetList() {
    const container = document.getElementById("setList");
    if (!container) return;
    container.innerHTML = "";

    const typeIcons = {
      identify_existential: "🔍",
      true_false_image: "✅",
    };
    const typeLabels = {
      identify_existential: "Choose the Existential",
      true_false_image: "Oikein vai Väärin?",
    };

    this.questionSets.forEach((set, i) => {
      const btn = document.createElement("button");
      btn.className = "set-btn" + (i === 0 ? " selected" : "");
      btn.dataset.setId = set.id;

      btn.innerHTML = `
        <span class="set-icon">${typeIcons[set.type] || "📝"}</span>
        <div class="set-info">
          <strong>${set.title}</strong>
          <span class="set-type-label">${typeLabels[set.type] || set.type}</span>
        </div>
      `;

      btn.addEventListener("click", () => {
        document.querySelectorAll(".set-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.selectedSetId = set.id;
      });

      container.appendChild(btn);
    });

    if (this.questionSets.length > 0) {
      this.selectedSetId = this.questionSets[0].id;
    }
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
        document.querySelector('.subtopic-checkbox[value="all"]').checked = false;
      } else {
        this.selectedSubtopics.delete(value);
      }
      if (this.selectedSubtopics.size === 0) {
        this.selectedSubtopics.add("all");
        document.querySelector('.subtopic-checkbox[value="all"]').checked = true;
      }
    }
    this.updateAvailableCount();
  }

  getFilteredQuestions() {
    if (this.selectedSubtopics.has("all")) return this.questions;
    return this.questions.filter((q) => this.selectedSubtopics.has(q.subtopic));
  }

  updateAvailableCount() {
    const el = document.getElementById("availableCount");
    if (el) el.textContent = `(${this.getFilteredQuestions().length} available)`;
  }

  setupEventListeners() {
    // Mode tabs
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".mode-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.mode = tab.dataset.mode;
      });
    });

    // Exercise type radios
    document.querySelectorAll('input[name="exerciseType"]').forEach((radio) => {
      radio.addEventListener("change", (e) => {
        this.exerciseMode = e.target.value;
        const isQ = e.target.value === "questions";
        document.getElementById("standardOptions").classList.toggle("hidden", !isQ);
        document.getElementById("setOptions").classList.toggle("hidden", isQ);
        document.querySelectorAll(".mode-tab").forEach((t) => (t.style.display = isQ ? "" : "none"));
      });
    });

    document.getElementById("startBtn").addEventListener("click", () => {
      this.exerciseMode === "questions" ? this.startQuiz() : this.startExerciseSet();
    });

    document.getElementById("nextBtn").addEventListener("click", () => this.nextQuestion());
    document.getElementById("submitAnswer").addEventListener("click", () => this.checkWrittenAnswer());
    document.getElementById("writtenAnswer").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.checkWrittenAnswer();
    });

    document.getElementById("backToStartBtn").addEventListener("click", () => this.showScreen("startScreen"));
    document.getElementById("retryBtn").addEventListener("click", () => this.showScreen("startScreen"));
    document.getElementById("homeBtn").addEventListener("click", () => (window.location.href = "../../"));

    document.getElementById("checkIdentifyBtn").addEventListener("click", () => this.checkIdentifyAnswers());
    document.getElementById("checkTrueFalseBtn").addEventListener("click", () => this.checkTrueFalseAnswers());
  }

  /* ==========================================
     STANDARD QUIZ
  ========================================== */

  startQuiz() {
    const val = document.getElementById("questionCount").value;
    const filtered = this.getFilteredQuestions();
    this.questionsPerQuiz = val === "all" ? filtered.length : Math.min(parseInt(val), filtered.length);
    this.selectedQuestions = this.shuffle([...filtered]).slice(0, this.questionsPerQuiz);
    this.currentIndex = 0;
    this.score = 0;
    this.showScreen("quizScreen");
    this.displayQuestion();
  }

  displayQuestion() {
    const q = this.selectedQuestions[this.currentIndex];
    const pct = ((this.currentIndex + 1) / this.questionsPerQuiz) * 100;
    document.getElementById("progressFill").style.width = `${pct}%`;
    document.getElementById("progressText").textContent = `${this.currentIndex + 1}/${this.questionsPerQuiz}`;

    // Determine display style
    const typeEl = document.getElementById("questionType");
    const wordEl = document.getElementById("wordDisplay");
    const endingEl = document.getElementById("endingDisplay");
    const englishEl = document.getElementById("questionEnglish");

    if (q.type === "identify") {
      typeEl.textContent = "Onko tämä eksistentiaalilause?";
      wordEl.textContent = q.word;
      endingEl.textContent = "";
      englishEl.textContent = q.question;
    } else if (q.type === "sentence") {
      typeEl.textContent = "Muodosta lause";
      wordEl.textContent = "📝";
      endingEl.textContent = "";
      englishEl.textContent = q.sentence;
    } else if (q.type === "genitive" || q.type === "partitive") {
      typeEl.textContent = q.type === "partitive" ? "Partitiivi" : "Nominatiivi";
      wordEl.textContent = q.word;
      endingEl.textContent = q.ending || "";
      englishEl.textContent = q.english;
    }

    document.getElementById("feedback").classList.add("hidden");
    document.getElementById("feedback").classList.remove("correct", "incorrect");
    document.getElementById("nextBtn").classList.add("hidden");

    if (this.mode === "mcq") {
      document.getElementById("optionsContainer").classList.remove("hidden");
      document.getElementById("writtenContainer").classList.add("hidden");
      this.buildOptions(q);
    } else {
      document.getElementById("optionsContainer").classList.add("hidden");
      document.getElementById("writtenContainer").classList.remove("hidden");
      document.getElementById("writtenAnswer").value = "";
      document.getElementById("writtenAnswer").focus();
    }
  }

  buildOptions(q) {
    const container = document.getElementById("optionsContainer");
    container.innerHTML = "";

    let options;
    if (q.type === "identify") {
      options = this.shuffle(["yes", "no"]);
    } else {
      const correct = q.answer;
      const wrongs = this.questions
        .filter((x) => x.id !== q.id && x.subtopic === q.subtopic && x.answer && x.answer !== correct)
        .map((x) => x.answer)
        .filter((a, i, arr) => arr.indexOf(a) === i);
      options = this.shuffle([correct, ...this.shuffle(wrongs).slice(0, 3)]);
    }

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => this.selectOption(opt, q.answer, btn));
      container.appendChild(btn);
    });
  }

  selectOption(selected, correct, btn) {
    document.querySelectorAll(".option-btn").forEach((b) => {
      b.classList.add("disabled");
      if (b.textContent === correct) b.classList.add("correct");
    });

    const isCorrect = selected.toLowerCase().trim() === correct.toLowerCase().trim();
    if (isCorrect) { btn.classList.add("correct"); this.score++; }
    else btn.classList.add("incorrect");

    this.showFeedback(isCorrect, this.selectedQuestions[this.currentIndex]);
  }

  checkWrittenAnswer() {
    const input = document.getElementById("writtenAnswer");
    const userAns = input.value.trim().toLowerCase();
    const q = this.selectedQuestions[this.currentIndex];
    const correct = q.answer.toLowerCase();
    const isCorrect = userAns === correct;

    input.style.borderColor = isCorrect ? "#4caf50" : "#f44336";
    input.style.background = isCorrect ? "#e8f5e9" : "#ffebee";
    document.getElementById("submitAnswer").disabled = true;

    if (isCorrect) this.score++;
    this.showFeedback(isCorrect, q);
  }

  showFeedback(isCorrect, q) {
    const fb = document.getElementById("feedback");
    fb.classList.remove("hidden", "correct", "incorrect");
    fb.classList.add(isCorrect ? "correct" : "incorrect");
    document.getElementById("feedbackIcon").textContent = isCorrect ? "✓" : "✗";
    document.getElementById("feedbackText").textContent = isCorrect
      ? "Oikein! 🎉"
      : `Väärin! Oikea vastaus: ${q.answer}`;
    document.getElementById("feedbackExplanation").textContent = q.explanation || "";
    document.getElementById("nextBtn").classList.remove("hidden");
  }

  nextQuestion() {
    this.currentIndex++;
    const wi = document.getElementById("writtenAnswer");
    wi.style.borderColor = "";
    wi.style.background = "";
    document.getElementById("submitAnswer").disabled = false;

    if (this.currentIndex >= this.questionsPerQuiz) this.showResults();
    else this.displayQuestion();
  }

  showResults() {
    this.showScreen("resultsScreen");
    const pct = Math.round((this.score / this.questionsPerQuiz) * 100);
    document.getElementById("finalScore").textContent = this.score;
    document.getElementById("totalQuestions").textContent = this.questionsPerQuiz;
    document.getElementById("scorePercentage").textContent = `${pct}%`;

    let msg = "Jatka yrittämistä! 🌱";
    if (pct === 100) msg = "Täydellinen! Olet mestari! 🏆";
    else if (pct >= 80) msg = "Erinomainen! Hienoa työtä! 🌟";
    else if (pct >= 60) msg = "Hyvä! Jatka harjoittelua! 💪";
    else if (pct >= 40) msg = "Ihan ok! Harjoittele lisää! 📚";
    document.getElementById("scoreMessage").textContent = msg;
  }

  /* ==========================================
     EXERCISE SETS
  ========================================== */

  startExerciseSet() {
    if (!this.selectedSetId) { alert("Valitse harjoitus ensin."); return; }
    const set = this.questionSets.find((s) => s.id === this.selectedSetId);
    if (!set) return;

    ["exerciseIdentify", "exerciseTrueFalse"].forEach((id) =>
      document.getElementById(id).classList.add("hidden")
    );

    document.getElementById("exerciseSetTitle").textContent = set.title;
    document.getElementById("exerciseSetInstructions").innerHTML =
      `<strong>${set.instructions_fi}</strong><br>${set.instructions_en}`;

    this.showScreen("exerciseSetScreen");

    if (set.type === "identify_existential") this.renderIdentifyExercise(set);
    else if (set.type === "true_false_image") this.renderTrueFalseExercise(set);
  }

  /* --- Identify Existential --- */

  renderIdentifyExercise(set) {
    const block = document.getElementById("exerciseIdentify");
    block.classList.remove("hidden");
    const container = document.getElementById("identifyPairs");
    container.innerHTML = "";

    set.pairs.forEach((pair) => {
      const pairDiv = document.createElement("div");
      pairDiv.className = "identify-pair";
      pairDiv.dataset.number = pair.number;

      const numLabel = document.createElement("div");
      numLabel.className = "pair-number";
      numLabel.textContent = `${pair.number}.`;
      pairDiv.appendChild(numLabel);

      const optionsDiv = document.createElement("div");
      optionsDiv.className = "pair-options";

      pair.options.forEach((opt) => {
        const btn = document.createElement("button");
        btn.className = "pair-option-btn";
        btn.textContent = opt.text;
        btn.dataset.isExistential = opt.is_existential;

        btn.addEventListener("click", () => {
          // Deselect siblings
          optionsDiv.querySelectorAll(".pair-option-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          pairDiv.dataset.selected = opt.is_existential;
          pairDiv.dataset.selectedText = opt.text;
        });

        optionsDiv.appendChild(btn);
      });

      // Store correct answer
      const correctOpt = pair.options.find((o) => o.is_existential);
      pairDiv.dataset.correctText = correctOpt ? correctOpt.text : "";
      pairDiv.dataset.explanation = pair.explanation;

      pairDiv.appendChild(optionsDiv);

      // Explanation area (hidden until check)
      const expDiv = document.createElement("div");
      expDiv.className = "pair-explanation hidden";
      pairDiv.appendChild(expDiv);

      container.appendChild(pairDiv);
    });

    document.getElementById("identifyScore").classList.add("hidden");
    document.getElementById("checkIdentifyBtn").style.display = "";
    document.getElementById("checkIdentifyBtn").disabled = false;
  }

  checkIdentifyAnswers() {
    const pairs = document.querySelectorAll(".identify-pair");
    let correct = 0;

    pairs.forEach((pair) => {
      const selected = pair.dataset.selected;
      const isCorrect = selected === "true";
      const expDiv = pair.querySelector(".pair-explanation");
      const explanation = pair.dataset.explanation;

      pair.querySelectorAll(".pair-option-btn").forEach((btn) => {
        btn.disabled = true;
        btn.classList.remove("selected");
        if (btn.dataset.isExistential === "true") btn.classList.add("correct");
      });

      // Highlight what user selected
      const selectedBtn = Array.from(pair.querySelectorAll(".pair-option-btn")).find(
        (b) => b.textContent === pair.dataset.selectedText
      );
      if (selectedBtn && selectedBtn.dataset.isExistential === "false") {
        selectedBtn.classList.add("incorrect");
      }

      expDiv.classList.remove("hidden");
      expDiv.innerHTML = `
        <span class="exp-icon">${isCorrect ? "✓" : "✗"}</span>
        <span class="exp-text">${explanation}</span>
      `;
      expDiv.className = `pair-explanation ${isCorrect ? "exp-correct" : "exp-incorrect"}`;

      if (isCorrect || selected === "true") correct++;
      // Re-evaluate: correct means they picked the existential one
    });

    // Re-count correctly
    let trueCorrect = 0;
    pairs.forEach((pair) => {
      if (pair.dataset.selected === "true") trueCorrect++;
    });

    const scoreEl = document.getElementById("identifyScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(trueCorrect, pairs.length);
    document.getElementById("checkIdentifyBtn").style.display = "none";
  }

  /* --- True / False --- */

  renderTrueFalseExercise(set) {
    const block = document.getElementById("exerciseTrueFalse");
    block.classList.remove("hidden");

    // Scene description
    const sceneBox = document.getElementById("sceneBox");
    sceneBox.innerHTML = `
      <div class="scene-emoji">${set.scene_emoji}</div>
      <p class="scene-desc">${set.scene_description}</p>
    `;

    const container = document.getElementById("trueFalseItems");
    container.innerHTML = "";

    set.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "tf-row";
      row.dataset.correct = item.correct;
      row.dataset.explanation = item.explanation;

      const sentenceDiv = document.createElement("div");
      sentenceDiv.className = "tf-sentence";
      sentenceDiv.innerHTML = `
        <span class="tf-number">${item.number}.</span>
        <span class="tf-fi">${item.sentence}</span>
        <span class="tf-en">${item.english}</span>
      `;

      const btnGroup = document.createElement("div");
      btnGroup.className = "tf-btn-group";

      ["oikein", "väärin"].forEach((label) => {
        const btn = document.createElement("button");
        btn.className = `tf-btn tf-btn-${label}`;
        btn.textContent = label.charAt(0).toUpperCase() + label.slice(1);
        btn.dataset.value = label === "oikein" ? "true" : "false";

        btn.addEventListener("click", () => {
          btnGroup.querySelectorAll(".tf-btn").forEach((b) => b.classList.remove("selected"));
          btn.classList.add("selected");
          row.dataset.selected = btn.dataset.value;
        });

        btnGroup.appendChild(btn);
      });

      const expDiv = document.createElement("div");
      expDiv.className = "tf-explanation hidden";

      row.appendChild(sentenceDiv);
      row.appendChild(btnGroup);
      row.appendChild(expDiv);
      container.appendChild(row);
    });

    document.getElementById("trueFalseScore").classList.add("hidden");
    document.getElementById("checkTrueFalseBtn").style.display = "";
    document.getElementById("checkTrueFalseBtn").disabled = false;
  }

  checkTrueFalseAnswers() {
    const rows = document.querySelectorAll(".tf-row");
    let correct = 0;

    rows.forEach((row) => {
      const selected = row.dataset.selected;
      const correctVal = row.dataset.correct;
      const isCorrect = selected === correctVal;
      const expDiv = row.querySelector(".tf-explanation");

      row.querySelectorAll(".tf-btn").forEach((btn) => {
        btn.disabled = true;
        if (btn.dataset.value === correctVal) btn.classList.add("tf-correct");
        else if (btn.classList.contains("selected")) btn.classList.add("tf-incorrect");
      });

      expDiv.classList.remove("hidden");
      expDiv.innerHTML = `
        <span class="exp-icon">${isCorrect ? "✓" : "✗"}</span>
        <span class="exp-text">${row.dataset.explanation}</span>
      `;
      expDiv.className = `tf-explanation ${isCorrect ? "exp-correct" : "exp-incorrect"}`;

      if (isCorrect) correct++;
    });

    const scoreEl = document.getElementById("trueFalseScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, rows.length);
    document.getElementById("checkTrueFalseBtn").style.display = "none";
  }

  /* ==========================================
     UTILITIES
  ========================================== */

  buildScoreHtml(correct, total) {
    const pct = Math.round((correct / total) * 100);
    const emoji = pct === 100 ? "🏆" : pct >= 80 ? "🌟" : pct >= 60 ? "💪" : "🌱";
    const msg = pct === 100 ? "Täydellinen!" : pct >= 80 ? "Erinomainen!" : pct >= 60 ? "Hyvä työ!" : pct >= 40 ? "Harjoittele lisää!" : "Jatka yrittämistä!";
    return `<div class="score-result">
      <span class="score-emoji">${emoji}</span>
      <span class="score-fraction">${correct}/${total}</span>
      <span class="score-pct">(${pct}%)</span>
      <span class="score-msg">${msg}</span>
    </div>`;
  }

  showScreen(id) {
    document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
    window.scrollTo(0, 0);
  }

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

document.addEventListener("DOMContentLoaded", () => new ExistentialQuiz());
