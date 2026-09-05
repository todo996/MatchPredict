/**
 * Điều hướng ổn định + tích hợp dữ liệu WorldCup26.
 *
 * - Chuyển Cổ điển / Dữ liệu bóng đá / AI không tự xóa danh sách.
 * - WorldCup26 là nguồn dữ liệu bóng đá bên ngoài duy nhất.
 * - Khi nguồn tạm lỗi, ứng dụng chỉ dùng cache thật trong SQLite/PostgreSQL.
 * - Không hiển thị spinner AI khi chưa có đủ trận để phân tích.
 */

(function () {
    'use strict';

    // Một số section dùng class hidden nhưng CSS cũ không có quy tắc chung.
    // Bổ sung đúng semantics để các panel/spinner không tự hiện khi chưa chạy.
    const style = document.createElement('style');
    style.textContent = '.hidden{display:none!important;}';
    document.head.appendChild(style);

    function showSection(mode) {
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.querySelector(`.nav-btn[data-mode="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });

        const target = document.getElementById(`${mode}-mode`);
        if (!target) {
            console.error('Không tìm thấy khu vực chế độ:', mode);
            return;
        }
        target.classList.remove('hidden');

        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.classList.add('hidden');

        if (window.aiPredictionManager) {
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
            manager.checkParlayRecommendation();

            const now = Date.now();
            const stale = !manager._lastLiveRefresh || (now - manager._lastLiveRefresh > 2 * 60 * 1000);
            if (!manager.matches.length || stale) {
                const daysSelect = document.getElementById('days-filter');
                const days = daysSelect ? parseInt(daysSelect.value, 10) || 3 : 3;
                manager.refreshMatches(days);
            }
        }

        console.log('Đã chuyển chế độ, giữ nguyên danh sách:', mode);
    }

    // app.js cũ có handler tự xóa dữ liệu khi đổi chế độ. Chặn handler đó ở pha
    // capture và dùng luồng điều hướng an toàn bên trên.
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

    function patchFootballRefresh() {
        if (!window.LotteryManager || window.LotteryManager.prototype.__worldcup26RefreshPatched) return;

        window.LotteryManager.prototype.refreshMatches = async function (days = 3, force = false) {
            const container = document.getElementById('lottery-matches');
            const refreshBtn = document.getElementById('refresh-lottery-btn');
            const forceRefreshBtn = document.getElementById('force-refresh-lottery-btn');
            days = Math.min(Math.max(parseInt(days, 10) || 3, 1), 14);
            if (!container) return;

            container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-spin"></i> Đang lấy dữ liệu mới nhất từ WorldCup26...</div>';
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
            }
            if (forceRefreshBtn) forceRefreshBtn.disabled = true;

            let data = null;
            let source = 'worldcup26';
            let liveError = null;

            try {
                const liveResponse = await fetch('/api/lottery/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ days, force: Boolean(force) })
                });
                const text = await liveResponse.text();
                let payload = null;
                try {
                    payload = text ? JSON.parse(text) : null;
                } catch (_) {
                    throw new Error('WorldCup26 trả về phản hồi không hợp lệ');
                }

                if (!liveResponse.ok || !payload || !payload.success || !Array.isArray(payload.matches)) {
                    throw new Error((payload && (payload.message || payload.error)) || `HTTP ${liveResponse.status}`);
                }
                data = payload;
                this._lastLiveRefresh = Date.now();
            } catch (error) {
                liveError = error;
                console.warn('WorldCup26 tạm thời không khả dụng:', error);

                try {
                    const cachedResponse = await fetch(`/api/lottery/matches?days=${days}`);
                    const cachedData = await cachedResponse.json();
                    if (cachedResponse.ok && cachedData.success && Array.isArray(cachedData.matches) && cachedData.matches.length) {
                        data = cachedData;
                        source = 'cache';
                    }
                } catch (cacheError) {
                    console.warn('Cache database cũng không khả dụng:', cacheError);
                }
            }

            try {
                if (!data || !Array.isArray(data.matches) || data.matches.length === 0) {
                    throw new Error(liveError ? liveError.message : 'Không có dữ liệu trận đấu trong khoảng ngày đã chọn');
                }

                this.matches = data.matches;
                const validIds = new Set(this.matches.map(match => String(match.match_id)));
                this.selectedMatches = new Set(
                    Array.from(this.selectedMatches).filter(id => validIds.has(String(id)))
                );

                this.renderMatches();
                this.updateSelectedMatchesDisplay();
                this.updateSelectionInfo();
                this.checkParlayRecommendation();

                if (source === 'worldcup26') {
                    this.showMessage(`✅ Đã cập nhật ${this.matches.length} trận từ WorldCup26`, 'success');
                } else {
                    this.showMessage(`⚠️ WorldCup26 tạm lỗi, đang hiển thị ${this.matches.length} trận đã lưu trên máy`, 'info');
                }
            } catch (error) {
                console.error('Không thể cập nhật dữ liệu bóng đá:', error);
                this.matches = [];
                this.renderMatches();
                container.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>Chưa lấy được dữ liệu WorldCup26</h3>
                        <p>${error.message}</p>
                        <button type="button" class="retry-btn" onclick="window.lotteryManager.refreshMatches(${days}, true)">
                            <i class="fas fa-redo"></i> Thử lại
                        </button>
                    </div>
                `;
                this.updateMatchesCount(0, 0);
                this.showMessage('Không thể lấy dữ liệu WorldCup26: ' + error.message, 'error');
            } finally {
                if (refreshBtn) {
                    refreshBtn.disabled = false;
                    refreshBtn.innerHTML = '<i class="fas fa-sync"></i> Làm mới dữ liệu';
                }
                if (forceRefreshBtn) forceRefreshBtn.disabled = false;
            }
        };

        window.LotteryManager.prototype.__worldcup26RefreshPatched = true;
    }

    patchFootballRefresh();

    document.addEventListener('DOMContentLoaded', function () {
        patchFootballRefresh();

        const sourceHeading = document.querySelector('#lottery-mode > h2');
        if (sourceHeading) {
            sourceHeading.innerHTML = '<i class="fas fa-globe"></i> Dữ liệu bóng đá trực tiếp - WorldCup26';
        }

        const forceRefreshBtn = document.getElementById('force-refresh-lottery-btn');
        if (forceRefreshBtn) {
            forceRefreshBtn.title = 'Cập nhật dữ liệu mới nhất từ WorldCup26 vào cơ sở dữ liệu';
        }

        const historicalHeading = document.querySelector('.success-cases h2');
        if (historicalHeading) {
            historicalHeading.innerHTML = '<i class="fas fa-trophy"></i> Ví dụ lịch sử (dữ liệu minh họa)';
        }

        if (window.lotteryManager) {
            window.lotteryManager.checkParlayRecommendation();
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
