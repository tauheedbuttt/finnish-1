/* ========================================
   Postpositions Quiz - JavaScript
======================================== */

class PostpositionsQuiz {
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
    const icons = { drag_postposition: "🎯", write_postposition: "✏️" };
    const labels = { drag_postposition: "Drag & Drop", write_postposition: "Write Genitive + Postposition" };

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
    document.getElementById("checkDragBtn").addEventListener("click", () => this.checkDragAnswers());
    document.getElementById("checkWriteBtn").addEventListener("click", () => this.checkWriteAnswers());

    // Vocab toggles
    document.getElementById("vocabToggleBtn").addEventListener("click", () => {
      const hints = document.getElementById("vocabHints");
      hints.classList.toggle("hidden");
      document.getElementById("vocabToggleBtn").textContent = hints.classList.contains("hidden")
        ? "📖 Show vocabulary hints" : "📖 Hide vocabulary hints";
    });

    document.getElementById("writeVocabToggleBtn").addEventListener("click", () => {
      const hints = document.getElementById("writeVocabHints");
      hints.classList.toggle("hidden");
      document.getElementById("writeVocabToggleBtn").textContent = hints.classList.contains("hidden")
        ? "📖 Show vocabulary hints" : "📖 Hide vocabulary hints";
    });
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

    if (q.type === "sentence") {
      typeEl.textContent = q.subtopic === "translate" ? "Käännä – Translate" : "Täydennä – Fill in";
      wordEl.textContent = "📝";
      endEl.textContent = "";
      engEl.textContent = q.sentence;
    } else if (q.type === "genitive") {
      typeEl.textContent = "Genetiivi – Genitive";
      wordEl.textContent = q.word;
      endEl.textContent = q.ending;
      engEl.textContent = q.english;
    } else if (q.type === "identify") {
      typeEl.textContent = "Tunnista – Identify";
      wordEl.textContent = q.word;
      endEl.textContent = "";
      engEl.textContent = q.question;
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

    const correct = q.answer;
    const pool = this.questions
      .filter((x) => x.id !== q.id && x.subtopic === q.subtopic && x.answer && x.answer !== correct)
      .map((x) => x.answer)
      .filter((a, i, arr) => arr.indexOf(a) === i);
    const options = this.shuffle([correct, ...this.shuffle(pool).slice(0, 3)]);

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
    // Accept partial match for multi-word answers like "on the right side of"
    const correct = q.answer.toLowerCase();
    const isCorrect = userAns === correct || userAns === correct.split("/")[0].trim();
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

    ["exerciseDrag", "exerciseWrite"].forEach((id) =>
      document.getElementById(id).classList.add("hidden")
    );
    document.getElementById("exerciseSetTitle").textContent = set.title;
    document.getElementById("exerciseSetInstructions").innerHTML =
      `<strong>${set.instructions_fi}</strong><br>${set.instructions_en}`;

    this.showScreen("exerciseSetScreen");

    if (set.type === "drag_postposition") this.renderDragExercise(set);
    else if (set.type === "write_postposition") this.renderWriteExercise(set);
  }

  /* --- Drag Postposition --- */

  renderDragExercise(set) {
    const block = document.getElementById("exerciseDrag");
    block.classList.remove("hidden");

    // Build word bank – deduplicated display
    const bankEl = document.getElementById("wordBank");
    bankEl.innerHTML = "";
    const uniqueWords = [...new Set(set.word_bank)];
    uniqueWords.forEach((word) => {
      const chip = document.createElement("div");
      chip.className = "word-chip";
      chip.textContent = word;
      chip.draggable = true;
      chip.dataset.word = word;
      chip.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", word);
        chip.classList.add("dragging");
      });
      chip.addEventListener("dragend", () => chip.classList.remove("dragging"));
      // Touch support
      chip.addEventListener("touchstart", this.touchStart.bind(this), { passive: true });
      chip.addEventListener("touchmove", this.touchMove.bind(this), { passive: false });
      chip.addEventListener("touchend", this.touchEnd.bind(this));
      bankEl.appendChild(chip);
    });

    // Vocab hints
    const hintsEl = document.getElementById("vocabHints");
    hintsEl.innerHTML = "";
    set.vocabulary.forEach((v) => {
      const item = document.createElement("span");
      item.className = "vocab-item";
      item.innerHTML = `<strong>${v.word}</strong> = ${v.meaning}`;
      hintsEl.appendChild(item);
    });

    // Sentence items
    const itemsEl = document.getElementById("dragItems");
    itemsEl.innerHTML = "";
    set.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "drag-row";

      const numEl = document.createElement("span");
      numEl.className = "item-number";
      numEl.textContent = `${item.number}.`;

      const sentenceEl = document.createElement("div");
      sentenceEl.className = "drag-sentence";

      const fiEl = document.createElement("span");
      fiEl.className = "drag-fi";
      fiEl.textContent = item.sentence_fi + " ";

      const drop = document.createElement("div");
      drop.className = "drop-zone";
      drop.dataset.answer = item.answer;
      drop.dataset.number = item.number;
      drop.textContent = "___";

      drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("drag-over"); });
      drop.addEventListener("dragleave", () => drop.classList.remove("drag-over"));
      drop.addEventListener("drop", (e) => {
        e.preventDefault();
        drop.classList.remove("drag-over");
        const word = e.dataTransfer.getData("text/plain");
        this.placeWordInDrop(drop, word);
      });

      const enEl = document.createElement("span");
      enEl.className = "drag-en";
      enEl.textContent = item.sentence_en;

      sentenceEl.appendChild(fiEl);
      sentenceEl.appendChild(drop);
      sentenceEl.appendChild(enEl);

      row.appendChild(numEl);
      row.appendChild(sentenceEl);
      itemsEl.appendChild(row);
    });

    document.getElementById("dragScore").classList.add("hidden");
    document.getElementById("checkDragBtn").style.display = "";
    document.getElementById("checkDragBtn").disabled = false;
  }

  placeWordInDrop(drop, word) {
    // If drop zone already has a word, return it to the bank
    const existing = drop.dataset.placed;
    if (existing) {
      // Re-enable that chip in word bank
      const chips = document.querySelectorAll(`.word-chip[data-word="${existing}"]`);
      chips.forEach((c) => { if (c.classList.contains("used")) { c.classList.remove("used"); return; } });
    }
    drop.textContent = word;
    drop.dataset.placed = word;
    drop.classList.add("filled");

    // Mark chip as used (first unused one)
    const chips = document.querySelectorAll(`#wordBank .word-chip[data-word="${word}"]`);
    let marked = false;
    chips.forEach((c) => {
      if (!marked && !c.classList.contains("used")) {
        c.classList.add("used");
        marked = true;
      }
    });
  }

  // Touch drag support
  touchStart(e) {
    this._touchChip = e.currentTarget;
    this._touchChip.classList.add("dragging");
  }

  touchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll(".drop-zone").forEach((d) => d.classList.remove("drag-over"));
    if (el && el.classList.contains("drop-zone")) el.classList.add("drag-over");
  }

  touchEnd(e) {
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    document.querySelectorAll(".drop-zone").forEach((d) => d.classList.remove("drag-over"));
    if (target && target.classList.contains("drop-zone") && this._touchChip) {
      this.placeWordInDrop(target, this._touchChip.dataset.word);
    }
    if (this._touchChip) this._touchChip.classList.remove("dragging");
    this._touchChip = null;
  }

  checkDragAnswers() {
    const drops = document.querySelectorAll(".drop-zone");
    let correct = 0;
    drops.forEach((drop) => {
      const placed = (drop.dataset.placed || "").toLowerCase().trim();
      const answer = drop.dataset.answer.toLowerCase().trim();
      const isCorrect = placed === answer;
      drop.classList.remove("filled");
      drop.classList.add(isCorrect ? "drop-correct" : "drop-incorrect");
      if (!isCorrect) {
        const hint = document.createElement("div");
        hint.className = "correct-hint";
        hint.textContent = `→ ${drop.dataset.answer}`;
        drop.parentElement.appendChild(hint);
      }
      if (isCorrect) correct++;
    });
    const scoreEl = document.getElementById("dragScore");
    scoreEl.classList.remove("hidden");
    scoreEl.innerHTML = this.buildScoreHtml(correct, drops.length);
    document.getElementById("checkDragBtn").style.display = "none";
  }

  /* --- Write Genitive + Postposition --- */

  renderWriteExercise(set) {
    const block = document.getElementById("exerciseWrite");
    block.classList.remove("hidden");

    const noteEl = document.getElementById("writeNoteBox");
    noteEl.textContent = set.note || "";
    noteEl.classList.toggle("hidden", !set.note);

    // Vocab hints
    const hintsEl = document.getElementById("writeVocabHints");
    hintsEl.innerHTML = "";
    if (set.vocabulary && set.vocabulary.length) {
      set.vocabulary.forEach((v) => {
        const item = document.createElement("span");
        item.className = "vocab-item";
        item.innerHTML = `<strong>${v.word}</strong> = ${v.meaning}`;
        hintsEl.appendChild(item);
      });
    }

    const itemsEl = document.getElementById("writeItems");
    itemsEl.innerHTML = "";

    set.items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "write-row";

      const numEl = document.createElement("span");
      numEl.className = "item-number";
      numEl.textContent = `${item.number}.`;

      const sentEl = document.createElement("div");
      sentEl.className = "write-sentence";

      const fiParts = item.sentence_fi.split("___");

      const fiEl = document.createElement("div");
      fiEl.className = "write-fi";

      fiEl.appendChild(document.createTextNode(fiParts[0]));

      const input1 = document.createElement("input");
      input1.type = "text";
      input1.className = "write-input write-input-gen";
      input1.placeholder = "sana + gen.";
      input1.dataset.answer = item.answer_genitive;
      input1.autocomplete = "off";
      input1.autocapitalize = "none";
      fiEl.appendChild(input1);

      if (fiParts.length > 2) fiEl.appendChild(document.createTextNode(fiParts[1]));

      const input2 = document.createElement("input");
      input2.type = "text";
      input2.className = "write-input write-input-post";
      input2.placeholder = "postpositio";
      input2.dataset.answer = item.answer_postposition;
      input2.autocomplete = "off";
      input2.autocapitalize = "none";
      fiEl.appendChild(input2);

      if (fiParts[fiParts.length - 1]) fiEl.appendChild(document.createTextNode(fiParts[fiParts.length - 1]));

      const enEl = document.createElement("div");
      enEl.className = "write-en";
      enEl.textContent = item.sentence_en;

      sentEl.appendChild(fiEl);
      sentEl.appendChild(enEl);
      row.appendChild(numEl);
      row.appendChild(sentEl);
      itemsEl.appendChild(row);
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
        let hint = input.parentElement.querySelector(`.hint-for-${input.className.includes("gen") ? "gen" : "post"}`);
        if (!hint) {
          hint = document.createElement("span");
          hint.className = `correct-hint hint-for-${input.className.includes("gen") ? "gen" : "post"}`;
          input.insertAdjacentElement("afterend", hint);
        }
        hint.textContent = input.dataset.answer;
      }
      if (isCorrect) correct++;
    });
    const scoreEl = document.getElementById("writeScore");
    scoreEl.classList.remove("hidden");
    // Each sentence = 2 inputs, show score as correct pairs out of total inputs/2 
    scoreEl.innerHTML = this.buildScoreHtml(correct, inputs.length);
    document.getElementById("checkWriteBtn").style.display = "none";
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

document.addEventListener("DOMContentLoaded", () => new PostpositionsQuiz());
