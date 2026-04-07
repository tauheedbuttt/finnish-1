/* ========================================
   Attempt Review
   Display a read-only review of a completed session
======================================== */

class AttemptReview {
  constructor() {
    this.sessionId = null;
    this.session = null;
    this.exam = null;
  }

  async init() {
    try {
      // Extract session ID from URL
      const params = new URLSearchParams(window.location.search);
      this.sessionId = params.get("session");

      if (!this.sessionId) {
        alert("No session ID provided");
        window.location.href = "review.html";
        return;
      }

      // Load session from IDB
      this.session = await getSession(this.sessionId);
      if (!this.session) {
        alert("Session not found");
        window.location.href = "review.html";
        return;
      }

      // Initialize Exam class
      this.exam = new Exam();

      // Load data from exam.json
      await this.exam.loadData();

      // Load existing questions
      if (this.session.selectedSections && this.session.selectedSections.length > 0) {
        this.exam.loadSelectedSections(this.session.selectedSections);
      } else {
        alert("No questions found in session");
        window.location.href = "review.html";
        return;
      }

      // Build the exam DOM (read-only)
      console.log("Building exam DOM...");
      this.exam.buildExam();

      // Restore saved answers
      if (this.session.answers) {
        console.log("Restoring answers...", Object.keys(this.session.answers).length);
        this.exam.restoreAnswers(this.session.answers);
      }

      // Disable all inputs
      console.log("Disabling inputs...");
      this.disableAllInputs();

      // Apply grading visuals if submitted
      if (this.session.status === "submitted") {
        console.log("Applying grading visuals...");
        this.exam.applyGradingVisuals(this.session);
        console.log("Showing results...");
        this.showResults();
      } else {
        // In-progress session - show what's filled in
        console.log("In-progress session, hiding results...");
        document.getElementById("resultsCard").style.display = "none";
      }
      console.log("Attempt review initialized successfully");

      // Wire up buttons
      document.getElementById("retryBtn").addEventListener("click", () => {
        window.location.href = "index.html";
      });

      document.getElementById("homeBtn").addEventListener("click", () => {
        window.location.href = "index.html";
      });
    } catch (e) {
      console.error("Failed to load attempt review:", e);
      console.error("Stack:", e.stack);
      alert("Error loading attempt review: " + e.message);
    }
  }

  disableAllInputs() {
    const container = document.getElementById("sectionsContainer");
    const inputs = container.querySelectorAll("input, textarea, select");
    inputs.forEach(input => {
      input.disabled = true;
    });
  }

  showResults() {
    if (!this.session.scores) return;

    const earned = this.session.totalEarned;
    const possible = this.session.totalPossible;
    const pct = Math.round((earned / possible) * 100);

    // Format date
    const date = new Date(this.session.submittedAt);
    const dateStr = date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
    document.getElementById("attemptDate").textContent = dateStr;

    // Update results display
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
    Object.entries(this.session.scores).forEach(([sectionId, scores]) => {
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
  }
}

// Auto-initialize on page load
document.addEventListener("DOMContentLoaded", () => {
  const review = new AttemptReview();
  review.init();
});
