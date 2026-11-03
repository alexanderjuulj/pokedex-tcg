-- TCGdex gives the cards without a rarity (My First Battle, the Classic
-- Collections, some promos) the rarity "None". The pull now stores null.
update catalog_cards set rarity = null where rarity = 'None';
