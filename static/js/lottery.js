/**
 * Mô-đun xử lý dữ liệu Xổ số Thể thao Trung Quốc
 */

class LotteryManager {
    constructor() {
        this.matches = [];
        this.selectedMatches = new Set();
        this.isCollapsed = true;
        this.defaultShowCount = 10;
        this.initializeEventListeners();
    }

    // Lấy tỷ lệ 1X2, tương thích nhiều cấu trúc had/hhad/wdl
    getWdlOdds(odds) {
        const empty = {};
        if (!odds || typeof odds !== 'object') return empty;

        if (odds.had && (odds.had.h || odds.had.d || odds.had.a)) {
            return odds.had;
        }
        if (odds.hhad && (odds.hhad.h || odds.hhad.d || odds.hhad.a)) {
            return odds.hhad;
        }
        if (odds.wdl && (odds.wdl.home || odds.wdl.draw || odds.wdl.away)) {
            return { h: odds.wdl.home, d: odds.wdl.draw, a: odds.wdl.away };
        }
        if (typeof odds.home !== 'undefined' && typeof odds.draw !== 'undefined' && typeof odds.away !== 'undefined') {
            return { h: odds.home, d: odds.draw, a: odds.away };
        }
        return empty;
    }

    initializeEventListeners() {
        const refreshBtn = document.getElementById('refresh-lottery-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                const daysSelect = document.getElementById('days-filter');
                const days = daysSelect ? parseInt(daysSelect.value) : 3;
                this.refreshMatches(days);
            });
        }

        const forceRefreshBtn = document.getElementById('force-refresh-lottery-btn');
        if (forceRefreshBtn) {
            forceRefreshBtn.addEventListener('click', () => {
                this.showForceRefreshModal();
            });
        }

        const daysFilter = document.getElementById('days-filter');
        if (daysFilter) {
            daysFilter.addEventListener('change', (e) => {
                this.refreshMatches(parseInt(e.target.value));
            });
        }

        const toggleBtn = document.getElementById('toggle-matches-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleMatchesDisplay();
            });
        }

        const generateParlayBtn = document.getElementById('generate-parlay-btn');
        if (generateParlayBtn) {
            generateParlayBtn.addEventListener('click', () => {
                this.generateBestParlay();
            });
        }

        const clearBtn = document.getElementById('clear-lottery-selection-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearSelection();
            });
        }

        const predictBtn = document.getElementById('lottery-ai-predict-btn');
        if (predictBtn) {
            predictBtn.addEventListener('click', () => {
                this.startLotteryAIPrediction();
            });
        }
    }

    async refreshMatches(days = 3) {
        const container = document.getElementById('lottery-matches');
        const refreshBtn = document.getElementById('refresh-lottery-btn');

        try {
            container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Đang lấy dữ liệu trận đấu...</div>';

            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
            }

            const response = await fetch(`/api/lottery/matches?days=${days}`);

            if (!response.ok) {
                if (response.status === 504) {
                    throw new Error('Máy chủ phản hồi quá thời gian, vui lòng thử lại sau');
                } else if (response.status === 500) {
                    throw new Error('Lỗi máy chủ nội bộ, vui lòng liên hệ quản trị viên');
                } else {
                    throw new Error(`Yêu cầu thất bại (${response.status})`);
                }
            }

            let data;
            try {
                const responseText = await response.text();
                if (!responseText.trim()) {
                    throw new Error('Máy chủ trả về phản hồi rỗng');
                }
                data = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Lỗi phân tích JSON:', jsonError);
                throw new Error('Định dạng phản hồi từ máy chủ không hợp lệ, hãy tải lại trang');
            }

            if (data.success) {
                this.matches = data.matches || [];
                this.renderMatches();
                this.showMessage(`💾 Đã lấy ${data.count || this.matches.length} trận từ cơ sở dữ liệu`, 'success');
            } else {
                throw new Error(data.message || 'Không thể lấy dữ liệu trận đấu');
            }

        } catch (error) {
            console.error('Không thể lấy dữ liệu xổ số thể thao:', error);
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Không thể lấy dữ liệu trận đấu</h3>
                    <p>${error.message}</p>
                    <button onclick="lotteryManager.refreshMatches()" class="retry-btn">
                        <i class="fas fa-redo"></i> Thử lại
                    </button>
                </div>
            `;
            this.showMessage('Không thể lấy dữ liệu: ' + error.message, 'error');
        } finally {
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Làm mới dữ liệu';
            }
        }
    }

    renderMatches() {
        const container = document.getElementById('lottery-matches');

        if (!this.matches || this.matches.length === 0) {
            container.innerHTML = '<div class="empty-message">Chưa có dữ liệu trận đấu</div>';
            this.updateMatchesCount(0, 0);
            return;
        }

        const matchesByLeague = this.groupMatchesByLeague(this.matches);

        let html = '';
        let cardIndex = 0;
        for (const [leagueName, matches] of Object.entries(matchesByLeague)) {
            html += this.renderLeagueSection(leagueName, matches, cardIndex);
            cardIndex += matches.length;
        }

        container.innerHTML = html;
        this.applyCollapseState();
        this.updateMatchesCount(this.matches.length, this.getVisibleMatchesCount());
        this.updateToggleButton();
        this.bindMatchEvents();
    }

    groupMatchesByLeague(matches) {
        const grouped = {};
        matches.forEach(match => {
            const league = match.league_name || 'Khác';
            if (!grouped[league]) {
                grouped[league] = [];
            }
            grouped[league].push(match);
        });
        return grouped;
    }

    renderLeagueSection(leagueName, matches, startIndex = 0) {
        let html = `
            <div class="league-section">
                <h3 class="league-title">
                    <i class="fas fa-futbol"></i> ${leagueName}
                    <span class="match-count">(${matches.length} trận)</span>
                </h3>
                <div class="league-matches">
        `;

        matches.forEach((match, index) => {
            const cardIndex = startIndex + index;
            html += this.renderMatchCard(match, cardIndex);
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    renderMatchCard(match, cardIndex) {
        const isSelected = this.selectedMatches.has(match.match_id);
        const matchTime = this.formatMatchTime(match.match_time, match.match_date);
        const collapseClass = cardIndex >= this.defaultShowCount ? 'collapsed' : 'show-first-few';
        const odds = match.odds || {};

        return `
            <div class="lottery-match-card ${isSelected ? 'selected' : ''}"
                 data-match-id="${match.match_id}">
                <div class="match-header">
                    <div class="match-time">${matchTime}</div>
                    <div class="match-status">${this.getMatchStatus(match.status)}</div>
                </div>

                <div class="match-teams">
                    <div class="team home-team">
                        <span class="team-name">${match.home_team}</span>
                    </div>
                    <div class="vs">VS</div>
                    <div class="team away-team">
                        <span class="team-name">${match.away_team}</span>
                    </div>
                </div>

                ${this.renderOddsSection(odds)}

                <div class="match-actions">
                    <button class="select-match-btn ${isSelected ? 'selected' : ''}"
                            data-match-id="${match.match_id}">
                        <i class="fas ${isSelected ? 'fa-check-square' : 'fa-square'}"></i>
                        ${isSelected ? 'Đã chọn' : 'Chọn trận'}
                    </button>
                </div>
            </div>
        `;
    }

    renderOddsSection(odds) {
        const wdlOdds = this.getWdlOdds(odds);
        const scoreOdds = odds.score || {};
        const goalOdds = odds.goal || {};
        const halfFullOdds = odds.half_full || {};

        let html = '<div class="odds-section">';

        if (wdlOdds.h || wdlOdds.d || wdlOdds.a) {
            html += `
                <div class="odds-group">
                    <div class="odds-title">1X2</div>
                    <div class="odds-values">
                        <span class="odds-item">Chủ nhà: ${wdlOdds.h || 'N/A'}</span>
                        <span class="odds-item">Hòa: ${wdlOdds.d || 'N/A'}</span>
                        <span class="odds-item">Đội khách: ${wdlOdds.a || 'N/A'}</span>
                    </div>
                </div>
            `;
        }

        if (Object.keys(scoreOdds).length > 0) {
            html += `
                <div class="odds-group">
                    <div class="odds-title">Tỷ số</div>
                    <div class="odds-note">${Object.keys(scoreOdds).length} lựa chọn</div>
                </div>
            `;
        }

        html += '</div>';
        return html;
    }

    formatMatchTime(matchTime, matchDate) {
        try {
            if (matchDate && matchTime) {
                return `${matchDate} ${matchTime}`;
            } else if (matchDate) {
                return matchDate;
            } else if (matchTime) {
                return matchTime;
            } else {
                return 'Chưa xác định thời gian';
            }
        } catch (error) {
            return 'Chưa xác định thời gian';
        }
    }

    getMatchStatus(status) {
        const statusMap = {
            'PENDING': 'Chưa bắt đầu',
            'LIVE': 'Đang diễn ra',
            'FINISHED': 'Đã kết thúc',
            'CANCELLED': 'Đã hủy',
            'Selling': 'Đang mở',
            'Unknown': 'Chưa xác định'
        };
        return statusMap[status] || 'Chưa xác định';
    }

    bindMatchEvents() {
        document.querySelectorAll('.select-match-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const matchId = btn.getAttribute('data-match-id');
                this.toggleMatchSelection(matchId);
            });
        });

        document.querySelectorAll('.lottery-match-card').forEach(card => {
            card.addEventListener('click', () => {
                const matchId = card.getAttribute('data-match-id');
                this.toggleMatchSelection(matchId);
            });
        });
    }

    toggleMatchSelection(matchId) {
        const match = this.matches.find(m => m.match_id === matchId);
        if (!match) return;

        if (this.selectedMatches.has(matchId)) {
            this.selectedMatches.delete(matchId);
        } else {
            this.selectedMatches.add(matchId);
        }

        this.updateMatchCardSelection(matchId);
        this.updateSelectionInfo();
        this.updateSelectedMatchesDisplay();
        this.checkParlayRecommendation();

        if (window.aiPredictionManager && window.aiPredictionManager.currentMode === 'lottery') {
            window.aiPredictionManager.updateModeSpecificDisplay('lottery');
            window.aiPredictionManager.updateAIPredictButtonText();
        }
    }

    updateMatchCardSelection(matchId) {
        const card = document.querySelector(`[data-match-id="${matchId}"]`);
        const btn = card.querySelector('.select-match-btn');
        const isSelected = this.selectedMatches.has(matchId);

        if (isSelected) {
            card.classList.add('selected');
            btn.classList.add('selected');
            btn.innerHTML = '<i class="fas fa-check-square"></i> Đã chọn';
        } else {
            card.classList.remove('selected');
            btn.classList.remove('selected');
            btn.innerHTML = '<i class="fas fa-square"></i> Chọn trận';
        }
    }

    updateSelectionInfo() {
        const count = this.selectedMatches.size;

        const matchCount = document.getElementById('match-count');
        if (matchCount) {
            matchCount.textContent = `(${count})`;
        }

        if (window.aiPredictionManager && typeof window.aiPredictionManager.updateAIPredictButtonText === 'function') {
            window.aiPredictionManager.updateAIPredictButtonText();
        }
    }

    updateSelectedMatchesDisplay() {
        const container = document.getElementById('lottery-selected-matches');
        const countElement = document.getElementById('lottery-selected-count');
        const clearBtn = document.getElementById('clear-lottery-selection-btn');
        const predictBtn = document.getElementById('lottery-ai-predict-btn');

        if (!container) return;

        const selectedMatches = this.getSelectedMatches();
        const count = selectedMatches.length;

        if (countElement) {
            countElement.textContent = `(${count})`;
        }

        if (clearBtn) {
            clearBtn.disabled = count === 0;
        }
        if (predictBtn) {
            predictBtn.disabled = count === 0;
        }

        if (count === 0) {
            container.innerHTML = '<div class="empty-message"><i class="fas fa-info-circle"></i><p>Hãy chọn trận ở phía trên</p></div>';
            return;
        }

        let html = '';
        selectedMatches.forEach((match, index) => {
            html += this.renderSelectedMatchCard(match, index);
        });

        container.innerHTML = html;
        this.bindSelectedMatchEvents();
    }

    renderSelectedMatchCard(match, index) {
        const odds = this.getWdlOdds(match.odds);
        return `
            <div class="match-card lottery-selected-card" data-match-id="${match.match_id}">
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
                        <span class="odds-values">${odds.h || 'N/A'} / ${odds.d || 'N/A'} / ${odds.a || 'N/A'}</span>
                    </div>
                </div>

                <div class="match-actions">
                    <button class="remove-selected-match-btn" data-match-id="${match.match_id}">
                        <i class="fas fa-times"></i> Xóa
                    </button>
                </div>
            </div>
        `;
    }

    bindSelectedMatchEvents() {
        document.querySelectorAll('.remove-selected-match-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const matchId = btn.getAttribute('data-match-id');
                this.toggleMatchSelection(matchId);
            });
        });
    }

    getSelectedMatches() {
        return this.matches.filter(match => this.selectedMatches.has(match.match_id));
    }

    clearSelection() {
        this.selectedMatches.clear();
        document.querySelectorAll('.lottery-match-card').forEach(card => {
            card.classList.remove('selected');
        });
        document.querySelectorAll('.select-match-btn').forEach(btn => {
            btn.classList.remove('selected');
            btn.innerHTML = '<i class="fas fa-square"></i> Chọn trận';
        });
        this.updateSelectionInfo();
        this.updateSelectedMatchesDisplay();
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    async startLotteryAIPrediction() {
        if (!await window.authManager.checkPredictionLimit()) {
            return;
        }

        const selectedMatches = this.getSelectedMatches();

        if (selectedMatches.length === 0) {
            this.showMessage('Vui lòng chọn ít nhất một trận', 'error');
            return;
        }

        console.log('Bắt đầu dự đoán AI cho chế độ xổ số thể thao, số trận:', selectedMatches.length);

        try {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.remove('hidden');
            }

            const aiMatches = selectedMatches.map(match => {
                const wdl = this.getWdlOdds(match.odds);
                return ({
                    match_id: match.match_id,
                    home_team: match.home_team,
                    away_team: match.away_team,
                    league_name: match.league_name,
                    home_odds: parseFloat(wdl.h),
                    draw_odds: parseFloat(wdl.d),
                    away_odds: parseFloat(wdl.a),
                    source: 'lottery'
                });
            });

            const predictions = [];
            for (const match of aiMatches) {
                try {
                    console.log(`Bắt đầu dự đoán: ${match.home_team} vs ${match.away_team}`);

                    if (window.aiPredictionManager) {
                        const prediction = await window.aiPredictionManager.predictMatchWithGemini(match);
                        if (prediction) {
                            predictions.push(prediction);
                            console.log(`Dự đoán thành công: ${match.home_team} vs ${match.away_team}`);
                        }
                    } else {
                        throw new Error('Trình quản lý dự đoán AI chưa được khởi tạo');
                    }
                } catch (error) {
                    console.error(`Dự đoán thất bại ${match.home_team} vs ${match.away_team}:`, error);
                }
            }

            if (predictions.length > 0) {
                console.log('Dự đoán AI thành công:', predictions);
                this.displayAIPredictionResults(predictions);
                this.savePredictionsToDatabase(predictions);
            } else {
                throw new Error('Tất cả dự đoán đều thất bại. Vui lòng kiểm tra kết nối mạng hoặc cấu hình API');
            }

        } catch (error) {
            console.error('Lỗi dự đoán AI:', error);
            this.showMessage('Dự đoán AI thất bại: ' + error.message, 'error');
        } finally {
            const loadingOverlay = document.getElementById('loading-overlay');
            if (loadingOverlay) {
                loadingOverlay.classList.add('hidden');
            }
        }
    }

    displayAIPredictionResults(predictions) {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.classList.remove('hidden');

            const aiTab = document.querySelector('[data-tab="ai-analysis"]');
            if (aiTab) {
                aiTab.classList.remove('hidden');
                aiTab.click();
            }

            const aiResultsContainer = document.getElementById('ai-analysis-results');
            if (aiResultsContainer) {
                let html = '<div class="simple-ai-results">';

                predictions.forEach(prediction => {
                    html += `
                        <div class="ai-result-card lottery-selected-card">
                            <div class="match-header">
                                <div class="match-title">
                                    <span>${prediction.home_team}</span>
                                    <span> vs </span>
                                    <span>${prediction.away_team}</span>
                                </div>
                                <div class="league-info">${prediction.league_name}</div>
                            </div>

                            <div class="odds-display">
                                <div class="odds-item">Chủ nhà: ${prediction.odds.home}</div>
                                <div class="odds-item">Hòa: ${prediction.odds.draw}</div>
                                <div class="odds-item">Đội khách: ${prediction.odds.away}</div>
                            </div>

                            <div class="ai-analysis-content">
                                <h4><i class="fas fa-brain"></i> Phân tích AI</h4>
                                <div class="analysis-text">${this.formatAnalysisText(prediction.ai_analysis)}</div>
                            </div>

                            <div class="match-source">
                                <span class="source-tag">Dữ liệu xổ số thể thao</span>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';
                aiResultsContainer.innerHTML = html;
            }
        }

        this.showMessage(`Đã hoàn tất dự đoán AI cho ${predictions.length} trận`, 'success');
    }

    formatAnalysisText(text) {
        if (!text) return 'Chưa có phân tích';

        let formatted = text
            .replace(/\*\*([^*]+)\*\*/g, '<h5>$1</h5>')
            .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
            .replace(/^\s*[\*\-]\s+(.+)$/gm, '<li>$1</li>')
            .replace(/^\s*(\d+)\.\s+(.+)$/gm, '<li>$2</li>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');

        if (!formatted.includes('<p>')) {
            formatted = '<p>' + formatted + '</p>';
        }

        formatted = formatted.replace(/(<li>.*?<\/li>)/gs, function(match) {
            if (!match.includes('<ul>')) {
                return '<ul>' + match + '</ul>';
            }
            return match;
        });

        formatted = formatted.replace(/(<\/li>)\s*(<li>)/g, '$1$2');
        formatted = formatted.replace(/(<\/ul>)\s*(<ul>)/g, '');

        return formatted;
    }

    showForceRefreshModal() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-download"></i> Cập nhật dữ liệu trận đấu</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p><strong>Nguồn dữ liệu hiện tại:</strong> bộ nhớ đệm trong cơ sở dữ liệu</p>
                    <p><strong>Để lấy dữ liệu mới nhất, hãy chạy lệnh sau trên máy chủ:</strong></p>
                    <div class="code-block">
                        <code>python scripts/sync_daily_matches.py --days 7</code>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText('python scripts/sync_daily_matches.py --days 7')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <p class="help-text">
                        <i class="fas fa-info-circle"></i>
                        Lệnh này sẽ lấy dữ liệu trận đấu mới nhất trong 7 ngày và cập nhật cơ sở dữ liệu
                    </p>
                </div>
                <div class="modal-footer">
                    <button class="btn secondary-btn" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i> Đóng
                    </button>
                    <button class="btn primary-btn" onclick="this.closest('.modal-overlay').remove(); lotteryManager.refreshMatches();">
                        <i class="fas fa-sync"></i> Làm mới dữ liệu hiện tại
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async savePredictionsToDatabase(predictions) {
        try {
            for (const prediction of predictions) {
                const aiAnalysis = prediction.ai_analysis || '';
                let predictedResult = 'Chưa xác định';
                let confidence = 5.0;

                // Hỗ trợ cả nội dung tiếng Việt mới và dữ liệu tiếng Trung cũ để không làm gián đoạn dữ liệu hiện có
                if (/Chủ nhà thắng|đội chủ nhà|主胜|主队/i.test(aiAnalysis)) {
                    predictedResult = 'Chủ nhà thắng';
                } else if (/Khách thắng|Đội khách thắng|đội khách|客胜|客队/i.test(aiAnalysis)) {
                    predictedResult = 'Khách thắng';
                } else if (/\bHòa\b|平局|平/i.test(aiAnalysis)) {
                    predictedResult = 'Hòa';
                }

                const confidenceMatch = aiAnalysis.match(/(?:Độ tin cậy|Chỉ số tin cậy|信心指数)[：:]?\s*(\d+(?:\.\d+)?)/i);
                if (confidenceMatch) {
                    confidence = parseFloat(confidenceMatch[1]);
                }

                const saveData = {
                    mode: 'lottery',
                    match_data: prediction,
                    prediction_result: predictedResult,
                    confidence: confidence,
                    ai_analysis: aiAnalysis
                };

                const response = await fetch('/api/save-prediction', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(saveData)
                });

                if (response.ok) {
                    console.log(`✅ Đã lưu dự đoán xổ số thể thao: ${prediction.home_team} vs ${prediction.away_team}`);
                } else {
                    console.warn(`⚠️ Không thể lưu dự đoán xổ số thể thao: ${prediction.home_team} vs ${prediction.away_team}`);
                }
            }
        } catch (error) {
            console.error('Không thể lưu dự đoán xổ số thể thao vào cơ sở dữ liệu:', error);
        }
    }

    toggleMatchesDisplay() {
        this.isCollapsed = !this.isCollapsed;
        this.applyCollapseState();
        this.updateMatchesCount(this.matches.length, this.getVisibleMatchesCount());
        this.updateToggleButton();
    }

    applyCollapseState() {
        const cards = document.querySelectorAll('#lottery-matches .lottery-match-card');
        const container = document.getElementById('lottery-matches');

        const existingOverlay = container.querySelector('.matches-fade-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }

        cards.forEach((card, index) => {
            if (this.isCollapsed && index >= this.defaultShowCount) {
                card.classList.add('hidden-match');
            } else {
                card.classList.remove('hidden-match');
            }
        });

        if (this.isCollapsed && cards.length > this.defaultShowCount) {
            const overlay = document.createElement('div');
            overlay.className = 'matches-fade-overlay';
            overlay.innerHTML = `Còn ${cards.length - this.defaultShowCount} trận...`;
            container.appendChild(overlay);
        }
    }

    getVisibleMatchesCount() {
        if (this.isCollapsed) {
            return Math.min(this.matches.length, this.defaultShowCount);
        }
        return this.matches.length;
    }

    updateMatchesCount(total, visible) {
        const totalElement = document.getElementById('total-matches-count');
        const visibleElement = document.getElementById('visible-matches-count');

        if (totalElement) totalElement.textContent = total;
        if (visibleElement) visibleElement.textContent = visible;
    }

    updateToggleButton() {
        const toggleBtn = document.getElementById('toggle-matches-btn');
        if (!toggleBtn) return;

        if (this.isCollapsed) {
            toggleBtn.innerHTML = '<i class="fas fa-eye"></i> Hiển thị tất cả';
        } else {
            toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Thu gọn';
        }
    }

    async generateBestParlay() {
        if (!await window.authManager.checkPredictionLimit()) {
            return;
        }

        const selectedMatchesArray = Array.from(this.selectedMatches).map(id =>
            this.matches.find(match => match.match_id === id)
        ).filter(Boolean);

        if (selectedMatchesArray.length < 2) {
            this.showMessage('Hãy chọn ít nhất 2 trận để tạo đề xuất tổ hợp', 'warning');
            return;
        }

        const parlaySection = document.getElementById('best-parlay-recommendation');
        const parlayContent = document.getElementById('parlay-content');
        const generateBtn = document.getElementById('generate-parlay-btn');

        if (!parlaySection || !parlayContent) return;

        parlaySection.classList.remove('hidden');
        parlayContent.innerHTML = '<div class="parlay-loading"><i class="fas fa-spinner fa-spin"></i> AI đang phân tích tổ hợp tốt nhất...</div>';

        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang phân tích';
        }

        try {
            const prompt = this.buildParlayPrompt(selectedMatchesArray);
            const aiResponse = await this.callGeminiForParlay(prompt);
            this.displayParlayRecommendation(aiResponse, selectedMatchesArray);

        } catch (error) {
            console.error('Không thể tạo đề xuất tổ hợp:', error);
            parlayContent.innerHTML = `
                <div class="parlay-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Phân tích AI thất bại: ${error.message}</p>
                    <button class="btn compact-btn" onclick="lotteryManager.generateBestParlay()">
                        <i class="fas fa-refresh"></i> Thử lại
                    </button>
                </div>
            `;
        } finally {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fas fa-magic"></i> Tạo lại';
            }
        }
    }

    buildParlayPrompt(matches) {
        let prompt = `Bạn là chuyên gia phân tích bóng đá. Hãy đề xuất tổ hợp tốt nhất cho ${matches.length} trận sau:\n\n`;

        matches.forEach((match, index) => {
            const odds = this.getWdlOdds(match.odds);
            prompt += `Trận ${index + 1}: ${match.home_team} vs ${match.away_team}\n`;
            prompt += `Giải đấu: ${match.league_name}\n`;
            prompt += `Thời gian: ${match.match_time}\n`;
            prompt += `Tỷ lệ: Chủ nhà ${odds.h || 'N/A'} | Hòa ${odds.d || 'N/A'} | Đội khách ${odds.a || 'N/A'}\n\n`;
        });

        prompt += `Hãy trả lời hoàn toàn bằng tiếng Việt và cung cấp:
1. **Tổ hợp đề xuất**: kết quả cho từng trận (Chủ nhà thắng/Hòa/Khách thắng)
2. **Tổng tỷ lệ**: tính tổng tỷ lệ của tổ hợp
3. **Độ tin cậy**: chấm từ 1-10
4. **Lý do**: phân tích ngắn từng trận (sức mạnh, phong độ gần đây, đối đầu...)
5. **Đánh giá rủi ro**: chỉ ra các điểm rủi ro

Yêu cầu:
- Ngắn gọn, rõ ràng
- Làm nổi bật thông tin chính
- Không quá 300 từ`;

        return prompt;
    }

    async callGeminiForParlay(prompt) {
        const apiKey = window.GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY');
        if (!apiKey) {
            throw new Error('Chưa cấu hình khóa Gemini API');
        }

        const model = window.GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gọi API thất bại: ${response.status}`);
        }

        const data = await response.json();
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Định dạng phản hồi AI không hợp lệ');
        }

        return data.candidates[0].content.parts[0].text;
    }

    displayParlayRecommendation(aiResponse, matches) {
        const parlayContent = document.getElementById('parlay-content');
        if (!parlayContent) return;

        let totalOdds = 1;
        matches.forEach(match => {
            const odds = this.getWdlOdds(match.odds);
            const avgOdds = (parseFloat(odds.h || 0) + parseFloat(odds.d || 0) + parseFloat(odds.a || 0)) / 3;
            totalOdds *= (avgOdds || 2.5);
        });

        parlayContent.innerHTML = `
            <div class="parlay-recommendation">
                <div class="parlay-stats">
                    <div class="parlay-stat">
                        <span class="parlay-stat-value">${matches.length}</span>
                        <span class="parlay-stat-label">trận</span>
                    </div>
                    <div class="parlay-stat">
                        <span class="parlay-stat-value">${totalOdds.toFixed(2)}</span>
                        <span class="parlay-stat-label">tỷ lệ ước tính</span>
                    </div>
                </div>

                <div class="parlay-analysis">
                    ${this.formatAnalysisText(aiResponse)}
                </div>
            </div>
        `;
    }

    checkParlayRecommendation() {
        const parlaySection = document.getElementById('best-parlay-recommendation');
        if (!parlaySection) return;

        if (this.selectedMatches.size >= 2) {
            parlaySection.classList.remove('hidden');
        } else {
            parlaySection.classList.add('hidden');
        }
    }
}

let lotteryManager = null;

document.addEventListener('DOMContentLoaded', function() {
    lotteryManager = new LotteryManager();
    window.lotteryManager = lotteryManager;
});

window.LotteryManager = LotteryManager;
