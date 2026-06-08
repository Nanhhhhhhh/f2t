import pandas as pd
from scripts.prepare_instacart import map_aisle, build_baskets

def test_map_aisle_drops_unmappable():
    cmap = {"fresh vegetables": "leafy", "milk": "dairy"}
    assert map_aisle("fresh vegetables", "lettuce", cmap) == "leafy"
    assert map_aisle("milk", "whole milk", cmap) == "dairy"
    assert map_aisle("snacks", "chips", cmap) is None

def test_map_aisle_mushroom_heuristic():
    cmap = {"fresh vegetables": "leafy"}
    assert map_aisle("fresh vegetables", "white mushroom", cmap) == "mushrooms"

def test_map_aisle_root_heuristic():
    cmap = {"fresh vegetables": "leafy"}
    assert map_aisle("fresh vegetables", "organic carrot", cmap) == "root"

def test_build_baskets_groups_distinct_categories():
    df = pd.DataFrame({
        "order_id": [1, 1, 1, 2],
        "category": ["leafy", "leafy", "dairy", "fruit"],
    })
    baskets = build_baskets(df)
    assert sorted(baskets[1]) == ["dairy", "leafy"]
    assert baskets[2] == ["fruit"]
