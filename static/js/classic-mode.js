/**
 * Chế độ cổ điển - dự đoán cục bộ
 * Sử dụng dữ liệu đặc trưng cục bộ để dự đoán, không phụ thuộc AI
 */

// Biến toàn cục
let classicMatches = [];
let teamFeaturesData = {};

// Khởi tạo chế độ cổ điển
function initClassicMode() {
    // Tải dữ liệu đặc trưng đội bóng cục bộ
    loadTeamFeatures();
    
    // Gắn trình lắng nghe sự kiện
    const addMatchBtn = document.getElementById('add-match-btn');
    const clearClassicBtn = document.getElementById('clear-classic-selection-btn');
    const classicPredictBtn = document.getElementById('classic-predict-btn');
    
    if (addMatchBtn) {
        addMatchBtn.addEventListener('click', addClassicMatch);
    }
    
    if (clearClassicBtn) {
        clearClassicBtn.addEventListener('click', clearClassicMatches);
    }
    
    if (classicPredictBtn) {
        classicPredictBtn.addEventListener('click', predictClassicMatches);
    }
}

// Tải dữ liệu đặc trưng đội bóng
async function loadTeamFeatures() {
    const leagues = ['PL', 'PD', 'SA', 'BL1', 'FL1'];
    
    for (const league of leagues) {
        try {
            // Thử tải tệp đặc trưng JSON
            const response = await fetch(`/data/features_${league}2024.json`);
            if (response.ok) {
                const data = await response.json();
                teamFeaturesData[league] = data;
                console.log(`Đã tải thành công dữ liệu đặc trưng ${league}`);
            } else {
                console.warn(`Không thể tải dữ liệu đặc trưng ${league}`);
                // Dùng dữ liệu mặc định
                teamFeaturesData[league] = generateDefaultFeatures(league);
            }
        } catch (error) {
            console.error(`Tải dữ liệu đặc trưng ${league} thất bại:`, error);
            teamFeaturesData[league] = generateDefaultFeatures(league);
        }
    }
}

// Tạo dữ liệu đặc trưng mặc định
function generateDefaultFeatures(league) {
    const teams = getTeamsByLeague(league);
    const features = {};
    
    teams.forEach((team, index) => {
        // Sinh một số đặc trưng cơ bản dựa trên tên đội
        const seed = hashCode(team) / 2147483647; // Chuẩn hóa về khoảng 0-1
        
        features[team] = {
            home_goals_scored_avg: 1.2 + seed * 1.5,
            home_goals_conceded_avg: 0.8 + seed * 1.2,
            away_goals_scored_avg: 1.0 + seed * 1.2,
            away_goals_conceded_avg: 1.0 + seed * 1.4,
            home_win_rate: 0.3 + seed * 0.4,
            away_win_rate: 0.2 + seed * 0.4,
            overall_win_rate: 0.25 + seed * 0.4,
            recent_form: 0.3 + seed * 0.7,
            attack: 1.0 + seed * 0.8,
            defense: 1.0 + seed * 0.6,
            xG: 1.1 + seed * 0.8,
            xGA: 1.0 + seed * 0.7
        };
    });
    
    return features;
}

// Hàm băm chuỗi
function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Chuyển sang số nguyên 32 bit
    }
    return hash;
}

// Lấy danh sách đội theo giải đấu
function getTeamsByLeague(league) {
    const teams = {
        'PL': ['Arsenal FC', 'Manchester City FC', 'Liverpool FC', 'Manchester United FC', 'Chelsea FC', 'Tottenham Hotspur FC', 'Newcastle United FC', 'Brighton & Hove Albion FC'],
        'PD': ['Real Madrid CF', 'FC Barcelona', 'Atlético de Madrid', 'Sevilla FC', 'Valencia CF', 'Real Betis Balompié', 'Real Sociedad', 'Athletic Bilbao'],
        'SA': ['FC Internazionale Milano', 'AC Milan', 'Juventus FC', 'SSC Napoli', 'AS Roma', 'SS Lazio', 'Atalanta BC', 'ACF Fiorentina'],
        'BL1': ['FC Bayern München', 'Borussia Dortmund', 'RB Leipzig', 'Bayer 04 Leverkusen', 'VfB Stuttgart', 'Eintracht Frankfurt', 'Borussia Mönchengladbach', 'VfL Wolfsburg'],
        'FL1': ['Paris Saint-Germain FC', 'Olympique de Marseille', 'AS Monaco FC', 'Olympique Lyonnais', 'OGC Nice', 'Stade Rennais FC', 'RC Lens', 'RC Strasbourg Alsace']
    };
    
    return teams[league] || [];
}

// Thêm trận đấu ở chế độ cổ điển
function addClassicMatch() {
    const leagueSelect = document.getElementById('league-select');
    const homeTeamSelect = document.getElementById('home-team-select');
    const awayTeamSelect = document.getElementById('away-team-select');
    const homeOddsInput = document.getElementById('home-odds');
    const drawOddsInput = document.getElementById('draw-odds');
    const awayOddsInput = document.getElementById('away-odds');
    
    // Kiểm tra dữ liệu đầu vào
    if (!leagueSelect.value) {
        showMessage('Vui lòng chọn giải đấu', 'error');
        return;
    }
    
    if (!homeTeamSelect.value || !awayTeamSelect.value) {
        showMessage('Vui lòng chọn đội chủ nhà và đội khách', 'error');
        return;
    }
    
    if (homeTeamSelect.value === awayTeamSelect.value) {
        showMessage('Đội chủ nhà và đội khách không thể trùng nhau', 'error');
        return;
    }
    
    if (!homeOddsInput.value || !drawOddsInput.value || !awayOddsInput.value) {
        showMessage('Vui lòng nhập đầy đủ thông tin tỷ lệ cược', 'error');
        return;
    }
    
    // Kiểm tra trận đấu trùng lặp
    const existingMatch = classicMatches.find(match => 
        match.league_code === leagueSelect.value &&
        match.home_team === homeTeamSelect.value &&
        match.away_team === awayTeamSelect.value
    );
    
    if (existingMatch) {
        showMessage('Trận đấu này đã được thêm', 'error');
        return;
    }
    
    // Tạo đối tượng trận đấu
    const match = {
        id: Date.now(),
        league_code: leagueSelect.value,
        league_name: leagueSelect.options[leagueSelect.selectedIndex].text,
        home_team: homeTeamSelect.value,
        away_team: awayTeamSelect.value,
        home_odds: parseFloat(homeOddsInput.value),
        draw_odds: parseFloat(drawOddsInput.value),
        away_odds: parseFloat(awayOddsInput.value)
    };
    
    // Thêm vào mảng
    classicMatches.push(match);
    
    // Cập nhật hiển thị
    updateClassicMatchesDisplay();
    
    // Xóa dữ liệu biểu mẫu
    homeOddsInput.value = '';
    drawOddsInput.value = '';
    awayOddsInput.value = '';
    
    showMessage('Đã thêm trận đấu vào danh sách', 'success');
}

// Cập nhật danh sách trận đấu của chế độ cổ điển
function updateClassicMatchesDisplay() {
    const container = document.getElementById('classic-selected-matches');
    const countSpan = document.getElementById('classic-match-count');
    const clearBtn = document.getElementById('clear-classic-selection-btn');
    const predictBtn = document.getElementById('classic-predict-btn');
    
    // Cập nhật số lượng
    countSpan.textContent = `(${classicMatches.length})`;
    
    // Cập nhật trạng thái nút
    const hasMatches = classicMatches.length > 0;
    clearBtn.disabled = !hasMatches;
    predictBtn.disabled = !hasMatches;
    
    if (classicMatches.length === 0) {
        container.innerHTML = `
            <div class="empty-cart-message">
                <i class="fas fa-shopping-cart"></i>
                <p>Danh sách đang trống</p>
                <small>Hãy thêm trận đấu ở khung bên trái</small>
            </div>
        `;
        return;
    }
    
    // Tạo thẻ trận đấu
    container.innerHTML = classicMatches.map(match => `
        <div class="match-card" data-match-id="${match.id}">
            <div class="match-info">
                <div class="teams">
                    <div class="home-team">${match.home_team}</div>
                    <div class="vs">VS</div>
                    <div class="away-team">${match.away_team}</div>
                </div>
                <div class="league">${match.league_name}</div>
            </div>
            
            <div class="odds-info">
                <div class="odds-group">
                    <span class="odds-label">Tỷ lệ cược</span>
                    <span class="odds-values">${match.home_odds} / ${match.draw_odds} / ${match.away_odds}</span>
                </div>
            </div>
            
            <div class="match-actions">
                <button class="remove-match-btn" onclick="removeClassicMatch(${match.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Xóa một trận đấu khỏi chế độ cổ điển
function removeClassicMatch(matchId) {
    classicMatches = classicMatches.filter(match => match.id !== matchId);
    updateClassicMatchesDisplay();
    showMessage('Đã xóa trận đấu', 'info');
}

// Xóa toàn bộ trận đấu ở chế độ cổ điển
function clearClassicMatches() {
    classicMatches = [];
    updateClassicMatchesDisplay();
    showMessage('Đã xóa toàn bộ danh sách', 'info');
}

// Dự đoán các trận đấu ở chế độ cổ điển
async function predictClassicMatches() {
    // Kiểm tra trạng thái đăng nhập và quyền dự đoán
    if (!await window.authManager.checkPredictionLimit()) {
        return;
    }
    
    if (classicMatches.length === 0) {
        showMessage('Vui lòng thêm trận đấu trước', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        // Sử dụng thuật toán dự đoán cục bộ
        const predictions = classicMatches.map(match => {
            return predictMatchLocally(match);
        });
        
        // Tạo các tổ hợp xiên
        const parlayPredictions = generateClassicParlays(predictions);
        
        // Hiển thị kết quả
        displayClassicPredictions(predictions);
        displayClassicParlays(parlayPredictions);
        
        // Lưu kết quả dự đoán vào cơ sở dữ liệu
        saveClassicPredictionsToDatabase(predictions);
        
        // Hiển thị khu vực kết quả
        const resultsSection = document.getElementById('results-section');
        resultsSection.classList.remove('hidden');
        
        // Chuyển sang tab dự đoán từng trận
        const individualTab = document.querySelector('[data-tab="individual"]');
        if (individualTab) {
            individualTab.click();
        }
        
        showMessage(`Đã dự đoán thành công ${predictions.length} trận đấu`, 'success');
        
    } catch (error) {
        console.error('Dự đoán thất bại:', error);
        showMessage('Dự đoán thất bại, vui lòng thử lại sau', 'error');
    } finally {
        showLoading(false);
    }
}

// Thuật toán dự đoán cục bộ
function predictMatchLocally(match) {
    const homeFeatures = getTeamFeatures(match.home_team, match.league_code);
    const awayFeatures = getTeamFeatures(match.away_team, match.league_code);
    
    if (!homeFeatures || !awayFeatures) {
        throw new Error(`Không tìm thấy dữ liệu đội bóng: ${match.home_team} hoặc ${match.away_team}`);
    }
    
    // Tính số bàn thắng kỳ vọng
    const homeExpectedGoals = calculateExpectedGoals(homeFeatures, awayFeatures, true, match.home_odds, match.away_odds);
    const awayExpectedGoals = calculateExpectedGoals(awayFeatures, homeFeatures, false, match.away_odds, match.home_odds);
    
    // Dùng phân phối Poisson để tính xác suất
    const probabilities = calculateMatchProbabilities(homeExpectedGoals, awayExpectedGoals);
    
    // Điều chỉnh xác suất theo tỷ lệ cược
    const adjustedProbs = adjustProbabilitiesWithOdds(probabilities, match.home_odds, match.draw_odds, match.away_odds);
    
    // Tính giá trị kỳ vọng
    const homeEV = (adjustedProbs.home * match.home_odds) - 1;
    const drawEV = (adjustedProbs.draw * match.draw_odds) - 1;
    const awayEV = (adjustedProbs.away * match.away_odds) - 1;
    
    // Xác định lựa chọn tốt nhất
    const bestBet = homeEV > drawEV && homeEV > awayEV ? 'home' : 
                   drawEV > awayEV ? 'draw' : 'away';
    
    const bestEV = Math.max(homeEV, drawEV, awayEV);
    
    // Tính các tỷ số có khả năng xảy ra cao nhất
    const mostLikelyScores = calculateMostLikelyScores(homeExpectedGoals, awayExpectedGoals);
    
    return {
        match_id: match.id,
        league_code: match.league_code,
        home_team: match.home_team,
        away_team: match.away_team,
        home_win_prob: adjustedProbs.home,
        draw_prob: adjustedProbs.draw,
        away_win_prob: adjustedProbs.away,
        home_odds: match.home_odds,
        draw_odds: match.draw_odds,
        away_odds: match.away_odds,
        best_bet: bestBet,
        best_ev: bestEV,
        expected_goals: {
            home: homeExpectedGoals,
            away: awayExpectedGoals
        },
        most_likely_scores: mostLikelyScores,
        recommendation: getBetRecommendation(bestBet, bestEV)
    };
}

// Lấy đặc trưng đội bóng
function getTeamFeatures(teamName, leagueCode) {
    const leagueData = teamFeaturesData[leagueCode];
    if (!leagueData) return null;
    
    return leagueData[teamName] || null;
}

// Tính số bàn thắng kỳ vọng
function calculateExpectedGoals(teamFeatures, opponentFeatures, isHome, teamOdds, opponentOdds) {
    let expectedGoals;
    
    if (isHome) {
        expectedGoals = (
            (teamFeatures.home_goals_scored_avg || 1.3) * 0.4 +
            (teamFeatures.attack || 1.3) * 0.3 +
            (teamFeatures.recent_form || 1.0) * 0.2 +
            (teamFeatures.xG || 1.2) * 0.1
        );
        
        // Lợi thế sân nhà
        expectedGoals *= 1.05;
    } else {
        expectedGoals = (
            (teamFeatures.away_goals_scored_avg || 1.1) * 0.4 +
            (teamFeatures.attack || 1.3) * 0.3 +
            (teamFeatures.recent_form || 1.0) * 0.2 +
            (teamFeatures.xG || 1.2) * 0.1
        );
    }
    
    // Điều chỉnh theo khả năng phòng ngự của đối thủ
    const opponentDefense = opponentFeatures.defense || 1.0;
    expectedGoals *= (2.0 - opponentDefense) / 1.0; // Phòng ngự càng mạnh thì số bàn kỳ vọng càng thấp
    
    // Điều chỉnh theo tỷ lệ cược
    const oddsRatio = teamOdds / opponentOdds;
    if (oddsRatio < 0.7) { // Đội mạnh rõ rệt
        expectedGoals *= 1.2;
    } else if (oddsRatio > 1.5) { // Đội yếu rõ rệt
        expectedGoals *= 0.8;
    }
    
    return Math.max(expectedGoals, 0.3); // Số bàn kỳ vọng tối thiểu
}

// Tính xác suất trận đấu
function calculateMatchProbabilities(homeGoals, awayGoals) {
    let homeWin = 0, draw = 0, awayWin = 0;
    
    // Dùng phân phối Poisson để tính xác suất cho từng tỷ số
    for (let h = 0; h <= 5; h++) {
        for (let a = 0; a <= 5; a++) {
            const prob = poissonProbability(h, homeGoals) * poissonProbability(a, awayGoals);
            
            if (h > a) homeWin += prob;
            else if (h === a) draw += prob;
            else awayWin += prob;
        }
    }
    
    // Chuẩn hóa
    const total = homeWin + draw + awayWin;
    return {
        home: homeWin / total,
        draw: draw / total,
        away: awayWin / total
    };
}

// Hàm khối xác suất Poisson
function poissonProbability(k, lambda) {
    return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

// Hàm giai thừa
function factorial(n) {
    if (n <= 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

// Điều chỉnh xác suất theo tỷ lệ cược
function adjustProbabilitiesWithOdds(probs, homeOdds, drawOdds, awayOdds) {
    // Tính xác suất ngụ ý từ tỷ lệ cược
    const totalMargin = 1/homeOdds + 1/drawOdds + 1/awayOdds - 1;
    const homeImplied = (1/homeOdds) / (1 + totalMargin);
    const drawImplied = (1/drawOdds) / (1 + totalMargin);
    const awayImplied = (1/awayOdds) / (1 + totalMargin);
    
    // Kết hợp xác suất tính toán và xác suất ngụ ý
    const weight = 0.7; // Trọng số xác suất tính toán
    const oddsWeight = 0.3; // Trọng số tỷ lệ cược
    
    const adjustedHome = probs.home * weight + homeImplied * oddsWeight;
    const adjustedDraw = probs.draw * weight + drawImplied * oddsWeight;
    const adjustedAway = probs.away * weight + awayImplied * oddsWeight;
    
    // Chuẩn hóa
    const total = adjustedHome + adjustedDraw + adjustedAway;
    return {
        home: adjustedHome / total,
        draw: adjustedDraw / total,
        away: adjustedAway / total
    };
}

// Tính các tỷ số có khả năng xảy ra cao nhất
function calculateMostLikelyScores(homeGoals, awayGoals) {
    const scores = [];
    
    for (let h = 0; h <= 4; h++) {
        for (let a = 0; a <= 4; a++) {
            const prob = poissonProbability(h, homeGoals) * poissonProbability(a, awayGoals);
            scores.push({
                score: `${h}-${a}`,
                probability: prob
            });
        }
    }
    
    return scores
        .sort((a, b) => b.probability - a.probability)
        .slice(0, 3)
        .map(s => ({ score: s.score, probability: s.probability }));
}

// Tạo khuyến nghị lựa chọn
function getBetRecommendation(bestBet, bestEV) {
    const betNames = {
        'home': 'Chủ nhà thắng',
        'draw': 'Hòa', 
        'away': 'Khách thắng'
    };
    
    if (bestEV > 0.05) {
        return `Khuyến nghị mạnh: ${betNames[bestBet]} (EV: ${(bestEV * 100).toFixed(1)}%)`;
    } else if (bestEV > 0) {
        return `Khuyến nghị: ${betNames[bestBet]} (EV: ${(bestEV * 100).toFixed(1)}%)`;
    } else {
        return `Nên thận trọng: ${betNames[bestBet]} (EV: ${(bestEV * 100).toFixed(1)}%)`;
    }
}

// Hiển thị kết quả dự đoán cổ điển
function displayClassicPredictions(predictions) {
    const container = document.getElementById('individual-results');
    
    container.innerHTML = predictions.map(pred => `
        <div class="prediction-card classic-prediction">
            <div class="match-header">
                <h3>${pred.home_team} vs ${pred.away_team}</h3>
                <span class="league-badge">${pred.league_code}</span>
            </div>
            
            <div class="probabilities-section">
                <h4>Xác suất thắng - hòa - thua</h4>
                <div class="probability-bars">
                    <div class="prob-bar">
                        <span class="prob-label">Chủ nhà thắng</span>
                        <div class="prob-value">${(pred.home_win_prob * 100).toFixed(1)}%</div>
                        <div class="prob-visual">
                            <div class="prob-fill" style="width: ${pred.home_win_prob * 100}%"></div>
                        </div>
                    </div>
                    <div class="prob-bar">
                        <span class="prob-label">Hòa</span>
                        <div class="prob-value">${(pred.draw_prob * 100).toFixed(1)}%</div>
                        <div class="prob-visual">
                            <div class="prob-fill" style="width: ${pred.draw_prob * 100}%"></div>
                        </div>
                    </div>
                    <div class="prob-bar">
                        <span class="prob-label">Khách thắng</span>
                        <div class="prob-value">${(pred.away_win_prob * 100).toFixed(1)}%</div>
                        <div class="prob-visual">
                            <div class="prob-fill" style="width: ${pred.away_win_prob * 100}%"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="prediction-details">
                <div class="detail-item">
                    <strong>Bàn thắng kỳ vọng:</strong> 
                    ${pred.expected_goals.home.toFixed(1)} - ${pred.expected_goals.away.toFixed(1)}
                </div>
                <div class="detail-item">
                    <strong>Tỷ số có khả năng cao nhất:</strong> 
                    ${pred.most_likely_scores.map(s => s.score).join(', ')}
                </div>
                <div class="detail-item recommendation">
                    <strong>Khuyến nghị:</strong> ${pred.recommendation}
                </div>
            </div>
            
            <div class="odds-comparison">
                <h4>So sánh tỷ lệ cược</h4>
                <div class="odds-row">
                    <span>Chủ nhà thắng: ${pred.home_odds}</span>
                    <span>Hòa: ${pred.draw_odds}</span>
                    <span>Khách thắng: ${pred.away_odds}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Hiển thị thông báo
function showMessage(message, type = 'info') {
    // Tạo phần tử thông báo
    const messageEl = document.createElement('div');
    messageEl.className = `message ${type}`;
    messageEl.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}-circle"></i>
        ${message}
    `;
    
    // Thêm vào trang
    document.body.appendChild(messageEl);
    
    // Xóa sau 3 giây
    setTimeout(() => {
        messageEl.remove();
    }, 3000);
}

// Hiển thị/ẩn trạng thái tải
function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}

// Tạo các tổ hợp xiên cho chế độ cổ điển
function generateClassicParlays(predictions) {
    if (predictions.length < 2) {
        return { best: null, all: [] };
    }
    
    const allCombinations = [];
    
    // Tạo toàn bộ lựa chọn có thể có cho từng trận
    const allSelections = predictions.map(pred => [
        { type: 'home', odds: pred.home_odds, prob: pred.home_win_prob, ev: (pred.home_win_prob * pred.home_odds) - 1 },
        { type: 'draw', odds: pred.draw_odds, prob: pred.draw_prob, ev: (pred.draw_prob * pred.draw_odds) - 1 },
        { type: 'away', odds: pred.away_odds, prob: pred.away_win_prob, ev: (pred.away_win_prob * pred.away_odds) - 1 }
    ]);
    
    // Tạo mọi tổ hợp có thể có (tích Descartes)
    function generateCombinations(index, currentCombo) {
        if (index === allSelections.length) {
            const combo = {
                selections: currentCombo.map((sel, i) => ({
                    match: `${predictions[i].home_team} vs ${predictions[i].away_team}`,
                    pick: sel.type,
                    odds: sel.odds,
                    prob: sel.prob
                })),
                totalOdds: currentCombo.reduce((acc, sel) => acc * sel.odds, 1),
                totalProb: currentCombo.reduce((acc, sel) => acc * sel.prob, 1),
                avgEV: currentCombo.reduce((acc, sel) => acc + sel.ev, 0) / currentCombo.length
            };
            combo.expectedValue = (combo.totalProb * combo.totalOdds) - 1;
            allCombinations.push(combo);
            return;
        }
        
        for (const selection of allSelections[index]) {
            currentCombo.push(selection);
            generateCombinations(index + 1, currentCombo);
            currentCombo.pop();
        }
    }
    
    generateCombinations(0, []);
    
    // Sắp xếp theo giá trị kỳ vọng
    allCombinations.sort((a, b) => b.expectedValue - a.expectedValue);
    
    return {
        best: allCombinations[0],
        all: allCombinations.slice(0, 10) // Chỉ lấy 10 tổ hợp tốt nhất
    };
}

// Hiển thị kết quả xiên của chế độ cổ điển
function displayClassicParlays(parlayPredictions) {
    // Hiển thị tổ hợp xiên tốt nhất
    const bestParlayContainer = document.getElementById('best-parlay-results');
    if (parlayPredictions.best) {
        bestParlayContainer.innerHTML = `
            <div class="best-parlay-card">
                <h3><i class="fas fa-star"></i> Tổ hợp xiên tốt nhất</h3>
                <div class="parlay-details">
                    <div class="parlay-info">
                        <span class="parlay-odds">Tổng tỷ lệ cược: ${parlayPredictions.best.totalOdds.toFixed(2)}</span>
                        <span class="parlay-prob">Xác suất thành công: ${(parlayPredictions.best.totalProb * 100).toFixed(1)}%</span>
                        <span class="parlay-ev ${parlayPredictions.best.expectedValue > 0 ? 'positive' : 'negative'}">
                            Giá trị kỳ vọng: ${(parlayPredictions.best.expectedValue * 100).toFixed(1)}%
                        </span>
                    </div>
                    <div class="parlay-selections">
                        ${parlayPredictions.best.selections.map(sel => `
                            <div class="selection-item">
                                <span class="match-name">${sel.match}</span>
                                <span class="pick-type">${getPickDisplayName(sel.pick)}</span>
                                <span class="pick-odds">@${sel.odds}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    } else {
        bestParlayContainer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-info-circle"></i>
                <p>Cần ít nhất 2 trận đấu để tạo tổ hợp xiên</p>
            </div>
        `;
    }
    
    // Hiển thị các tổ hợp khác
    const allParlaysContainer = document.getElementById('all-parlays-results');
    if (parlayPredictions.all.length > 1) {
        allParlaysContainer.innerHTML = `
            <div class="parlays-list">
                <h3><i class="fas fa-layer-group"></i> Các tổ hợp đề xuất khác</h3>
                ${parlayPredictions.all.slice(1).map((parlay, index) => `
                    <div class="parlay-item">
                        <div class="parlay-header">
                            <span class="parlay-rank">#${index + 2}</span>
                            <span class="parlay-odds">@${parlay.totalOdds.toFixed(2)}</span>
                            <span class="parlay-prob">${(parlay.totalProb * 100).toFixed(1)}%</span>
                            <span class="parlay-ev ${parlay.expectedValue > 0 ? 'positive' : 'negative'}">
                                ${(parlay.expectedValue * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div class="parlay-picks">
                            ${parlay.selections.map(sel => `
                                <span class="pick-chip">${getPickDisplayName(sel.pick)}</span>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        allParlaysContainer.innerHTML = `
            <div class="empty-message">
                <i class="fas fa-info-circle"></i>
                <p>Không có tổ hợp nào khác để hiển thị</p>
            </div>
        `;
    }
}

// Lấy tên hiển thị của loại lựa chọn
function getPickDisplayName(pick) {
    const names = {
        'home': 'Chủ nhà thắng',
        'draw': 'Hòa',
        'away': 'Khách thắng'
    };
    return names[pick] || pick;
}

// Các hàm và biến được xuất ra phạm vi toàn cục
window.getClassicMatches = () => classicMatches;
window.setClassicMatches = (matches) => { classicMatches = matches; };
window.updateClassicMatchesDisplay = updateClassicMatchesDisplay;
window.clearClassicMatches = clearClassicMatches;

// Lưu kết quả dự đoán cổ điển vào cơ sở dữ liệu
async function saveClassicPredictionsToDatabase(predictions) {
    try {
        for (const prediction of predictions) {
            // Xác định kết quả dự đoán. Giữ nguyên literal nội bộ để tương thích dữ liệu cũ.
            let predictedResult = '主胜';
            let confidence = prediction.home_win_prob * 10; // Chuyển sang thang điểm 0-10
            
            // Chọn kết quả có xác suất cao nhất
            if (prediction.draw_prob > prediction.home_win_prob && prediction.draw_prob > prediction.away_win_prob) {
                predictedResult = '平局';
                confidence = prediction.draw_prob * 10;
            } else if (prediction.away_win_prob > prediction.home_win_prob) {
                predictedResult = '客胜';
                confidence = prediction.away_win_prob * 10;
            }
            
            const saveData = {
                mode: 'classic',
                match_data: {
                    home_team: prediction.home_team,
                    away_team: prediction.away_team,
                    league_name: prediction.league_code,
                    home_odds: prediction.home_odds,
                    draw_odds: prediction.draw_odds,
                    away_odds: prediction.away_odds
                },
                prediction_result: predictedResult,
                confidence: Math.round(confidence * 100) / 100, // Giữ 2 chữ số thập phân
                ai_analysis: `Dự đoán chế độ cổ điển - Xác suất chủ nhà thắng:${(prediction.home_win_prob*100).toFixed(1)}% Xác suất hòa:${(prediction.draw_prob*100).toFixed(1)}% Xác suất khách thắng:${(prediction.away_win_prob*100).toFixed(1)}%`
            };
            
            // Gửi về backend để lưu
            const response = await fetch('/api/save-prediction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(saveData)
            });
            
            if (response.ok) {
                console.log(`✅ Đã lưu kết quả dự đoán cổ điển: ${prediction.home_team} vs ${prediction.away_team}`);
            } else {
                console.warn(`⚠️ Không thể lưu kết quả dự đoán cổ điển: ${prediction.home_team} vs ${prediction.away_team}`);
            }
        }
    } catch (error) {
        console.error('Không thể lưu kết quả dự đoán cổ điển vào cơ sở dữ liệu:', error);
    }
}

// Khởi tạo sau khi trang tải xong
document.addEventListener('DOMContentLoaded', function() {
    initClassicMode();
});