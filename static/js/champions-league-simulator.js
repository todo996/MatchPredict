/**
 * Hệ thống mô phỏng và dự đoán UEFA Champions League
 * Mỗi lần chạy tạo kết quả ngẫu nhiên nhưng hợp lý.
 */

// Cấu trúc dữ liệu đội bóng
class Team {
    constructor(name, attackStrength, defenseStrength, homeAdvantage, formFactor, experience, logo) {
        this.name = name;
        this.attackStrength = attackStrength;      // Sức mạnh tấn công (1-10)
        this.defenseStrength = defenseStrength;    // Sức mạnh phòng ngự (1-10)
        this.homeAdvantage = homeAdvantage;        // Lợi thế sân nhà (1-1.5)
        this.formFactor = formFactor;              // Phong độ hiện tại (0.8-1.2)
        this.experience = experience;              // Kinh nghiệm Champions League (1-10)
        this.logo = logo;                          // URL logo đội bóng
    }
}

// Dữ liệu đội Champions League.
// Các key tiếng Trung được giữ nguyên làm khóa nội bộ để không phá các tham chiếu cũ;
// tên hiển thị của Team đã được chuẩn hóa.
const teams = {
    "皇家马德里": new Team("Real Madrid", 9.2, 8.5, 1.3, 1.1, 10, "logos/real_madrid.png"),
    "巴塞罗那": new Team("Barcelona", 8.8, 8.3, 1.3, 1.05, 9.5, "logos/barcelona.png"),
    "拜仁慕尼黑": new Team("Bayern Munich", 9.0, 8.4, 1.3, 1.15, 9.5, "logos/bayern.png"),
    "利物浦": new Team("Liverpool", 8.9, 8.4, 1.35, 1.1, 9.0, "logos/liverpool.png"),
    "巴黎圣日耳曼": new Team("Paris Saint-Germain", 8.7, 8.0, 1.25, 0.95, 8.0, "logos/psg.png"),
    "阿森纳": new Team("Arsenal", 8.6, 8.7, 1.3, 1.2, 7.5, "logos/arsenal.png"),
    "马德里竞技": new Team("Atlético Madrid", 8.2, 8.5, 1.25, 1.0, 8.5, "logos/atletico.png"),
    "多特蒙德": new Team("Borussia Dortmund", 8.3, 7.8, 1.3, 1.0, 8.0, "logos/dortmund.png"),
    "国际米兰": new Team("Inter Milan", 8.4, 8.2, 1.25, 1.1, 8.5, "logos/inter.png"),
    "阿斯顿维拉": new Team("Aston Villa", 8.0, 7.9, 1.25, 1.15, 6.0, "logos/aston_villa.png"),
    "勒沃库森": new Team("Bayer Leverkusen", 8.1, 7.8, 1.2, 0.9, 6.5, "logos/leverkusen.png"),
    "里尔": new Team("Lille", 7.8, 7.7, 1.2, 1.0, 6.0, "logos/lille.png"),
    "PSV埃因霍温": new Team("PSV Eindhoven", 7.7, 7.5, 1.2, 0.9, 6.0, "logos/psv.png"),
    "布鲁日": new Team("Club Brugge", 7.5, 7.4, 1.2, 0.95, 5.5, "logos/brugge.png"),
    "本菲卡": new Team("Benfica", 7.9, 7.6, 1.25, 0.95, 7.0, "logos/benfica.png"),
    "费耶诺德": new Team("Feyenoord", 7.6, 7.5, 1.2, 0.9, 6.0, "logos/feyenoord.png")
};

// Kết quả lượt đi vòng 1/8 (khóa nội bộ giữ nguyên để tương thích)
const firstLegResults = [
    { home: "PSV埃因霍温", away: "阿森纳", homeGoals: 1, awayGoals: 7, date: "03/13" },
    { home: "皇家马德里", away: "马德里竞技", homeGoals: 2, awayGoals: 1, date: "03/13" },
    { home: "巴黎圣日耳曼", away: "利物浦", homeGoals: 0, awayGoals: 1, date: "03/12" },
    { home: "布鲁日", away: "阿斯顿维拉", homeGoals: 1, awayGoals: 3, date: "03/13" },
    { home: "本菲卡", away: "巴塞罗那", homeGoals: 0, awayGoals: 1, date: "03/12" },
    { home: "多特蒙德", away: "里尔", homeGoals: 1, awayGoals: 1, date: "03/13" },
    { home: "拜仁慕尼黑", away: "勒沃库森", homeGoals: 3, awayGoals: 0, date: "03/12" },
    { home: "费耶诺德", away: "国际米兰", homeGoals: 0, awayGoals: 2, date: "03/12" }
];

// Thêm yếu tố ngẫu nhiên
function addRandomness(value, range = 0.2) {
    return value * (1 - range/2 + Math.random() * range);
}

// Mô phỏng một trận đấu
function simulateMatch(homeTeam, awayTeam, isNeutralVenue = false, isKnockout = true) {
    // Năng lực tấn công và phòng ngự cơ bản
    let homeAttack = homeTeam.attackStrength * homeTeam.formFactor;
    let homeDefense = homeTeam.defenseStrength * homeTeam.formFactor;
    let awayAttack = awayTeam.attackStrength * awayTeam.formFactor;
    let awayDefense = awayTeam.defenseStrength * awayTeam.formFactor;

    // Thêm ngẫu nhiên
    homeAttack = addRandomness(homeAttack, 0.3);
    homeDefense = addRandomness(homeDefense, 0.3);
    awayAttack = addRandomness(awayAttack, 0.3);
    awayDefense = addRandomness(awayDefense, 0.3);

    // Lợi thế sân nhà
    if (!isNeutralVenue) {
        homeAttack *= homeTeam.homeAdvantage;
        homeDefense *= 1.1;
    }

    // Kinh nghiệm Champions League có trọng số cao hơn ở vòng loại trực tiếp
    if (isKnockout) {
        const homeExpFactor = 1 + (homeTeam.experience - 5) * 0.02;
        const awayExpFactor = 1 + (awayTeam.experience - 5) * 0.02;

        homeAttack *= homeExpFactor;
        homeDefense *= homeExpFactor;
        awayAttack *= awayExpFactor;
        awayDefense *= awayExpFactor;
    }

    // Tính bàn thắng kỳ vọng
    const homeExpectedGoals = Math.max(0.3, (homeAttack / awayDefense) * 1.4);
    const awayExpectedGoals = Math.max(0.2, (awayAttack / homeDefense) * 1.1);

    // Mô phỏng số bàn bằng phân phối Poisson
    const homeGoals = simulatePoissonGoals(homeExpectedGoals);
    const awayGoals = simulatePoissonGoals(awayExpectedGoals);

    return { homeGoals, awayGoals };
}

// Mô phỏng số bàn theo phân phối Poisson
function simulatePoissonGoals(lambda) {
    let L = Math.exp(-lambda);
    let p = 1.0;
    let k = 0;

    do {
        k++;
        p *= Math.random();
    } while (p > L);

    return k - 1;
}

// Mô phỏng cặp đấu hai lượt
function simulateTwoLegTie(team1, team2, firstLegResult = null) {
    // Lượt đi
    let firstLeg;
    if (firstLegResult) {
        firstLeg = firstLegResult;
    } else {
        firstLeg = simulateMatch(team1, team2);
    }

    // Lượt về
    const secondLeg = simulateMatch(team2, team1);

    // Tổng tỷ số
    const team1TotalGoals = firstLeg.homeGoals + secondLeg.awayGoals;
    const team2TotalGoals = firstLeg.awayGoals + secondLeg.homeGoals;

    // Luật bàn thắng sân khách không còn áp dụng từ mùa 2021/22
    if (team1TotalGoals === team2TotalGoals) {
        const extraTime = simulateExtraTime(team2, team1);

        if (extraTime.homeGoals === extraTime.awayGoals) {
            const penalties = simulatePenalties(team2, team1);
            return {
                winner: penalties.winner === team2 ? team2 : team1,
                loser: penalties.winner === team2 ? team1 : team2,
                firstLeg,
                secondLeg,
                extraTime,
                penalties,
                aggregate: `${team1TotalGoals}-${team2TotalGoals} (luân lưu)`
            };
        } else {
            return {
                winner: extraTime.homeGoals > extraTime.awayGoals ? team2 : team1,
                loser: extraTime.homeGoals > extraTime.awayGoals ? team1 : team2,
                firstLeg,
                secondLeg,
                extraTime,
                aggregate: `${team1TotalGoals + extraTime.awayGoals}-${team2TotalGoals + extraTime.homeGoals} (hiệp phụ)`
            };
        }
    } else {
        return {
            winner: team1TotalGoals > team2TotalGoals ? team1 : team2,
            loser: team1TotalGoals > team2TotalGoals ? team2 : team1,
            firstLeg,
            secondLeg,
            aggregate: `${team1TotalGoals}-${team2TotalGoals}`
        };
    }
}

// Mô phỏng hiệp phụ
function simulateExtraTime(homeTeam, awayTeam) {
    // Bàn thắng kỳ vọng thấp hơn trong hiệp phụ
    const homeExpectedGoals = (homeTeam.attackStrength / awayTeam.defenseStrength) * 0.4;
    const awayExpectedGoals = (awayTeam.attackStrength / homeTeam.defenseStrength) * 0.3;

    // Yếu tố thể lực và tâm lý
    const homeFatigue = 0.9 + Math.random() * 0.2;
    const awayFatigue = 0.85 + Math.random() * 0.2;

    const homeGoals = simulatePoissonGoals(homeExpectedGoals * homeFatigue);
    const awayGoals = simulatePoissonGoals(awayExpectedGoals * awayFatigue);

    return { homeGoals, awayGoals };
}

// Mô phỏng loạt sút luân lưu
function simulatePenalties(homeTeam, awayTeam) {
    // Xác suất thành công dựa trên kinh nghiệm và phong độ
    const homeSuccessRate = 0.7 + (homeTeam.experience / 30) + (homeTeam.formFactor - 1) * 0.1;
    const awaySuccessRate = 0.7 + (awayTeam.experience / 30) + (awayTeam.formFactor - 1) * 0.1;

    let homeScore = 0;
    let awayScore = 0;

    // 5 lượt sút chính thức
    for (let i = 0; i < 5; i++) {
        if (Math.random() < homeSuccessRate) homeScore++;
        if (Math.random() < awaySuccessRate) awayScore++;

        if (homeScore > awayScore + (5 - i) || awayScore > homeScore + (5 - i)) {
            break;
        }
    }

    // Sudden death nếu vẫn hòa
    if (homeScore === awayScore) {
        let round = 0;
        while (homeScore === awayScore) {
            round++;
            const homeSuccess = Math.random() < homeSuccessRate;
            const awaySuccess = Math.random() < awaySuccessRate;

            if (homeSuccess) homeScore++;
            if (awaySuccess) awayScore++;

            if (homeScore !== awayScore) break;
        }
    }

    return {
        homeScore,
        awayScore,
        winner: homeScore > awayScore ? homeTeam : awayTeam
    };
}

// Mô phỏng trận chung kết một lượt
function simulateFinal(team1, team2) {
    // Chung kết diễn ra trên sân trung lập
    const result = simulateMatch(team1, team2, true, true);

    if (result.homeGoals === result.awayGoals) {
        const extraTime = simulateExtraTime(team1, team2);

        if (extraTime.homeGoals === extraTime.awayGoals) {
            const penalties = simulatePenalties(team1, team2);
            return {
                winner: penalties.winner,
                loser: penalties.winner === team1 ? team2 : team1,
                result,
                extraTime,
                penalties,
                finalScore: `${result.homeGoals + extraTime.homeGoals}-${result.awayGoals + extraTime.awayGoals} (luân lưu ${penalties.homeScore}-${penalties.awayScore})`
            };
        } else {
            return {
                winner: extraTime.homeGoals > extraTime.awayGoals ? team1 : team2,
                loser: extraTime.homeGoals > extraTime.awayGoals ? team2 : team1,
                result,
                extraTime,
                finalScore: `${result.homeGoals + extraTime.homeGoals}-${result.awayGoals + extraTime.awayGoals} (hiệp phụ)`
            };
        }
    } else {
        return {
            winner: result.homeGoals > result.awayGoals ? team1 : team2,
            loser: result.homeGoals > result.awayGoals ? team2 : team1,
            result,
            finalScore: `${result.homeGoals}-${result.awayGoals}`
        };
    }
}

// Tạo ngày ngẫu nhiên theo định dạng 03/XX
function generateRandomDate() {
    const day = Math.floor(Math.random() * 15) + 15; // Từ ngày 15 đến 30
    return `03/${day}`;
}

// Mô phỏng toàn bộ phần còn lại của Champions League
function simulateChampionsLeague() {
    const results = {
        round16: [],
        quarterFinals: [],
        semiFinals: [],
        final: null,
        champion: null
    };

    // Lượt về vòng 1/8 và các đội vào tứ kết
    const quarterFinalists = [];

    // Khóa nội bộ được giữ nguyên để bảo toàn các tham chiếu đã có
    const round16Matches = [
        { team1: teams["PSV埃因霍温"], team2: teams["阿森纳"], firstLeg: { homeGoals: 1, awayGoals: 7 } },
        { team1: teams["皇家马德里"], team2: teams["马德里竞技"], firstLeg: { homeGoals: 2, awayGoals: 1 } },
        { team1: teams["巴黎圣日耳曼"], team2: teams["利物浦"], firstLeg: { homeGoals: 0, awayGoals: 1 } },
        { team1: teams["布鲁日"], team2: teams["阿斯顿维拉"], firstLeg: { homeGoals: 1, awayGoals: 3 } },
        { team1: teams["本菲卡"], team2: teams["巴塞罗那"], firstLeg: { homeGoals: 0, awayGoals: 1 } },
        { team1: teams["多特蒙德"], team2: teams["里尔"], firstLeg: { homeGoals: 1, awayGoals: 1 } },
        { team1: teams["拜仁慕尼黑"], team2: teams["勒沃库森"], firstLeg: { homeGoals: 3, awayGoals: 0 } },
        { team1: teams["费耶诺德"], team2: teams["国际米兰"], firstLeg: { homeGoals: 0, awayGoals: 2 } }
    ];

    for (const match of round16Matches) {
        const secondLeg = simulateMatch(match.team2, match.team1);
        const result = simulateTwoLegTie(match.team1, match.team2, { homeGoals: match.firstLeg.homeGoals, awayGoals: match.firstLeg.awayGoals });

        results.round16.push({
            team1: match.team1,
            team2: match.team2,
            firstLeg: match.firstLeg,
            secondLeg: secondLeg,
            winner: result.winner,
            aggregate: result.aggregate
        });

        quarterFinalists.push(result.winner);
    }

    // Bốc thăm tứ kết ngẫu nhiên
    const shuffledQuarterFinalists = [...quarterFinalists].sort(() => Math.random() - 0.5);
    const quarterFinalMatches = [];

    for (let i = 0; i < shuffledQuarterFinalists.length; i += 2) {
        quarterFinalMatches.push({
            team1: shuffledQuarterFinalists[i],
            team2: shuffledQuarterFinalists[i + 1]
        });
    }

    const semiFinalists = [];

    for (const match of quarterFinalMatches) {
        const firstLeg = simulateMatch(match.team1, match.team2);
        const secondLeg = simulateMatch(match.team2, match.team1);
        const result = simulateTwoLegTie(match.team1, match.team2, firstLeg);

        results.quarterFinals.push({
            team1: match.team1,
            team2: match.team2,
            firstLeg: firstLeg,
            secondLeg: secondLeg,
            winner: result.winner,
            aggregate: result.aggregate,
            date: generateRandomDate()
        });

        semiFinalists.push(result.winner);
    }

    // Bán kết
    const semiFinalMatches = [
        { team1: semiFinalists[0], team2: semiFinalists[1] },
        { team1: semiFinalists[2], team2: semiFinalists[3] }
    ];

    const finalists = [];

    for (const match of semiFinalMatches) {
        const firstLeg = simulateMatch(match.team1, match.team2);
        const secondLeg = simulateMatch(match.team2, match.team1);
        const result = simulateTwoLegTie(match.team1, match.team2, firstLeg);

        results.semiFinals.push({
            team1: match.team1,
            team2: match.team2,
            firstLeg: firstLeg,
            secondLeg: secondLeg,
            winner: result.winner,
            aggregate: result.aggregate,
            date: generateRandomDate()
        });

        finalists.push(result.winner);
    }

    // Chung kết
    const finalResult = simulateFinal(finalists[0], finalists[1]);

    results.final = {
        team1: finalists[0],
        team2: finalists[1],
        result: finalResult.result,
        winner: finalResult.winner,
        finalScore: finalResult.finalScore,
        date: "05/31"
    };

    results.champion = finalResult.winner;

    return results;
}

// Xuất hàm mô phỏng cho môi trường module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        simulateChampionsLeague,
        teams
    };
}

// Giao diện frontend của trình mô phỏng Champions League
document.addEventListener('DOMContentLoaded', function() {
    const simulateClBtn = document.getElementById('simulate-cl-btn');
    const clBracket = document.getElementById('cl-bracket');

    if (simulateClBtn) {
        simulateClBtn.addEventListener('click', function() {
            clBracket.innerHTML = '<div class="loading">Đang mô phỏng các trận đấu...</div>';

            setTimeout(() => {
                simulateAndRender();
            }, 300);
        });
    }

    // Mô phỏng và render sơ đồ Champions League
    function simulateAndRender() {
        clBracket.innerHTML = '';

        // Kết quả lượt đi vòng 1/8 cố định; dùng tên hiển thị đã chuẩn hóa
        const firstLegMatches = [
            { team1: "PSV Eindhoven", team2: "Arsenal", score1: 1, score2: 7, date: "03/13" },
            { team1: "Real Madrid", team2: "Atlético Madrid", score1: 2, score2: 1, date: "03/13" },
            { team1: "Paris Saint-Germain", team2: "Liverpool", score1: 0, score2: 1, date: "03/12" },
            { team1: "Club Brugge", team2: "Aston Villa", score1: 1, score2: 3, date: "03/13" },
            { team1: "Benfica", team2: "Barcelona", score1: 0, score2: 1, date: "03/12" },
            { team1: "Borussia Dortmund", team2: "Lille", score1: 1, score2: 1, date: "03/13" },
            { team1: "Bayern Munich", team2: "Bayer Leverkusen", score1: 3, score2: 0, date: "03/12" },
            { team1: "Feyenoord", team2: "Inter Milan", score1: 0, score2: 2, date: "03/12" }
        ];

        const round16Results = simulateRound16(firstLegMatches);

        // Ghép cặp tứ kết theo nhánh cố định
        const quarterFinalPairs = [
            { match1Index: 0, match2Index: 1 },
            { match1Index: 2, match2Index: 3 },
            { match1Index: 4, match2Index: 5 },
            { match1Index: 6, match2Index: 7 }
        ];

        const quarterFinalMatches = quarterFinalPairs.map(pair => {
            const team1 = round16Results[pair.match1Index].winner;
            const team2 = round16Results[pair.match2Index].winner;
            const score1 = Math.floor(Math.random() * 4);
            const score2 = Math.floor(Math.random() * 4);

            return {
                team1: team1,
                team2: team2,
                score1: score1,
                score2: score2,
                winner: score1 > score2 ? team1 : (score1 < score2 ? team2 : (Math.random() > 0.5 ? team1 : team2))
            };
        });

        // Ghép cặp bán kết theo nhánh cố định
        const semiFinalPairs = [
            { match1Index: 0, match2Index: 1 },
            { match1Index: 2, match2Index: 3 }
        ];

        const semiFinalMatches = semiFinalPairs.map(pair => {
            const team1 = quarterFinalMatches[pair.match1Index].winner;
            const team2 = quarterFinalMatches[pair.match2Index].winner;
            const score1 = Math.floor(Math.random() * 4);
            const score2 = Math.floor(Math.random() * 4);

            return {
                team1: team1,
                team2: team2,
                score1: score1,
                score2: score2,
                winner: score1 > score2 ? team1 : (score1 < score2 ? team2 : (Math.random() > 0.5 ? team1 : team2))
            };
        });

        // Chung kết
        const team1 = semiFinalMatches[0].winner;
        const team2 = semiFinalMatches[1].winner;
        const finalScore1 = Math.floor(Math.random() * 4);
        const finalScore2 = Math.floor(Math.random() * 4);
        const champion = finalScore1 > finalScore2 ? team1 : (finalScore1 < finalScore2 ? team2 : (Math.random() > 0.5 ? team1 : team2));

        const finalMatch = {
            team1: team1,
            team2: team2,
            score1: finalScore1,
            score2: finalScore2,
            winner: champion
        };

        const bracketHTML = createBracketHTML(
            firstLegMatches,
            round16Results,
            quarterFinalMatches,
            semiFinalMatches,
            finalMatch
        );

        clBracket.innerHTML = bracketHTML;
    }

    // Mô phỏng lượt về vòng 1/8
    function simulateRound16(firstLegMatches) {
        return firstLegMatches.map(match => {
            const score1 = Math.floor(Math.random() * 4);
            const score2 = Math.floor(Math.random() * 4);

            const totalScore1 = match.score1 + score2;
            const totalScore2 = match.score2 + score1;

            let winner;
            if (totalScore1 > totalScore2) {
                winner = match.team1;
            } else if (totalScore1 < totalScore2) {
                winner = match.team2;
            } else {
                // Giữ nguyên quy tắc hiện có của mô phỏng để không thay đổi logic
                winner = match.score2 > score2 ? match.team2 : match.team1;
            }

            return {
                firstLeg: { team1: match.team1, team2: match.team2, score1: match.score1, score2: match.score2, date: match.date },
                secondLeg: { team1: match.team2, team2: match.team1, score1: score1, score2: score2, date: getNextDate(match.date) },
                winner: winner
            };
        });
    }

    // Tạo HTML sơ đồ đấu loại trực tiếp
    function createBracketHTML(firstLegMatches, round16Results, quarterFinals, semiFinals, final) {
        let html = `
        <div class="tournament-bracket">
            <div class="bracket-container">
                <!-- Vòng 1/8 - bên trái -->
                <div class="bracket-column">
                    <h3 class="round-title">Vòng 1/8</h3>
                    <div class="matches-container">`;

        // 4 cặp vòng 1/8 bên trái
        for (let i = 0; i < 4; i++) {
            const match = firstLegMatches[i];
            const result = round16Results[i];

            html += `
                <div class="match-pair">
                    <div class="match">
                        <div class="match-date">${match.date}</div>
                        <div class="team ${result.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1}</div>
                        </div>
                        <div class="team ${result.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2}</div>
                        </div>
                    </div>
                    <div class="connector"></div>
                    <div class="match">
                        <div class="match-date">${result.secondLeg.date}</div>
                        <div class="team ${result.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${result.secondLeg.score1}</div>
                        </div>
                        <div class="team ${result.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${result.secondLeg.score2}</div>
                        </div>
                    </div>
                </div>`;
        }

        html += `
                    </div>
                </div>

                <!-- Tứ kết - bên trái -->
                <div class="bracket-column">
                    <h3 class="round-title">Tứ kết</h3>
                    <div class="matches-container">`;

        for (let i = 0; i < 2; i++) {
            const match = quarterFinals[i];

            html += `
                <div class="match-single">
                    <div class="match">
                        <div class="team ${match.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1}</div>
                        </div>
                        <div class="team ${match.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2}</div>
                        </div>
                    </div>
                </div>`;
        }

        html += `
                    </div>
                </div>

                <!-- Bán kết - bên trái -->
                <div class="bracket-column">
                    <h3 class="round-title">Bán kết</h3>
                    <div class="matches-container">
                        <div class="match-single">
                            <div class="match">
                                <div class="team ${semiFinals[0].winner === semiFinals[0].team1 ? 'winner' : ''}">
                                    <div class="team-name">${semiFinals[0].team1}</div>
                                    <div class="score">${semiFinals[0].score1}</div>
                                </div>
                                <div class="team ${semiFinals[0].winner === semiFinals[0].team2 ? 'winner' : ''}">
                                    <div class="team-name">${semiFinals[0].team2}</div>
                                    <div class="score">${semiFinals[0].score2}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Chung kết -->
                <div class="bracket-column">
                    <h3 class="round-title">Chung kết</h3>
                    <div class="matches-container">
                        <div class="match-single final">
                            <div class="match">
                                <div class="team ${final.winner === final.team1 ? 'winner' : ''}">
                                    <div class="team-name">${final.team1}</div>
                                    <div class="score">${final.score1}</div>
                                </div>
                                <div class="team ${final.winner === final.team2 ? 'winner' : ''}">
                                    <div class="team-name">${final.team2}</div>
                                    <div class="score">${final.score2}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bán kết - bên phải -->
                <div class="bracket-column">
                    <h3 class="round-title">Bán kết</h3>
                    <div class="matches-container">
                        <div class="match-single">
                            <div class="match">
                                <div class="team ${semiFinals[1].winner === semiFinals[1].team1 ? 'winner' : ''}">
                                    <div class="team-name">${semiFinals[1].team1}</div>
                                    <div class="score">${semiFinals[1].score1}</div>
                                </div>
                                <div class="team ${semiFinals[1].winner === semiFinals[1].team2 ? 'winner' : ''}">
                                    <div class="team-name">${semiFinals[1].team2}</div>
                                    <div class="score">${semiFinals[1].score2}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tứ kết - bên phải -->
                <div class="bracket-column">
                    <h3 class="round-title">Tứ kết</h3>
                    <div class="matches-container">`;

        for (let i = 2; i < 4; i++) {
            const match = quarterFinals[i];

            html += `
                <div class="match-single">
                    <div class="match">
                        <div class="team ${match.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1}</div>
                        </div>
                        <div class="team ${match.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2}</div>
                        </div>
                    </div>
                </div>`;
        }

        html += `
                    </div>
                </div>

                <!-- Vòng 1/8 - bên phải -->
                <div class="bracket-column">
                    <h3 class="round-title">Vòng 1/8</h3>
                    <div class="matches-container">`;

        for (let i = 4; i < 8; i++) {
            const match = firstLegMatches[i];
            const result = round16Results[i];

            html += `
                <div class="match-pair">
                    <div class="match">
                        <div class="match-date">${match.date}</div>
                        <div class="team ${result.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${match.score1}</div>
                        </div>
                        <div class="team ${result.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${match.score2}</div>
                        </div>
                    </div>
                    <div class="connector"></div>
                    <div class="match">
                        <div class="match-date">${result.secondLeg.date}</div>
                        <div class="team ${result.winner === match.team2 ? 'winner' : ''}">
                            <div class="team-name">${match.team2}</div>
                            <div class="score">${result.secondLeg.score1}</div>
                        </div>
                        <div class="team ${result.winner === match.team1 ? 'winner' : ''}">
                            <div class="team-name">${match.team1}</div>
                            <div class="score">${result.secondLeg.score2}</div>
                        </div>
                    </div>
                </div>`;
        }

        html += `
                    </div>
                </div>
            </div>

            <!-- Nhà vô địch -->
            <div class="champion-container">
                <h3 class="champion-title">🏆 Nhà vô địch</h3>
                <div class="champion-team">${final.winner}</div>
            </div>
        </div>`;

        return html;
    }

    // Tính ngày thi đấu tiếp theo
    function getNextDate(date) {
        const parts = date.split('/');
        let month = parseInt(parts[0]);
        let day = parseInt(parts[1]) + 7;

        if (day > 30) {
            day = day - 30;
            month++;
        }

        return `${month < 10 ? '0' + month : month}/${day < 10 ? '0' + day : day}`;
    }
});
