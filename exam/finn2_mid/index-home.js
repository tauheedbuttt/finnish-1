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
        const chMap = { ch1: "Ch1", ch2: "Ch2", ch3: "Ch3" };
        this.exam.data.syllabus && Object.entries(this.exam.data.syllabus).forEach(([ch, topics]) => {
          topics.forEach(t => {
            const el = document.createElement("div");
            el.className = "syllabus-tag";
            el.innerHTML = `<span class="ch-badge">${chMap[ch]}</span>${t}`;
            grid.appendChild(el);
          });
        });
      }

      document.getElementById("introSections").textContent = this.exam.data.sections.length;
      const total = this.exam.data.sections.reduce((s, sec) => s + (sec.points || 0), 0);
      document.getElementById("introPoints").textContent = total;

      // Wire up start exam button
      document.getElementById("startExamBtn").addEventListener("click", () => {
        this.startNewExam();
      });

      // Load and display past attempts
      await this.loadPastAttempts();
    } catch (e) {
      console.error("Failed to initialize home page:", e);
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
        totalPossible: null
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
          minute: "2-digit"
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
