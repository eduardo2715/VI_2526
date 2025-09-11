import os
import re
import pandas as pd

# Base path containing all series
data_folder = "data"

all_cards = []

# Loop through all series folders
for serie_item in os.listdir(data_folder):
    serie_path = os.path.join(data_folder, serie_item)

    # Only process directories (series)
    if not os.path.isdir(serie_path):
        continue

    # -----------------------------
    # 1. Read series metadata
    # -----------------------------
    serie_file = os.path.join(data_folder, f"{serie_item}.ts")
    if not os.path.exists(serie_file):
        print(f"Warning: Serie metadata file not found for {serie_item}, skipping.")
        continue

    with open(serie_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Extract series name (English)
    serie_name_match = re.search(r'name:\s*{[^}]*en:\s*"([^"]+)"', content)
    serie_name = serie_name_match.group(1) if serie_name_match else ""

    # Extract series id
    serie_id_match = re.search(r'id:\s*"([^"]+)"', content)
    serie_id = serie_id_match.group(1) if serie_id_match else ""

    # -----------------------------
    # 2. Loop through all sets in this series
    # -----------------------------
    for set_item in os.listdir(serie_path):
        set_path = os.path.join(serie_path, set_item)

        if not os.path.isdir(set_path):
            continue

        # Set metadata file
        set_file = os.path.join(serie_path, f"{set_item}.ts")
        if not os.path.exists(set_file):
            print(f"Warning: Metadata file not found for set {set_item}, skipping.")
            continue

        # Read set metadata
        with open(set_file, "r", encoding="utf-8") as f:
            set_content = f.read()

        # Extract set id
        set_id_match = re.search(r'id:\s*"([^"]+)"', set_content)
        set_id = set_id_match.group(1) if set_id_match else ""

        # Extract set name (English)
        set_name_match = re.search(r'name:\s*{[^}]*en:\s*"([^"]+)"', set_content)
        set_name = set_name_match.group(1) if set_name_match else ""

        # Extract releaseDate
        release_date_match = re.search(r'releaseDate:\s*"([^"]+)"', set_content)
        release_date = release_date_match.group(1) if release_date_match else ""

        # -----------------------------
        # 3. Read numbered card files in set
        # -----------------------------
        for file in os.listdir(set_path):
            if not file.endswith(".ts") or not file[:-3].isdigit():
                continue

            internal_id = int(file[:-3])  # number from filename (e.g. 1.ts -> 1)

            file_path = os.path.join(set_path, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Only cards with category: "Pokemon"
            if 'category: "Pokemon"' not in content:
                continue

            # Extract rarity
            rarity_match = re.search(r'rarity:\s*"([^"]+)"', content)
            rarity = rarity_match.group(1) if rarity_match else ""

            # Extract English name
            name_match = re.search(r'name:\s*{[^}]*en:\s*"([^"]+)"', content)
            name = name_match.group(1) if name_match else ""

            # Extract tcgplayer id
            tcg_match = re.search(r'tcgplayer:\s*(\d+)', content)
            tcgplayer = int(tcg_match.group(1)) if tcg_match else ""

            all_cards.append({
                "internal_id": internal_id,   # 👈 new column
                "name": name,
                "rarity": rarity,
                "tcgplayer": tcgplayer,
                "serie_id": serie_id,
                "serie_name": serie_name,
                "set_id": set_id,
                "set_name": set_name,
                "release_date": release_date
            })

# -----------------------------
# 4. Save to CSV
# -----------------------------
df = pd.DataFrame(all_cards)
df.to_csv("pokemon_cards.csv", index=False)
print(f"CSV created successfully! Total cards: {len(all_cards)}")
