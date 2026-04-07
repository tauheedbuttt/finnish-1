/* ========================================
   Finn 2 Mid Exam – JavaScript Engine
   Randomizes questions from large pools each run
======================================== */

class Exam {
  constructor() {
    this.data = null;
    this.submitted = false;
    this.sectionScores = {};
    // Stores the randomly selected questions for this run
    this.selectedSections = [];
    this.onSubmit = null; // callback hook for submission
    this.init();
  }

  async loadData() {
    // Only fetch if not already loaded
    if (this.data) return this;

    try {
      const res = await fetch("exam.json?v=" + Date.now());
      this.data = await res.json();
      return this;
    } catch (e) {
      console.error("Failed to load exam data:", e);
      throw e;
    }
  }

  async init() {
    try {
      await this.loadData();
      if (document.getElementById("introScreen")) {
        this.renderIntro();
      }
      if (document.getElementById("startExamBtn")) {
        this.setupEventListeners();
      }
    } catch (e) {
      console.error("Failed to initialize exam:", e);
    }
  }

  /* ==========================================
     INTRO
  ========================================== */

  renderIntro() {
    const total = this.data.sections.reduce((s, sec) => s + (sec.points || 0), 0);
    document.getElementById("introSections").textContent = this.data.sections.length;
    document.getElementById("introPoints").textContent = total;

    const grid = document.getElementById("syllabusGrid");
    const chMap = { ch1: "Ch1", ch2: "Ch2", ch3: "Ch3" };
    this.data.syllabus && Object.entries(this.data.syllabus).forEach(([ch, topics]) => {
      topics.forEach(t => {
        const el = document.createElement("div");
        el.className = "syllabus-tag";
        el.innerHTML = `<span class="ch-badge">${chMap[ch]}</span>${t}`;
        grid.appendChild(el);
      });
    });
  }

  /* ==========================================
     RANDOMIZATION – pick questions from pools
  ========================================== */

  buildSelectedSections() {
    this.selectedSections = this.data.sections.map(sec => {
      const clone = { ...sec };

      if (sec.type === "fill_in_blank" && sec.question_pool) {
        clone.items = this.shuffle([...sec.question_pool]).slice(0, sec.items_per_exam || 8);
        // Re-number items for display
        clone.items = clone.items.map((item, i) => ({ ...item, displayNum: i + 1 }));
      }

      if (sec.type === "mcq" && sec.question_pool) {
        const picked = this.shuffle([...sec.question_pool]).slice(0, sec.items_per_exam || 6);
        // Shuffle options for each picked question
        clone.items = picked.map(item => ({
          ...item,
          options: this.shuffle([...item.options])
        }));
        clone.items = clone.items.map((item, i) => ({ ...item, displayNum: i + 1 }));
      }

      if (sec.type === "comprehension" && sec.passage_pool) {
        const passage = this.shuffle([...sec.passage_pool])[0];
        clone.passage = passage;
        const picked = this.shuffle([...passage.items]).slice(0, sec.items_per_exam || 5);
        clone.items = picked.map(item => ({
          ...item,
          options: this.shuffle([...item.options])
        }));
        clone.items = clone.items.map((item, i) => ({ ...item, displayNum: i + 1 }));
      }

      if (sec.type === "sentence_writing") {
        const doPicks = sec.do_picks || 3;
        const dontPicks = sec.dont_picks || 3;
        clone.do_prompts = this.shuffle([...(sec.do_pool || [])]).slice(0, doPicks);
        clone.dont_prompts = this.shuffle([...(sec.dont_pool || [])]).slice(0, dontPicks);
      }

      if (sec.type === "fill_in_blank_sentence" && sec.question_pool) {
        clone.items = this.shuffle([...sec.question_pool]).slice(0, sec.items_per_exam || 5);
        clone.items = clone.items.map((item, i) => ({ ...item, displayNum: i + 1 }));
      }

      if (sec.type === "audio_response" && sec.audio_pool) {
        const picked = sec.audio_pool[Math.floor(Math.random() * sec.audio_pool.length)];
        clone.audio_file = picked.file;
        clone.audio_script = picked.script;
        clone.questions = picked.questions;
      }

      return clone;
    });
  }

  /* ==========================================
     BUILD EXAM DOM
  ========================================== */

  buildExam() {
    // Only randomize if selectedSections is empty (not loaded from IDB)
    if (!this.selectedSections || this.selectedSections.length === 0) {
      this.buildSelectedSections();
    }
    const container = document.getElementById("sectionsContainer");
    container.innerHTML = "";
    this.selectedSections.forEach((sec, i) => {
      const card = this.buildSectionCard(sec, i);
      container.appendChild(card);
    });
  }

  buildSectionCard(sec, idx) {
    const card = document.createElement("div");
    card.className = "section-card";
    card.id = `section-${sec.id}`;

    card.innerHTML = `
      <div class="section-header">
        <div class="section-num">${sec.number}</div>
        <div class="section-title-group">
          <div class="section-title">${sec.title}</div>
          <div class="section-title-en">${sec.titleEn}</div>
        </div>
        <div class="section-points">${sec.points} pts</div>
      </div>
      <div class="section-body">
        <p class="section-instructions">${sec.instructions}</p>
        ${sec.note ? `<div class="section-note">${sec.note}</div>` : ""}
        <div class="section-content" id="content-${sec.id}"></div>
      </div>`;

    const contentEl = card.querySelector(`#content-${sec.id}`);

    switch (sec.type) {
      case "fill_in_blank":          this.buildFillInBlank(contentEl, sec); break;
      case "mcq":                    this.buildMCQ(contentEl, sec); break;
      case "comprehension":          this.buildComprehension(contentEl, sec); break;
      case "sentence_writing":       this.buildSentenceWriting(contentEl, sec); break;
      case "fill_in_blank_sentence": this.buildFillInBlankSentence(contentEl, sec); break;
      case "vocabulary_open":        this.buildVocabOpen(contentEl, sec); break;
      case "word_types":             this.buildWordTypes(contentEl, sec); break;
      case "audio_response":         this.buildAudioResponse(contentEl, sec); break;
    }

    return card;
  }

  /* ==========================================
     SESSION MANAGEMENT
  ========================================== */

  /**
   * Load selected sections from a saved session instead of randomizing.
   */
  loadSelectedSections(savedSections) {
    this.selectedSections = savedSections;
  }

  /**
   * Collect all user answers from the current DOM state.
   * Returns a flat key-value map: "<sectionId>:<itemId>" => answer value
   */
  collectAnswers() {
    const answers = {};

    this.selectedSections.forEach(sec => {
      switch (sec.type) {
        case "fill_in_blank":
        case "fill_in_blank_sentence":
          sec.items.forEach(item => {
            const input = document.querySelector(
              `.fitb-input[data-section-id="${sec.id}"][data-item-id="${item.id}"]`
            );
            if (input) {
              answers[`${sec.id}:${item.id}`] = input.value;
            }
          });
          break;

        case "mcq":
        case "comprehension":
          sec.items.forEach(item => {
            const radios = document.querySelectorAll(`input[name="mcq-${sec.id}-${item.id}"]`);
            radios.forEach(r => {
              if (r.checked) {
                answers[`${sec.id}:${item.id}`] = r.value;
              }
            });
          });
          break;

        case "sentence_writing":
          if (sec.do_prompts) {
            sec.do_prompts.forEach((prompt, idx) => {
              const textarea = document.querySelector(
                `textarea[data-section-id="${sec.id}"][data-prompt-id="${prompt.id}"]`
              );
              if (textarea) {
                answers[`${sec.id}:do:${prompt.id}`] = textarea.value;
              }
            });
          }
          if (sec.dont_prompts) {
            sec.dont_prompts.forEach((prompt, idx) => {
              const textarea = document.querySelector(
                `textarea[data-section-id="${sec.id}"][data-prompt-id="${prompt.id}"]`
              );
              if (textarea) {
                answers[`${sec.id}:dont:${prompt.id}`] = textarea.value;
              }
            });
          }
          break;

        case "vocabulary_open":
          if (sec.items) {
            sec.items.forEach((item, idx) => {
              const fiInput = document.querySelector(
                `input[data-section-id="${sec.id}"][data-row="${idx}"][data-lang="fi"]`
              );
              const enInput = document.querySelector(
                `input[data-section-id="${sec.id}"][data-row="${idx}"][data-lang="en"]`
              );
              if (fiInput) answers[`${sec.id}:row${idx}:fi`] = fiInput.value;
              if (enInput) answers[`${sec.id}:row${idx}:en`] = enInput.value;
            });
          }
          break;

        case "word_types":
          if (sec.word_types) {
            sec.word_types.forEach(wt => {
              [1, 2].forEach(n => {
                const baseInput = document.querySelector(
                  `.wt-input[data-word-type="${wt.id}"][data-field="base"][data-row-num="${n}"]`
                );
                const genInput = document.querySelector(
                  `.wt-input[data-word-type="${wt.id}"][data-field="genitive"][data-row-num="${n}"]`
                );
                if (baseInput) answers[`${wt.id}:base:${n}`] = baseInput.value;
                if (genInput) answers[`${wt.id}:genitive:${n}`] = genInput.value;
              });
            });
          }
          break;

        case "audio_response":
          if (sec.questions) {
            sec.questions.forEach((q, idx) => {
              const textarea = document.querySelector(
                `textarea[data-section-id="${sec.id}"][data-question-id="${q.id}"]`
              );
              if (textarea) {
                answers[`${sec.id}:q${q.id}`] = textarea.value;
              }
            });
          }
          break;
      }
    });

    return answers;
  }

  /**
   * Restore user answers into the DOM from a saved answer map.
   */
  restoreAnswers(answers) {
    if (!answers) return;

    this.selectedSections.forEach(sec => {
      switch (sec.type) {
        case "fill_in_blank":
        case "fill_in_blank_sentence":
          sec.items.forEach(item => {
            const input = document.querySelector(
              `.fitb-input[data-section-id="${sec.id}"][data-item-id="${item.id}"]`
            );
            const key = `${sec.id}:${item.id}`;
            if (input && answers[key]) {
              input.value = answers[key];
            }
          });
          break;

        case "mcq":
        case "comprehension":
          sec.items.forEach(item => {
            const key = `${sec.id}:${item.id}`;
            if (answers[key]) {
              const radio = document.querySelector(
                `input[name="mcq-${sec.id}-${item.id}"][value="${answers[key]}"]`
              );
              if (radio) {
                radio.checked = true;
              }
            }
          });
          break;

        case "sentence_writing":
          if (sec.do_prompts) {
            sec.do_prompts.forEach(prompt => {
              const key = `${sec.id}:do:${prompt.id}`;
              const textarea = document.querySelector(
                `textarea[data-section-id="${sec.id}"][data-prompt-id="${prompt.id}"]`
              );
              if (textarea && answers[key]) {
                textarea.value = answers[key];
              }
            });
          }
          if (sec.dont_prompts) {
            sec.dont_prompts.forEach(prompt => {
              const key = `${sec.id}:dont:${prompt.id}`;
              const textarea = document.querySelector(
                `textarea[data-section-id="${sec.id}"][data-prompt-id="${prompt.id}"]`
              );
              if (textarea && answers[key]) {
                textarea.value = answers[key];
              }
            });
          }
          break;

        case "vocabulary_open":
          if (sec.items) {
            sec.items.forEach((item, idx) => {
              const fiKey = `${sec.id}:row${idx}:fi`;
              const enKey = `${sec.id}:row${idx}:en`;
              const fiInput = document.querySelector(
                `input[data-section-id="${sec.id}"][data-row="${idx}"][data-lang="fi"]`
              );
              const enInput = document.querySelector(
                `input[data-section-id="${sec.id}"][data-row="${idx}"][data-lang="en"]`
              );
              if (fiInput && answers[fiKey]) fiInput.value = answers[fiKey];
              if (enInput && answers[enKey]) enInput.value = answers[enKey];
            });
          }
          break;

        case "word_types":
          if (sec.word_types) {
            sec.word_types.forEach(wt => {
              [1, 2].forEach(n => {
                const baseKey = `${wt.id}:base:${n}`;
                const genKey = `${wt.id}:genitive:${n}`;
                const baseInput = document.querySelector(
                  `.wt-input[data-word-type="${wt.id}"][data-field="base"][data-row-num="${n}"]`
                );
                const genInput = document.querySelector(
                  `.wt-input[data-word-type="${wt.id}"][data-field="genitive"][data-row-num="${n}"]`
                );
                if (baseInput && answers[baseKey]) baseInput.value = answers[baseKey];
                if (genInput && answers[genKey]) genInput.value = answers[genKey];
              });
            });
          }
          break;

        case "audio_response":
          if (sec.questions) {
            sec.questions.forEach(q => {
              const key = `${sec.id}:q${q.id}`;
              const textarea = document.querySelector(
                `textarea[data-section-id="${sec.id}"][data-question-id="${q.id}"]`
              );
              if (textarea && answers[key]) {
                textarea.value = answers[key];
              }
            });
          }
          break;
      }
    });
  }

  /**
   * Apply grading visuals (correct/incorrect CSS) from saved scores.
   * Used in review mode to show grading without re-computing.
   */
  applyGradingVisuals(session) {
    if (!session.scores) return;

    this.selectedSections.forEach(sec => {
      const answers = session.answers || {};

      // Skip if no answers for this section
      if (!sec.id) return;

      switch (sec.type) {
        case "fill_in_blank":
          sec.items.forEach(item => {
            const input = document.querySelector(
              `.fitb-input[data-section-id="${sec.id}"][data-item-id="${item.id}"]`
            );
            if (!input) return;
            const userVal = answers[`${sec.id}:${item.id}`]?.toLowerCase() || "";
            const isCorrect = userVal === item.answer.toLowerCase();

            input.classList.add(isCorrect ? "correct" : "incorrect");

            const fb = document.getElementById(`fb-${sec.id}-${item.id}`);
            if (fb) {
              fb.className = `fitb-feedback ${isCorrect ? "correct" : "incorrect"}`;
              fb.textContent = isCorrect
                ? `✓ Correct!`
                : `✗ Answer: ${item.answer}${item.explanation ? " — " + item.explanation : ""}`;
            }
          });
          break;

        case "mcq":
        case "comprehension":
          sec.items.forEach(item => {
            const key = `${sec.id}:${item.id}`;
            const selected = answers[key];
            const isCorrect = selected === item.answer;

            const radios = document.querySelectorAll(`input[name="mcq-${sec.id}-${item.id}"]`);
            radios.forEach(r => {
              const label = r.parentElement;
              if (label) {
                if (r.value === item.answer) label.classList.add("correct-answer");
                else if (r.value === selected && !isCorrect) label.classList.add("incorrect");
              }
            });

            const explanationDiv = document.getElementById(`mcq-explanation-${sec.id}-${item.id}`);
            if (explanationDiv && item.explanation) {
              explanationDiv.textContent = item.explanation;
              explanationDiv.style.display = "block";
            }
          });
          break;

        case "sentence_writing":
          // Presence grading only, show sample answers
          if (sec.sample_answers) {
            const sampleDiv = document.getElementById(`sentence-samples-${sec.id}`);
            if (sampleDiv) {
              sampleDiv.style.display = "block";
            }
          }
          break;

        case "fill_in_blank_sentence":
          sec.items.forEach(item => {
            const input = document.querySelector(
              `.fitb-input[data-section-id="${sec.id}"][data-item-id="${item.id}"]`
            );
            if (!input) return;
            const userVal = answers[`${sec.id}:${item.id}`] || "";
            const acceptedList = item.accepted || [];
            const isCorrect = acceptedList.some(a => a.toLowerCase() === userVal.toLowerCase());

            input.classList.add(isCorrect ? "correct" : "incorrect");

            const fb = document.getElementById(`fb-${sec.id}-${item.id}`);
            if (fb) {
              fb.className = `fitb-feedback ${isCorrect ? "correct" : "incorrect"}`;
              fb.textContent = isCorrect
                ? `✓ Correct!`
                : `✗ Expected: ${item.answer}${item.explanation ? " — " + item.explanation : ""}`;
            }
          });
          break;

        case "vocabulary_open":
          // Only grade Finnish field
          if (sec.items) {
            sec.items.forEach((item, idx) => {
              const fiKey = `${sec.id}:row${idx}:fi`;
              const userVal = answers[fiKey]?.toLowerCase() || "";
              const isCorrect = (sec.accepted_answers?.[idx]?.fi || "").toLowerCase() === userVal;

              const fiInput = document.querySelector(
                `input[data-section-id="${sec.id}"][data-row="${idx}"][data-lang="fi"]`
              );
              if (fiInput) {
                fiInput.classList.add(isCorrect ? "correct" : "incorrect");
              }
            });
          }
          break;

        case "word_types":
          if (sec.word_types) {
            sec.word_types.forEach(wt => {
              // Build accepted map
              const acceptedBases = wt.accepted.map(a => a.base.toLowerCase());
              const acceptedMap = {};
              wt.accepted.forEach(a => { acceptedMap[a.base.toLowerCase()] = a.genitive.toLowerCase(); });

              [1, 2].forEach(n => {
                const baseKey = `${wt.id}:base:${n}`;
                const genKey = `${wt.id}:genitive:${n}`;
                const userBase = (answers[baseKey] || "").toLowerCase();
                const userGen = (answers[genKey] || "").toLowerCase();

                const baseCorrect = acceptedBases.includes(userBase);
                const genCorrect = baseCorrect && userGen === acceptedMap[userBase];

                const baseInput = document.querySelector(
                  `.wt-input[data-word-type="${wt.id}"][data-field="base"][data-row-num="${n}"]`
                );
                const genInput = document.querySelector(
                  `.wt-input[data-word-type="${wt.id}"][data-field="genitive"][data-row-num="${n}"]`
                );

                if (baseInput) baseInput.classList.add(baseCorrect ? "correct" : "incorrect");
                if (genInput) genInput.classList.add(genCorrect ? "correct" : "incorrect");
              });

              const acceptedEl = document.getElementById(`wt-accepted-${wt.id}`);
              if (acceptedEl) acceptedEl.classList.add("visible");
            });
          }
          break;

        case "audio_response":
          // Presence grading, show sample answers
          if (sec.sample_answers) {
            const sampleDiv = document.getElementById(`audio-samples-${sec.id}`);
            if (sampleDiv) {
              sampleDiv.style.display = "block";
            }
          }
          break;
      }
    });
  }

  /* ==========================================
     SECTION BUILDERS
  ========================================== */

  buildFillInBlank(el, sec) {
    if (sec.word_bank) {
      const bankDiv = document.createElement("div");
      bankDiv.className = "word-bank-row";
      bankDiv.innerHTML = `<strong>Word bank:</strong>
        <div class="word-bank-chips">${sec.word_bank.map(w => `<span class="wb-chip">${w}</span>`).join("")}</div>`;
      el.appendChild(bankDiv);
    }

    sec.items.forEach(item => {
      const num = item.displayNum || item.id;
      const div = document.createElement("div");
      div.className = "fitb-item";

      const row = document.createElement("div");
      row.className = "fitb-row";
      row.innerHTML = `<span class="fitb-num">${num}.</span>
        <span class="fitb-text">${item.before || ""}</span>`;

      const input = document.createElement("input");
      input.type = "text";
      input.className = "fitb-input";
      input.dataset.answer = item.answer.toLowerCase();
      input.dataset.sectionId = sec.id;
      input.dataset.itemId = item.id;
      input.autocomplete = "off";
      input.autocapitalize = "none";
      row.appendChild(input);

      if (item.after) {
        const afterEl = document.createElement("span");
        afterEl.className = "fitb-text";
        afterEl.textContent = item.after;
        row.appendChild(afterEl);
      }

      if (item.english) {
        const engEl = document.createElement("span");
        engEl.className = "fitb-hint";
        engEl.textContent = `(${item.english})`;
        row.appendChild(engEl);
      }

      div.appendChild(row);

      const fb = document.createElement("div");
      fb.className = "fitb-feedback";
      fb.id = `fb-${sec.id}-${item.id}`;
      div.appendChild(fb);

      el.appendChild(div);
    });
  }

  buildMCQ(el, sec) {
    sec.items.forEach(item => {
      const num = item.displayNum || item.id;
      const div = document.createElement("div");
      div.className = "mcq-item";

      div.innerHTML = `<div class="mcq-question"><span class="mcq-num">${num}.</span> ${item.question}</div>`;

      const opts = document.createElement("div");
      opts.className = "mcq-options";

      item.options.forEach(opt => {
        const label = document.createElement("label");
        label.className = "mcq-option";

        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = `mcq-${sec.id}-${item.id}`;
        radio.value = opt;
        radio.dataset.sectionId = sec.id;
        radio.dataset.itemId = item.id;
        radio.dataset.answer = item.answer;

        label.appendChild(radio);
        label.appendChild(document.createTextNode(opt));
        opts.appendChild(label);
      });

      div.appendChild(opts);

      const expEl = document.createElement("div");
      expEl.className = "mcq-explanation";
      expEl.id = `exp-${sec.id}-${item.id}`;
      expEl.textContent = item.explanation || "";
      div.appendChild(expEl);

      el.appendChild(div);
    });
  }

  buildComprehension(el, sec) {
    const { passage } = sec;

    const passageBox = document.createElement("div");
    passageBox.className = "passage-box";
    passageBox.innerHTML = `<div class="passage-title">📖 ${passage.title}</div>
      <div class="passage-text">${passage.text}</div>`;
    el.appendChild(passageBox);

    if (passage.vocabulary && passage.vocabulary.length) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "vocab-toggle-btn";
      toggleBtn.textContent = "📖 Show vocabulary hints";

      const vocabList = document.createElement("div");
      vocabList.className = "vocab-list hidden";
      passage.vocabulary.forEach(v => {
        const chip = document.createElement("span");
        chip.className = "vocab-chip";
        chip.innerHTML = `<strong>${v.word}</strong> = ${v.meaning}`;
        vocabList.appendChild(chip);
      });

      toggleBtn.addEventListener("click", () => {
        vocabList.classList.toggle("hidden");
        toggleBtn.textContent = vocabList.classList.contains("hidden")
          ? "📖 Show vocabulary hints" : "📖 Hide vocabulary hints";
      });

      el.appendChild(toggleBtn);
      el.appendChild(vocabList);
    }

    this.buildMCQ(el, sec);
  }

  buildSentenceWriting(el, sec) {
    const buildGroup = (prompts, groupClass, labelText) => {
      const group = document.createElement("div");
      group.className = "writing-group";

      const title = document.createElement("div");
      title.className = `writing-group-title ${groupClass}`;
      title.textContent = labelText;
      group.appendChild(title);

      prompts.forEach((p, i) => {
        const div = document.createElement("div");
        div.className = "writing-prompt";

        const promptEn = document.createElement("div");
        promptEn.className = "prompt-en";
        promptEn.textContent = `${i + 1}. ${p.english}`;
        div.appendChild(promptEn);

        const textarea = document.createElement("textarea");
        textarea.className = "writing-input";
        textarea.dataset.sectionId = sec.id;
        textarea.dataset.promptId = p.id;
        textarea.dataset.sampleFi = p.sample_fi;
        textarea.placeholder = "Kirjoita suomeksi... (Write in Finnish)";
        textarea.rows = 2;
        div.appendChild(textarea);

        const sample = document.createElement("div");
        sample.className = "sample-answer";
        sample.id = `sample-${sec.id}-${p.id}`;
        sample.innerHTML = `<strong>Sample answer:</strong> ${p.sample_fi}`;
        div.appendChild(sample);

        group.appendChild(div);
      });

      el.appendChild(group);
    };

    buildGroup(sec.do_prompts, "do-title", "✅ DO – Things you will do:");
    buildGroup(sec.dont_prompts, "dont-title", "❌ DON'T – Things you won't do:");
  }

  buildFillInBlankSentence(el, sec) {
    sec.items.forEach(item => {
      const num = item.displayNum || item.id;
      const div = document.createElement("div");
      div.className = "poss-item fitb-item";

      const enEl = document.createElement("div");
      enEl.className = "poss-en";
      // Use Finnish prompt if available, fall back to english for any legacy items
      enEl.textContent = `${num}. ${item.prompt_fi || item.english}`;
      div.appendChild(enEl);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "fitb-input";
      input.style.width = "100%";
      input.placeholder = "Kirjoita suomeksi...";
      input.dataset.sectionId = sec.id;
      input.dataset.itemId = item.id;
      input.dataset.answer = item.answer.toLowerCase();
      input.dataset.accepted = JSON.stringify(item.accepted.map(a => a.toLowerCase()));
      input.autocomplete = "off";
      input.autocapitalize = "none";
      div.appendChild(input);

      const fb = document.createElement("div");
      fb.className = "fitb-feedback";
      fb.id = `fb-${sec.id}-${item.id}`;
      div.appendChild(fb);

      el.appendChild(div);
    });
  }

  buildVocabOpen(el, sec) {
    const givenDiv = document.createElement("div");
    givenDiv.className = "vocab-given";
    sec.given.forEach(g => {
      const chip = document.createElement("div");
      chip.className = "vocab-given-chip";
      chip.innerHTML = `<span class="fi">${g.fi}</span><span class="en">${g.en}</span>`;
      givenDiv.appendChild(chip);
    });
    el.appendChild(givenDiv);

    const rows = document.createElement("div");
    rows.className = "vocab-open-rows";

    [1, 2].forEach(n => {
      const row = document.createElement("div");
      row.className = "vocab-open-row";
      row.innerHTML = `<span class="row-num">${n}.</span>`;

      const fi = document.createElement("input");
      fi.type = "text";
      fi.className = "vocab-open-input";
      fi.placeholder = "Finnish (e.g. sairaanhoitaja)";
      fi.dataset.sectionId = sec.id;
      fi.dataset.field = "fi";
      fi.dataset.rowNum = n;
      fi.autocomplete = "off";
      fi.autocapitalize = "none";

      const en = document.createElement("input");
      en.type = "text";
      en.className = "vocab-open-input";
      en.placeholder = "English meaning";
      en.dataset.sectionId = sec.id;
      en.dataset.field = "en";
      en.dataset.rowNum = n;
      en.autocomplete = "off";

      row.appendChild(fi);
      row.appendChild(en);
      rows.appendChild(row);
    });

    el.appendChild(rows);

    const accepted = document.createElement("div");
    accepted.className = "vocab-accepted-list";
    accepted.id = `vocab-accepted-${sec.id}`;
    accepted.innerHTML = `<strong>Accepted Finnish professions:</strong><br>${
      sec.accepted_answers.map(a => `<strong>${a.fi}</strong> = ${a.en}`).join(", ")
    }`;
    el.appendChild(accepted);
  }

  buildAudioResponse(el, sec) {
    // Audio player
    const playerBox = document.createElement("div");
    playerBox.className = "audio-player-box";

    const playBtn = document.createElement("button");
    playBtn.className = "audio-play-btn";
    playBtn.innerHTML = "▶ Kuuntele – Play Audio";

    const audio = document.createElement("audio");
    audio.src = sec.audio_file;
    audio.preload = "auto";

    let playing = false;
    playBtn.addEventListener("click", () => {
      if (playing) {
        audio.pause();
        audio.currentTime = 0;
        playBtn.innerHTML = "▶ Kuuntele – Play Audio";
        playing = false;
      } else {
        audio.play();
        playBtn.innerHTML = "⏹ Pysäytä – Stop";
        playing = true;
      }
    });
    audio.addEventListener("ended", () => {
      playBtn.innerHTML = "▶ Toista uudelleen – Play Again";
      playing = false;
    });

    const replayNote = document.createElement("p");
    replayNote.className = "audio-replay-note";
    replayNote.textContent = "You can play the audio multiple times.";

    // Script toggle
    const scriptToggle = document.createElement("button");
    scriptToggle.className = "vocab-toggle-btn";
    scriptToggle.textContent = "📄 Show audio script (spoiler)";
    const scriptBox = document.createElement("pre");
    scriptBox.className = "audio-script hidden";
    scriptBox.textContent = sec.audio_script;
    scriptToggle.addEventListener("click", () => {
      scriptBox.classList.toggle("hidden");
      scriptToggle.textContent = scriptBox.classList.contains("hidden")
        ? "📄 Show audio script (spoiler)" : "📄 Hide script";
    });

    playerBox.appendChild(audio);
    playerBox.appendChild(playBtn);
    playerBox.appendChild(replayNote);
    el.appendChild(playerBox);
    el.appendChild(scriptToggle);
    el.appendChild(scriptBox);

    // Questions
    sec.questions.forEach(q => {
      const div = document.createElement("div");
      div.className = "audio-q-item";

      const prompt = document.createElement("div");
      prompt.className = "audio-q-prompt";
      prompt.innerHTML = `<span class="audio-q-num">${q.id}.</span> ${q.prompt} <span class="audio-q-en">(${q.promptEn})</span>`;
      div.appendChild(prompt);

      const input = document.createElement("input");
      input.type = "text";
      input.className = "fitb-input audio-q-input";
      input.placeholder = q.placeholder;
      input.dataset.sectionId = sec.id;
      input.dataset.questionId = q.id;
      input.dataset.sample = q.sample;
      input.autocomplete = "off";
      input.autocapitalize = "none";
      div.appendChild(input);

      const sample = document.createElement("div");
      sample.className = "sample-answer";
      sample.id = `audio-sample-${sec.id}-${q.id}`;
      sample.innerHTML = `<strong>Sample:</strong> ${q.sample}`;
      div.appendChild(sample);

      el.appendChild(div);
    });
  }

  gradeAudioResponse(sec) {
    let filled = 0;
    sec.questions.forEach(q => {
      const input = document.querySelector(
        `.audio-q-input[data-section-id="${sec.id}"][data-question-id="${q.id}"]`
      );
      if (!input) return;
      input.disabled = true;
      if (input.value.trim().length > 1) filled++;

      const sample = document.getElementById(`audio-sample-${sec.id}-${q.id}`);
      if (sample) sample.classList.add("visible");
    });
    return Math.round((filled / sec.questions.length) * sec.points);
  }

  buildWordTypes(el, sec) {
    if (sec.word_bank_hint) {
      const hintBox = document.createElement("div");
      hintBox.className = "word-bank-hint-box";
      hintBox.innerHTML = `<strong>Word bank hints:</strong> ${sec.word_bank_hint}`;
      el.appendChild(hintBox);
    }

    sec.word_types.forEach(wt => {
      const block = document.createElement("div");
      block.className = "word-type-block";

      block.innerHTML = `
        <div class="word-type-header">
          <div class="word-type-name">${wt.name} <span style="font-weight:400;font-size:0.88rem;color:#555;">${wt.nameEn}</span></div>
          <div class="word-type-desc">${wt.description}</div>
        </div>
        <div class="word-type-example">
          <strong>Example:</strong> ${wt.example.base} → ${wt.example.genitive} (${wt.example.meaning})
          &nbsp;&nbsp;<em style="color:#888">${wt.rule}</em>
        </div>
        <div class="word-type-body">
          <div class="word-type-inputs" id="wt-inputs-${wt.id}"></div>
          <div class="word-type-accepted" id="wt-accepted-${wt.id}"></div>
        </div>`;

      el.appendChild(block);

      const inputsEl = block.querySelector(`#wt-inputs-${wt.id}`);
      [1, 2].forEach(n => {
        const row = document.createElement("div");
        row.className = "wt-input-row";
        row.innerHTML = `<span class="wt-row-num">${n}.</span>`;

        const baseInput = document.createElement("input");
        baseInput.type = "text";
        baseInput.className = "wt-input";
        baseInput.placeholder = "Base form (nominative)";
        baseInput.dataset.wordType = wt.id;
        baseInput.dataset.field = "base";
        baseInput.dataset.rowNum = n;
        baseInput.dataset.sectionId = "q8";
        baseInput.autocomplete = "off";
        baseInput.autocapitalize = "none";

        const arrow = document.createElement("span");
        arrow.className = "wt-sep";
        arrow.textContent = "→";

        const genInput = document.createElement("input");
        genInput.type = "text";
        genInput.className = "wt-input";
        genInput.placeholder = "Genitive (-n)";
        genInput.dataset.wordType = wt.id;
        genInput.dataset.field = "genitive";
        genInput.dataset.rowNum = n;
        genInput.dataset.sectionId = "q8";
        genInput.autocomplete = "off";
        genInput.autocapitalize = "none";

        row.appendChild(baseInput);
        row.appendChild(arrow);
        row.appendChild(genInput);
        inputsEl.appendChild(row);
      });

      const acceptedEl = block.querySelector(`#wt-accepted-${wt.id}`);
      acceptedEl.innerHTML = `<strong>Accepted words:</strong> ${
        wt.accepted.filter(a => a.meaning).map(a => `<strong>${a.base}</strong> → ${a.genitive} (${a.meaning})`).join(", ")
      }`;
    });
  }

  /* ==========================================
     EVENT LISTENERS
  ========================================== */

  setupEventListeners() {
    document.getElementById("startExamBtn").addEventListener("click", () => {
      this.submitted = false;
      this.sectionScores = {};
      this.buildExam();
      this.showScreen("examScreen");
    });

    document.getElementById("submitExamBtn").addEventListener("click", () => {
      if (!this.submitted) this.submitExam();
    });

    document.getElementById("retryBtn").addEventListener("click", () => {
      this.submitted = false;
      this.sectionScores = {};
      this.buildExam();
      document.getElementById("sectionsContainer").classList.remove("review-mode");
      const submitBar = document.getElementById("submitExamBtn").parentElement;
      submitBar.style.display = "";
      this.showScreen("examScreen");
    });

    document.getElementById("reviewBtn").addEventListener("click", () => {
      document.getElementById("sectionsContainer").classList.add("review-mode");
      document.getElementById("submitExamBtn").parentElement.style.display = "none";
      this.showScreen("examScreen");
    });

    document.getElementById("homeBtn").addEventListener("click", () => {
      window.location.href = "../../";
    });
  }

  /* ==========================================
     SUBMIT & GRADE
  ========================================== */

  submitExam() {
    this.submitted = true;
    let totalEarned = 0;
    let totalPossible = 0;

    this.selectedSections.forEach(sec => {
      const { earned, possible } = this.gradeSection(sec);
      this.sectionScores[sec.id] = { earned, possible, title: sec.titleEn };
      totalEarned += earned;
      totalPossible += possible;
    });

    const finalAnswers = this.collectAnswers();

    // Fire onSubmit callback if provided (used by exam.html for IDB save)
    if (this.onSubmit) {
      this.onSubmit({
        answers: finalAnswers,
        scores: this.sectionScores,
        totalEarned,
        totalPossible
      });
    }

    this.showResults(totalEarned, totalPossible);
  }

  gradeSection(sec) {
    const possible = sec.points;
    let earned = 0;

    switch (sec.type) {
      case "fill_in_blank":          earned = this.gradeFillInBlank(sec); break;
      case "mcq":                    earned = this.gradeMCQ(sec); break;
      case "comprehension":          earned = this.gradeMCQ(sec); break;
      case "sentence_writing":       earned = this.gradeSentenceWriting(sec); break;
      case "fill_in_blank_sentence": earned = this.gradeFillInBlankSentence(sec); break;
      case "vocabulary_open":        earned = this.gradeVocabOpen(sec); break;
      case "word_types":             earned = this.gradeWordTypes(sec); break;
      case "audio_response":         earned = this.gradeAudioResponse(sec); break;
    }

    return { earned: Math.min(earned, possible), possible };
  }

  gradeFillInBlank(sec) {
    let correct = 0;
    const total = sec.items.length;
    sec.items.forEach(item => {
      const input = document.querySelector(
        `.fitb-input[data-section-id="${sec.id}"][data-item-id="${item.id}"]`
      );
      if (!input) return;
      const userVal = input.value.trim().toLowerCase();
      const isCorrect = userVal === item.answer.toLowerCase();

      input.disabled = true;
      input.classList.add(isCorrect ? "correct" : "incorrect");

      const fb = document.getElementById(`fb-${sec.id}-${item.id}`);
      if (fb) {
        fb.className = `fitb-feedback ${isCorrect ? "correct" : "incorrect"}`;
        fb.textContent = isCorrect
          ? `✓ Correct!`
          : `✗ Answer: ${item.answer}${item.explanation ? " — " + item.explanation : ""}`;
      }
      if (isCorrect) correct++;
    });
    return Math.round((correct / total) * sec.points);
  }

  gradeMCQ(sec) {
    let correct = 0;
    const total = sec.items.length;
    sec.items.forEach(item => {
      const radios = document.querySelectorAll(`input[name="mcq-${sec.id}-${item.id}"]`);
      let selected = null;
      radios.forEach(r => { if (r.checked) selected = r.value; });

      const isCorrect = selected === item.answer;
      if (isCorrect) correct++;

      radios.forEach(r => {
        r.disabled = true;
        const label = r.parentElement;
        if (r.value === item.answer) label.classList.add("correct-answer");
        else if (r.checked && !isCorrect) label.classList.add("incorrect");
      });

      const expEl = document.getElementById(`exp-${sec.id}-${item.id}`);
      if (expEl) expEl.classList.add("visible");
    });
    return Math.round((correct / total) * sec.points);
  }

  gradeSentenceWriting(sec) {
    let filled = 0;
    const allPrompts = [...(sec.do_prompts || []), ...(sec.dont_prompts || [])];
    const total = allPrompts.length;

    allPrompts.forEach(p => {
      const textarea = document.querySelector(
        `textarea[data-section-id="${sec.id}"][data-prompt-id="${p.id}"]`
      );
      if (!textarea) return;
      textarea.disabled = true;
      if (textarea.value.trim().length > 2) filled++;

      const sample = document.getElementById(`sample-${sec.id}-${p.id}`);
      if (sample) sample.classList.add("visible");
    });

    return Math.round((filled / total) * sec.points);
  }

  gradeFillInBlankSentence(sec) {
    let correct = 0;
    const total = sec.items.length;
    sec.items.forEach(item => {
      const input = document.querySelector(
        `.fitb-input[data-section-id="${sec.id}"][data-item-id="${item.id}"]`
      );
      if (!input) return;
      const userVal = input.value.trim().toLowerCase();

      let accepted = [item.answer.toLowerCase()];
      try { accepted = JSON.parse(input.dataset.accepted); } catch (e) { /* */ }

      const isCorrect = accepted.some(a => userVal === a);
      input.disabled = true;
      input.classList.add(isCorrect ? "correct" : "incorrect");

      const fb = document.getElementById(`fb-${sec.id}-${item.id}`);
      if (fb) {
        fb.className = `fitb-feedback ${isCorrect ? "correct" : "incorrect"}`;
        fb.textContent = isCorrect
          ? `✓ Correct!`
          : `✗ Answer: ${item.answer}${item.explanation ? " — " + item.explanation : ""}`;
      }
      if (isCorrect) correct++;
    });
    return Math.round((correct / total) * sec.points);
  }

  gradeVocabOpen(sec) {
    let correct = 0;
    const acceptedFi = sec.accepted_answers.map(a => a.fi.toLowerCase());

    [1, 2].forEach(n => {
      const fiInput = document.querySelector(
        `.vocab-open-input[data-section-id="${sec.id}"][data-field="fi"][data-row-num="${n}"]`
      );
      if (!fiInput) return;
      const userFi = fiInput.value.trim().toLowerCase();
      const isCorrect = acceptedFi.includes(userFi);

      fiInput.disabled = true;
      fiInput.classList.add(isCorrect ? "correct" : "incorrect");

      const enInput = document.querySelector(
        `.vocab-open-input[data-section-id="${sec.id}"][data-field="en"][data-row-num="${n}"]`
      );
      if (enInput) enInput.disabled = true;
      if (isCorrect) correct++;
    });

    const acceptedEl = document.getElementById(`vocab-accepted-${sec.id}`);
    if (acceptedEl) acceptedEl.classList.add("visible");

    return Math.round((correct / 2) * sec.points);
  }

  gradeWordTypes(sec) {
    let totalCorrect = 0;
    const totalPairs = sec.word_types.length * 2;

    sec.word_types.forEach(wt => {
      const acceptedBases = wt.accepted.map(a => a.base.toLowerCase());
      const acceptedMap = {};
      wt.accepted.forEach(a => { acceptedMap[a.base.toLowerCase()] = a.genitive.toLowerCase(); });

      [1, 2].forEach(n => {
        const baseInput = document.querySelector(
          `.wt-input[data-word-type="${wt.id}"][data-field="base"][data-row-num="${n}"]`
        );
        const genInput = document.querySelector(
          `.wt-input[data-word-type="${wt.id}"][data-field="genitive"][data-row-num="${n}"]`
        );
        if (!baseInput || !genInput) return;

        const userBase = baseInput.value.trim().toLowerCase();
        const userGen = genInput.value.trim().toLowerCase();
        const baseOk = acceptedBases.includes(userBase);
        const genOk = baseOk && userGen === acceptedMap[userBase];

        baseInput.disabled = true;
        genInput.disabled = true;
        baseInput.classList.add(baseOk ? "correct" : "incorrect");
        genInput.classList.add(genOk ? "correct" : "incorrect");

        if (baseOk && genOk) totalCorrect++;
      });

      const acceptedEl = document.getElementById(`wt-accepted-${wt.id}`);
      if (acceptedEl) acceptedEl.classList.add("visible");
    });

    return Math.round((totalCorrect / totalPairs) * sec.points);
  }

  /* ==========================================
     RESULTS
  ========================================== */

  showResults(earned, possible) {
    const pct = Math.round((earned / possible) * 100);

    document.getElementById("finalScore").textContent = earned;
    document.getElementById("totalPoints").textContent = possible;
    document.getElementById("scorePercentage").textContent = `${pct}%`;

    const msgs = [
      [90, "Erinomainen! 🏆 Excellent work!"],
      [75, "Hyvä! 🌟 Good job!"],
      [60, "Ihan hyvä! 💪 Keep it up!"],
      [40, "Harjoittele lisää! 📚 Practice more."],
      [0,  "Jatka yrittämistä! 🌱 Keep trying!"]
    ];
    document.getElementById("scoreMessage").textContent =
      msgs.find(([min]) => pct >= min)?.[1] || msgs.at(-1)[1];

    const scoresEl = document.getElementById("sectionScores");
    scoresEl.innerHTML = "";
    this.selectedSections.forEach(sec => {
      const { earned: e, possible: p } = this.sectionScores[sec.id] || { earned: 0, possible: sec.points };
      const pctSec = Math.round((e / p) * 100);
      const cls = pctSec === 100 ? "full" : e > 0 ? "partial" : "zero";
      const row = document.createElement("div");
      row.className = "section-score-row";
      row.innerHTML = `<span class="ss-num">Q${sec.number}</span>
        <span class="ss-title">${sec.titleEn}</span>
        <span class="ss-score ${cls}">${e}/${p}</span>`;
      scoresEl.appendChild(row);
    });

    this.showScreen("resultsScreen");
  }

  /* ==========================================
     UTILITIES
  ========================================== */

  showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.add("hidden"));
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

document.addEventListener("DOMContentLoaded", () => new Exam());
