/**
 * Script hỗ trợ nút điều hướng
 * Bảo đảm các nút điều hướng hoạt động ổn định
 */

// Chờ trang tải hoàn toàn
window.addEventListener('load', function() {
    console.log('Trang đã tải hoàn toàn, bắt đầu thiết lập lại nút điều hướng');

    // Chờ một khoảng ngắn để bảo đảm các script khác đã chạy xong
    setTimeout(function() {
        setupNavigation();
    }, 200);
});

// Thiết lập chức năng điều hướng
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('Số nút điều hướng tìm thấy:', navButtons.length);

    // Gắn sự kiện cho từng nút
    navButtons.forEach((btn, index) => {
        console.log(`Thiết lập nút ${index + 1}:`, btn.id, btn.getAttribute('data-mode'));

        // Xóa các sự kiện cũ có thể tồn tại
        btn.onclick = null;
        btn.removeAttribute('onclick');

        // Thêm sự kiện nhấn mới
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();

            const mode = this.getAttribute('data-mode');
            console.log('Đã nhấn nút điều hướng:', this.id, 'chế độ:', mode);

            if (mode) {
                switchToMode(mode);
            }
        });

        // Bảo đảm con trỏ thể hiện nút có thể tương tác
        btn.style.cursor = 'pointer';
    });
}

// Chuyển chế độ
function switchToMode(mode) {
    console.log('Chuyển sang chế độ:', mode);

    try {
        // 1. Cập nhật trạng thái nút điều hướng
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const activeBtn = document.querySelector(`[data-mode="${mode}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            console.log('Kích hoạt nút:', activeBtn.id);
        }

        // 2. Ẩn tất cả khu vực chế độ
        document.querySelectorAll('.match-input-section').forEach(section => {
            section.classList.add('hidden');
        });

        // 3. Hiển thị khu vực chế độ đích
        const targetSection = document.getElementById(mode + '-mode');
        if (targetSection) {
            targetSection.classList.remove('hidden');
            console.log('Hiển thị khu vực chế độ:', mode + '-mode');
        } else {
            console.error('Không tìm thấy khu vực chế độ:', mode + '-mode');
        }

        // 4. Ẩn khu vực kết quả
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.classList.add('hidden');
        }

        console.log('Đã chuyển chế độ:', mode);

    } catch (error) {
        console.error('Chuyển chế độ thất bại:', error);
    }
}

// Hàm gỡ lỗi: hiển thị trạng thái hiện tại
function debugNavigation() {
    console.log('=== Thông tin gỡ lỗi điều hướng ===');

    const navButtons = document.querySelectorAll('.nav-btn');
    console.log('Số nút điều hướng:', navButtons.length);

    navButtons.forEach((btn, index) => {
        console.log(`Nút ${index + 1}:`, {
            id: btn.id,
            mode: btn.getAttribute('data-mode'),
            active: btn.classList.contains('active'),
            visible: !btn.hidden,
            clickable: btn.style.pointerEvents !== 'none'
        });
    });

    const sections = document.querySelectorAll('.match-input-section');
    console.log('Số khu vực chế độ:', sections.length);

    sections.forEach((section, index) => {
        console.log(`Khu vực ${index + 1}:`, {
            id: section.id,
            hidden: section.classList.contains('hidden'),
            visible: !section.hidden
        });
    });
}

// Đưa hàm gỡ lỗi ra phạm vi toàn cục
window.debugNavigation = debugNavigation;
