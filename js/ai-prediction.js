/**
 * Mô-đun dự đoán AI thông minh
 */

class AIPredictionManager {
    constructor() {
        this.currentMode = 'classic';
        this.aiMatches = [];
        this.aiResults = null;
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Nút chuyển chế độ
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.id.replace('-mode-btn', '');
                this.switchMode(mode);
            });
        });

        // Nút thêm trận trong chế độ AI
        const addAiMatchBtn = document.getElementById('add-ai-match-btn');
        if (addAiMatchBtn) {
            addAiMatchBtn.addEventListener('click', () => this.addAIMatch());
        }

        // Nút dự đoán AI
        const aiPredictBtn = document.getElementById('ai-predict-btn');
        if (aiPredictBtn) {
            aiPredictBtn.addEventListener('click', () => this.startAIPrediction());
        }

        // Chuyển tab
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
    }

    switchMode(mode) {
        this.currentMode = mode;

        // Cập nhật trạng thái nút chế độ
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(`${mode}-mode-btn`).classList.add('active');

        // Hiển thị/ẩn vùng nhập tương ứng
        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(`${mode}-mode`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        // Cập nhật nút dự đoán
        const classicPredictBtn = document.getElementById('predict-btn');
        const aiPredictBtn = document.getElementById('ai-predict-btn');

        if (mode === 'ai' || mode === 'lottery') {
            classicPredictBtn.classList.add('hidden');
            aiPredictBtn.classList.remove('hidden');
        } else {
            classicPredictBtn.classList.remove('hidden');
            aiPredictBtn.classList.add('hidden');
        }

        // Cập nhật hiển thị tab
        this.updateTabsVisibility(mode);
    }

    updateTabsVisibility(mode) {
        const aiTabs = document.querySelectorAll('.ai-tab');
        const classicTabs = document.querySelectorAll('.tab-btn:not(.ai-tab)');

        if (mode === 'ai' || mode === 'lottery') {
            aiTabs.forEach(tab => tab.classList.remove('hidden'));
        } else {
            aiTabs.forEach(tab => tab.classList.add('hidden'));
        }
    }

    addAIMatch() {
        const homeTeam = document.getElementById('ai-home-team').value.trim();
        const awayTeam = document.getElementById('ai-away-team').value.trim();
        const league = document.getElementById('ai-league').value.trim();
        const homeOdds = parseFloat(document.getElementById('ai-home-odds').value);
        const drawOdds = parseFloat(document.getElementById('ai-draw-odds').value);
        const awayOdds = parseFloat(document.getElementById('ai-away-odds').value);

        // Kiểm tra dữ liệu nhập
        if (!homeTeam || !awayTeam) {
            this.showMessage('Vui lòng nhập tên đội chủ nhà và đội khách', 'error');
            return;
        }

        if (!league) {
            this.showMessage('Vui lòng nhập tên giải đấu', 'error');
            return;
        }

        if (isNaN(homeOdds) || isNaN(drawOdds) || isNaN(awayOdds)) {
            this.showMessage('Vui lòng nhập thông tin tỷ lệ cược hợp lệ', 'error');
            return;
        }

        // Tạo dữ liệu trận đấu
        const match = {
            match_id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            home_team: homeTeam,
            away_team: awayTeam,
            league_name: league,
            odds: {
                hhad: {
                    h: homeOdds.toString(),
                    d: drawOdds.toString(),
                    a: awayOdds.toString()
                }
            }
        };

        this.aiMatches.push(match);
        this.renderAIMatches();
        this.clearAIForm();
        this.updateAIPredictButton();

        this.showMessage('Đã thêm trận thành công', 'success');
    }

    clearAIForm() {
        document.getElementById('ai-home-team').value = '';
        document.getElementById('ai-away-team').value = '';
        document.getElementById('ai-league').value = '';
        document.getElementById('ai-home-odds').value = '';
        document.getElementById('ai-draw-odds').value = '';
        document.getElementById('ai-away-odds').value = '';
    }

    renderAIMatches() {
        const container = document.getElementById('matches-container');

        if (this.aiMatches.length === 0) {
            container.innerHTML = '<div class="empty-message">Chưa thêm trận nào</div>';
            return;
        }

        let html = '';
        this.aiMatches.forEach((match, index) => {
            html += this.renderAIMatchCard(match, index);
        });

        container.innerHTML = html;
        this.bindAIMatchEvents();
    }

    renderAIMatchCard(match, index) {
        const odds = match.odds.hhad;
        return `
            <div class="match-card ai-match-card" data-index="${index}">
                <div class="match-info">
                    <div class="teams">
                        <span class="home-team">${match.home_team}</span>
                        <span class="vs">VS</span>
                        <span class="away-team">${match.away_team}</span>
                    </div>
                    <div class="league">${match.league_name}</div>
                </div>

                <div class="odds-info">
                    <div class="odds-group">
                        <span class="odds-label">1X2:</span>
                        <span class="odds-values">${odds.h} / ${odds.d} / ${odds.a}</span>
                    </div>
                </div>

                <div class="match-actions">
                    <button class="remove-match-btn" data-index="${index}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    bindAIMatchEvents() {
        // Nút xóa trận
        document.querySelectorAll('.remove-match-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.getAttribute('data-index'));
                this.removeAIMatch(index);
            });
        });
    }

    removeAIMatch(index) {
        this.aiMatches.splice(index, 1);
        this.renderAIMatches();
        this.updateAIPredictButton();
        this.updateMatchCount();
    }

    updateAIPredictButton() {
        const aiPredictBtn = document.getElementById('ai-predict-btn');
        const clearBtn = document.getElementById('clear-matches-btn');

        if (this.aiMatches.length > 0) {
            aiPredictBtn.disabled = false;
            clearBtn.disabled = false;
        } else {
            aiPredictBtn.disabled = true;
            clearBtn.disabled = true;
        }

        this.updateMatchCount();
    }

    updateMatchCount() {
        const matchCount = document.getElementById('match-count');
        if (matchCount) {
            matchCount.textContent = `(${this.aiMatches.length})`;
        }
    }

    async startAIPrediction() {
        let matches = [];

        if (this.currentMode === 'lottery') {
            // Chế độ xổ số thể thao: dùng các trận đã chọn
            if (window.lotteryManager) {
                matches = window.lotteryManager.getSelectedMatches();
            }
        } else if (this.currentMode === 'ai') {
            // Chế độ AI: dùng các trận được thêm thủ công
            matches = this.aiMatches;
        }

        if (matches.length === 0) {
            this.showMessage('Vui lòng thêm hoặc chọn trận trước', 'error');
            return;
        }

        const aiPredictBtn = document.getElementById('ai-predict-btn');

        try {
            // Hiển thị trạng thái tải
            aiPredictBtn.disabled = true;
            aiPredictBtn.innerHTML = '<i class="fas fa-spin fa-spinner"></i> AI đang phân tích...';

            // Gọi API dự đoán AI
            const response = await fetch('/api/ai/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ matches })
            });

            const data = await response.json();

            if (data.success) {
                this.aiResults = data;
                this.displayAIResults();
                this.showMessage('Đã hoàn tất phân tích AI', 'success');
            } else {
                throw new Error(data.message || 'Dự đoán AI thất bại');
            }

        } catch (error) {
            console.error('Dự đoán AI thất bại:', error);
            this.showMessage('Dự đoán AI thất bại: ' + error.message, 'error');
        } finally {
            // Khôi phục trạng thái nút
            aiPredictBtn.disabled = false;
            aiPredictBtn.innerHTML = '<i class="fas fa-brain"></i> Dự đoán AI thông minh';
        }
    }

    displayAIResults() {
        if (!this.aiResults) return;

        // Hiển thị khu vực kết quả
        const resultsSection = document.getElementById('results-section');
        resultsSection.classList.remove('hidden');

        // Chuyển sang tab phân tích AI
        this.switchTab('ai-analysis');

        // Hiển thị từng nhóm kết quả
        this.renderAIAnalysisResults();
        this.renderHalfFullResults();
        this.renderGoalsResults();
        this.renderScoresResults();
    }

    renderAIAnalysisResults() {
        const container = document.getElementById('ai-analysis-results');
        const analyses = this.aiResults.ai_analyses || [];

        let html = '<div class="ai-analysis-container">';

        analyses.forEach(analysis => {
            html += this.renderSingleAnalysis(analysis);
        });

        // Thêm dự đoán tổ hợp
        if (this.aiResults.combination_predictions) {
            html += this.renderCombinationPredictions(this.aiResults.combination_predictions);
        }

        html += '</div>';
        container.innerHTML = html;
    }

    renderSingleAnalysis(analysis) {
        const wdl = analysis.win_draw_loss;
        const confidence = Math.round(analysis.confidence_level * 100);

        return `
            <div class="analysis-card">
                <div class="match-header">
                    <h3>${analysis.home_team} vs ${analysis.away_team}</h3>
                    <span class="league">${analysis.league_name}</span>
                    <span class="confidence">Độ tin cậy: ${confidence}%</span>
                </div>

                <div class="prediction-section">
                    <h4>Dự đoán 1X2</h4>
                    <div class="wdl-predictions">
                        <div class="wdl-item ${this.getBestOutcome(wdl) === 'home' ? 'best' : ''}">
                            <span class="label">Chủ nhà thắng</span>
                            <span class="probability">${Math.round(wdl.home * 100)}%</span>
                        </div>
                        <div class="wdl-item ${this.getBestOutcome(wdl) === 'draw' ? 'best' : ''}">
                            <span class="label">Hòa</span>
                            <span class="probability">${Math.round(wdl.draw * 100)}%</span>
                        </div>
                        <div class="wdl-item ${this.getBestOutcome(wdl) === 'away' ? 'best' : ''}">
                            <span class="label">Khách thắng</span>
                            <span class="probability">${Math.round(wdl.away * 100)}%</span>
                        </div>
                    </div>
                </div>

                <div class="analysis-reason">
                    <h4>Lý do phân tích</h4>
                    <p>${analysis.analysis_reason}</p>
                </div>

                ${this.renderRecommendedBets(analysis.recommended_bets)}
                ${this.renderValueBets(analysis.value_bets)}
            </div>
        `;
    }

    getBestOutcome(wdl) {
        const max = Math.max(wdl.home, wdl.draw, wdl.away);
        if (wdl.home === max) return 'home';
        if (wdl.draw === max) return 'draw';
        return 'away';
    }

    renderRecommendedBets(bets) {
        if (!bets || bets.length === 0) return '';

        let html = '<div class="recommended-bets"><h4>Lựa chọn đề xuất</h4><div class="bets-list">';

        bets.forEach(bet => {
            const confidence = Math.round((bet.confidence || 0) * 100);
            html += `
                <div class="bet-item">
                    <span class="bet-type">${bet.bet_type}</span>
                    <span class="bet-selection">${bet.selection}</span>
                    <span class="bet-confidence">${confidence}%</span>
                    <p class="bet-reason">${bet.reason}</p>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    renderValueBets(bets) {
        if (!bets || bets.length === 0) return '';

        let html = '<div class="value-bets"><h4>Cơ hội có giá trị</h4><div class="bets-list">';

        bets.forEach(bet => {
            const expectedValue = Math.round(bet.expected_value * 100);
            const probability = Math.round(bet.predicted_probability * 100);

            html += `
                <div class="value-bet-item ${expectedValue > 10 ? 'high-value' : ''}">
                    <div class="bet-info">
                        <span class="bet-type">${bet.bet_type}</span>
                        <span class="bet-selection">${bet.selection}</span>
                        <span class="odds">Tỷ lệ: ${bet.odds}</span>
                    </div>
                    <div class="bet-stats">
                        <span class="probability">Xác suất dự đoán: ${probability}%</span>
                        <span class="expected-value">Giá trị kỳ vọng: ${expectedValue > 0 ? '+' : ''}${expectedValue}%</span>
                    </div>
                </div>
            `;
        });

        html += '</div></div>';
        return html;
    }

    renderCombinationPredictions(combinations) {
        if (!combinations || combinations.length === 0) return '';

        let html = '<div class="combination-predictions"><h3>Tổ hợp AI đề xuất</h3>';

        combinations.forEach(combo => {
            html += `
                <div class="combination-card">
                    <h4>${combo.type}</h4>
                    <p class="combination-desc">${combo.description}</p>

                    <div class="selections">
                        ${combo.selections.map(selection => `
                            <div class="selection-item">
                                <span class="match">${selection.match}</span>
                                <span class="prediction">${this.formatPrediction(selection.prediction)}</span>
                                <span class="probability">${Math.round((selection.probability || 0) * 100)}%</span>
                            </div>
                        `).join('')}
                    </div>

                    ${combo.total_confidence ? `
                        <div class="combination-confidence">
                            Độ tin cậy của tổ hợp: ${Math.round(combo.total_confidence * 100)}%
                        </div>
                    ` : ''}
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    formatPrediction(prediction) {
        const formatMap = {
            'home': 'Chủ nhà thắng',
            'draw': 'Hòa',
            'away': 'Khách thắng',
            'home_home': 'Chủ/Chủ',
            'home_draw': 'Chủ/Hòa',
            'home_away': 'Chủ/Khách',
            'draw_home': 'Hòa/Chủ',
            'draw_draw': 'Hòa/Hòa',
            'draw_away': 'Hòa/Khách',
            'away_home': 'Khách/Chủ',
            'away_draw': 'Khách/Hòa',
            'away_away': 'Khách/Khách',
            '0-1': '0-1 bàn',
            '2-3': '2-3 bàn',
            '4-6': '4-6 bàn',
            '7+': 'Từ 7 bàn trở lên'
        };
        return formatMap[prediction] || prediction;
    }

    renderHalfFullResults() {
        const container = document.getElementById('half-full-results');
        const analyses = this.aiResults.ai_analyses || [];

        let html = '<div class="half-full-container">';

        analyses.forEach(analysis => {
            if (analysis.half_full_time) {
                html += this.renderHalfFullAnalysis(analysis);
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderHalfFullAnalysis(analysis) {
        const hf = analysis.half_full_time;
        const sortedHF = Object.entries(hf)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5); // Chỉ hiển thị 5 kết quả có khả năng cao nhất

        return `
            <div class="half-full-card">
                <h3>${analysis.home_team} vs ${analysis.away_team}</h3>
                <div class="half-full-predictions">
                    ${sortedHF.map(([outcome, prob], index) => `
                        <div class="hf-item ${index === 0 ? 'best' : ''}">
                            <span class="outcome">${this.formatPrediction(outcome)}</span>
                            <span class="probability">${Math.round(prob * 100)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderGoalsResults() {
        const container = document.getElementById('goals-results');
        const analyses = this.aiResults.ai_analyses || [];

        let html = '<div class="goals-container">';

        analyses.forEach(analysis => {
            if (analysis.total_goals) {
                html += this.renderGoalsAnalysis(analysis);
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderGoalsAnalysis(analysis) {
        const goals = analysis.total_goals;
        const sortedGoals = Object.entries(goals)
            .sort(([,a], [,b]) => b - a);

        return `
            <div class="goals-card">
                <h3>${analysis.home_team} vs ${analysis.away_team}</h3>
                <div class="goals-predictions">
                    ${sortedGoals.map(([range, prob], index) => `
                        <div class="goals-item ${index === 0 ? 'best' : ''}">
                            <span class="range">${this.formatPrediction(range)}</span>
                            <span class="probability">${Math.round(prob * 100)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderScoresResults() {
        const container = document.getElementById('scores-results');
        const analyses = this.aiResults.ai_analyses || [];

        let html = '<div class="scores-container">';

        analyses.forEach(analysis => {
            if (analysis.exact_scores) {
                html += this.renderScoresAnalysis(analysis);
            }
        });

        html += '</div>';
        container.innerHTML = html;
    }

    renderScoresAnalysis(analysis) {
        const scores = analysis.exact_scores;

        return `
            <div class="scores-card">
                <h3>${analysis.home_team} vs ${analysis.away_team}</h3>
                <div class="scores-predictions">
                    ${scores.map(([score, prob], index) => `
                        <div class="score-item ${index === 0 ? 'best' : ''}">
                            <span class="score">${score}</span>
                            <span class="probability">${Math.round(prob * 100)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    switchTab(tabName) {
        // Cập nhật trạng thái nút tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        // Cập nhật nội dung tab
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    showMessage(message, type = 'info') {
        // Tạo phần tử thông báo
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            ${message}
        `;

        // Thêm vào trang
        document.body.appendChild(messageDiv);

        // Tự động xóa
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Biến toàn cục
let aiPredictionManager = null;

// Khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    aiPredictionManager = new AIPredictionManager();
});

// Xuất cho các mô-đun khác sử dụng
window.AIPredictionManager = AIPredictionManager;
