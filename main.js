/* ========================================
   Finnish Quiz Hub - Main JavaScript
======================================== */

class QuizHub {
  constructor() {
    this.topics = [];
    this.init();
  }

  async init() {
    await this.loadTopics();
    this.renderTopics();
  }

  async loadTopics() {
    try {
      const response = await fetch("topics.json");
      const data = await response.json();
      this.topics = data.topics;
    } catch (error) {
      console.error("Error loading topics:", error);
      this.topics = [];
    }
  }

  renderTopics() {
    const grid = document.getElementById("topicsGrid");

    if (this.topics.length === 0) {
      grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <p class="empty-state-text">No topics available yet. Check back soon!</p>
                </div>
            `;
      return;
    }

    grid.innerHTML = this.topics
      .map((topic) => this.createTopicCard(topic))
      .join("");
  }

  createTopicCard(topic) {
    const difficultyLabels = {
      beginner: "Aloittelija",
      intermediate: "Keskitaso",
      advanced: "Edistynyt",
    };

    return `
            <a href="${topic.path}" class="topic-card">
                <div class="topic-icon">${topic.icon}</div>
                <h3 class="topic-title">${topic.title}</h3>
                <p class="topic-title-en">${topic.titleEn}</p>
                <p class="topic-description">${topic.description}</p>
                <div class="topic-meta">
                    <span class="topic-badge questions">📝 ${
                      topic.questionCount
                    } questions</span>
                    <span class="topic-badge difficulty-${topic.difficulty}">${
      difficultyLabels[topic.difficulty] || topic.difficulty
    }</span>
                </div>
            </a>
        `;
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new QuizHub();
});
