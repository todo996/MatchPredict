/**
 * Dự đoán kết quả một trận đấu
 */
function predictMatch(league_code, home_team, away_team, home_odds, draw_odds, away_odds) {
    // Tính số bàn thắng kỳ vọng
    const { homeExpectedGoals, awayExpectedGoals } = calculateExpectedGoals(
        home_team, away_team, league_code, home_odds, away_odds
    );

    // Điều chỉnh số bàn tối đa theo chênh lệch tỷ lệ và đặc điểm giải đấu
    let maxGoals = 5;  // Số bàn tối đa mặc định

    // Lấy hệ số xu hướng nhiều bàn của giải đấu
    const highScoringFactor = leagueHighScoringFactor[league_code] || 1.0;

    // Điều chỉnh số bàn tối đa cơ sở theo hệ số của giải
    maxGoals = Math.ceil(maxGoals * highScoringFactor);

    // Tính tỷ lệ chênh lệch để đánh giá khoảng cách sức mạnh
    const favoriteOdds = Math.min(home_odds, away_odds);
    const underdogOdds = Math.max(home_odds, away_odds);
    const oddsRatio = underdogOdds / favoriteOdds;

    // Điều chỉnh số bàn tối đa mạnh hơn khi chênh lệch lớn
    if (oddsRatio > 5) {
        maxGoals = Math.max(9, maxGoals + 3);  // Chênh lệch sức mạnh cực lớn
    } else if (oddsRatio > 3) {
        maxGoals = Math.max(8, maxGoals + 2);  // Chênh lệch sức mạnh rất lớn
    } else if (oddsRatio > 2) {
        maxGoals = Math.max(7, maxGoals + 1);  // Chênh lệch sức mạnh rõ rệt
    } else if (oddsRatio > 1.5) {
        maxGoals = Math.max(6, maxGoals);      // Có chênh lệch sức mạnh
    }

    // Bảo đảm số bàn tối đa không quá thấp
    maxGoals = Math.max(maxGoals, 6);

    // Dùng phân phối Poisson để tính xác suất tỷ số
    const scoreProbs = {};
    let totalProb = 0;

    for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
            // Xác suất của một tỷ số cụ thể theo phân phối Poisson
            const homeProb = Math.exp(-homeExpectedGoals) * Math.pow(homeExpectedGoals, i) / factorial(i);
            const awayProb = Math.exp(-awayExpectedGoals) * Math.pow(awayExpectedGoals, j) / factorial(j);
            scoreProbs[`${i}-${j}`] = homeProb * awayProb;
            totalProb += homeProb * awayProb;
        }
    }

    // Tính xác suất 1X2
    let homeWinProb = 0;
    let drawProb = 0;
    let awayWinProb = 0;

    for (const [score, prob] of Object.entries(scoreProbs)) {
        const [home, away] = score.split('-').map(Number);

        if (home > away) {
            homeWinProb += prob;
        } else if (home === away) {
            drawProb += prob;
        } else {
            awayWinProb += prob;
        }
    }

    // Điều chỉnh xác suất theo tỷ lệ cược - giảm trọng số tỷ lệ cược
    // Tăng trọng số xác suất gốc và giảm trọng số tỷ lệ cược
    const originalProbWeight = 0.7;  // Tăng trọng số xác suất gốc
    const oddsWeight = 0.3;          // Giảm trọng số tỷ lệ cược

    // Tính xác suất ngụ ý từ tỷ lệ cược
    const totalMargin = 1/home_odds + 1/draw_odds + 1/away_odds - 1;
    const homeImpliedProb = (1/home_odds) / (1 + totalMargin);
    const drawImpliedProb = (1/draw_odds) / (1 + totalMargin);
    const awayImpliedProb = (1/away_odds) / (1 + totalMargin);

    // Kết hợp xác suất gốc và xác suất ngụ ý từ tỷ lệ cược
    const adjustedHomeWinProb = homeWinProb * originalProbWeight + homeImpliedProb * oddsWeight;
    const adjustedDrawProb = drawProb * originalProbWeight + drawImpliedProb * oddsWeight;
    const adjustedAwayWinProb = awayWinProb * originalProbWeight + awayImpliedProb * oddsWeight;

    // Chuẩn hóa xác suất sau điều chỉnh
    const totalAdjustedProb = adjustedHomeWinProb + adjustedDrawProb + adjustedAwayWinProb;
    const finalHomeWinProb = adjustedHomeWinProb / totalAdjustedProb;
    const finalDrawProb = adjustedDrawProb / totalAdjustedProb;
    const finalAwayWinProb = adjustedAwayWinProb / totalAdjustedProb;

    // Tính giá trị kỳ vọng, có xét đến chênh lệch sức mạnh
    // Chênh lệch càng lớn thì càng giảm trọng số EV của đội yếu
    let homeEV = (finalHomeWinProb * home_odds) - 1;
    let drawEV = (finalDrawProb * draw_odds) - 1;
    let awayEV = (finalAwayWinProb * away_odds) - 1;

    // Điều chỉnh giá trị kỳ vọng theo chênh lệch sức mạnh
    if (oddsRatio > 3) {
        // Khi chênh lệch lớn, giảm EV của đội yếu
        const strengthPenalty = Math.min(0.5, (oddsRatio - 3) * 0.1);

        if (home_odds > away_odds) {
            // Chủ nhà là đội yếu hơn
            homeEV *= (1 - strengthPenalty);
        } else {
            // Đội khách là đội yếu hơn
            awayEV *= (1 - strengthPenalty);
        }
    }

    // Tất cả lựa chọn và giá trị kỳ vọng tương ứng
    const allBets = [
        ['home', homeEV, home_odds, finalHomeWinProb],
        ['draw', drawEV, draw_odds, finalDrawProb],
        ['away', awayEV, away_odds, finalAwayWinProb]
    ].sort((a, b) => b[1] - a[1]);  // Sắp xếp theo giá trị kỳ vọng

    // Tính các tỷ số có khả năng cao nhất
    const normalizedScoreProbs = {};
    for (const [score, prob] of Object.entries(scoreProbs)) {
        normalizedScoreProbs[score] = prob * totalProb;
    }

    // Sắp xếp theo xác suất để lấy các tỷ số có khả năng cao nhất
    const sortedScores = Object.entries(normalizedScoreProbs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // Lấy 3 tỷ số có khả năng cao nhất

    // Tính tỷ số hiệp 1
    const halfTimeHomeExpectedGoals = homeExpectedGoals * 0.45; // Hiệp 1 thường có ít bàn hơn hiệp 2
    const halfTimeAwayExpectedGoals = awayExpectedGoals * 0.45;

    const halfTimeScoreProbs = {};
    let halfTimeTotalProb = 0;

    // Số bàn tối đa của hiệp 1 cũng được điều chỉnh theo chênh lệch sức mạnh
    const halfTimeMaxGoals = Math.min(4, Math.ceil(maxGoals * 0.6));

    for (let i = 0; i <= halfTimeMaxGoals; i++) {
        for (let j = 0; j <= halfTimeMaxGoals; j++) {
            const homeProb = Math.exp(-halfTimeHomeExpectedGoals) * Math.pow(halfTimeHomeExpectedGoals, i) / factorial(i);
            const awayProb = Math.exp(-halfTimeAwayExpectedGoals) * Math.pow(halfTimeAwayExpectedGoals, j) / factorial(j);
            halfTimeScoreProbs[`${i}-${j}`] = homeProb * awayProb;
            halfTimeTotalProb += homeProb * awayProb;
        }
    }

    // Chuẩn hóa xác suất tỷ số hiệp 1
    const halfTimeNormalizationFactor = 1 / halfTimeTotalProb;
    for (const score in halfTimeScoreProbs) {
        halfTimeScoreProbs[score] *= halfTimeNormalizationFactor;
    }

    // Lấy các tỷ số hiệp 1 có khả năng cao nhất
    const sortedHalfTimeScores = Object.entries(halfTimeScoreProbs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // Lấy 3 tỷ số hiệp 1 có khả năng cao nhất

    // Tính kết quả hiệp 1/cả trận
    const halfTimeFullTimeProbs = {};

    // Kết quả hiệp 1: chủ nhà thắng (H), hòa (D), khách thắng (A)
    // Kết quả cả trận: chủ nhà thắng (H), hòa (D), khách thắng (A)
    // Tổ hợp: HH, HD, HA, DH, DD, DA, AH, AD, AA
    const halfTimeResults = ['H', 'D', 'A'];
    const fullTimeResults = ['H', 'D', 'A'];

    // Tính xác suất kết quả hiệp 1
    let halfTimeHomeWinProb = 0;
    let halfTimeDrawProb = 0;
    let halfTimeAwayWinProb = 0;

    for (const [score, prob] of Object.entries(halfTimeScoreProbs)) {
        const [home, away] = score.split('-').map(Number);

        if (home > away) {
            halfTimeHomeWinProb += prob;
        } else if (home === away) {
            halfTimeDrawProb += prob;
        } else {
            halfTimeAwayWinProb += prob;
        }
    }

    // Tính xác suất tổ hợp hiệp 1/cả trận
    for (const ht of halfTimeResults) {
        for (const ft of fullTimeResults) {
            let htProb = 0;
            let ftProb = 0;

            if (ht === 'H') htProb = halfTimeHomeWinProb;
            else if (ht === 'D') htProb = halfTimeDrawProb;
            else htProb = halfTimeAwayWinProb;

            if (ft === 'H') ftProb = finalHomeWinProb;
            else if (ft === 'D') ftProb = finalDrawProb;
            else ftProb = finalAwayWinProb;

            // Kết quả hiệp 1 và cả trận không hoàn toàn độc lập nên cần điều chỉnh
            // Ví dụ: đội dẫn trước ở hiệp 1 có xác suất thắng chung cuộc cao hơn
            let adjustmentFactor = 1.0;

            if (ht === ft) {
                adjustmentFactor = 1.5; // Xác suất kết quả hiệp 1 và cả trận giống nhau cao hơn
            } else if ((ht === 'H' && ft === 'A') || (ht === 'A' && ft === 'H')) {
                adjustmentFactor = 0.5; // Khả năng đảo chiều hoàn toàn thấp hơn
            }

            halfTimeFullTimeProbs[`${ht}/${ft}`] = htProb * ftProb * adjustmentFactor;
        }
    }

    // Chuẩn hóa xác suất hiệp 1/cả trận
    const htftTotal = Object.values(halfTimeFullTimeProbs).reduce((sum, prob) => sum + prob, 0);
    for (const key in halfTimeFullTimeProbs) {
        halfTimeFullTimeProbs[key] /= htftTotal;
    }

    // Lấy các kết quả hiệp 1/cả trận có khả năng cao nhất
    const sortedHalfTimeFullTime = Object.entries(halfTimeFullTimeProbs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // Lấy 3 kết quả có khả năng cao nhất

    // Tính xác suất tổng số bàn thắng
    const totalGoalsProbs = {};
    for (let total = 0; total <= maxGoals * 2; total++) {
        totalGoalsProbs[total] = 0;

        for (const [score, prob] of Object.entries(normalizedScoreProbs)) {
            const [home, away] = score.split('-').map(Number);
            if (home + away === total) {
                totalGoalsProbs[total] += prob;
            }
        }
    }

    // Lấy các tổng bàn có khả năng cao nhất
    const sortedTotalGoals = Object.entries(totalGoalsProbs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3); // Lấy 3 tổng bàn có khả năng cao nhất

    // Trả về kết quả dự đoán
    return {
        league_code: league_code,
        home_team: home_team,
        away_team: away_team,
        home_win_prob: finalHomeWinProb,  // Dùng xác suất cuối cùng sau điều chỉnh
        draw_prob: finalDrawProb,
        away_win_prob: finalAwayWinProb,
        home_odds: home_odds,
        draw_odds: draw_odds,
        away_odds: away_odds,
        best_bet: allBets[0][0],
        best_ev: allBets[0][1],
        all_bets: allBets,
        // Kết quả dự đoán chi tiết
        most_likely_scores: sortedScores,
        most_likely_ht_scores: sortedHalfTimeScores,
        most_likely_htft: sortedHalfTimeFullTime,
        most_likely_total_goals: sortedTotalGoals
    };
}

/**
 * Tạo tất cả tổ hợp nhiều trận có thể có
 */
function generateParlays(predictions) {
    // Tạo tất cả lựa chọn cho từng trận
    const all_selections = [];

    for (const pred of predictions) {
        const match_selections = [];

        for (const [bet_type, ev, odds, prob] of pred.all_bets) {
            const selection = {
                match: `${pred.home_team} vs ${pred.away_team}`,
                pick: bet_type,
                odds,
                prob,
                ev
            };

            match_selections.push(selection);
        }

        all_selections.push(match_selections);
    }

    // Tạo tất cả tổ hợp có thể có
    const all_combinations = [];

    // Tạo tổ hợp bằng đệ quy
    function generateCombinations(index, current_combo) {
        if (index === all_selections.length) {
            let total_odds = 1.0;
            let total_prob = 1.0;

            for (const selection of current_combo) {
                total_odds *= selection.odds;
                total_prob *= selection.prob;
            }

            const expected_value = (total_prob * total_odds) - 1;

            all_combinations.push({
                selections: [...current_combo],
                total_odds,
                total_prob,
                expected_value
            });

            return;
        }

        for (const selection of all_selections[index]) {
            current_combo.push(selection);
            generateCombinations(index + 1, current_combo);
            current_combo.pop();
        }
    }

    generateCombinations(0, []);

    // Sắp xếp theo giá trị kỳ vọng
    all_combinations.sort((a, b) => b.expected_value - a.expected_value);

    return all_combinations;
}

/**
 * Hàm khối xác suất của phân phối Poisson
 */
function poissonPmf(k, lambda) {
    return Math.exp(-lambda) * Math.pow(lambda, k) / factorial(k);
}

/**
 * Tính giai thừa
 */
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

/**
 * Tính sức mạnh tấn công của đội bóng
 */
function calculateAttackStrength(features, isHome) {
    if (isHome) {
        // Tính sức mạnh tấn công trên sân nhà
        return (
            (features.home_goals_scored_avg || 1.3) * 0.4 +
            (features.attack || 1.3) * 0.3 +
            (features.recent_scoring_rate || 1.2) * 0.2 +
            (features.xG || 1.2) * 0.1
        );
    } else {
        // Tính sức mạnh tấn công trên sân khách
        return (
            (features.away_goals_scored_avg || 1.1) * 0.4 +
            (features.attack || 1.3) * 0.3 +
            (features.recent_scoring_rate || 1.2) * 0.2 +
            (features.xG || 1.2) * 0.1
        );
    }
}

/**
 * Tính sức mạnh phòng ngự của đội bóng
 */
function calculateDefenseStrength(features, isHome) {
    if (isHome) {
        // Tính sức mạnh phòng ngự trên sân nhà
        return (
            (features.home_goals_conceded_avg || 1.1) * 0.4 +
            (features.defense || 1.2) * 0.3 +
            (features.recent_conceding_rate || 1.1) * 0.2 +
            (features.xGA || 1.1) * 0.1
        );
    } else {
        // Tính sức mạnh phòng ngự trên sân khách
        return (
            (features.away_goals_conceded_avg || 1.3) * 0.4 +
            (features.defense || 1.2) * 0.3 +
            (features.recent_conceding_rate || 1.1) * 0.2 +
            (features.xGA || 1.1) * 0.1
        );
    }
}

/**
 * Tính phong độ gần đây của đội bóng
 */
function calculateTeamForm(features) {
    // Tính phong độ từ kết quả các trận gần đây
    return (features.form || 1.0);
}

/**
 * Tính hệ số đối đầu lịch sử
 */
function calculateHeadToHeadFactor(home_team, away_team, league_code) {
    // Cần triển khai logic lấy dữ liệu đối đầu lịch sử tại đây
    // Tạm thời trả về giá trị mặc định
    return { home: 1.0, away: 1.0 };
}

/**
 * Tính số bàn thắng kỳ vọng
 */
function calculateExpectedGoals(homeTeam, awayTeam, league_code, home_odds, away_odds) {
    // Lấy đặc trưng đội bóng
    const home_features = getTeamFeatures(homeTeam, league_code);
    const away_features = getTeamFeatures(awayTeam, league_code);

    if (!home_features || !away_features) {
        throw new Error(`Không tìm thấy dữ liệu đội bóng: ${homeTeam} hoặc ${awayTeam}`);
    }

    // Tính toán cơ sở
    const homeAttack = calculateAttackStrength(home_features, true);
    const homeDefense = calculateDefenseStrength(home_features, true);
    const awayAttack = calculateAttackStrength(away_features, false);
    const awayDefense = calculateDefenseStrength(away_features, false);

    // Xét phong độ gần đây của đội bóng
    const homeForm = calculateTeamForm(home_features);
    const awayForm = calculateTeamForm(away_features);

    // Lợi thế sân nhà riêng theo giải đấu
    const leagueHomeAdvantage = {
        'PL': 1.02,  // Ngoại hạng Anh
        'PD': 1.00,  // La Liga
        'SA': 1.02,  // Serie A
        'BL1': 1.04, // Bundesliga
        'FL1': 1.0   // Ligue 1
    }[league_code] || 1.02;

    // Lấy hệ số xu hướng nhiều bàn của giải đấu
    const highScoringFactor = leagueHighScoringFactor[league_code] || 1.0;

    // Số bàn kỳ vọng cơ sở
    let homeExpectedGoals = homeAttack * 0.5 + awayDefense * 0.3 + homeForm * 0.1;
    let awayExpectedGoals = awayAttack * 0.5 + homeDefense * 0.3 + awayForm * 0.1;

    // Áp dụng lợi thế sân nhà
    homeExpectedGoals *= leagueHomeAdvantage;

    // Điều chỉnh số bàn kỳ vọng theo tỷ lệ cược với mức điều chỉnh mạnh hơn
    const oddsRatio = home_odds / away_odds;

    if (oddsRatio < 0.5) {  // Chủ nhà mạnh hơn rõ rệt
        const strengthDiff = Math.pow(0.5 / oddsRatio, 0.7); // Tăng số mũ để khuếch đại hiệu ứng
        homeExpectedGoals *= (1 + (strengthDiff - 1) * 0.7);  // Tăng hệ số
        awayExpectedGoals *= (1 - (strengthDiff - 1) * 0.4);
    } else if (oddsRatio > 2.0) {  // Đội khách mạnh hơn rõ rệt
        const strengthDiff = Math.pow(oddsRatio / 2.0, 0.7); // Tăng số mũ để khuếch đại hiệu ứng
        homeExpectedGoals *= (1 - (strengthDiff - 1) * 0.4);
        awayExpectedGoals *= (1 + (strengthDiff - 1) * 0.7);  // Tăng hệ số
    }

    // Áp dụng hệ số xu hướng nhiều bàn của giải đấu
    homeExpectedGoals *= highScoringFactor;
    awayExpectedGoals *= highScoringFactor;

    // Bảo đảm số bàn kỳ vọng không thấp hơn mức tối thiểu
    homeExpectedGoals = Math.max(homeExpectedGoals, 0.3);
    awayExpectedGoals = Math.max(awayExpectedGoals, 0.2);

    return { homeExpectedGoals, awayExpectedGoals };
}

// Hệ số xu hướng nhiều bàn của từng giải đấu
const leagueHighScoringFactor = {
    'PL': 1.15,  // Ngoại hạng Anh có xu hướng nhiều bàn
    'PD': 1.15,  // La Liga có mức bàn thắng tương đối cao
    'SA': 0.95,  // Serie A có xu hướng ít bàn hơn
    'BL1': 1.25, // Bundesliga có xu hướng nhiều bàn nhất
    'FL1': 1.10, // Ligue 1 có xu hướng nhiều bàn
};
