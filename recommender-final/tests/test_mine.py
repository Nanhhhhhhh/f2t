from scripts.mine_rules import mine

def test_mine_produces_rule_schema():
    baskets = [
        ["leafy", "herbs"], ["leafy", "herbs"], ["leafy", "herbs"],
        ["leafy", "fruit"], ["fruit", "honey"], ["leafy", "herbs", "fruit"],
    ]
    rules, popularity = mine(baskets, min_support=0.2, min_confidence=0.3)
    assert "leafy" in rules
    entry = rules["leafy"][0]
    assert set(entry.keys()) == {"consequent", "lift", "confidence", "support"}
    assert "leafy" in popularity and 0 <= popularity["leafy"] <= 1
