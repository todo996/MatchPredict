/**
 * Mô-đun xử lý dữ liệu Xổ số Thể thao Trung Quốc
 */

class LotteryManager {
    constructor() {
        this.matches = [];
        this.selectedMatches = new Set();
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Nút làm mới dữ liệu trận đấu
        const refreshBtn = document.getElementById('refresh-lottery-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refreshMatches());
        }

        // Bộ lọc số ngày
        const daysFilter = document.getElementById('days-filter');
        if (daysFilter) {
            daysFilter.addEventListener('change', (e) => {
                this.refreshMatches(parseInt(e.target.value));
            });
        }
    }

    async refreshMatches(days = 3) {
        const refreshBtn = document.getElementById('refresh-lottery-btn');
        const container = document.getElementById('lottery-matches');

        try {
            // Hiển thị trạng thái tải
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spin fa-spinner"></i> Đang lấy dữ liệu...';
            }

            container.innerHTML = '<div class="loading-message"><i class="fas fa-spin fa-spinner"></i> Đang lấy dữ liệu trận đấu mới nhất...</div>';

            // Gọi API lấy dữ liệu trận đấu
            const response = await fetch(`/api/lottery/matches?days=${days}`);
            const data = await response.json();

            if (data.success) {
                this.matches = data.matches;
                this.renderMatches();
                this.showMessage(`Đã lấy thành công ${data.count} trận`, 'success');
            } else {
                throw new Error(data.message || 'Không thể lấy dữ liệu trận đấu');
            }

        } catch (error) {
            console.error('Không thể lấy dữ liệu xổ số thể thao:', error);
            container.innerHTML = '<div class="error-message">Không thể lấy dữ liệu trận đấu, vui lòng thử lại sau</div>';
            this.showMessage('Không thể lấy dữ liệu: ' + error.message, 'error');
        } finally {
            // Khôi phục trạng thái nút
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Làm mới dữ liệu trận đấu';
            }
        }
    }

    renderMatches() {
        const container = document.getElementById('lottery-matches');

        if (!this.matches || this.matches.length === 0) {
            container.innerHTML = '<div class="empty-message">Chưa có dữ liệu trận đấu</div>';
            return;
        }

        // Nhóm theo giải đấu
        const matchesByLeague = this.groupMatchesByLeague(this.matches);

        let html = '';
        for (const [leagueName, matches] of Object.entries(matchesByLeague)) {
            html += this.renderLeagueSection(leagueName, matches);
        }

        container.innerHTML = html;

        // Gắn sự kiện
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

    renderLeagueSection(leagueName, matches) {
        let html = `
            <div class="league-section">
                <h3 class="league-title">
                    <i class="fas fa-futbol"></i> ${leagueName}
                    <span class="match-count">(${matches.length} trận)</span>
                </h3>
                <div class="league-matches">
        `;

        matches.forEach(match => {
            html += this.renderMatchCard(match);
        });

        html += `
                </div>
            </div>
        `;

        return html;
    }

    renderMatchCard(match) {
        const isSelected = this.selectedMatches.has(match.match_id);
        const matchTime = this.formatMatchTime(match.match_time, match.match_date);

        // Lấy thông tin tỷ lệ cược
        const odds = match.odds || {};
        const hhadOdds = odds.hhad || {};

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
        const hhadOdds = odds.hhad || {};
        const scoreOdds = odds.score || {};
        const goalOdds = odds.goal || {};
        const halfFullOdds = odds.half_full || {};

        let html = '<div class="odds-section">';

        // Tỷ lệ 1X2
        if (hhadOdds.h || hhadOdds.d || hhadOdds.a) {
            html += `
                <div class="odds-group">
                    <div class="odds-title">1X2</div>
                    <div class="odds-values">
                        <span class="odds-item">Chủ nhà: ${hhadOdds.h || 'N/A'}</span>
                        <span class="odds-item">Hòa: ${hhadOdds.d || 'N/A'}</span>
                        <span class="odds-item">Đội khách: ${hhadOdds.a || 'N/A'}</span>
                    </div>
                </div>
            `;
        }

        // Nếu có các loại tỷ lệ khác thì hiển thị thêm
        if (Object.keys(scoreOdds).length > 0) {
            html += `
                <div class="odds-group">
                    <div class="odds-title">Tỷ số</div>
                    <div class="odds-note">Có ${Object.keys(scoreOdds).length} lựa chọn</div>
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
            'CANCELLED': 'Đã hủy'
        };
        return statusMap[status] || 'Chưa xác định';
    }

    bindMatchEvents() {
        // Nút chọn trận
        document.querySelectorAll('.select-match-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const matchId = btn.getAttribute('data-match-id');
                this.toggleMatchSelection(matchId);
            });
        });

        // Có thể chọn trận bằng cách nhấn vào thẻ
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

        // Cập nhật hiển thị
        this.updateMatchCardSelection(matchId);
        this.updateSelectionInfo();
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

        // Cập nhật trạng thái nút
        const predictBtn = document.getElementById('ai-predict-btn');
        if (predictBtn) {
            if (count > 0) {
                predictBtn.disabled = false;
                predictBtn.innerHTML = `<i class="fas fa-brain"></i> Dự đoán AI ${count} trận đã chọn`;
            } else {
                predictBtn.disabled = true;
                predictBtn.innerHTML = '<i class="fas fa-brain"></i> Dự đoán AI thông minh';
            }
        }

        // Cập nhật số trận
        const matchCount = document.getElementById('match-count');
        if (matchCount) {
            matchCount.textContent = `(${count})`;
        }
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
    }

    showMessage(message, type = 'info') {
        // Thông báo đơn giản
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }
}

// Biến toàn cục
let lotteryManager = null;

// Khởi tạo
document.addEventListener('DOMContentLoaded', function() {
    lotteryManager = new LotteryManager();
});

// Xuất cho các mô-đun khác sử dụng
window.LotteryManager = LotteryManager;
