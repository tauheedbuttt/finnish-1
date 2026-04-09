/* ========================================
   Home Page – Intro & Session Management
======================================== */

class HomePage {
  constructor() {
    this.exam = null;
  }

  async init() {
    try {
      // Initialize exam (loads JSON, renders intro, sets up event listeners)
      this.exam = new Exam();
      await this.exam.loadData();

      // Render intro
      const grid = document.getElementById("syllabusGrid");
      if (grid && this.exam.data) {
        const chMap = { ch4: "Ch4", ch5: "Ch5", ch6: "Ch6" };
        this.exam.data.syllabus &&
          Object.entries(this.exam.data.syllabus).forEach(([ch, topics]) => {
            topics.forEach((t) => {
              const el = document.createElement("div");
              el.className = "syllabus-tag";
              el.innerHTML = `<span class="ch-badge">${chMap[ch]}</span>${t}`;
              grid.appendChild(el);
            });
          });
      }

      document.getElementById("introSections").textContent =
        this.exam.data.sections.length;
      const total = this.exam.data.sections.reduce(
        (s, sec) => s + (sec.points || 0),
        0,
      );
      document.getElementById("introPoints").textContent = total;

      // Wire up start exam button
      document.getElementById("startExamBtn").addEventListener("click", () => {
        this.startNewExam();
      });

      // Setup delete history modal
      this.setupDeleteHistoryModal();

      // Load and display past attempts & stats
      await this.loadPastAttempts();
      await this.loadStatsbyQuestionType();
    } catch (e) {
      console.error("Failed to initialize home page:", e);
    }
  }

  async loadStatsbyQuestionType() {
    try {
      const sessions = await getAllSessions();
      const submittedSessions = sessions.filter(
        (s) => s.status === "submitted",
      );

      if (submittedSessions.length === 0) {
        document.getElementById("statsSection").classList.add("hidden");
        return;
      }

      document.getElementById("statsSection").classList.remove("hidden");

      // Group stats by question type - count individual questions
      const typeStats = {};
      let totalQuestionsAttempted = 0;
      let totalQuestionsCorrect = 0;

      submittedSessions.forEach((session) => {
        // Count questions by type from selectedSections
        if (session.selectedSections) {
          session.selectedSections.forEach((section) => {
            const sectionType = section.titleEn || section.id;

            if (!typeStats[sectionType]) {
              typeStats[sectionType] = { attempted: 0, correct: 0 };
            }

            // Count items/questions in this section
            if (section.items && Array.isArray(section.items)) {
              const numQuestions = section.items.length;
              typeStats[sectionType].attempted += numQuestions;
              totalQuestionsAttempted += numQuestions;

              // Count correct answers based on section type
              if (session.scores && session.scores[section.id]) {
                const sectionScore = session.scores[section.id];
                const earnedPct =
                  sectionScore.possible > 0
                    ? sectionScore.earned / sectionScore.possible
                    : 0;
                const correctCount = Math.round(numQuestions * earnedPct);
                typeStats[sectionType].correct += correctCount;
                totalQuestionsCorrect += correctCount;
              }
            }
          });
        }
      });

      // Render question type stats
      const statsContainer = document.getElementById("questionTypeStats");
      statsContainer.innerHTML = "";

      Object.entries(typeStats).forEach(([type, stats]) => {
        const pct =
          stats.attempted > 0
            ? Math.round((stats.correct / stats.attempted) * 100)
            : 0;
        const card = document.createElement("div");
        card.className = "question-type-card";
        card.innerHTML = `
          <div class="qt-header">
            <span class="qt-name">${type}</span>
            <span class="qt-score">${stats.correct}/${stats.attempted}</span>
          </div>
          <div class="qt-bar">
            <div class="qt-progress" style="width: ${pct}%"></div>
          </div>
          <div class="qt-footer">
            <span>Correct</span>
            <span>${pct}%</span>
          </div>
        `;
        statsContainer.appendChild(card);
      });

      // Update overall stats
      const overallPct =
        totalQuestionsAttempted > 0
          ? Math.round((totalQuestionsCorrect / totalQuestionsAttempted) * 100)
          : 0;
      document.getElementById("totalQuestionsAttempted").textContent =
        totalQuestionsAttempted;
      document.getElementById("overallScore").textContent =
        `${totalQuestionsCorrect}/${totalQuestionsAttempted} (${overallPct}%)`;
    } catch (e) {
      console.error("Failed to load stats by question type:", e);
    }
  }

  setupDeleteHistoryModal() {
    const deleteBtn = document.getElementById("deleteHistoryBtn");
    const modal = document.getElementById("deleteConfirmModal");
    const cancelBtn = document.getElementById("cancelDeleteBtn");
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    const overlay = modal?.querySelector(".modal-overlay");

    if (!deleteBtn) return;

    deleteBtn.addEventListener("click", () => {
      modal?.classList.remove("hidden");
    });

    cancelBtn?.addEventListener("click", () => {
      modal?.classList.add("hidden");
    });

    overlay?.addEventListener("click", () => {
      modal?.classList.add("hidden");
    });

    confirmBtn?.addEventListener("click", async () => {
      await this.deleteAllHistory();
      modal?.classList.add("hidden");
    });
  }

  async deleteAllHistory() {
    try {
      const sessions = await getAllSessions();

      // Delete all sessions from IndexedDB
      for (const session of sessions) {
        await deleteSession(session.id);
      }

      // Reload page to refresh stats
      window.location.reload();
    } catch (e) {
      console.error("Failed to delete history:", e);
      alert("Error deleting history");
    }
  }

  async startNewExam() {
    try {
      // Create new session in IDB
      const session = {
        id: crypto.randomUUID(),
        examId: this.exam.data.id || "finn2_mid_v1",
        createdAt: Date.now(),
        submittedAt: null,
        status: "in_progress",
        selectedSections: [],
        answers: {},
        scores: null,
        totalEarned: null,
        totalPossible: null,
      };

      await saveSession(session);

      // Navigate to exam page
      window.location.href = `exam.html?session=${session.id}`;
    } catch (e) {
      console.error("Failed to create new session:", e);
      alert("Error starting exam");
    }
  }

  async loadPastAttempts() {
    try {
      const sessions = await getAllSessions();

      if (sessions.length === 0) {
        document.getElementById("emptyHistoryState").classList.remove("hidden");
        document.getElementById("pastAttemptsSection").classList.add("hidden");
        return;
      }

      document.getElementById("emptyHistoryState").classList.add("hidden");
      document.getElementById("pastAttemptsSection").classList.remove("hidden");

      const list = document.getElementById("pastAttemptsList");
      list.innerHTML = "";

      // Show last 3 attempts
      sessions.slice(0, 3).forEach((session, idx) => {
        const row = document.createElement("div");
        row.className = "session-row";

        const createdDate = new Date(session.createdAt);
        const dateStr = createdDate.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        let statusBadge = "";
        let score = "";

        if (session.status === "submitted") {
          const earned = session.totalEarned || 0;
          const possible = session.totalPossible || 0;
          const pct = possible > 0 ? Math.round((earned / possible) * 100) : 0;
          statusBadge = `<span class="status-badge submitted">Completed</span>`;
          score = `<span class="attempt-score">${earned}/${possible} (${pct}%)</span>`;
        } else {
          statusBadge = `<span class="status-badge in-progress">In Progress</span>`;
          score = `<span class="attempt-score">Not submitted</span>`;
        }

        row.innerHTML = `
          <div class="session-row-main">
            <div class="session-row-date">${dateStr}</div>
          </div>
          <div class="session-row-score">
            ${score}
            ${statusBadge}
          </div>
          <div class="session-row-action">
            <a href="attempt.html?session=${session.id}" class="view-link">View →</a>
          </div>
        `;

        list.appendChild(row);
      });
    } catch (e) {
      console.error("Failed to load past attempts:", e);
    }
  }
}

// Auto-initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  const home = new HomePage();
  home.init();
});
