/* ========================================
   Imperatiivi Quiz - JavaScript
======================================== */

class ImperatiivisQuiz {
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
      const res = await fetch("questions.json");
      const data = await res.json();
      this.questions = data.questions || [];
      this.questionSets = data.question_sets || [];
      this.subtopics = data.subtopics || [];

      document.getElementById("topicTitle").textContent = data.description;
      document.getElementById("quizTitle").textContent = data.title;
      document.getElementById("quizDescription").textContent = data.instructions;

      this.populateSubtopicCheckboxes();
      this.populateSetList();
      this.updateCount();
    } catch (e) {
      console.error("Error loading data:", e);
    }
  }

  populateSubtopicCheckboxes() {
    const c = document.getElementById("subtopicCheckboxes");
    if (!c) return;
    c.innerHTML = "";
    this.subtopics.forEach((sub) => {
      const label = document.createElement("label");
      label.className = "subtopic-checkbox-label";
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.value = sub.id; cb.className = "subtopic-checkbox";
      cb.checked = sub.id === "all";
      cb.addEventListener("change", (e) => this.handleSubtopicChange(e.target));
      const span = document.createElement("span");
      span.textContent = `${sub.icon} ${sub.name}`;
      label.appendChild(cb); label.appendChild(span); c.appendChild(label);
    });
  }

  populateSetList() {
    const c = document.getElementById("setList");
    if (!c) return;
    c.innerHTML = "";
    const icons = {
      write_imperative: "✏️",
      drag_match: "🔀",
      click_to_identify: "🔍"
    };
    const labels = {
      write_imperative: "Write Imperative Forms",
      drag_match: "Drag & Match Translations",
      click_to_identify: "Click to Identify Imperatives"
    };

    this.questionSets.forEach((set, i) => {
      const btn = document.createElement("button");
      btn.className = "set-btn" + (i === 0 ? " selected" : "");
      btn.dataset.setId = set.id;
      btn.innerHTML = `
        <span class="set-icon">${icons[set.type] || "📝"}</span>
        <div class="set-info">
          <strong>${set.title}</strong>
          <span class="set-type-label">${labels[set.type] || set.type}</span>
        </div>`;
      btn.addEventListener("click", () => {
        document.querySelectorAll(".set-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        this.selectedSetId = set.id;
      });
      c.appendChild(btn);
    });
    if (this.questionSets.length > 0) this.selectedSetId = this.questionSets[0].id;
  }

  handleSubtopicChange(cb) {
    const val = cb.value;
    if (val === "all") {
      if (cb.checked) {
        this.selectedSubtopics.clear(); this.selectedSubtopics.add("all");
        document.querySelectorAll(".subtopic-checkbox").forEach((c) => (c.checked = c.value === "all"));
      } else { this.selectedSubtopics.delete("all"); }
    } else {
      if (cb.checked) {
        this.selectedSubtopics.delete("all"); this.selectedSubtopics.add(val);
        document.querySelector('.subtopic-checkbox[value="all"]').checked = false;
      } else { this.selectedSubtopics.delete(val); }
      if (this.selectedSubtopics.size === 0) {
        this.selectedSubtopics.add("all");
        document.querySelector('.subtopic-checkbox[value="all"]').checked = true;
      }
    }
    this.updateCount();
  }

  getFiltered() {
    if (this.selectedSubtopics.has("all")) return this.questions;
    return this.questions.filter((q) => this.selectedSubtopics.has(q.subtopic));
  }

  updateCount() {
    const el = document.getElementById("availableCount");
    if (el) el.textContent = `(${this.getFiltered().length} available)`;
  }

  setupEventListeners() {
    document.querySelectorAll(".mode-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".mode-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        this.mode = tab.dataset.mode;
      });
    });

    document.querySelectorAll('input[name="exerciseType"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        this.exerciseMode = e.target.value;
        const isQ = e.target.value === "questions";
        document.getElementById("standardOptions").classList.toggle("hidden", !isQ);
        document.getElementById("setOptions").classList.toggle("hidden", isQ);
        document.querySelectorAll(".mode-tab").forEach((t) => (t.style.display = isQ ? "" : "none"));
      });
    });

    document.getElementById("startBtn").addEventListener("click", () =>
      this.exerciseMode === "questions" ? this.startQuiz() : this.startExerciseSet()
    );
    document.getElementById("nextBtn").addEventListener("click", () => this.nextQuestion());
    document.getElementById("submitAnswer").addEventListener("click", () => this.checkWritten());
    document.getElementById("writtenAnswer").addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.checkWritten();
    });
    document.getElementById("backToStartBtn").addEventListener("click", () => this.showScreen("startScreen"));
    document.getElementById("retryBtn").addEventListener("click", () => this.showScreen("startScreen"));
    document.getElementById("homeBtn").addEventListener("click", () => (window.location.href = "../../"));
    document.getElementById("checkWriteBtn").addEventListener("click", () => this.checkWriteAnswers());
    document.getElementById("checkDragBtn").addEventListener("click", () => this.checkDragMatchAnswers());
    document.getElementById("checkIdentifyBtn").addEventListener("click", () => this.checkIdentifyAnswers());
  }

  /* ==========================================
     STANDARD QUIZ
  ========================================== */

  startQuiz() {
    const val = document.getElementById("questionCount").value;
    const filtered = this.getFiltered();
    this.questionsPerQuiz = val === "all" ? filtered.length : Math.min(parseInt(val), filtered.length);
    this.selectedQuestions = this.shuffle([...filtered]).slice(0, this.questionsPerQuiz);
    this.currentIndex = 0; this.score = 0;
    this.showScreen("quizScreen");
    this.displayQuestion();
  }

  displayQuestion() {
    const q = this.selectedQuestions[this.currentIndex];
    const pct = ((this.currentIndex + 1) / this.questionsPerQuiz) * 100;
    document.getElementById("progressFill").style.width = `${pct}%`;
    document.getElementById("progressText").textContent = `${this.currentIndex + 1}/${this.questionsPerQuiz}`;

    const typeEl = document.getElementById("questionType");
    const wordEl = document.getElementById("wordDisplay");
    const endEl = document.getElementById("endingDisplay");
    const engEl = document.getElementById("questionEnglish");

    if (q.type === "mcq" || q.type === "sentence") {
      typeEl.textContent = q.subtopic === "translate" ? "Käännä – Translate" :
                           q.subtopic === "fill" ? "Täydennä – Fill in" :
                           q.subtopic === "identify" ? "Tunnista – Identify" : "Harjoitus";
      wordEl.textContent = "⚡";
      endEl.textContent = "";
      engEl.textContent = q.question || q.sentence;
    } else if (q.type === "write") {
      typeEl.textContent = "Kirjoita – Write";
      wordEl.textContent = "✍️";
      endEl.textContent = "";
      engEl.textContent = q.question;
    } else if (q.type === "identify") {
      typeEl.textContent = "Tunnista – Identify";
      wordEl.textContent = q.word;
      endEl.textContent = "";
      engEl.textContent = q.question;
    }

    document.getElementById("feedback").classList.add("hidden");
    document.getElementById("feedback").classList.remove("correct", "incorrect");
    document.getElementById("nextBtn").classList.add("hidden");

    if (this.mode === "mcq" && (q.options || q.type === "mcq")) {
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

    const correct = q.answer;
    let options;

    if (q.options) {
      // Use predefined options from JSON
      options = this.shuffle([...q.options]);
    } else {
      // Auto-generate from same subtopic
      const pool = this.questions
        .filter((x) => x.id !== q.id && x.subtopic === q.subtopic && x.answer && x.answer !== correct)
        .map((x) => x.answer)
        .filter((a, i, arr) => arr.indexOf(a) === i);
      options = this.shuffle([correct, ...this.shuffle(pool).slice(0, 3)]);
    }

    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = opt;
      btn.addEventListener("click", () => this.selectOption(opt, correct, btn));
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

  checkWritten() {
    const input = document.getElementById("writtenAnswer");
    const userAns = input.value.trim().toLowerCase();
    const q = this.selectedQuestions[this.currentIndex];
    const correct = q.answer.toLowerCase();
    const isCorrect = userAns === correct || userAns === correct.split("/")[0].trim();
    input.style.borderColor = isCorrect ? "#e8511a" : "#e53e3e";
    input.style.background = isCorrect ? "#fff3ee" : "#fff5f5";
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
      ? "Oikein! 🎉" : `Väärin! Oikea vastaus: ${q.answer}`;
    document.getElementById("feedbackExplanation").textContent = q.explanation || "";
    document.getElementById("nextBtn").classList.remove("hidden");
  }

  nextQuestion() {
    this.currentIndex++;
    const wi = document.getElementById("writtenAnswer");
    wi.style.borderColor = ""; wi.style.background = "";
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
    const msgs = ["Jatka yrittämistä! 🌱", "Harjoittele lisää! 📚", "Hyvä! Jatka! 💪", "Erinomainen! 🌟", "Täydellinen! 🏆"];
    document.getElementById("scoreMessage").textContent = msgs[Math.min(Math.floor(pct / 25), 4)];
  }

  /* ==========================================
     EXERCISE SETS
  ========================================== */

  startExerciseSet() {
    if (!this.selectedSetId) { alert("Valitse harjoitus ensin."); return; }
    const set = this.questionSets.find((s) => s.id === this.selectedSetId);
    if (!set) return;

    ["exerciseWrite", "exerciseDrag", "exerciseIdentify"].forEach((id) =>
      document.getElementById(id).classList.add("hidden")
    );
    document.getElementById("exerciseSetTitle").textContent = set.title;
    document.getElementById("exerciseSetInstructions").innerHTML =
      `<strong>${set.instructions_fi}</strong><br>${set.instructions_en}`;

    this.showScreen("exerciseSetScreen");

    if (set.type === "write_imperative") this.renderWriteImperativeExercise(set);
    else if (set.type === "drag_match") this.renderDragMatchExercise(set);
    else if (set.type === "click_to_identify") this.renderIdentifyExercise(set);
  }

  /* --- Write Imperative (Dos & Don'ts) --- */

  renderWriteImperativeExercise(set) {
    const block = document.getElementById("exerciseWrite");
    block.classList.remove("hidden");

    const noteEl = document.getElementById("writeNoteBox");
    noteEl.textContent = set.note || "";
    noteEl.classList.toggle("hidden", !set.note);

    const itemsEl = document.getElementById("writeItems");
    itemsEl.innerHTML = "";

    set.sections.forEach((section) => {
      const sectionDiv = document.createElement("div");
      sectionDiv.className = "write-section";

      const sectionLabel = document.createElement("div");
      sectionLabel.className = `write-section-label ${section.type === "negative" ? "neg" : "pos"}`;
      sectionLabel.textContent = section.label;
      sectionDiv.appendChild(sectionLabel);

      section.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "write-row";

        const numEl = document.createElement("span");
        numEl.className = "item-number";
        numEl.textContent = `${item.number}.`;

        const sentEl = document.createElement("div");
        sentEl.className = "write-sentence";

        // Build context sentence with verb info
        const verbInfo = document.createElement("div");
        verbInfo.className = "verb-info";
        verbInfo.innerHTML = `<span class="verb-base">${item.verb}</span> <span class="verb-meaning">= ${item.meaning}</span>`;

        const contextDiv = document.createElement("div");
        contextDiv.className = "write-fi";

        const parts = item.context_fi.split("___");

        // For negative: two blanks (älä + verb)
        if (section.type === "negative") {
          const alaInput = document.createElement("input");
          alaInput.type = "text";
          alaInput.className = "write-input write-input-neg-particle";
          alaInput.placeholder = "älä/";
          alaInput.dataset.answer = "älä";
          alaInput.autocomplete = "off";
          alaInput.autocapitalize = "none";

          const verbInput = document.createElement("input");
          verbInput.type = "text";
          verbInput.className = "write-input write-input-imp";
          verbInput.placeholder = item.verb.slice(0, 3) + "...";
          verbInput.dataset.answer = item.answer.replace("älä ", "");
          verbInput.autocomplete = "off";
          verbInput.autocapitalize = "none";

          contextDiv.appendChild(document.createTextNode(parts[0]));
          contextDiv.appendChild(alaInput);
          contextDiv.appendChild(verbInput);
          if (parts[1]) contextDiv.appendChild(document.createTextNode(parts[1]));
        } else {
          const input = document.createElement("input");
          input.type = "text";
          input.className = "write-input write-input-imp";
          input.placeholder = item.verb.slice(0, 3) + "...";
          input.dataset.answer = item.answer;
          input.autocomplete = "off";
          input.autocapitalize = "none";

          contextDiv.appendChild(document.createTextNode(parts[0]));
          contextDiv.appendChild(input);
          if (parts[1]) contextDiv.appendChild(document.createTextNode(parts[1]));
        }

        const enEl = document.createElement("div");
        enEl.className = "write-en";
        enEl.textContent = item.context_en;

        const stepsEl = document.createElement("div");
        stepsEl.className = "steps-hint hidden";
        item.steps.forEach((step) => {
          const s = document.createElement("span");
          s.className = "step-chip";
          s.textContent = step;
          stepsEl.appendChild(s);
        });

        const hintBtn = document.createElement("button");
        hintBtn.className = "hint-toggle-btn";
        hintBtn.textContent = "💡 Show steps";
        hintBtn.addEventListener("click", () => {
          stepsEl.classList.toggle("hidden");
          hintBtn.textContent = stepsEl.classList.contains("hidden") ? "💡 Show steps" : "💡 Hide steps";
        });

        sentEl.appendChild(verbInfo);
        sentEl.appendChild(contextDiv);
        sentEl.appendChild(enEl);
        sentEl.appendChild(hintBtn);
        sentEl.appendChild(stepsEl);

        row.appendChild(numEl);
        row.appendChild(sentEl);
        sectionDiv.appendChild(row);
      });

      itemsEl.appendChild(sectionDiv);
    });

    document.getElementById("writeScore").classList.add("hidden");
    document.getElementById("checkWriteBtn").style.display = "";
    document.getElementById("checkWriteBtn").disabled = false;
  }

  checkWriteAnswers() {
    const inputs = document.querySelectorAll("#exerciseWrite .write-input");
    let correct = 0;
    inputs.forEach((input) => {
      const userAns = input.value.trim().toLowerCase();
      const correctAns = input.dataset.answer.toLowerCase();
      const isCorrect = userAns === correctAns;
      input.disabled = true;
      input.classList.remove("input-correct", "input-incorrect");
      input.classList.add(isCorrect ? "input-correct" : "input-incorrect");
      if (!isCorrect) {
        const existing = input.nextElementSibling;
        if (!existing || !existing.classList.contains("correct-hint")) {
          const hint = document.createElement("span");
          hint.className = "correct-hint";
          hint.textContent = correctAns;
          input.insertAdjacentElement("afterend", hint);
        }
      }
      if (isCorrect) correct++;
    });
    const scoreEl = document.getElementById("writeScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, inputs.length);
    document.getElementById("checkWriteBtn").style.display = "none";
  }

  /* --- Drag Match (Finnish advice → English) --- */

  renderDragMatchExercise(set) {
    const block = document.getElementById("exerciseDrag");
    block.classList.remove("hidden");

    const container = document.getElementById("dragMatchItems");
    container.innerHTML = "";

    // Shuffle translations for the right column
    const shuffledTranslations = this.shuffle([...set.items]);

    // Left column: Finnish phrases (fixed)
    const leftCol = document.createElement("div");
    leftCol.className = "drag-match-col drag-match-left";
    leftCol.innerHTML = "<div class='drag-col-header'>🇫🇮 Suomi</div>";

    // Right column: English translations (draggable)
    const rightCol = document.createElement("div");
    rightCol.className = "drag-match-col drag-match-right";
    rightCol.innerHTML = "<div class='drag-col-header'>🇬🇧 English</div>";

    set.items.forEach((item) => {
      // Finnish card (fixed, has drop zone)
      const fiCard = document.createElement("div");
      fiCard.className = "match-fi-card";
      fiCard.dataset.id = item.id;

      const fiText = document.createElement("span");
      fiText.className = "match-fi-text";
      fiText.textContent = item.finnish;

      const dropSlot = document.createElement("div");
      dropSlot.className = "match-drop-slot";
      dropSlot.dataset.correctId = item.id;
      dropSlot.textContent = "Drop here";

      dropSlot.addEventListener("dragover", (e) => { e.preventDefault(); dropSlot.classList.add("drag-over"); });
      dropSlot.addEventListener("dragleave", () => dropSlot.classList.remove("drag-over"));
      dropSlot.addEventListener("drop", (e) => {
        e.preventDefault();
        dropSlot.classList.remove("drag-over");
        const draggedId = e.dataTransfer.getData("text/plain");
        const draggedCard = document.querySelector(`.match-en-card[data-id="${draggedId}"]`);
        if (!draggedCard) return;

        // If slot already has something, put it back in right column
        if (dropSlot.dataset.placedId) {
          const oldCard = document.querySelector(`.match-en-card[data-id="${dropSlot.dataset.placedId}"]`);
          if (oldCard) { oldCard.classList.remove("placed"); rightCol.appendChild(oldCard); }
        }

        dropSlot.dataset.placedId = draggedId;
        dropSlot.textContent = "";
        dropSlot.appendChild(draggedCard);
        draggedCard.classList.add("placed");
      });

      // Touch support for drop slots
      dropSlot.addEventListener("touchstart", (e) => { e.preventDefault(); }, { passive: false });

      fiCard.appendChild(fiText);
      fiCard.appendChild(dropSlot);
      leftCol.appendChild(fiCard);
    });

    // Draggable English translations
    shuffledTranslations.forEach((item) => {
      const enCard = document.createElement("div");
      enCard.className = "match-en-card";
      enCard.dataset.id = item.id;
      enCard.textContent = item.english;
      enCard.draggable = true;

      enCard.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", item.id);
        enCard.classList.add("dragging");
      });
      enCard.addEventListener("dragend", () => enCard.classList.remove("dragging"));

      // Touch drag support
      enCard.addEventListener("touchstart", this.matchTouchStart.bind(this), { passive: true });
      enCard.addEventListener("touchmove", this.matchTouchMove.bind(this), { passive: false });
      enCard.addEventListener("touchend", this.matchTouchEnd.bind(this));

      rightCol.appendChild(enCard);
    });

    container.appendChild(leftCol);
    container.appendChild(rightCol);

    document.getElementById("dragScore").classList.add("hidden");
    document.getElementById("checkDragBtn").style.display = "";
    document.getElementById("checkDragBtn").disabled = false;
  }

  matchTouchStart(e) {
    this._touchCard = e.currentTarget;
    this._touchCard.classList.add("dragging");
  }

  matchTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll(".match-drop-slot").forEach((d) => d.classList.remove("drag-over"));
    if (el && (el.classList.contains("match-drop-slot") || el.closest(".match-drop-slot"))) {
      const slot = el.classList.contains("match-drop-slot") ? el : el.closest(".match-drop-slot");
      slot.classList.add("drag-over");
    }
  }

  matchTouchEnd(e) {
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll(".match-drop-slot").forEach((d) => d.classList.remove("drag-over"));

    const slot = target && (target.classList.contains("match-drop-slot") ? target : target.closest(".match-drop-slot"));
    if (slot && this._touchCard) {
      const rightCol = document.querySelector(".drag-match-right");
      if (slot.dataset.placedId) {
        const oldCard = document.querySelector(`.match-en-card[data-id="${slot.dataset.placedId}"]`);
        if (oldCard) { oldCard.classList.remove("placed"); rightCol.appendChild(oldCard); }
      }
      slot.dataset.placedId = this._touchCard.dataset.id;
      slot.textContent = "";
      slot.appendChild(this._touchCard);
      this._touchCard.classList.add("placed");
    }

    if (this._touchCard) this._touchCard.classList.remove("dragging");
    this._touchCard = null;
  }

  checkDragMatchAnswers() {
    const slots = document.querySelectorAll(".match-drop-slot");
    let correct = 0;
    slots.forEach((slot) => {
      const placedId = parseInt(slot.dataset.placedId);
      const correctId = parseInt(slot.dataset.correctId);
      const isCorrect = placedId === correctId;
      slot.classList.remove("drag-over");
      slot.classList.add(isCorrect ? "slot-correct" : "slot-incorrect");
      if (!isCorrect) {
        // Find correct English text
        const correctSet = this.questionSets.find((s) => s.type === "drag_match");
        if (correctSet) {
          const correctItem = correctSet.items.find((i) => i.id === correctId);
          if (correctItem && !slot.querySelector(".slot-answer-hint")) {
            const hint = document.createElement("div");
            hint.className = "slot-answer-hint";
            hint.textContent = `→ ${correctItem.english}`;
            slot.appendChild(hint);
          }
        }
      }
      if (isCorrect) correct++;
    });
    const scoreEl = document.getElementById("dragScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, slots.length);
    document.getElementById("checkDragBtn").style.display = "none";
  }

  /* --- Click to Identify --- */

  renderIdentifyExercise(set) {
    const block = document.getElementById("exerciseIdentify");
    block.classList.remove("hidden");

    const textBox = document.getElementById("identifyTextBox");
    textBox.innerHTML = "";

    this._identifyCorrect = new Set(set.correct_imperatives.map((w) => w.toLowerCase()));
    this._identifyNegative = new Set(set.negative_imperatives.map((w) => w.toLowerCase()));

    document.getElementById("identifyTarget").textContent =
      `Find all ${set.total_count} imperatives (including negative forms)`;

    // Tokenise text: split on spaces and punctuation but keep punctuation attached
    const words = set.text_fi.split(/(\s+)/);
    let selected = new Set();

    words.forEach((token) => {
      if (/^\s+$/.test(token)) {
        textBox.appendChild(document.createTextNode(token));
        return;
      }

      // Strip trailing punctuation for comparison
      const clean = token.replace(/[.,!?;:]+$/, "").toLowerCase();
      const punctuation = token.slice(clean.length);

      const span = document.createElement("span");
      span.className = "identify-word";
      span.textContent = token.replace(/[.,!?;:]+$/, "");
      span.dataset.clean = clean;

      span.addEventListener("click", () => {
        if (span.classList.contains("locked")) return;
        if (selected.has(clean)) {
          selected.delete(clean);
          span.classList.remove("selected");
        } else {
          selected.add(clean);
          span.classList.add("selected");
        }
        document.getElementById("identifyCount").textContent =
          `${selected.size} selected`;
      });

      textBox.appendChild(span);
      if (punctuation) textBox.appendChild(document.createTextNode(punctuation));
    });

    this._identifySelected = selected;
    document.getElementById("identifyCount").textContent = "0 selected";
    document.getElementById("identifyScore").classList.add("hidden");
    document.getElementById("checkIdentifyBtn").style.display = "";
    document.getElementById("checkIdentifyBtn").disabled = false;
  }

  checkIdentifyAnswers() {
    const allWordSpans = document.querySelectorAll(".identify-word");
    let correct = 0, total = this._identifyCorrect.size;

    allWordSpans.forEach((span) => {
      span.classList.add("locked");
      const clean = span.dataset.clean;
      const isImperative = this._identifyCorrect.has(clean);
      const wasSelected = this._identifySelected.has(clean);

      if (isImperative && wasSelected) { span.classList.add("identify-correct"); correct++; }
      else if (isImperative && !wasSelected) span.classList.add("identify-missed");
      else if (!isImperative && wasSelected) span.classList.add("identify-wrong");
    });

    const scoreEl = document.getElementById("identifyScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, total);
    document.getElementById("checkIdentifyBtn").style.display = "none";
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

document.addEventListener("DOMContentLoaded", () => new ImperatiivisQuiz());
