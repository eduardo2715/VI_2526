import os
import re
import json
import pandas as pd

# -----------------------------
# Step 1: Build full CSV with card metadata
# -----------------------------
data_folder = "data"
all_cards = []

for serie_item in os.listdir(data_folder):
    serie_path = os.path.join(data_folder, serie_item)
    if not os.path.isdir(serie_path):
        continue

    serie_file = os.path.join(data_folder, f"{serie_item}.ts")
    if not os.path.exists(serie_file):
        print(f"Warning: Serie metadata file not found for {serie_item}, skipping.")
        continue

    with open(serie_file, "r", encoding="utf-8") as f:
        content = f.read()

    serie_name_match = re.search(r'name:\s*{[^}]*en:\s*"([^"]+)"', content)
    serie_name = serie_name_match.group(1) if serie_name_match else ""

    serie_id_match = re.search(r'id:\s*"([^"]+)"', content)
    serie_id = serie_id_match.group(1) if serie_id_match else ""

    for set_item in os.listdir(serie_path):
        set_path = os.path.join(serie_path, set_item)
        if not os.path.isdir(set_path):
            continue

        set_file = os.path.join(serie_path, f"{set_item}.ts")
        if not os.path.exists(set_file):
            print(f"Warning: Metadata file not found for set {set_item}, skipping.")
            continue

        with open(set_file, "r", encoding="utf-8") as f:
            set_content = f.read()

        set_id_match = re.search(r'id:\s*"([^"]+)"', set_content)
        set_id = set_id_match.group(1) if set_id_match else ""

        set_name_match = re.search(r'name:\s*{[^}]*en:\s*"([^"]+)"', set_content)
        set_name = set_name_match.group(1) if set_name_match else ""

        release_date_match = re.search(r'releaseDate:\s*"([^"]+)"', set_content)
        release_date = release_date_match.group(1) if release_date_match else ""

        for file in os.listdir(set_path):
            if not file.endswith(".ts") or not file[:-3].isdigit():
                continue

            internal_id = int(file[:-3])

            file_path = os.path.join(set_path, file)
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            if 'category: "Pokemon"' not in content:
                continue

            rarity_match = re.search(r'rarity:\s*"([^"]+)"', content)
            rarity = rarity_match.group(1) if rarity_match else ""

            name_match = re.search(r'name:\s*{[^}]*en:\s*"([^"]+)"', content)
            name = name_match.group(1) if name_match else ""

            all_cards.append({
                "internal_id": internal_id,
                "name": name,
                "rarity": rarity,
                "serie_id": serie_id,
                "serie_name": serie_name,
                "set_id": set_id,
                "set_name": set_name,
                "release_date": release_date
            })

cards_df = pd.DataFrame(all_cards)
cards_df.sort_values(by=["serie_id", "set_id", "internal_id"], inplace=True)
cards_df.to_csv("pokemon_cards.csv", index=False)
print(f"CSV created successfully! Total cards: {len(all_cards)}")

# -----------------------------
# Step 2: Merge price evolution
# -----------------------------
PRICES_ROOT = "eng_pokemon_cards"
price_rows = []

for _, card in cards_df.iterrows():
    set_id = card["set_id"]
    internal_id = card["internal_id"]
    price_file = os.path.join(PRICES_ROOT, set_id, f"{internal_id}.tcgplayer.json")

    if not os.path.isfile(price_file):
        print(f"Price file missing: {price_file}")
        continue

    with open(price_file, "r", encoding="utf-8") as f:
        price_data = json.load(f)

    for condition, cond_data in price_data.get("data", {}).items():
        history = cond_data.get("history", {})
        for date, values in history.items():
            price_rows.append({
                "date": date,
                "condition": condition,
                "avg": values.get("avg"),
                "count": values.get("count"),
                "min": values.get("min"),
                "max": values.get("max"),
                "internal_id": internal_id,
                "name": card["name"],
                "rarity": card["rarity"],
                "set_id": set_id,
                "set_name": card["set_name"],
                "serie_id": card["serie_id"],
                "serie_name": card["serie_name"],
                "release_date": card["release_date"]
            })

# -----------------------------
# Step 3: Save price evolution CSV
# -----------------------------
price_df = pd.DataFrame(price_rows)
price_df.sort_values(by=["serie_id", "set_id", "internal_id", "date"], inplace=True)
price_df.to_csv("pokemon_cards_price_evolution.csv", index=False)
print(f"Price evolution CSV created! Total rows: {len(price_df)}")
