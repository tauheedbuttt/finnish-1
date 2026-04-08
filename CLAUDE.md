# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Suomen kieli is a static Finnish language learning application with interactive quizzes and an exam module. It's a pure frontend application using vanilla HTML/CSS/JavaScript with JSON-based question data.

**Key Points:**
- No build process or backend server required
- Runs directly in the browser
- All questions and content stored in JSON files
- Quiz progress saved to browser LocalStorage
- Static site suitable for hosting on GitHub Pages or any static host

## Architecture

### Top-Level Structure
- **index.html** — Landing page with topics grid
- **main.js** — QuizHub class that loads topics from topics.json and renders grid
- **topics.json** — Master list of all quiz topics with metadata
- **styles.css** — Global styling for landing page
- **exam/** — Full mock exam module (separate from topic quizzes)
- **[topic-dir]/** — Each topic has its own directory (time/, weather/, family/, etc.) with quiz implementation

### Quiz Architecture

**Two quiz patterns exist in this repo:**

#### Pattern 1: Simple Topic Quizzes (Legacy)
Located in: `[topic]/quiz/` directory
- Basic MCQ and written questions
- Example: time/, weather/, family/
- Uses simple FinnishQuiz class

#### Pattern 2: Advanced Quizzes with Educational Content (NEW)
Located in: `[topic]/` directory (top level)
- Educational content displayed at start (formula boxes, reference tables)
- Multiple topic selection via checkboxes
- Question type selection (Standard Questions vs. Exercise Sets)
- More sophisticated question types (audio, drag/match, identify)
- Examples: imperative/, intonation/, imperfect/, opinion/, svosentence/, predicative/, necessive/, kpt-advanced/

**Pattern 2 Directory Structure:**
```
[topic-name]/
├── index.html         — Quiz UI with educational content
├── quiz.js            — Quiz engine with checkbox filtering
├── questions.json     — Questions with rules/formula sections
└── styles.css         — Topic styling
```

**Advanced Quiz HTML Features (Pattern 2):**
- Formula box explaining the grammar rule
- Reference table with examples
- Checkbox selection for multiple subtopics (with "All" option)
- Question count selector (5, 10, 15, or all)
- Exercise type toggle (standard questions vs. exercise sets)
- Support for different question types: MCQ, written, audio, drag/match, identify

**questions.json Structure (Pattern 2):**
```json
{
  "topic": "topic-id",
  "title": "Topic Name",
  "description": "Short description",
  "instructions": "How to use this quiz",
  "subtopics": [
    { "id": "all", "name": "All Exercises", "icon": "📚" },
    { "id": "subtopic-id", "name": "Subtopic Name", "icon": "🎯" }
  ],
  "rules": {
    "structure": {
      "description": "Grammar explanation",
      "formula": "Visual formula/pattern",
      "examples": [{ "finnish": "...", "english": "...", "explanation": "..." }],
      "notes": ["Note 1", "Note 2"]
    }
  },
  "questions": [
    {
      "id": 1,
      "subtopic": "subtopic-id",
      "type": "mcq|written|audio|identify|drag",
      "text": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct": 0,
      "explanation": "Why this is correct"
    }
  ],
  "question_sets": [
    {
      "id": "set-1",
      "type": "write_imperative|drag_match|click_to_identify",
      "title": "Exercise Title",
      "instructions": "How to do this exercise",
      "items": [...]
    }
  ]
}
```

### Exam Module

The exam module (exam/finn2_mid/) is significantly more complex than topic quizzes:
- **exam.json** — Large file with full exam structure (10 sections, 100+ questions)
- **exam.js** — Complex exam engine handling:
  - Multi-section exam flow with progress tracking
  - Auto-save functionality (session stored in localStorage)
  - Different question types: MCQ, written, audio response, sentence writing
  - Timed sections (when applicable)
  - Answer validation and explanation display
- **exam-session.js** — Session management (auto-save, recovery)
- **db.js** — LocalStorage wrapper for persisting exam attempts
- **attempt-review.js** — Review interface for past exam attempts
- **index-home.js** — Exam home page with history and performance stats

**Important:** The exam is self-contained in its directory and uses a different data structure than topic quizzes.

## Running Locally

### Option 1: Python HTTP Server (Built-in)
```bash
cd /Users/mac/Documents/assignments/fin1
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Option 2: Node http-server
```bash
npm install -g http-server
cd /Users/mac/Documents/assignments/fin1
http-server
```

### Option 3: Live Server (VS Code Extension)
Install the Live Server extension and use "Go Live" from index.html

**Important:** Do not open HTML files directly (file://) as fetch() calls to JSON will fail due to CORS policy.

## Development Patterns

### Adding a New Advanced Quiz (Pattern 2 - Recommended)

1. Create new directory: `[topic-name]/`
2. Copy files from `imperative/`: index.html, quiz.js, styles.css
3. Create questions.json following Pattern 2 structure with:
   - Educational content in `rules` section
   - Subtopics array with "all" as first option
   - Questions array with proper `type` field
   - Optional `question_sets` for exercises
4. Update topics.json to add new topic entry
5. Update index.html with proper formula boxes and reference tables
6. Test locally via HTTP server

### Adding a Simple Topic Quiz (Pattern 1 - Legacy)

1. Create new directory: `[topic-name]/quiz/`
2. Copy structure from existing topic (e.g., time/quiz/)
3. Create questions.json with simple structure
4. Update topics.json to add new topic entry
5. Test locally to ensure JSON loads

### Question Types Supported

**MCQ (Multiple Choice)**
- 4 options, one correct answer
- Immediate feedback on selection

**Written (Text Input)**
- Free-form text answer
- Case-insensitive matching
- Show correct answer after attempt

**Audio Listening Questions**
- User listens to Finnish audio (without visible text during the quiz)
- Questions test comprehension of intonation, grammar, context
- Finnish text hidden during question to force listening
- Text revealed only in explanation after answer

**Audio Response (Exam Only)**
- User records audio and compares to reference
- Used in exam module for pronunciation practice

**Sentence Writing (Exam Only)**
- Multi-part sentence construction
- Dynamic input based on selected tense/mood
- Answer validation with guidance

**Drag & Match**
- Drag items from left to match with right side
- Visual feedback on correct/incorrect matches
- Used for translations, pairing concepts

**Click to Identify**
- Click words/phrases in text to identify something
- Count selections or highlight specific elements
- Good for grammar pattern recognition

### Key Classes & Functions to Know

**main.js (Landing Page):**
- `QuizHub` — Loads topics.json, renders topic grid

**quiz.js (Quiz Engine):**
- `FinnishQuiz` — Main quiz class
- `loadQuestions()` — Fetches and parses questions.json
- `startQuiz()` — Begins quiz with randomly selected questions
- `nextQuestion()` — Advances to next question, updates score
- `submitAnswer()` — Records user answer, checks correctness
- `getFilteredQuestions()` — Filters by selected subtopic
- `toggleReview()` — Shows/hides answer explanations after quiz

**exam.js (Exam Engine):**
- Much larger (~1500+ lines), handles multi-section flow
- Auto-saves progress to localStorage via db.js
- Different question rendering based on type

### Common Development Tasks

**Modifying Quiz Questions:**
- Edit the questions.json file in the topic's quiz/ directory
- Ensure JSON is valid (use JSON validator if unsure)
- Changes take effect immediately on page reload (no cache)

**Changing Quiz UI:**
- styles.css in quiz/ directory controls individual topic appearance
- styles.css in root controls landing page
- Modify quiz.js HTML template methods to change question rendering

**Updating Exam Structure:**
- Edit exam/finn2_mid/exam.json directly
- Complex structure — ensure all section IDs and question references are valid
- Auto-save will recover partial progress if exam is interrupted

**Adding Subtopic Filters:**
- Add subtopic entries to questions.json subtopics array
- Mark questions with matching subtopic IDs
- Filter dropdown will auto-populate

### Data Persistence

Quiz results are stored in localStorage:
- Key: `quiz_history_[topic-id]` — Array of past quiz attempts with scores/answers
- Key: `exam_session` — Current exam session (auto-saved every answer)
- Key: `exam_attempts` — Array of completed exam attempts with scores

Clearing browser data will erase all saved progress.

### Styling Notes

- Use CSS custom properties sparingly (fallbacks for older browsers)
- Responsive design targets desktop first, scales down for mobile
- Topic quizzes inherit some base styles from root styles.css but should be self-contained
- Exam module has heavy styling due to complex layout needs

## Git Workflow

Recent commits indicate active feature development:
- Features: Adding question types, exam functionality, UI improvements
- Refactoring: JSON structure simplification, code organization
- Avoid destructive operations — always commit before major restructures

## Common Pitfalls

1. **JSON Fetch Fails** — Must run via HTTP server, not file:// protocol
2. **Broken Question References** — Ensure question IDs exist, subtopic IDs match
3. **Styling Conflicts** — Topic CSS can override root styles; check specificity
4. **LocalStorage Quota** — Large exam.json + history can approach limits on heavily-used quizzes
5. **Audio Files Missing** — Exam audio response questions reference audio files in exam/audio/ directory

## Testing Tips

- Open DevTools console (F12) to check for JSON load errors
- Use "Network" tab to verify questions.json loads correctly
- Check localStorage in "Application" tab to see saved progress
- Test both MCQ and Written modes for each topic quiz
- Verify subtopic filter works when questions have different subtopic IDs
