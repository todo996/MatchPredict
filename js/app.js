document.addEventListener('DOMContentLoaded', function() {
    // Biến toàn cục
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

    // Lưu các trận đã thêm
    let matches = [];

    // Hàm khởi tạo
    function init() {
        // Nạp dữ liệu đội bóng của tất cả giải
        loadAllLeaguesData();

        // Trình lắng nghe sự kiện
        leagueSelect.addEventListener('change', handleLeagueChange);
        addMatchBtn.addEventListener('click', addMatch);
        clearMatchesBtn.addEventListener('click', clearMatches);
        predictBtn.addEventListener('click', predictMatches);

        // Chuyển tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                // Xóa trạng thái đang hoạt động của tất cả tab
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                // Đặt trạng thái đang hoạt động cho tab hiện tại
                this.classList.add('active');
                const tabId = this.getAttribute('data-tab') + '-tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    // Xử lý thay đổi lựa chọn giải đấu
    function handleLeagueChange() {
        const leagueCode = leagueSelect.value;

        // Đặt lại lựa chọn đội bóng
        homeTeamSelect.innerHTML = '<option value="">Chọn đội chủ nhà</option>';
        awayTeamSelect.innerHTML = '<option value="">Chọn đội khách</option>';

        if (!leagueCode) {
            homeTeamSelect.disabled = true;
            awayTeamSelect.disabled = true;
            return;
        }

        // Nếu dữ liệu đã nạp, điền danh sách đội
        if (featuresData[leagueCode]) {
            populateTeamSelects(leagueCode, Object.keys(featuresData[leagueCode]));
        } else {
            // Nếu chưa thì nạp dữ liệu
            loadLeagueData(leagueCode)
                .then(() => {
                    loadingOverlay.classList.add('hidden');
                })
                .catch(error => {
                    alert(`Nạp dữ liệu ${LEAGUES[leagueCode]} thất bại: ${error.message}`);
                });
        }
    }

    // Điền danh sách đội bóng
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

        // Kiểm tra đầu vào
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

        // Tạo đối tượng trận đấu
        const match = {
            id: Date.now(), // Dùng timestamp làm ID duy nhất
            league_code: league,
            leagueName: LEAGUES[league],
            home_team: homeTeam,
            away_team: awayTeam,
            home_odds: homeOdds,
            draw_odds: drawOdds,
            away_odds: awayOdds
        };

        // Thêm vào danh sách trận
        matches.push(match);

        // Cập nhật giao diện
        updateMatchesUI();

        // Đặt lại biểu mẫu
        homeTeamSelect.value = '';
        awayTeamSelect.value = '';
        homeOddsInput.value = '';
        drawOddsInput.value = '';
        awayOddsInput.value = '';
    }

    // Cập nhật giao diện danh sách trận
    function updateMatchesUI() {
        // Cập nhật số trận
        matchCountSpan.textContent = `(${matches.length})`;

        // Cập nhật trạng thái nút
        clearMatchesBtn.disabled = matches.length === 0;
        predictBtn.disabled = matches.length === 0;

        // Cập nhật danh sách trận
        if (matches.length === 0) {
            matchesContainer.innerHTML = '<div class="empty-message">Chưa thêm trận nào</div>';
            return;
        }

        matchesContainer.innerHTML = '';

        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <div class="match-header">
                    <div class="match-teams">${match.home_team} vs ${match.away_team}</div>
                    <div class="match-league">${match.leagueName}</div>
                </div>
                <div class="match-odds">
                    <div class="odds-item">
                        <div class="odds-label">Chủ nhà</div>
                        <div class="odds-value">${match.home_odds.toFixed(2)}</div>
                    </div>
                    <div class="odds-item">
                        <div class="odds-label">Hòa</div>
                        <div class="odds-value">${match.draw_odds.toFixed(2)}</div>
                    </div>
                    <div class="odds-item">
                        <div class="odds-label">Đội khách</div>
                        <div class="odds-value">${match.away_odds.toFixed(2)}</div>
                    </div>
                </div>
                <button class="remove-match" data-id="${match.id}">
                    <i class="fas fa-times"></i>
                </button>
            `;

            matchesContainer.appendChild(matchCard);
        });

        // Gắn sự kiện cho nút xóa
        document.querySelectorAll('.remove-match').forEach(btn => {
            btn.addEventListener('click', function() {
                const matchId = parseInt(this.getAttribute('data-id'));
                removeMatch(matchId);
            });
        });
    }

    // Xóa trận
    function removeMatch(matchId) {
        matches = matches.filter(match => match.id !== matchId);
        updateMatchesUI();

        // Nếu đã xóa hết trận, ẩn khu vực kết quả
        if (matches.length === 0) {
            resultsSection.classList.add('hidden');
        }
    }

    // Xóa toàn bộ trận
    function clearMatches() {
        matches = [];
        updateMatchesUI();
        resultsSection.classList.add('hidden');
    }

    // Dự đoán trận
    function predictMatches() {
        if (matches.length === 0) return;

        // Dùng setTimeout để mô phỏng thao tác bất đồng bộ và cho giao diện thời gian cập nhật
        setTimeout(() => {
            try {
                // Ghi lại dữ liệu người dùng nhập
                logUserPrediction(matches);

                // Xử lý từng trận
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

                // Tạo tất cả tổ hợp nhiều trận có thể có
                const all_combinations = generateParlays(individual_predictions);

                // Tổ hợp tốt nhất
                const best_parlay = all_combinations.length > 0 ? all_combinations[0] : null;

                // Hiển thị kết quả
                displayIndividualResults(individual_predictions);
                renderBestParlay(best_parlay);
                renderAllParlays(all_combinations);

                // Hiển thị khu vực kết quả
                resultsSection.classList.remove('hidden');

                // Cuộn đến khu vực kết quả
                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } catch (error) {
                console.error('Lỗi dự đoán:', error);
                alert('Đã xảy ra lỗi trong quá trình dự đoán: ' + error.message);
            } finally {
            }
        }, 100);
    }

    // Hiển thị kết quả dự đoán từng trận
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

            // Định dạng các tỷ số có khả năng cao nhất (3 tỷ số đầu)
            let scoresHTML = '<div class="no-data">Chưa có dữ liệu</div>';
            if (prediction.most_likely_scores && prediction.most_likely_scores.length > 0) {
                scoresHTML = prediction.most_likely_scores.map(score =>
                    `<div class="prediction-item">${score[0]} (${(score[1] * 100).toFixed(1)}%)</div>`
                ).join('');
            }

            // Định dạng các tỷ số hiệp 1 có khả năng cao nhất (3 tỷ số đầu)
            let htScoresHTML = '<div class="no-data">Chưa có dữ liệu</div>';
            if (prediction.most_likely_ht_scores && prediction.most_likely_ht_scores.length > 0) {
                htScoresHTML = prediction.most_likely_ht_scores.map(score =>
                    `<div class="prediction-item">${score[0]} (${(score[1] * 100).toFixed(1)}%)</div>`
                ).join('');
            }

            // Định dạng kết quả hiệp 1/cả trận có khả năng cao nhất (3 kết quả đầu)
            let htftHTML = '<div class="no-data">Chưa có dữ liệu</div>';
            if (prediction.most_likely_htft && prediction.most_likely_htft.length > 0) {
                htftHTML = prediction.most_likely_htft.map(htft => {
                    // Chỉ đổi nhãn hiển thị; giữ nguyên mã H/D/A dùng trong logic
                    const [ht, ft] = htft[0].split('/');
                    const htText = ht === 'H' ? 'Chủ nhà thắng' : (ht === 'D' ? 'Hòa' : 'Khách thắng');
                    const ftText = ft === 'H' ? 'Chủ nhà thắng' : (ft === 'D' ? 'Hòa' : 'Khách thắng');
                    return `<div class="prediction-item">${htText}/${ftText} (${(htft[1] * 100).toFixed(1)}%)</div>`;
                }).join('');
            }

            // Định dạng tổng số bàn có khả năng cao nhất (3 kết quả đầu)
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
                        <div class="bet-value">${bestBetText} (Giá trị kỳ vọng: ${bestEV})</div>
                    </div>
                </div>
            `;

            container.appendChild(resultCard);
        });
    }

    // Hàm hỗ trợ: lấy tên giải đấu
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

    // Hiển thị tổ hợp tốt nhất
    function renderBestParlay(parlay) {
        const container = document.getElementById('best-parlay-results');
        container.innerHTML = '';

        if (!parlay) {
            container.innerHTML = '<div class="empty-message">Không thể tạo tổ hợp</div>';
            return;
        }

        // Định dạng tên kết quả
        function formatResult(result) {
            if (result === 'home') return 'Chủ nhà thắng';
            if (result === 'draw') return 'Hòa';
            if (result === 'away') return 'Khách thắng';
            return result;
        }

        // Tạo HTML cho các lựa chọn
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

    // Hiển thị tất cả tổ hợp
    function renderAllParlays(parlays) {
        const container = document.getElementById('all-parlays-results');
        container.innerHTML = '';

        if (!parlays || parlays.length === 0) {
            container.innerHTML = '<div class="empty-message">Không thể tạo tổ hợp</div>';
            return;
        }

        // Chỉ hiển thị 10 tổ hợp đầu sau tổ hợp tốt nhất
        const displayParlays = parlays.slice(1, 11);

        if (displayParlays.length === 0) {
            container.innerHTML = '<div class="empty-message">Không còn tổ hợp khác</div>';
            return;
        }

        // Định dạng tên kết quả
        function formatResult(result) {
            if (result === 'home') return 'Chủ nhà thắng';
            if (result === 'draw') return 'Hòa';
            if (result === 'away') return 'Khách thắng';
            return result;
        }

        for (let i = 0; i < displayParlays.length; i++) {
            const parlay = displayParlays[i];

            // Tạo HTML cho các lựa chọn
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

    // Gọi hàm khởi tạo
    init();
});
