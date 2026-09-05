/**
 * Điều hướng ổn định + nạp dữ liệu trực tiếp.
 *
 * Mục tiêu:
 * - Chuyển Cổ điển/Xổ số/AI không được tự xóa danh sách người dùng.
 * - Xổ số tự lấy dữ liệu mới nhất khi mở lần đầu.
 * - Nút "Cập nhật dữ liệu" thực sự gọi nguồn live thay vì chỉ hiện hướng dẫn.
 * - Nếu nguồn live tạm lỗi thì thử cache SQLite/PostgreSQL hiện có.
 */

(function () {
    'use strict';

    function showSection(mode) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-btn[data-mode="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });

        const target = document.getElementById(`${mode}-mode`);
        if (target) {
            target.classList.remove('hidden');
        } else {
            console.error('Không tìm thấy khu vực chế độ:', mode);
            return;
        }

        // Chỉ ẩn kết quả cũ; KHÔNG xóa danh sách đã chọn.
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.classList.add('hidden');

        if (window.aiPredictionManager) {
            // Hàm này chỉ đổi UI/kết quả AI, không xóa aiMatches.
            window.aiPredictionManager.switchMode(mode);
        }

        if (mode === 'classic' && typeof window.updateClassicMatchesDisplay === 'function') {
            window.updateClassicMatchesDisplay();
        }

        if (mode === 'ai' && window.aiPredictionManager) {
            window.aiPredictionManager.renderAIMatches();
            window.aiPredictionManager.updateMatchCount();
        }

        if (mode === 'lottery' && window.lotteryManager) {
            const manager = window.lotteryManager;
            manager.renderMatches();
            manager.updateSelectedMatchesDisplay();

            const now = Date.now();
            const stale = !manager._lastLiveRefresh || (now - manager._lastLiveRefresh > 5 * 60 * 1000);
            if (!manager.matches.length || stale) {
                const daysSelect = document.getElementById('days-filter');
                const days = daysSelect ? parseInt(daysSelect.value, 10) || 3 : 3;
                manager.refreshMatches(days);
            }
        }

        console.log('Đã chuyển chế độ, giữ nguyên danh sách:', mode);
    }

    // Chặn handler cũ của app.js ở pha capture trước khi sự kiện tới nút.
    // Handler cũ gọi clearAllDataAndResults(), chính là nguyên nhân xóa danh sách.
    document.addEventListener('click', function (event) {
        const navBtn = event.target.closest && event.target.closest('.nav-btn[data-mode]');
        if (navBtn) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            showSection(navBtn.getAttribute('data-mode'));
            return;
        }

        const forceRefreshBtn = event.target.closest && event.target.closest('#force-refresh-lottery-btn');
        if (forceRefreshBtn && window.lotteryManager) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            const daysSelect = document.getElementById('days-filter');
            const days = daysSelect ? parseInt(daysSelect.value, 10) || 3 : 3;
            window.lotteryManager.refreshMatches(days, true);
        }
    }, true);

    function patchLotteryRefresh() {
        if (!window.LotteryManager || window.LotteryManager.prototype.__liveRefreshPatched) return;

        window.LotteryManager.prototype.refreshMatches = async function (days = 3, force = false) {
            const container = document.getElementById('lottery-matches');
            const refreshBtn = document.getElementById('refresh-lottery-btn');
            const forceRefreshBtn = document.getElementById('force-refresh-lottery-btn');
            days = Math.min(Math.max(parseInt(days, 10) || 3, 1), 7);

            if (!container) return;

            container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Đang cập nhật dữ liệu trận đấu mới nhất...</div>';
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
            }
            if (forceRefreshBtn) forceRefreshBtn.disabled = true;

            let data = null;
            let source = 'live';
            let liveError = null;

            try {
                // Endpoint này gọi ChinaSportsLotterySpider và nguồn live tự cache vào DB đang chọn.
                const liveResponse = await fetch('/api/lottery/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ days })
                });
                const liveText = await liveResponse.text();
                let liveData = null;
                try {
                    liveData = liveText ? JSON.parse(liveText) : null;
                } catch (_) {
                    throw new Error('Nguồn trực tiếp trả về dữ liệu không hợp lệ');
                }

                if (!liveResponse.ok || !liveData || !liveData.success || !Array.isArray(liveData.matches)) {
                    throw new Error((liveData && (liveData.message || liveData.error)) || `HTTP ${liveResponse.status}`);
                }
                data = liveData;
                this._lastLiveRefresh = Date.now();
            } catch (error) {
                liveError = error;
                console.warn('Nguồn live tạm thời không khả dụng:', error);

                // Khi live lỗi vẫn cho người dùng xem cache thật đã lưu trước đó.
                try {
                    const cachedResponse = await fetch(`/api/lottery/matches?days=${days}`);
                    const cachedData = await cachedResponse.json();
                    if (cachedResponse.ok && cachedData.success && Array.isArray(cachedData.matches)) {
                        data = cachedData;
                        source = 'cache';
                    }
                } catch (cacheError) {
                    console.warn('Cache database cũng không khả dụng:', cacheError);
                }
            }

            try {
                if (!data || !Array.isArray(data.matches) || data.matches.length === 0) {
                    throw new Error(liveError ? liveError.message : 'Không có dữ liệu trận đấu');
                }

                this.matches = data.matches;

                // Giữ lựa chọn cũ nếu trận vẫn còn trong danh sách mới.
                const validIds = new Set(this.matches.map(match => String(match.match_id)));
                this.selectedMatches = new Set(
                    Array.from(this.selectedMatches).filter(id => validIds.has(String(id)))
                );

                this.renderMatches();
                this.updateSelectedMatchesDisplay();
                this.updateSelectionInfo();

                if (source === 'live') {
                    this.showMessage(`✅ Đã cập nhật ${this.matches.length} trận từ nguồn trực tiếp`, 'success');
                } else {
                    this.showMessage(`⚠️ Nguồn trực tiếp tạm lỗi, đang hiển thị ${this.matches.length} trận đã lưu trên máy`, 'info');
                }
            } catch (error) {
                console.error('Không thể cập nhật dữ liệu xổ số thể thao:', error);
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Chưa lấy được dữ liệu mới</h3>
                        <p>${error.message}</p>
                        <button type="button" class="retry-btn" onclick="window.lotteryManager.refreshMatches(${days}, true)">
                            <i class="fas fa-redo"></i> Thử lại
                        </button>
                    </div>
                `;
                this.updateMatchesCount(0, 0);
                this.showMessage('Không thể lấy dữ liệu mới: ' + error.message, 'error');
            } finally {
                if (refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Làm mới dữ liệu';
                }
                if (forceRefreshBtn) forceRefreshBtn.disabled = false;
            }
        };

        window.LotteryManager.prototype.__liveRefreshPatched = true;
    }

    // Script lottery.js đã được tải trước nav-fix.js nên có thể patch ngay.
    patchLotteryRefresh();

    document.addEventListener('DOMContentLoaded', function () {
        patchLotteryRefresh();

        // Dữ liệu trong bảng đầu trang là dữ liệu minh họa cũ, gắn nhãn rõ để
        // không bị hiểu nhầm là lịch thi đấu trực tiếp.
        const heading = document.querySelector('.success-cases h2');
        if (heading && !heading.dataset.historicalMarked) {
            heading.innerHTML = '<i class="fas fa-trophy"></i> Ví dụ lịch sử (dữ liệu minh họa)';
            heading.dataset.historicalMarked = 'true';
        }
    });

    window.switchToMode = showSection;
    window.debugNavigation = function () {
        console.table(Array.from(document.querySelectorAll('.nav-btn')).map(btn => ({
            id: btn.id,
            mode: btn.dataset.mode,
            active: btn.classList.contains('active')
        })));
    };
})();
