/**
 * Mô-đun dự đoán AI thông minh
 */

class AIPredictionManager {
    constructor() {
        this.currentMode = 'classic';
        this.aiMatches = [];
        this.aiResults = null;
        this.initializeEventListeners();

        setTimeout(() => {
            this.updateAIPredictButtonText();
        }, 100);
    }

    initializeEventListeners() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.id.replace('-mode-btn', '');
                this.switchMode(mode);
            });
        });

        const addAiMatchBtn = document.getElementById('add-ai-match-btn');
        if (addAiMatchBtn) {
            addAiMatchBtn.addEventListener('click', () => this.addAIMatch());
        }

        const aiPredictBtn = document.getElementById('ai-predict-btn');
        if (aiPredictBtn) {
            aiPredictBtn.addEventListener('click', () => this.startAIPrediction());
        }

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
        this.clearAllResults();
        this.updateTabsVisibility(mode);
        this.updateModeButtons(mode);
        this.updateModeSpecificDisplay(mode);
        this.updateMatchCount();

        if (mode === 'lottery' && window.lotteryManager) {
            setTimeout(() => {
                this.updateModeSpecificDisplay(mode);
                this.updateMatchCount();
            }, 100);
        }

        console.log(`Đã chuyển sang chế độ ${mode}`);
    }

    clearAllResults() {
        const resultContainer = document.getElementById('ai-analysis-results');
        if (resultContainer) {
            resultContainer.innerHTML = '';
        }

        const classicResults = document.getElementById('results');
        if (classicResults) {
            classicResults.innerHTML = '';
        }

        this.switchTab('ai-input');
    }

    updateModeButtons(mode) {
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const modeBtn = document.getElementById(`${mode}-mode-btn`);
        if (modeBtn) modeBtn.classList.add('active');

        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(`${mode}-mode`);
        if (targetSection) {
            targetSection.classList.remove('hidden');
        }

        const classicPredictBtn = document.getElementById('predict-btn');
        const aiPredictBtn = document.getElementById('ai-predict-btn');

        if (classicPredictBtn) classicPredictBtn.classList.add('hidden');
        if (aiPredictBtn) {
            aiPredictBtn.classList.remove('hidden');
        }
    }

    updateModeSpecificDisplay(mode) {
        const matchesContainer = document.getElementById('matches-container');
        if (!matchesContainer) return;

        if (mode === 'classic') {
            if (typeof window.updateMatchesUI === 'function') {
                window.updateMatchesUI();
            } else {
                matchesContainer.innerHTML = '<div class="empty-message"><i class="fas fa-futbol"></i><p>Chưa thêm trận nào</p></div>';
            }
        } else if (mode === 'ai') {
            this.renderAIMatches();
        } else if (mode === 'lottery') {
            matchesContainer.innerHTML = '<div class="empty-message"><i class="fas fa-info-circle"></i><p>Danh sách trận xổ số thể thao được hiển thị ở khu vực chọn phía trên</p></div>';
        }
    }

    renderLotterySelectedCard(match, index) {
        const odds = match.odds?.hhad || {};
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

                <div class="match-source">
                    <span class="source-tag">Dữ liệu xổ số thể thao</span>
                </div>
            </div>
        `;
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

        if (!homeTeam || !awayTeam) {
            this.showMessage('Vui lòng nhập tên đội chủ nhà và đội khách', 'error');
            return;
        }

        if (!league) {
            this.showMessage('Vui lòng nhập tên giải đấu', 'error');
            return;
        }

        if (isNaN(homeOdds) || isNaN(drawOdds) || isNaN(awayOdds)) {
            this.showMessage('Vui lòng nhập đầy đủ tỷ lệ cược hợp lệ', 'error');
            return;
        }

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
        this.updateAICartDisplay();
        this.clearAIForm();
        this.updateAIMatchCount();
        this.updateAIPredictButtonText();

        this.showMessage('Đã thêm trận vào danh sách', 'success');
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
        this.updateAICartDisplay();
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
        this.updateAIPredictButtonText();
        this.updateMatchCount();
    }

    updateMatchCount() {
        const matchCount = document.getElementById('match-count');
        if (!matchCount) return;

        let count = 0;

        if (this.currentMode === 'lottery') {
            count = window.lotteryManager ? window.lotteryManager.selectedMatches.size : 0;
        } else if (this.currentMode === 'ai') {
            count = this.aiMatches.length;
        } else if (this.currentMode === 'classic') {
            count = window.matches ? window.matches.length : 0;
        }

        matchCount.textContent = `(${count})`;
        this.updateAIPredictButtonText();
    }

    async startAIPrediction() {
        if (!await window.authManager.checkPredictionLimit()) {
            return;
        }

        try {
            let matchesToPredict = [];

            if (this.currentMode === 'lottery') {
                if (window.lotteryManager && window.lotteryManager.getSelectedMatches) {
                    const lotteryMatches = window.lotteryManager.getSelectedMatches();
                    matchesToPredict = lotteryMatches.map(match => this.convertToAIFormat(match));
                    console.log('Các trận xổ số thể thao đã chọn:', lotteryMatches);
                }
            } else if (this.currentMode === 'ai') {
                matchesToPredict = this.aiMatches;
            } else if (this.currentMode === 'classic') {
                if (window.matches && window.matches.length > 0) {
                    matchesToPredict = window.matches.map(match => this.convertToAIFormat(match));
                }
            }

            if (!matchesToPredict || matchesToPredict.length === 0) {
                this.showMessage('Vui lòng chọn hoặc thêm trận trước', 'error');
                return;
            }

            console.log('Bắt đầu dự đoán AI, số trận:', matchesToPredict.length);
            console.log('Dữ liệu trận:', matchesToPredict);

            const loadingElement = document.getElementById('loading-overlay');
            if (loadingElement) {
                loadingElement.classList.remove('hidden');
            }

            const aiPredictBtn = document.getElementById('ai-predict-btn');
            if (aiPredictBtn) {
                aiPredictBtn.disabled = true;
                aiPredictBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AI đang phân tích...';
            }

            const predictions = [];
            for (const match of matchesToPredict) {
                try {
                    console.log(`Bắt đầu dự đoán: ${match.home_team} vs ${match.away_team}`);
                    const prediction = await this.predictMatchWithGemini(match);
                    if (prediction) {
                        predictions.push(prediction);
                        console.log(`Dự đoán thành công: ${match.home_team} vs ${match.away_team}`);
                    }
                } catch (error) {
                    console.error(`Dự đoán thất bại ${match.home_team} vs ${match.away_team}:`, error);
                }
            }

            if (predictions.length > 0) {
                this.aiResults = predictions;
                this.displayAIResults();
                this.showMessage(`Đã phân tích thành công ${predictions.length}/${matchesToPredict.length} trận`, 'success');
                this.savePredictionsToDatabase(predictions);

                const resultsSection = document.getElementById('results-section');
                if (resultsSection) {
                    resultsSection.classList.remove('hidden');
                }
                this.switchTab('ai-analysis');
            } else {
                throw new Error('Tất cả dự đoán đều thất bại. Vui lòng kiểm tra kết nối mạng hoặc cấu hình API');
            }

        } catch (error) {
            console.error('Dự đoán AI thất bại:', error);
            this.showMessage(`Dự đoán AI thất bại: ${error.message}`, 'error');
        } finally {
            const loadingElement = document.getElementById('loading-overlay');
            if (loadingElement) {
                loadingElement.classList.add('hidden');
            }

            const aiPredictBtn = document.getElementById('ai-predict-btn');
            if (aiPredictBtn) {
                aiPredictBtn.disabled = false;
                this.updateAIPredictButtonText();
            }
        }
    }

    convertToAIFormat(match) {
        if (match.odds && match.odds.hhad) {
            return match;
        } else {
            return {
                match_id: match.id || match.match_id || `converted_${Date.now()}`,
                home_team: match.home_team,
                away_team: match.away_team,
                league_name: match.leagueName || match.league_name || 'Giải đấu chưa xác định',
                odds: {
                    hhad: {
                        h: (match.home_odds || 2.0).toString(),
                        d: (match.draw_odds || 3.2).toString(),
                        a: (match.away_odds || 2.8).toString()
                    }
                }
            };
        }
    }

    updateAIPredictButtonText() {
        const aiPredictBtn = document.getElementById('ai-predict-btn');
        if (!aiPredictBtn) {
            return;
        }

        let matchCount = 0;

        if (this.currentMode === 'lottery') {
            if (window.lotteryManager && window.lotteryManager.selectedMatches) {
                matchCount = window.lotteryManager.selectedMatches.size;
            }
        } else if (this.currentMode === 'ai') {
            matchCount = this.aiMatches.length;
        } else if (this.currentMode === 'classic') {
            matchCount = window.matches ? window.matches.length : 0;
        }

        if (matchCount > 0) {
            aiPredictBtn.innerHTML = `<i class="fas fa-brain"></i> Dự đoán AI ${matchCount} trận đã chọn`;
            aiPredictBtn.disabled = false;
        } else {
            aiPredictBtn.innerHTML = '<i class="fas fa-brain"></i> Dự đoán bằng AI';
            aiPredictBtn.disabled = true;
        }
    }

    displayAIResults() {
        if (!this.aiResults || !Array.isArray(this.aiResults) || this.aiResults.length === 0) {
            this.showMessage('Chưa có kết quả phân tích AI', 'error');
            return;
        }

        this.renderSimpleAIResults();
    }

    renderSimpleAIResults() {
        const container = document.getElementById('ai-analysis-results');
        if (!container) {
            console.error('Không tìm thấy vùng ai-analysis-results');
            return;
        }

        console.log('Bắt đầu hiển thị kết quả AI:', this.aiResults);
        console.log('Kiểu dữ liệu:', typeof this.aiResults, 'Là mảng:', Array.isArray(this.aiResults));

        let html = '<div class="simple-ai-results">';

        this.aiResults.forEach((result, index) => {
            const homeTeam = result.home_team || 'Chủ nhà chưa xác định';
            const awayTeam = result.away_team || 'Đội khách chưa xác định';
            const leagueName = result.league_name || 'Giải đấu chưa xác định';
            const odds = result.odds || { home: '2.00', draw: '3.20', away: '2.80' };
            const analysis = result.ai_analysis || 'Chưa có phân tích AI';

            html += `
                <div class="ai-result-card">
                    <div class="match-header">
                        <h3 class="match-title">
                            <span class="home-team">${homeTeam}</span>
                            <span class="vs">VS</span>
                            <span class="away-team">${awayTeam}</span>
                        </h3>
                        <div class="league-info">${leagueName}</div>
                    </div>

                    <div class="odds-display">
                        <span class="odds-item">Chủ nhà: ${odds.home}</span>
                        <span class="odds-item">Hòa: ${odds.draw}</span>
                        <span class="odds-item">Đội khách: ${odds.away}</span>
                    </div>

                    <div class="ai-analysis-content">
                        <h4><i class="fas fa-brain"></i> Phân tích AI</h4>
                        <div class="analysis-text">${this.formatAnalysisText(analysis)}</div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
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

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetContent = document.getElementById(`${tabName}-tab`);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            ${message}
        `;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    async predictMatchWithGemini(match) {
        const GEMINI_API_KEY = this.getGeminiApiKey();
        if (!GEMINI_API_KEY) {
            throw new Error('Không tìm thấy GEMINI_API_KEY. Hãy cấu hình biến môi trường trên Vercel hoặc đặt khóa trong Console: localStorage.setItem("GEMINI_API_KEY", "your_api_key_here")');
        }

        const GEMINI_MODEL = window.GEMINI_MODEL || 'gemini-2.5-flash-lite-preview-06-17';
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
        const prompt = this.buildPrompt(match);

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2000
            }
        };

        try {
            const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gọi Gemini API thất bại: ${response.status} - ${errorText}`);
            }

            const data = await response.json();

            if (data.candidates && data.candidates.length > 0) {
                const aiAnalysis = data.candidates[0].content.parts[0].text;

                return {
                    match_id: match.match_id || `match_${Date.now()}`,
                    home_team: match.home_team,
                    away_team: match.away_team,
                    league_name: match.league_name || 'Giải đấu chưa xác định',
                    ai_analysis: aiAnalysis,
                    odds: {
                        home: match.home_odds || match.odds?.hhad?.h || '2.00',
                        draw: match.draw_odds || match.odds?.hhad?.d || '3.20',
                        away: match.away_odds || match.odds?.hhad?.a || '2.80'
                    }
                };
            } else {
                throw new Error('Định dạng dữ liệu trả về từ Gemini API không hợp lệ');
            }

        } catch (error) {
            console.error('Gọi Gemini API thất bại:', error);
            throw error;
        }
    }

    buildPrompt(match) {
        const home_team = match.home_team || 'Đội chủ nhà';
        const away_team = match.away_team || 'Đội khách';
        const league_name = match.league_name || 'Giải đấu chưa xác định';

        let home_odds, draw_odds, away_odds;
        if (match.odds && match.odds.hhad) {
            home_odds = match.odds.hhad.h;
            draw_odds = match.odds.hhad.d;
            away_odds = match.odds.hhad.a;
        } else {
            home_odds = match.home_odds || '2.00';
            draw_odds = match.draw_odds || '3.20';
            away_odds = match.away_odds || '2.80';
        }

        return `Hãy phân tích chi tiết trận bóng đá sau và đưa ra dự đoán đầy đủ bằng tiếng Việt:

Trận đấu: ${home_team} vs ${away_team}
Giải đấu: ${league_name}
Tỷ lệ cược: Chủ nhà thắng ${home_odds} | Hòa ${draw_odds} | Khách thắng ${away_odds}

Hãy trả lời theo cấu trúc sau:

**1. Phân tích trận đấu**
(Đánh giá sức mạnh hai đội, phong độ gần đây, lịch sử đối đầu, lợi thế sân nhà/sân khách và các yếu tố liên quan.)

**2. Dự đoán 1X2**
Kết quả đề xuất: [Chủ nhà thắng/Hòa/Khách thắng]
Lý do:
Độ tin cậy: [1-10]

**3. Dự đoán tỷ số**
Tỷ số có khả năng cao nhất:
Các tỷ số khác có thể xảy ra:

**4. Dự đoán hiệp 1/cả trận**
Kết quả hiệp 1: [Chủ nhà thắng/Hòa/Khách thắng]
Kết quả cả trận: [Chủ nhà thắng/Hòa/Khách thắng]
Tổ hợp hiệp 1/cả trận:

**5. Dự đoán tổng bàn thắng**
Tổng bàn: [0-1 bàn/2-3 bàn/Từ 4 bàn trở lên]
Bàn thắng đội chủ nhà:
Bàn thắng đội khách:

**6. Phân tích bổ sung**
- Tài/Xỉu
- Kèo châu Á
- Cảnh báo rủi ro

Hãy trả lời hoàn toàn bằng tiếng Việt, dùng thuật ngữ bóng đá tự nhiên và giữ giọng phân tích chuyên nghiệp.`;
    }

    getGeminiApiKey() {
        if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
            return process.env.GEMINI_API_KEY;
        }

        if (window.GEMINI_API_KEY) {
            return window.GEMINI_API_KEY;
        }

        const localKey = localStorage.getItem('GEMINI_API_KEY');
        if (localKey) {
            return localKey;
        }

        console.warn('Không tìm thấy GEMINI_API_KEY. Hãy cấu hình bằng một trong các cách sau:');
        console.warn('1. Cấu hình biến môi trường GEMINI_API_KEY trên Vercel');
        console.warn('2. Trong Console: localStorage.setItem("GEMINI_API_KEY", "your_api_key_here")');
        console.warn('3. Định nghĩa biến toàn cục: window.GEMINI_API_KEY = "your_api_key_here"');

        return null;
    }

    setGeminiApiKey(apiKey) {
        localStorage.setItem('GEMINI_API_KEY', apiKey);
        console.log('Đã lưu GEMINI_API_KEY vào localStorage');
    }

    updateAICartDisplay() {
        const container = document.getElementById('ai-selected-matches');
        if (!container) return;

        if (this.aiMatches.length === 0) {
            container.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-cart"></i>
                    <p>Chưa chọn trận nào</p>
                    <small>Hãy thêm trận ở cột bên trái</small>
                </div>
            `;
        } else {
            let html = '';
            this.aiMatches.forEach((match, index) => {
                html += this.renderAICartItem(match, index);
            });
            container.innerHTML = html;
            this.bindAICartEvents();
        }

        const clearBtn = document.getElementById('clear-ai-selection-btn');
        const predictBtn = document.getElementById('ai-predict-btn');

        if (clearBtn) {
            clearBtn.disabled = this.aiMatches.length === 0;
        }
        if (predictBtn) {
            predictBtn.disabled = this.aiMatches.length === 0;
        }
    }

    renderAICartItem(match, index) {
        const odds = match.odds.hhad;
        return `
            <div class="ai-selected-card" data-index="${index}">
                <div class="match-header">
                    <div class="match-title">${match.home_team} vs ${match.away_team}</div>
                    <button class="remove-btn" onclick="window.aiPredictionManager.removeAIMatch(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="match-info">
                    <span><i class="fas fa-trophy"></i> ${match.league_name}</span>
                    <span><i class="fas fa-clock"></i> Chờ dự đoán</span>
                </div>
                <div class="odds-info">
                    <span>Chủ nhà: ${odds.h}</span>
                    <span>Hòa: ${odds.d}</span>
                    <span>Đội khách: ${odds.a}</span>
                </div>
            </div>
        `;
    }

    bindAICartEvents() {
        const clearBtn = document.getElementById('clear-ai-selection-btn');
        if (clearBtn && !clearBtn.hasAttribute('data-bound')) {
            clearBtn.addEventListener('click', () => {
                this.clearAISelection();
            });
            clearBtn.setAttribute('data-bound', 'true');
        }
    }

    removeAIMatch(index) {
        if (index >= 0 && index < this.aiMatches.length) {
            const match = this.aiMatches[index];
            this.aiMatches.splice(index, 1);
            this.updateAICartDisplay();
            this.updateAIMatchCount();
            this.updateAIPredictButtonText();
            this.showMessage(`Đã xóa ${match.home_team} vs ${match.away_team}`, 'info');
        }
    }

    clearAISelection() {
        this.aiMatches = [];
        this.updateAICartDisplay();
        this.updateAIMatchCount();
        this.updateAIPredictButtonText();
        this.showMessage('Đã xóa toàn bộ danh sách', 'info');
    }

    updateAIMatchCount() {
        const countElement = document.getElementById('ai-match-count');
        if (countElement) {
            countElement.textContent = `(${this.aiMatches.length})`;
        }
    }

    async savePredictionsToDatabase(predictions) {
        try {
            for (const prediction of predictions) {
                const aiAnalysis = prediction.ai_analysis || '';
                let predictedResult = 'Chưa xác định';
                let confidence = 5.0;

                // Hỗ trợ đồng thời tiếng Việt mới và tiếng Trung cũ để tương thích dữ liệu trước đây
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
                    mode: 'ai',
                    match_data: {
                        home_team: prediction.home_team,
                        away_team: prediction.away_team,
                        league_name: prediction.league_name,
                        match_time: prediction.match_time,
                        odds: prediction.odds
                    },
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
                    console.log(`✅ Đã lưu kết quả dự đoán: ${prediction.home_team} vs ${prediction.away_team}`);
                } else {
                    console.warn(`⚠️ Không thể lưu kết quả dự đoán: ${prediction.home_team} vs ${prediction.away_team}`);
                }
            }
        } catch (error) {
            console.error('Không thể lưu kết quả dự đoán vào cơ sở dữ liệu:', error);
        }
    }
}

let aiPredictionManager = null;

document.addEventListener('DOMContentLoaded', function() {
    aiPredictionManager = new AIPredictionManager();
    window.aiPredictionManager = aiPredictionManager;
});

window.AIPredictionManager = AIPredictionManager;
