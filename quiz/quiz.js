/* ========================================
   Finnish Quiz - JavaScript
   Reusable quiz engine for multiple topics
======================================== */

class FinnishQuiz {
    constructor() {
        this.questions = [];
        this.selectedQuestions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        this.questionsPerQuiz = 10;
        
        this.init();
    }

    async init() {
        await this.loadQuestions();
        this.setupEventListeners();
        this.updateStartScreen();
    }

    async loadQuestions() {
        try {
            const response = await fetch('questions.json');
            const data = await response.json();
            this.questions = data.questions;
            this.topicTitle = data.title;
            this.topicDescription = data.description;
            
            document.getElementById('topicTitle').textContent = data.title;
            document.getElementById('quizTitle').textContent = data.title;
            document.getElementById('quizDescription').textContent = data.description;
        } catch (error) {
            console.error('Error loading questions:', error);
            document.getElementById('quizTitle').textContent = 'Error Loading Quiz';
            document.getElementById('quizDescription').textContent = 'Could not load questions. Please check the questions.json file.';
        }
    }

    setupEventListeners() {
        document.getElementById('startBtn').addEventListener('click', () => this.startQuiz());
        document.getElementById('nextBtn').addEventListener('click', () => this.nextQuestion());
        document.getElementById('retryBtn').addEventListener('click', () => this.retryQuiz());
        document.getElementById('reviewBtn').addEventListener('click', () => this.toggleReview());
    }

    updateStartScreen() {
        // Update any dynamic content on start screen
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    selectRandomQuestions() {
        const shuffled = this.shuffleArray(this.questions);
        this.selectedQuestions = shuffled.slice(0, this.questionsPerQuiz);
    }

    startQuiz() {
        this.selectRandomQuestions();
        this.currentIndex = 0;
        this.score = 0;
        this.userAnswers = [];
        
        this.showScreen('quizScreen');
        this.displayQuestion();
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
        document.getElementById(screenId).classList.remove('hidden');
    }

    displayQuestion() {
        const question = this.selectedQuestions[this.currentIndex];
        
        // Update progress
        const progress = ((this.currentIndex + 1) / this.selectedQuestions.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `${this.currentIndex + 1} / ${this.selectedQuestions.length}`;
        
        // Hide feedback and next button
        document.getElementById('feedback').classList.add('hidden');
        document.getElementById('nextBtn').classList.add('hidden');
        
        // Display visual component based on question type
        this.displayVisualComponent(question);
        
        // Display question text
        document.getElementById('questionText').textContent = question.question;
        
        // Display options
        this.displayOptions(question);
    }

    displayVisualComponent(question) {
        // Hide all visual components first
        document.getElementById('clockComponent').classList.add('hidden');
        document.getElementById('scenarioComponent').classList.add('hidden');
        document.getElementById('timeOfDayComponent').classList.add('hidden');
        
        switch (question.type) {
            case 'clock':
                this.displayClock(question.time);
                break;
            case 'scenario':
                this.displayScenario(question);
                break;
            case 'time-of-day':
                this.displayTimeOfDay(question);
                break;
        }
    }

    displayClock(timeStr) {
        const clockComponent = document.getElementById('clockComponent');
        clockComponent.classList.remove('hidden');
        
        const [hours, minutes] = timeStr.split(':').map(Number);
        
        // Calculate hand angles
        const minuteAngle = (minutes / 60) * 360;
        const hourAngle = ((hours % 12) / 12) * 360 + (minutes / 60) * 30;
        
        // Set hand positions using rotation
        const hourHand = document.getElementById('hourHand');
        const minuteHand = document.getElementById('minuteHand');
        
        hourHand.setAttribute('transform', `rotate(${hourAngle}, 100, 100)`);
        minuteHand.setAttribute('transform', `rotate(${minuteAngle}, 100, 100)`);
    }

    displayScenario(question) {
        const scenarioComponent = document.getElementById('scenarioComponent');
        scenarioComponent.classList.remove('hidden');
        
        const icons = {
            dinner: '🍽️',
            course: '📚',
            meeting: '👥',
            breakfast: '🥐',
            lunch: '🍝',
            bus: '🚌',
            work: '💼',
            exercise: '🏃',
            movie: '🎬'
        };
        
        document.getElementById('scenarioIcon').textContent = icons[question.scenario] || '⏰';
        document.getElementById('scenarioTime').textContent = question.time;
    }

    displayTimeOfDay(question) {
        const timeOfDayComponent = document.getElementById('timeOfDayComponent');
        timeOfDayComponent.classList.remove('hidden');
        
        // Remove all time-of-day classes
        timeOfDayComponent.className = 'time-of-day-component';
        
        // Parse time to determine period
        const timeMatch = question.question.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);
            document.getElementById('timeDisplay').textContent = `${hours.toString().padStart(2, '0')}:${timeMatch[2]}`;
            
            // Add appropriate class and emoji
            const skyIndicator = document.getElementById('skyIndicator');
            if (hours >= 5 && hours < 9) {
                timeOfDayComponent.classList.add('morning');
                skyIndicator.textContent = '🌅';
            } else if (hours >= 9 && hours < 12) {
                timeOfDayComponent.classList.add('late-morning');
                skyIndicator.textContent = '☀️';
            } else if (hours >= 12 && hours < 15) {
                timeOfDayComponent.classList.add('afternoon');
                skyIndicator.textContent = '🌤️';
            } else if (hours >= 15 && hours < 18) {
                timeOfDayComponent.classList.add('late-afternoon');
                skyIndicator.textContent = '🌇';
            } else if (hours >= 18 && hours < 22) {
                timeOfDayComponent.classList.add('evening');
                skyIndicator.textContent = '🌆';
            } else {
                timeOfDayComponent.classList.add('night');
                skyIndicator.textContent = '🌙';
            }
        }
    }

    displayOptions(question) {
        const container = document.getElementById('optionsContainer');
        container.innerHTML = '';
        
        const letters = ['A', 'B', 'C', 'D'];
        
        question.options.forEach((option, index) => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.innerHTML = `<span class="option-letter">${letters[index]}</span>${option}`;
            button.addEventListener('click', () => this.selectAnswer(index));
            container.appendChild(button);
        });
    }

    selectAnswer(selectedIndex) {
        const question = this.selectedQuestions[this.currentIndex];
        const options = document.querySelectorAll('.option-btn');
        const isCorrect = selectedIndex === question.correct;
        
        // Store user answer
        this.userAnswers.push({
            question: question,
            selected: selectedIndex,
            correct: isCorrect
        });
        
        if (isCorrect) {
            this.score++;
        }
        
        // Disable all options
        options.forEach((option, index) => {
            option.classList.add('disabled');
            if (index === question.correct) {
                option.classList.add('correct');
            } else if (index === selectedIndex && !isCorrect) {
                option.classList.add('incorrect');
            }
        });
        
        // Show feedback
        const feedback = document.getElementById('feedback');
        feedback.classList.remove('hidden', 'correct', 'incorrect');
        feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
        
        document.getElementById('feedbackIcon').textContent = isCorrect ? '✓ Oikein!' : '✗ Väärin!';
        document.getElementById('feedbackText').textContent = question.explanation;
        
        // Show next button
        document.getElementById('nextBtn').classList.remove('hidden');
        document.getElementById('nextBtn').textContent = 
            this.currentIndex < this.selectedQuestions.length - 1 ? 'Seuraava →' : 'Näytä tulokset';
    }

    nextQuestion() {
        this.currentIndex++;
        
        if (this.currentIndex < this.selectedQuestions.length) {
            this.displayQuestion();
        } else {
            this.showResults();
        }
    }

    showResults() {
        this.showScreen('resultsScreen');
        
        const percent = Math.round((this.score / this.selectedQuestions.length) * 100);
        document.getElementById('scorePercent').textContent = `${percent}%`;
        document.getElementById('correctCount').textContent = this.score;
        document.getElementById('totalCount').textContent = this.selectedQuestions.length;
        
        // Grade message
        const gradeMessage = document.getElementById('gradeMessage');
        gradeMessage.className = 'grade-message';
        
        if (percent >= 90) {
            gradeMessage.textContent = '🌟 Erinomainen! (Excellent!)';
            gradeMessage.classList.add('excellent');
        } else if (percent >= 70) {
            gradeMessage.textContent = '👍 Hyvä työ! (Good job!)';
            gradeMessage.classList.add('good');
        } else if (percent >= 50) {
            gradeMessage.textContent = '📚 Jatka harjoittelua! (Keep practicing!)';
            gradeMessage.classList.add('ok');
        } else {
            gradeMessage.textContent = '💪 Tarvitset lisää harjoitusta! (You need more practice!)';
            gradeMessage.classList.add('needs-work');
        }
        
        // Hide review section initially
        document.getElementById('reviewSection').classList.add('hidden');
    }

    toggleReview() {
        const reviewSection = document.getElementById('reviewSection');
        const isHidden = reviewSection.classList.contains('hidden');
        
        if (isHidden) {
            this.buildReviewSection();
            reviewSection.classList.remove('hidden');
            document.getElementById('reviewBtn').textContent = 'Piilota vastaukset';
        } else {
            reviewSection.classList.add('hidden');
            document.getElementById('reviewBtn').textContent = 'Tarkista vastaukset';
        }
    }

    buildReviewSection() {
        const container = document.getElementById('reviewContainer');
        container.innerHTML = '';
        
        this.userAnswers.forEach((answer, index) => {
            const div = document.createElement('div');
            div.className = `review-item ${answer.correct ? 'correct' : 'incorrect'}`;
            
            const statusIcon = answer.correct ? '✓' : '✗';
            const yourAnswer = answer.question.options[answer.selected];
            const correctAnswer = answer.question.options[answer.question.correct];
            
            div.innerHTML = `
                <div class="review-question">${statusIcon} ${index + 1}. ${answer.question.question}</div>
                <div class="review-answers">
                    ${!answer.correct ? `<span class="your-answer">Sinun vastaus: ${yourAnswer}</span>` : ''}
                    <span class="correct-answer">Oikea vastaus: ${correctAnswer}</span>
                    <span style="color: #666; font-style: italic; margin-top: 5px;">${answer.question.explanation}</span>
                </div>
            `;
            
            container.appendChild(div);
        });
    }

    retryQuiz() {
        this.showScreen('startScreen');
    }
}

// Initialize quiz when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FinnishQuiz();
});
