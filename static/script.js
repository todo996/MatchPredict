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

    // Ánh xạ tên giải đấu
    const leagueNames = {
        'PL': 'Ngoại hạng Anh',
        'PD': 'La Liga',
        'SA': 'Serie A',
        'BL1': 'Bundesliga',
        'FL1': 'Ligue 1'
    };

    // Lưu danh sách trận đã thêm
    let matches = [];

    // Lưu danh sách đội theo từng giải
    let teams = {};

    // Khởi tạo
    function init() {
        // Tải dữ liệu đội bóng của tất cả giải
        fetchTeams();

        // Trình lắng nghe sự kiện
        leagueSelect.addEventListener('change', handleLeagueChange);
        addMatchBtn.addEventListener('click', addMatch);
        clearMatchesBtn.addEventListener('click', clearMatches);
        predictBtn.addEventListener('click', predictMatches);

        // Chuyển tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                this.classList.add('active');
                const tabId = this.getAttribute('data-tab') + '-tab';
                document.getElementById(tabId).classList.add('active');
            });
        });
    }

    // Lấy dữ liệu đội bóng của các giải
    async function fetchTeams() {
        try {
            const response = await fetch('/api/teams');
            const data = await response.json();

            if (data.success) {
                teams = data.teams;
                console.log('Đã tải dữ liệu đội bóng');
            } else {
                console.error('Tải dữ liệu đội bóng thất bại:', data.message);
                alert('Không thể tải dữ liệu đội bóng, vui lòng tải lại trang');
            }
        } catch (error) {
            console.error('Lỗi khi tải dữ liệu đội bóng:', error);
            alert('Đã xảy ra lỗi khi tải dữ liệu đội bóng, vui lòng tải lại trang');
        }
    }

    // Xử lý khi đổi giải đấu
    function handleLeagueChange() {
        const selectedLeague = leagueSelect.value;

        homeTeamSelect.innerHTML = '<option value="">Chọn đội chủ nhà</option>';
        awayTeamSelect.innerHTML = '<option value="">Chọn đội khách</option>';

        if (!selectedLeague) {
            homeTeamSelect.disabled = true;
            awayTeamSelect.disabled = true;
            return;
        }

        if (teams[selectedLeague]) {
            populateTeamSelects(teams[selectedLeague]);
        } else {
            fetchLeagueTeams(selectedLeague);
        }
    }

    // Lấy danh sách đội của một giải cụ thể
    async function fetchLeagueTeams(leagueCode) {
        try {
            const response = await fetch(`/api/teams/${leagueCode}`);
            const data = await response.json();

            if (data.success) {
                teams[leagueCode] = data.teams;
                populateTeamSelects(data.teams);
            } else {
                console.error(`Không thể tải dữ liệu đội của ${leagueNames[leagueCode]}:`, data.message);
                alert(`Không thể tải dữ liệu đội của ${leagueNames[leagueCode]}, vui lòng thử lại`);
            }
        } catch (error) {
            console.error(`Lỗi khi tải dữ liệu đội của ${leagueNames[leagueCode]}:`, error);
            alert(`Lỗi khi tải dữ liệu đội của ${leagueNames[leagueCode]}, vui lòng thử lại`);
        }
    }

    // Điền danh sách đội vào ô chọn
    function populateTeamSelects(teamsList) {
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

    // Thêm trận đấu
    function addMatch() {
        const league = leagueSelect.value;
        const homeTeam = homeTeamSelect.value;
        const awayTeam = awayTeamSelect.value;
        const homeOdds = parseFloat(homeOddsInput.value);
        const drawOdds = parseFloat(drawOddsInput.value);
        const awayOdds = parseFloat(awayOddsInput.value);

        // Kiểm tra dữ liệu đầu vào
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
            id: Date.now(), // Dùng timestamp làm ID duy nhất
            league,
            leagueName: leagueNames[league],
            homeTeam,
            awayTeam,
            homeOdds,
            drawOdds,
            awayOdds
        };

        matches.push(match);

        renderMatches();
        updateMatchCount();

        clearMatchesBtn.disabled = false;
        predictBtn.disabled = false;

        // Đặt lại biểu mẫu
        leagueSelect.selectedIndex = 0;
        homeTeamSelect.innerHTML = '<option value="">Hãy chọn giải đấu trước</option>';
        awayTeamSelect.innerHTML = '<option value="">Hãy chọn giải đấu trước</option>';
        homeTeamSelect.disabled = true;
        awayTeamSelect.disabled = true;
        homeOddsInput.value = '';
        drawOddsInput.value = '';
        awayOddsInput.value = '';
    }

    // Hiển thị các trận đã thêm
    function renderMatches() {
        if (matches.length === 0) {
            matchesContainer.innerHTML = '<p class="empty-message">Chưa thêm trận nào</p>';
            return;
        }

        matchesContainer.innerHTML = '';

        matches.forEach(match => {
            const matchCard = document.createElement('div');
            matchCard.className = 'match-card';
            matchCard.innerHTML = `
                <div class="match-header">
                    <span class="league-name">${match.leagueName}</span>
                    <button class="remove-match" data-id="${match.id}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="match-teams">
                    <div class="team home-team">${match.homeTeam}</div>
                    <div class="vs">VS</div>
                    <div class="team away-team">${match.awayTeam}</div>
                </div>
                <div class="match-odds">
                    <div class="odd-item">
                        <div class="odd-value">${match.homeOdds.toFixed(2)}</div>
                        <div class="odd-label">Chủ nhà thắng</div>
                    </div>
                    <div class="odd-item">
                        <div class="odd-value">${match.drawOdds.toFixed(2)}</div>
                        <div class="odd-label">Hòa</div>
                    </div>
                    <div class="odd-item">
                        <div class="odd-value">${match.awayOdds.toFixed(2)}</div>
                        <div class="odd-label">Khách thắng</div>
                    </div>
                </div>
            `;

            matchesContainer.appendChild(matchCard);
        });

        // Gắn sự kiện xóa trận
        document.querySelectorAll('.remove-match').forEach(btn => {
            btn.addEventListener('click', function() {
                const matchId = parseInt(this.getAttribute('data-id'));
                removeMatch(matchId);
            });
        });
    }

    // Cập nhật số trận
    function updateMatchCount() {
        matchCountSpan.textContent = `(${matches.length})`;
    }

    // Xóa một trận
    function removeMatch(matchId) {
        matches = matches.filter(match => match.id !== matchId);
        renderMatches();
        updateMatchCount();

        clearMatchesBtn.disabled = matches.length === 0;
        predictBtn.disabled = matches.length < 1;
    }

    // Xóa tất cả trận
    function clearMatches() {
        if (confirm('Bạn có chắc muốn xóa toàn bộ các trận đã thêm không?')) {
            matches = [];
            renderMatches();
            updateMatchCount();

            clearMatchesBtn.disabled = true;
            predictBtn.disabled = true;

            resultsSection.classList.add('hidden');
        }
    }

    // Dự đoán trận đấu
    async function predictMatches() {
        if (matches.length === 0) {
            alert('Hãy thêm ít nhất một trận đấu');
            return;
        }

        try {
            loadingOverlay.classList.remove('hidden');

            const requestData = {
                matches: matches.map(match => ({
                    league_code: match.league,
                    home_team: match.homeTeam,
                    away_team: match.awayTeam,
                    home_odds: match.homeOdds,
                    draw_odds: match.drawOdds,
                    away_odds: match.awayOdds
                }))
            };

            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (result.success) {
                resultsSection.classList.remove('hidden');

                renderIndividualPredictions(result.individual_predictions);
                renderBestParlay(result.best_parlay);
                renderAllParlays(result.all_combinations);

                resultsSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                alert(`Dự đoán thất bại: ${result.message}`);
            }
        } catch (error) {
            console.error('Lỗi dự đoán:', error);
            alert('Đã xảy ra lỗi trong quá trình dự đoán, vui lòng thử lại');
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }

    // Hiển thị dự đoán từng trận
    function renderIndividualPredictions(predictions) {
        const container = document.getElementById('individual-results');
        container.innerHTML = '';

        predictions.forEach((pred, index) => {
            function formatResult(result) {
                if (result === 'home') return 'Chủ nhà thắng';
                if (result === 'draw') return 'Hòa';
                if (result === 'away') return 'Khách thắng';
                return result;
            }

            let betsHTML = '';
            pred.all_bets.forEach(([result, ev, odds, prob]) => {
                const resultName = formatResult(result);
                const evClass = ev > 0 ? 'positive-ev' : 'negative-ev';

                betsHTML += `
                    <div class="bet-option ${result === pred.best_bet ? 'best-bet' : ''}">
                        <div class="bet-name">${resultName}</div>
                        <div class="bet-details">
                            <span class="bet-odds">Tỷ lệ: ${odds.toFixed(2)}</span>
                            <span class="bet-prob">Xác suất: ${(prob * 100).toFixed(1)}%</span>
                            <span class="bet-ev ${evClass}">Giá trị kỳ vọng: ${ev.toFixed(4)}</span>
                        </div>
                    </div>
                `;
            });

            const card = document.createElement('div');
            card.className = 'prediction-card';

            card.innerHTML = `
                <div class="prediction-header">
                    <h3>${pred.home_team} vs ${pred.away_team}</h3>
                    <div class="match-number">Trận #${index + 1}</div>
                </div>
                <div class="prediction-content">
                    <div class="probabilities">
                        <div class="prob-item">
                            <div class="prob-value">${(pred.home_win_prob * 100).toFixed(1)}%</div>
                            <div class="prob-label">Chủ nhà thắng</div>
                        </div>
                        <div class="prob-item">
                            <div class="prob-value">${(pred.draw_prob * 100).toFixed(1)}%</div>
                            <div class="prob-label">Hòa</div>
                        </div>
                        <div class="prob-item">
                            <div class="prob-value">${(pred.away_win_prob * 100).toFixed(1)}%</div>
                            <div class="prob-label">Khách thắng</div>
                        </div>
                    </div>
                    <div class="betting-options">
                        <h4>Các lựa chọn</h4>
                        ${betsHTML}
                    </div>
                    <div class="best-prediction">
                        <div class="best-label">Lựa chọn tốt nhất</div>
                        <div class="best-value">${formatResult(pred.best_bet)}</div>
                        <div class="best-ev">Giá trị kỳ vọng: ${pred.best_ev.toFixed(4)}</div>
                    </div>
                </div>
            `;

            container.appendChild(card);
        });
    }

    // Hiển thị tổ hợp tốt nhất
    function renderBestParlay(parlay) {
        const container = document.getElementById('best-parlay-result');

        function formatResult(result) {
            if (result === 'home') return 'Chủ nhà thắng';
            if (result === 'draw') return 'Hòa';
            if (result === 'away') return 'Khách thắng';
            return result;
        }

        let selectionsHTML = '';
        parlay.selections.forEach((sel, index) => {
            selectionsHTML += `
                <div class="selection-item">
                    <div class="selection-match">${sel.match}</div>
                    <div class="selection-pick">
                        <span class="pick-type">${formatResult(sel.pick)}</span>
                        <span class="pick-odds">@${sel.odds.toFixed(2)}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
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
    }

    // Hiển thị các tổ hợp khác
    function renderAllParlays(combinations) {
        const container = document.getElementById('all-parlays-results');
        container.innerHTML = '';

        // Bỏ tổ hợp đầu vì đã hiển thị ở tab tốt nhất
        for (let i = 1; i < Math.min(combinations.length, 5); i++) {
            const parlay = combinations[i];

            function formatResult(result) {
                if (result === 'home') return 'Chủ nhà thắng';
                if (result === 'draw') return 'Hòa';
                if (result === 'away') return 'Khách thắng';
                return result;
            }

            let selectionsHTML = '';
            parlay.selections.forEach((sel, index) => {
                selectionsHTML += `
                    <div class="selection-item">
                        <div class="selection-match">${sel.match}</div>
                        <div class="selection-pick">
                            <span class="pick-type">${formatResult(sel.pick)}</span>
                            <span class="pick-odds">@${sel.odds.toFixed(2)}</span>
                        </div>
                    </div>
                `;
            });

            const parlayElement = document.createElement('div');
            parlayElement.className = 'parlay-result';
            parlayElement.innerHTML = `
                <div class="parlay-header">
                    <h3>Tổ hợp #${i + 1}</h3>
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

    init();
});
