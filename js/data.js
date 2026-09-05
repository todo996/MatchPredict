// Ánh xạ tên giải đấu
const LEAGUES = {
    "PL": "Ngoại hạng Anh",
    "PD": "La Liga",
    "SA": "Serie A",
    "BL1": "Bundesliga"
};

// Lưu dữ liệu đặc trưng của các đội theo từng giải
let featuresData = {};

// Nạp trước dữ liệu của tất cả giải
async function loadAllLeaguesData() {
    const loadingOverlay = document.getElementById('loading-overlay');

    try {
        // Nạp song song dữ liệu của tất cả giải
        const promises = Object.keys(LEAGUES).map(leagueCode =>
            loadLeagueData(leagueCode)
        );

        await Promise.all(promises);
        console.log('Đã nạp dữ liệu tất cả giải đấu');
    } catch (error) {
        console.error('Nạp dữ liệu thất bại:', error);
        alert('Không thể nạp dữ liệu đội bóng, vui lòng tải lại trang');
    } finally {
    }
}

// Nạp dữ liệu của một giải đấu
async function loadLeagueData(leagueCode) {
    try {
        // Dùng tệp JSON thay cho CSV để frontend xử lý thuận tiện hơn
        const response = await fetch(`data/features_${leagueCode}2024.json`);
        if (!response.ok) {
            throw new Error(`Không thể nạp dữ liệu ${LEAGUES[leagueCode]}`);
        }

        const data = await response.json();
        featuresData[leagueCode] = data;

        // Điền danh sách đội bóng
        populateTeamSelects(leagueCode, Object.keys(data));

        return data;
    } catch (error) {
        console.error(`Nạp dữ liệu ${LEAGUES[leagueCode]} thất bại:`, error);
        throw error;
    }
}

// Lấy đặc trưng đội bóng
function getTeamFeatures(teamName, leagueCode = null) {
    if (leagueCode && featuresData[leagueCode] && featuresData[leagueCode][teamName]) {
        return featuresData[leagueCode][teamName];
    }

    // Tìm trong tất cả giải đấu
    for (const [code, teams] of Object.entries(featuresData)) {
        if (teams[teamName]) {
            return teams[teamName];
        }
    }

    return null;
}

// Điền danh sách đội bóng
function populateTeamSelects(leagueCode, teamsList) {
    // Hàm này được triển khai trong app.js
    // Đây chỉ là khai báo; phần triển khai thực tế nằm trong logic ứng dụng chính
}

// Ghi lịch sử dự đoán của người dùng vào bộ nhớ cục bộ
function logUserPrediction(matches) {
    const timestamp = new Date().toISOString();

    const logEntry = {
        timestamp,
        matches
    };

    // Lấy nhật ký hiện có
    let logs = [];
    const storedLogs = localStorage.getItem('prediction_logs');
    if (storedLogs) {
        logs = JSON.parse(storedLogs);
    }

    // Thêm bản ghi mới
    logs.push(logEntry);

    // Giới hạn số lượng bản ghi để tránh bộ nhớ cục bộ quá lớn
    if (logs.length > 100) {
        logs = logs.slice(-100);
    }

    // Lưu vào bộ nhớ cục bộ
    localStorage.setItem('prediction_logs', JSON.stringify(logs));
}

// Bổ sung ở đầu trình xử lý DOMContentLoaded trong app.js
document.addEventListener('DOMContentLoaded', function() {
    // Bảo đảm lớp phủ tải dữ liệu được ẩn sau khi trang tải xong
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }

    // Phần mã còn lại...
});
