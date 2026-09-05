document.addEventListener('DOMContentLoaded', function() {
    // Biến toàn cục trong phạm vi ứng dụng
    const leagueSelect = document.getElementById('league-select');
    const homeTeamSelect = document.getElementById('home-team-select');
    const awayTeamSelect = document.getElementById('away-team-select');
    const homeOddsInput = document.getElementById('home-odds');
    const drawOddsInput = document.getElementById('draw-odds');
    const awayOddsInput = document.getElementById('away-odds');
    const addMatchBtn = document.getElementById('add-match-btn');
    const clearMatchesBtn = document.getElementById('clear-matches-btn');
    const predictBtn = document.getElementById('predict-btn');
    const matchesContainer = document.getElementById('matches-container');
    const matchCountSpan = document.getElementById('match-count');
    const resultsSection = document.getElementById('results-section');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Danh sách trận đã thêm
    let matches = [];
    window.matches = matches;

    function init() {
        loadAllLeaguesData();

        if (leagueSelect) {
            leagueSelect.addEventListener('change', handleLeagueChange);
        }
        if (clearMatchesBtn) {
            clearMatchesBtn.addEventListener('click', clearMatches);
        }
        if (predictBtn) {
            predictBtn.addEventListener('click', predictMatches);
        }

        initModeSelection();

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                console.log('Chuyển tab:', this.getAttribute('data-tab'));

                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                this.classList.add('active');
                const tabId = this.getAttribute('data-tab') + '-tab';
                const targetTab = document.getElementById(tabId);
                if (targetTab) {
                    targetTab.classList.add('active');
                    console.log('Hiển thị tab:', tabId);
                } else {
                    console.error('Không tìm thấy tab:', tabId);
                }
            });
        });
    }

    function initModeSelection() {
        console.log('Bắt đầu khởi tạo lựa chọn chế độ');
        const modeButtons = document.querySelectorAll('.nav-btn');
        console.log('Số nút điều hướng tìm thấy:', modeButtons.length);

        modeButtons.forEach((btn, index) => {
            console.log(`Gắn sự kiện cho nút ${index + 1}:`, btn.id, btn.getAttribute('data-mode'));
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Nút được nhấn:', this.id, this.getAttribute('data-mode'));
                const mode = this.getAttribute('data-mode');
                switchMode(mode);
            });
        });
    }

    function switchMode(mode) {
        console.log('Chuyển sang chế độ:', mode);

        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const targetBtn = document.getElementById(mode + '-mode-btn');
        if (targetBtn) {
            targetBtn.classList.add('active');
        }

        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(mode + '-mode');
        if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log('Hiển thị khu vực chế độ:', mode);
        }

        if (window.aiPredictionManager) {
            window.aiPredictionManager.switchMode(mode);
        }

        clearAllDataAndResults();

        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
    }

    function clearAllDataAndResults() {
        matches = [];
        if (typeof updateMatchesDisplay === 'function') {
            updateMatchesDisplay();
        }

        if (window.aiPredictionManager) {
            window.aiPredictionManager.clearAISelection();
        }

        if (window.clearClassicMatches) {
            window.clearClassicMatches();
        }

        if (window.lotteryManager) {
            window.lotteryManager.clearSelection();
        }

        const containers = [
            'individual-results',
            'best-parlay-results',
            'all-parlays-results',
            'ai-analysis-results'
        ];

        containers.forEach(containerId => {
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = '';
            }
        });

        console.log('Đã xóa toàn bộ dữ liệu và kết quả dự đoán');
    }

    function handleLeagueChange() {
        const leagueCode = leagueSelect.value;

        homeTeamSelect.innerHTML = '<option value="">Chọn đội chủ nhà</option>';
        awayTeamSelect.innerHTML = '<option value="">Chọn đội khách</option>';

        if (!leagueCode) {
            homeTeamSelect.disabled = true;
            awayTeamSelect.disabled = true;
            return;
        }

        if (featuresData[leagueCode]) {
            const teamsList = Array.isArray(featuresData[leagueCode])
                ? featuresData[leagueCode]
                : Object.keys(featuresData[leagueCode]);
            populateTeamSelects(leagueCode, teamsList);
        } else {
            homeTeamSelect.innerHTML = '<option value="">Đang tải...</option>';
            awayTeamSelect.innerHTML = '<option value="">Đang tải...</option>';
            homeTeamSelect.disabled = true;
            awayTeamSelect.disabled = true;
        }
    }

    function populateTeamSelects(leagueCode, teamsList) {
        homeTeamSelect.innerHTML = '<option value="">Chọn đội chủ nhà</option>';
        awayTeamSelect.innerHTML = '<option value="">Chọn đội khách</option>';

        teamsList.forEach(team => {
            const homeOption = document.createElement('option');
            homeOption.value = team;
            homeOption.textContent = team;
            homeTeamSelect.appendChild(homeOption);

            const awayOption = document.createElement('option');
            awayOption.value = team;
            awayOption.textContent = team;
            awayTeamSelect.appendChild(awayOption);
        });

        homeTeamSelect.disabled = false;
        awayTeamSelect.disabled = false;
    }

    // Thêm trận
    function addMatch() {
        const league = leagueSelect.value;
        const homeTeam = homeTeamSelect.value;
        const awayTeam = awayTeamSelect.value;
        const homeOdds = parseFloat(homeOddsInput.value);
        const drawOdds = parseFloat(drawOddsInput.value);
        const awayOdds = parseFloat(awayOddsInput.value);

        if (!league) {
            alert('Vui lòng chọn giải đấu');
            return;
        }

        if (!homeTeam) {
            alert('Vui lòng chọn đội chủ nhà');
            return;
        }

        if (!awayTeam) {
            alert('Vui lòng chọn đội khách');
            return;
        }

        if (homeTeam === awayTeam) {
            alert('Đội chủ nhà và đội khách không thể trùng nhau');
            return;
        }

        if (isNaN(homeOdds) || homeOdds < 1.01) {
            alert('Vui lòng nhập tỷ lệ chủ nhà thắng hợp lệ (lớn hơn 1.01)');
            return;
        }

        if (isNaN(drawOdds) || drawOdds < 1.01) {
            alert('Vui lòng nhập tỷ lệ hòa hợp lệ (lớn hơn 1.01)');
            return;
        }

        if (isNaN(awayOdds) || awayOdds < 1.01) {
            alert('Vui lòng nhập tỷ lệ khách thắng hợp lệ (lớn hơn 1.01)');
            return;
        }

        const match = {
            id: Date.now(),
            league_code: league,
            leagueName: LEAGUES[league],
            home_team: homeTeam,
            away_team: awayTeam,
            home_odds: homeOdds,
            draw_odds: drawOdds,
            away_odds: awayOdds
        };

        matches.push(match);
        updateMatchesUI();

        homeTeamSelect.value = '';
        awayTeamSelect.value = '';
        homeOddsInput.value = '';
        drawOddsInput.value = '';
        awayOddsInput.value = '';
    }

    function updateMatchesUI() {
        matchCountSpan.textContent = `(${matches.length})`;
        clearMatchesBtn.disabled = matches.length === 0;

        if (window.aiPredictionManager) {
            window.aiPredictionManager.updateMatchCount();
        }

        if (matches.length === 0) {
            matchesContainer.innerHTML = '<div class="empty-message"><i class="fas fa-futbol"></i><p>Chưa thêm trận nào</p></div>';
            return;
        }

        let html = '';
        matches.forEach((match, index) => {
            html += `
                <div class="match-card" data-match-id="${match.id}">
                    <div class="match-info">
                        <div class="teams">
                            <span class="home-team">${match.home_team}</span>
                            <span class="vs">VS</span>
                            <span class="away-team">${match.away_team}</span>
                        </div>
                        <div class="league">${match.leagueName}</div>
                    </div>

                    <div class="odds-info">
                        <div class="odds-group">
                            <span class="odds-label">1X2:</span>
                            <span class="odds-values">${match.home_odds.toFixed(2)} / ${match.draw_odds.toFixed(2)} / ${match.away_odds.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="match-actions">
                        <button class="remove-match-btn" onclick="removeMatch(${match.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        matchesContainer.innerHTML = html;
    }

    window.updateMatchesUI = updateMatchesUI;

    function removeMatch(matchId) {
        matches = matches.filter(match => match.id !== matchId);
        updateMatchesUI();

        if (matches.length === 0) {
            resultsSection.classList.add('hidden');
        }
    }

    function clearMatches() {
        matches = [];
        updateMatchesUI();
        resultsSection.classList.add('hidden');
    }

    function predictMatches() {
        if (matches.length === 0) return;

        setTimeout(() => {
            try {
                logUserPrediction(matches);

                const individual_predictions = [];
                for (const match of matches) {
                    const prediction = predictMatch(
                        match.league_code,
                        match.home_team,
                        match.away_team,
                        match.home_odds,
                        match.draw_odds,
                        match.away_odds
                    );
                    individual_predictions.push(prediction);
                }

                const all_combinations = generateParlays(individual_predictions);
                const best_parlay = all_combinations.length > 0 ? all_combinations[0] : null;

                displayIndividualResults(individual_predictions);
                renderBestParlay(best_parlay);
                renderAllParlays(all_combinations);

                resultsSection.classList.remove('hidden');
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                console.error('Lỗi khi dự đoán:', error);
                alert('Đã xảy ra lỗi trong quá trình dự đoán: ' + error.message);
            } finally {
            }
        }, 100);
    }

    function displayIndividualResults(predictions) {
        const container = document.getElementById('individual-results');
        container.innerHTML = '';

        predictions.forEach(prediction => {
            const homeWinPercentage = (prediction.home_win_prob * 100).toFixed(1);
            const drawPercentage = (prediction.draw_prob * 100).toFixed(1);
            const awayWinPercentage = (prediction.away_win_prob * 100).toFixed(1);

            const bestBet = prediction.best_bet;
            const bestEV = prediction.best_ev.toFixed(2);

            let bestBetText = '';
            if (bestBet === 'home') {
                bestBetText = `Chủ nhà thắng (${prediction.home_odds})`;
            } else if (bestBet === 'draw') {
                bestBetText = `Hòa (${prediction.draw_odds})`;
            } else {
                bestBetText = `Khách thắng (${prediction.away_odds})`;
            }

            let scoresHTML = '<div class="no-data">Chưa có dữ liệu</div>';
            if (prediction.most_likely_scores && prediction.most_likely_scores.length > 0) {
                scoresHTML = prediction.most_likely_scores.map(score =>
                    `<div class="prediction-item">${score[0]} (${(score[1] * 100).toFixed(1)}%)</div>`
                ).join('');
            }

            let htScoresHTML = '<div class="no-data">Chưa có dữ liệu</div>';
            if (prediction.most_likely_ht_scores && prediction.most_likely_ht_scores.length > 0) {
                htScoresHTML = prediction.most_likely_ht_scores.map(score =>
                    `<div class="prediction-item">${score[0]} (${(score[1] * 100).toFixed(1)}%)</div>`
                ).join('');
            }

            let htftHTML = '<div class="no-data">Chưa có dữ liệu</div>';
            if (prediction.most_likely_htft && prediction.most_likely_htft.length > 0) {
                htftHTML = prediction.most_likely_htft.map(htft => {
                    const [ht, ft] = htft[0].split('/');
                    const htText = ht === 'H' ? 'Chủ nhà thắng' : (ht === 'D' ? 'Hòa' : 'Khách thắng');
                    const ftText = ft === 'H' ? 'Chủ nhà thắng' : (ft === 'D' ? 'Hòa' : 'Khách thắng');
                    return `<div class="prediction-item">${htText}/${ftText} (${(htft[1] * 100).toFixed(1)}%)</div>`;
                }).join('');
            }

            let totalGoalsHTML = '<div class="no-data">Chưa có dữ liệu</div>';
            if (prediction.most_likely_total_goals && prediction.most_likely_total_goals.length > 0) {
                totalGoalsHTML = prediction.most_likely_total_goals.map(goals =>
                    `<div class="prediction-item">${goals[0]} (${(goals[1] * 100).toFixed(1)}%)</div>`
                ).join('');
            }

            const resultCard = document.createElement('div');
            resultCard.className = 'result-card';

            resultCard.innerHTML = `
                <div class="match-info">
                    <div class="league">${getLeagueName(prediction.league_code)}</div>
                    <div class="teams">${prediction.home_team} vs ${prediction.away_team}</div>
                </div>

                <div class="prediction-details">
                    <div class="probabilities">
                        <div class="prob-item">
                            <div class="prob-label">Chủ nhà</div>
                            <div class="prob-value">${homeWinPercentage}%</div>
                        </div>
                        <div class="prob-item">
                            <div class="prob-label">Hòa</div>
                            <div class="prob-value">${drawPercentage}%</div>
                        </div>
                        <div class="prob-item">
                            <div class="prob-label">Đội khách</div>
                            <div class="prob-value">${awayWinPercentage}%</div>
                        </div>
                    </div>

                    <div class="detailed-predictions">
                        <div class="detail-item">
                            <div class="detail-label">Tỷ số có khả năng cao:</div>
                            <div class="detail-value">${scoresHTML}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Tỷ số hiệp 1 có khả năng cao:</div>
                            <div class="detail-value">${htScoresHTML}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Hiệp 1/Cả trận có khả năng cao:</div>
                            <div class="detail-value">${htftHTML}</div>
                        </div>
                        <div class="detail-item">
                            <div class="detail-label">Tổng bàn có khả năng cao:</div>
                            <div class="detail-value">${totalGoalsHTML}</div>
                        </div>
                    </div>

                    <div class="best-bet">
                        <div class="bet-label">Lựa chọn tốt nhất:</div>
                        <div class="bet-value">${bestBetText} (EV: ${bestEV})</div>
                    </div>
                </div>
            `;

            container.appendChild(resultCard);
        });
    }

    function getLeagueName(leagueCode) {
        const leagueNames = {
            'PL': 'Ngoại hạng Anh',
            'PD': 'La Liga',
            'SA': 'Serie A',
            'BL1': 'Bundesliga',
            'FL1': 'Ligue 1'
        };

        return leagueNames[leagueCode] || leagueCode;
    }

    function renderBestParlay(parlay) {
        const container = document.getElementById('best-parlay-results');
        container.innerHTML = '';

        if (!parlay) {
            container.innerHTML = '<div class="empty-message">Không thể tạo tổ hợp</div>';
            return;
        }

        function formatResult(result) {
            if (result === 'home') return 'Chủ nhà thắng';
            if (result === 'draw') return 'Hòa';
            if (result === 'away') return 'Khách thắng';
            return result;
        }

        let selectionsHTML = '';
        parlay.selections.forEach(selection => {
            selectionsHTML += `
                <div class="selection-item">
                    <div class="selection-match">${selection.match}</div>
                    <div class="selection-pick">
                        <div class="pick-type">${formatResult(selection.pick)}</div>
                        <div class="pick-odds">${selection.odds.toFixed(2)}</div>
                    </div>
                </div>
            `;
        });

        const parlayElement = document.createElement('div');
        parlayElement.className = 'parlay-result best-parlay';

        parlayElement.innerHTML = `
            <div class="parlay-header">
                <h3>Tổ hợp tốt nhất</h3>
                <div class="parlay-odds">Tổng tỷ lệ: ${parlay.total_odds.toFixed(2)}</div>
            </div>
            <div class="parlay-stats">
                <div class="parlay-stat">
                    <div class="stat-value">${(parlay.total_prob * 100).toFixed(2)}%</div>
                    <div class="stat-label">Xác suất</div>
                </div>
                <div class="parlay-stat">
                    <div class="stat-value">${parlay.expected_value.toFixed(4)}</div>
                    <div class="stat-label">Giá trị kỳ vọng</div>
                </div>
                <div class="parlay-stat">
                    <div class="stat-value">${parlay.selections.length}</div>
                    <div class="stat-label">Số trận</div>
                </div>
            </div>
            <div class="parlay-selections">
                ${selectionsHTML}
            </div>
        `;

        container.appendChild(parlayElement);
    }

    function renderAllParlays(parlays) {
        const container = document.getElementById('all-parlays-results');
        container.innerHTML = '';

        if (!parlays || parlays.length === 0) {
            container.innerHTML = '<div class="empty-message">Không thể tạo tổ hợp</div>';
            return;
        }

        const displayParlays = parlays.slice(1, 11);

        if (displayParlays.length === 0) {
            container.innerHTML = '<div class="empty-message">Không còn tổ hợp khác</div>';
            return;
        }

        function formatResult(result) {
            if (result === 'home') return 'Chủ nhà thắng';
            if (result === 'draw') return 'Hòa';
            if (result === 'away') return 'Khách thắng';
            return result;
        }

        for (let i = 0; i < displayParlays.length; i++) {
            const parlay = displayParlays[i];

            let selectionsHTML = '';
            parlay.selections.forEach(selection => {
                selectionsHTML += `
                    <div class="selection-item">
                        <div class="selection-match">${selection.match}</div>
                        <div class="selection-pick">
                            <div class="pick-type">${formatResult(selection.pick)}</div>
                            <div class="pick-odds">${selection.odds.toFixed(2)}</div>
                        </div>
                    </div>
                `;
            });

            const parlayElement = document.createElement('div');
            parlayElement.className = 'parlay-result';

            parlayElement.innerHTML = `
                <div class="parlay-header">
                    <h3>Tổ hợp #${i + 2}</h3>
                    <div class="parlay-odds">Tổng tỷ lệ: ${parlay.total_odds.toFixed(2)}</div>
                </div>
                <div class="parlay-stats">
                    <div class="parlay-stat">
                        <div class="stat-value">${(parlay.total_prob * 100).toFixed(2)}%</div>
                        <div class="stat-label">Xác suất</div>
                    </div>
                    <div class="parlay-stat">
                        <div class="stat-value">${parlay.expected_value.toFixed(4)}</div>
                        <div class="stat-label">Giá trị kỳ vọng</div>
                    </div>
                    <div class="parlay-stat">
                        <div class="stat-value">${parlay.selections.length}</div>
                        <div class="stat-label">Số trận</div>
                    </div>
                </div>
                <div class="parlay-selections">
                    ${selectionsHTML}
                </div>
            `;

            container.appendChild(parlayElement);
        }
    }

    function showChampionsLeagueSection() {
        const sections = document.querySelectorAll('main > section');
        sections.forEach(section => {
            section.classList.add('hidden');
        });

        if (championsLeagueSection) {
            championsLeagueSection.classList.remove('hidden');
        }
    }

    init();

    window.removeMatch = removeMatch;
    window.clearMatches = clearMatches;
});

// Bảo đảm các nút điều hướng hoạt động sau khi DOM tải xong
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM đã tải xong, bắt đầu gắn sự kiện điều hướng');

    setTimeout(function() {
        const navButtons = document.querySelectorAll('.nav-btn');
        console.log('Kiểm tra lại số nút điều hướng:', navButtons.length);

        navButtons.forEach(btn => {
            btn.removeEventListener('click', handleNavClick);
            btn.addEventListener('click', handleNavClick);
        });
    }, 100);
});

function handleNavClick(e) {
    e.preventDefault();
    e.stopPropagation();

    console.log('Đã nhấn nút điều hướng:', this.id);
    const mode = this.getAttribute('data-mode');
    console.log('Chuyển sang chế độ:', mode);

    if (mode) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');

        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });

        const targetSection = document.getElementById(mode + '-mode');
        if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log('Đã chuyển sang chế độ:', mode);
        }

        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }
    }
}
