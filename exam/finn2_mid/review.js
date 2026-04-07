/* ========================================
   Review History
   Display list of all past exam sessions
======================================== */

async function loadSessions() {
  try {
    const sessions = await getAllSessions();

    const emptyState = document.getElementById("emptyState");
    const sessionsList = document.getElementById("sessionsList");

    if (sessions.length === 0) {
      emptyState.classList.remove("hidden");
      sessionsList.classList.add("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    sessionsList.classList.remove("hidden");
    sessionsList.innerHTML = "";

    sessions.forEach((session, idx) => {
      const row = document.createElement("div");
      row.className = "session-row";

      const createdDate = new Date(session.createdAt);
      const dateStr = createdDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
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
          <div class="session-row-number">Attempt ${sessions.length - idx}</div>
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

      sessionsList.appendChild(row);
    });
  } catch (e) {
    console.error("Failed to load sessions:", e);
    alert("Error loading session history");
  }
}

// Auto-load on page load
document.addEventListener("DOMContentLoaded", loadSessions);
