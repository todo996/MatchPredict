import pandas as pd
import json
import os

# Mã giải đấu
leagues = ["PL", "PD", "SA", "BL1", "FL1"]

for league in leagues:
    csv_file = f"data/features_{league}2024.csv"
    json_file = f"data/features_{league}2024.json"
    
    if os.path.exists(csv_file):
        # Đọc tệp CSV
        df = pd.read_csv(csv_file, index_col=0)
        
        # Chuyển sang định dạng JSON
        data = {}
        for team in df.index:
            data[team] = df.loc[team].to_dict()
        
        # Lưu thành tệp JSON
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Đã chuyển {csv_file} sang {json_file}")
    else:
        print(f"Không tồn tại tệp: {csv_file}")
