// Ánh xạ tên giải đấu
const LEAGUES = {
    "PL": "Ngoại hạng Anh",
    "PD": "La Liga",
    "SA": "Serie A",
    "BL1": "Bundesliga",
    "FL1": "Ligue 1"
};

// Lưu dữ liệu đặc trưng đội bóng của từng giải
let featuresData = {};

// Tải trước dữ liệu của tất cả giải đấu
async function loadAllLeaguesData() {
    try {
        // Lấy dữ liệu đội bóng từ API
        const response = await fetch('/api/teams');
        if (!response.ok) {
            throw new Error('Không thể lấy dữ liệu đội bóng');
        }
        
        const data = await response.json();
        if (data.success) {
            featuresData = data.teams;
            
            // Điền danh sách đội vào các ô chọn
            for (const [leagueCode, teams] of Object.entries(featuresData)) {
                populateTeamSelects(leagueCode, teams);
            }
            
            console.log('Đã tải xong dữ liệu của tất cả giải đấu');
        } else {
            throw new Error(data.message || 'Lấy dữ liệu đội bóng thất bại');
        }
    } catch (error) {
        console.error('Tải dữ liệu thất bại:', error);
        // Dùng dữ liệu mặc định
        featuresData = {
            "PL": ["Arsenal FC", "Manchester City FC", "Liverpool FC", "Manchester United FC", "Chelsea FC", "Tottenham Hotspur FC"],
            "PD": ["Real Madrid CF", "FC Barcelona", "Atlético de Madrid", "Sevilla FC", "Valencia CF", "Real Betis Balompié"],
            "SA": ["FC Internazionale Milano", "AC Milan", "Juventus FC", "SSC Napoli", "AS Roma", "SS Lazio"],
            "BL1": ["FC Bayern München", "Borussia Dortmund", "RB Leipzig", "Bayer 04 Leverkusen", "VfB Stuttgart", "Eintracht Frankfurt"],
            "FL1": ["Paris Saint-Germain FC", "Olympique de Marseille", "AS Monaco FC", "Olympique Lyonnais", "OGC Nice", "Stade Rennais FC"]
        };
        
        // Điền dữ liệu mặc định
        for (const [leagueCode, teams] of Object.entries(featuresData)) {
            populateTeamSelects(leagueCode, teams);
        }
        
        console.log('Đang sử dụng dữ liệu đội bóng mặc định');
    }
}

// Lấy đặc trưng đội bóng (bản đơn giản)
function getTeamFeatures(teamName, leagueCode = null) {
    // Trả về thông tin cơ bản, không còn phụ thuộc dữ liệu thống kê phức tạp
    return {
        team_name: teamName,
        league_code: leagueCode,
        // Dữ liệu mặc định; quá trình dự đoán thực tế sẽ do AI xử lý
        home_goals_scored_avg: 1.5,
        away_goals_scored_avg: 1.2,
        home_goals_conceded_avg: 1.0,
        away_goals_conceded_avg: 1.3
    };
}

// Điền danh sách đội vào các ô chọn
function populateTeamSelects(leagueCode, teamsList) {
    // Hàm này được triển khai trong app.js
    // Ở đây chỉ khai báo, phần xử lý thực tế nằm trong logic ứng dụng chính
}

// Ghi nhật ký dự đoán của người dùng vào bộ nhớ cục bộ
function logUserPrediction(matches) {
    const timestamp = new Date().toISOString();
    
    const logEntry = {
        timestamp,
        matches
    };
    
    // Lấy nhật ký hiện có
    let logs = [];
    try {
        const storedLogs = localStorage.getItem('prediction_logs');
        if (storedLogs) {
            logs = JSON.parse(storedLogs);
        }
    } catch (e) {
        console.warn('Không thể đọc nhật ký cục bộ:', e);
        logs = [];
    }
    
    // Thêm nhật ký mới
    logs.push(logEntry);
    
    // Giới hạn số bản ghi để tránh bộ nhớ cục bộ quá lớn
    if (logs.length > 100) {
        logs = logs.slice(-100);
    }
    
    // Lưu vào bộ nhớ cục bộ
    try {
        localStorage.setItem('prediction_logs', JSON.stringify(logs));
    } catch (e) {
        console.warn('Không thể lưu nhật ký cục bộ:', e);
    }
}

// Khởi tạo sau khi trang tải xong
document.addEventListener('DOMContentLoaded', function() {
    // Bảo đảm lớp phủ tải được ẩn sau khi trang đã tải
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
    }
    
    // Tải dữ liệu đội bóng
    loadAllLeaguesData();
});
