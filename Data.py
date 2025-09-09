import os
import json
from collections import defaultdict
from tcgdexsdk import TCGdex

PRICES_ROOT = "eng_pokemon_cards"  # <-- change this to your local repo path

def load_price_data(set_id, local_id):
    """
    Load pricing JSON for a card given set_id and localId.
    Example: base1/1.tcgplayer.json
    """
    set_path = os.path.join(PRICES_ROOT, set_id)
    if not os.path.isdir(set_path):
        return None

    filename = f"{local_id}.tcgplayer.json"
    file_path = os.path.join(set_path, filename)
    if not os.path.isfile(file_path):
        return None

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Failed to load pricing for {set_id}/{local_id}: {e}")
        return None

def fetch_cards_with_external_pricing(language="en"):
    sdk = TCGdex(language)
    data_by_set = defaultdict(list)

    sets = sdk.set.listSync()
    for s in sets:
        set_id = s.id
        set_data = sdk.set.getSync(set_id)

        print(f"Processing set: {set_id}")

        for card_ref in set_data.cards:
            card = sdk.card.getSync(card_ref.id)
            print(card.name)

            # attach external pricing
            external_price = load_price_data(set_id, card.localId)

            card_info = {
                "id": card.id,
                "localId": card.localId,
                "name": card.name,
                "types": getattr(card, "types", None),
                "hp": getattr(card, "hp", None),
                "rarity": getattr(card, "rarity", None),
                "pricing": external_price
            }
            data_by_set[set_id].append(card_info)

    return data_by_set

def save_to_file(data, filename="cards_with_external_prices.json"):
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    data = fetch_cards_with_external_pricing()
    save_to_file(data)
    print("Saved merged card data with external pricing.")
