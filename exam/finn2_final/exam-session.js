/* ========================================
   Exam Session Manager
   Handles session-based exam flow with auto-save
======================================== */

class ExamSession {
  constructor() {
    this.sessionId = null;
    this.session = null;
    this.exam = null;
    this.saveTimer = null;
    this.submitted = false;
  }

  async init() {
    try {
      // Extract session ID from URL
      const params = new URLSearchParams(window.location.search);
      this.sessionId = params.get("session");

      if (!this.sessionId) {
        alert("No session ID provided");
        window.location.href = "index.html";
        return;
      }

      // Load session from IDB
      this.session = await getSession(this.sessionId);
      if (!this.session) {
        alert("Session not found");
        window.location.href = "index.html";
        return;
      }

      // If already submitted, redirect to review
      if (this.session.status === "submitted") {
        window.location.href = `attempt.html?session=${this.sessionId}`;
        return;
      }

      // Initialize Exam class
      this.exam = new Exam();

      // Load data from exam.json
      await this.exam.loadData();

      // If selectedSections is empty (new session), build them now
      if (!this.session.selectedSections || this.session.selectedSections.length === 0) {
        console.log("New session - building questions...");
        this.exam.buildSelectedSections();
        this.session.selectedSections = this.exam.selectedSections;
        console.log("Built", this.exam.selectedSections.length, "sections");
        await saveSession(this.session);
        console.log("Session saved");
      } else {
        // Load existing questions
        console.log("Existing session - loading", this.session.selectedSections.length, "sections from IDB");
        this.exam.loadSelectedSections(this.session.selectedSections);
      }

      // Build the exam DOM
      console.log("Building exam DOM...");
      this.exam.buildExam();

      // Restore saved answers
      if (this.session.answers && Object.keys(this.session.answers).length > 0) {
        this.exam.restoreAnswers(this.session.answers);
      }

      // Set up submit callback
      this.exam.onSubmit = (result) => this.handleSubmit(result);

      // Set up auto-save
      this.setupAutoSave();

      // Wire up submit button
      document.getElementById("submitExamBtn").addEventListener("click", () => {
        if (!this.submitted) {
          this.exam.submitExam();
        }
      });

      // Wire up results buttons
      document.getElementById("retryBtn").addEventListener("click", () => {
        window.location.href = "index.html";
      });

      document.getElementById("reviewBtn").addEventListener("click", () => {
        window.location.href = `attempt.html?session=${this.sessionId}`;
      });

      document.getElementById("homeBtn").addEventListener("click", () => {
        window.location.href = "index.html";
      });
    } catch (e) {
      console.error("Failed to initialize exam session:", e);
      alert("Error loading exam session");
    }
  }

  setupAutoSave() {
    const container = document.getElementById("sectionsContainer");

    const debouncedSave = () => {
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(async () => {
        try {
          const answers = this.exam.collectAnswers();
          this.session.answers = answers;
          this.session.lastSavedAt = Date.now();
          await saveSession(this.session);
          console.log("✓ Auto-saved");
        } catch (e) {
          console.error("Failed to auto-save:", e);
        }
      }, 800);
    };

    // Auto-save on input and change events
    container.addEventListener("input", debouncedSave);
    container.addEventListener("change", debouncedSave);
  }

  async handleSubmit(result) {
    this.submitted = true;

    // Update session with scores and final state
    this.session.submittedAt = Date.now();
    this.session.status = "submitted";
    this.session.answers = result.answers;
    this.session.scores = result.scores;
    this.session.totalEarned = result.totalEarned;
    this.session.totalPossible = result.totalPossible;

    // Save to IDB
    try {
      await saveSession(this.session);
      console.log("✓ Exam submitted and saved");
      this.showResults(result.totalEarned, result.totalPossible);
    } catch (e) {
      console.error("Failed to save submitted exam:", e);
      alert("Error saving exam. Please try again.");
    }
  }

  showResults(earned, possible) {
    const pct = Math.round((earned / possible) * 100);

    document.getElementById("finalScore").textContent = earned;
    document.getElementById("totalPoints").textContent = possible;
    document.getElementById("scorePercentage").textContent = pct + "%";

    // Score message
    let message = "";
    if (pct >= 90) message = "Excellent work! 🌟";
    else if (pct >= 75) message = "Great job! 👍";
    else if (pct >= 60) message = "Good effort! 📈";
    else if (pct >= 50) message = "Keep practicing! 💪";
    else message = "Review and try again! 📚";
    document.getElementById("scoreMessage").textContent = message;

    // Section scores
    const scoresDiv = document.getElementById("sectionScores");
    scoresDiv.innerHTML = "";
    Object.entries(this.exam.sectionScores).forEach(([sectionId, scores]) => {
      const row = document.createElement("div");
      row.className = "section-score-row";

      const scorePct = Math.round((scores.earned / scores.possible) * 100);
      let badge = "";
      if (scores.earned === scores.possible) badge = "full";
      else if (scores.earned > 0) badge = "partial";
      else badge = "zero";

      row.innerHTML = `
        <div class="section-score-title">${scores.title}</div>
        <div class="section-score-value">
          <span class="score-badge ${badge}">${scores.earned}/${scores.possible}</span>
          <span class="score-pct">${scorePct}%</span>
        </div>
      `;
      scoresDiv.appendChild(row);
    });

    // Hide exam, show results
    document.getElementById("sectionsContainer").classList.add("hidden");
    document.getElementById("examSubmitBar").classList.add("hidden");
    document.getElementById("resultsContainer").classList.remove("hidden");
  }
}

// Auto-initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  const session = new ExamSession();
  session.init();
});
