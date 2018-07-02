var cgen = (function() {

    function Character() {
	this.name = "";
	this.cls = "";
	this.race = "";
	this.backstory = "";
	this.abilities = {
	    str:roll(3, 6),
	    int:roll(3, 6),
	    wis:roll(3, 6),
	    dex:roll(3, 6),
	    con:roll(3, 6),
	    cha:roll(3, 6)
	};
	this.buffer = 0;
	this.ability_adjs = {
	    str:0,
	    int:0,
	    wis:0,
	    dex:0,
	    con:0,
	    cha:0
	};
	this.level = 1;
	this.xp = 0;
	this.additional_languages = [];
	this.starting_gp = roll(2,6) * 10;
	this.packs = [ "Basic Pack" ];
    }
    
    Character.prototype.inc_ability = function(ability) {
	if (this.buffer > 0) {
	    this.buffer--;
	    this.ability_adjs[ability]++;
	}
    };
    
    Character.prototype.is_inc_ability_allowed = function(ability) {
	return ability != "con" && ability != "cha" && this.buffer > 0 && this.calc_effective_ability(ability) < 18;
    }
    
    Character.prototype.dec_ability = function(ability) {
	if (this.calc_effective_ability(ability) >= 11) {
	    this.ability_adjs[ability] -= 2;
	    this.buffer++;
	}
    };
    
    Character.prototype.is_dec_ability_allowed = function(ability) {
	return ability != "con" && ability != "cha" && this.calc_effective_ability(ability) >= 11;
    };
    
    Character.prototype.calc_effective_ability = function(ability) {
	var value = this.abilities[ability] + this.ability_adjs[ability];
	if (this.race && RACE_RULES[this.race].ability_maxes) {
	    var race_max = RACE_RULES[this.race].ability_maxes[ability];
	    if (race_max) {
		return Math.min(value, race_max);
	    }
	}
	return value;
    };
    
    Character.prototype.reset_ability_adjs = function() {
	this.ability_adjs = {
	    str:0,
	    int:0,
	    wis:0,
	    dex:0,
	    con:0,
	    cha:0
	};
	this.buffer = 0;
    }

    Character.prototype.set_class = function(cls) {
	if (!cls || CLASS_RULES[cls].is_allowed(this)) {
	    this.cls = cls;
	}
	if (this.race && !RACE_RULES[this.race].is_allowed(this)) {
	    this.race = "";
	}
    };
    
    Character.prototype.set_race = function(race) {
	if (!race || RACE_RULES[race].is_allowed(this)) {
	    this.race = race;
	}
	if (this.cls && !CLASS_RULES[this.cls].is_allowed(this)) {
	    this.cls = "";
	}
    };
    
    Character.prototype.calc_save = function(save) {
	if (this.cls) {
	    return CLASS_RULES[this.cls]["saves"][save];
	}
    };
    
    Character.prototype.calc_save_mod = function(save) {
	if (this.race && RACE_RULES[this.race].save_mods && RACE_RULES[this.race].save_mods ) {
	    return RACE_RULES[this.race].save_mods[save];
	}
    };

    Character.prototype.calc_hd = function() {
	if (this.race && this.cls && RACE_RULES[this.race].hd) {
	    return Math.min(RACE_RULES[this.race].hd, CLASS_RULES[this.cls].hd);
	}
	else if (this.cls) {
	    return CLASS_RULES[this.cls].hd;
	}
    };
    
    Character.prototype.calc_hp = function() {
	return this.calc_max_hp();
    };
    
    Character.prototype.calc_max_hp = function() {
	var hd = this.calc_hd();
	if (hd) {
	    return Math.max(hd, hd + this.calc_effective_ability_mod("con"));
	}
    }
    
    Character.prototype.calc_xp_mod = function() {
	if (this.race == "Human") {
	    return 10;
	}
	else {
	    return 0;
	}
    };
    
    Character.prototype.calc_next_level_xp = function() {
	if (this.cls) {
	    return CLASS_RULES[this.cls].next_level_xp;
	}
    };
    
    Character.prototype.calc_attack_bonus = function() {
	return 1;
    };
    
    Character.prototype.calc_languages = function() {
	var languages = [ "Common" ];
	if (this.race && this.race != "Human") {
	    languages.push(this.race);
	}
	var additional = this.calc_effective_ability_mod("int");
	if (additional > 0) {
	    languages.push(additional + " additional");
	}
	return languages;
    };
    
    Character.prototype.calc_effective_ability_mod = function(ability) {
	var value = this.calc_effective_ability(ability);
	if (value == 3) {
	    return -3;
	}
	else if (value >= 4 && value <= 5) {
	    return -2;
	}
	else if (value >= 6 && value <= 8) {
	    return -1
	}
	else if (value >= 9 && value <= 12) {
	    return 0;
	}
	else if (value >= 13 && value <= 15) {
	    return 1;
	}
	else if (value >= 16 && value <= 17) {
	    return 2;
	}
	else if (value == 18) {
	    return 3;
	}
    };
    
    Character.prototype.set_packs = function(packs) {
	this.packs = [ "Basic Pack" ];
	for (var i = 0, len = packs.length; i < len; i++) {
	    if (EQUIPMENT_PACKS[packs[i]] && EQUIPMENT_PACKS[packs[i]].is_allowed(this)) {
		this.packs.push(packs[i]);
	    }
	}
    };

    Character.prototype.calc_armor = function() {
	for (var i = 0, ilen = this.packs.length; i < ilen; i++) {
	    var pack = EQUIPMENT_PACKS[this.packs[i]];
	    if (pack && pack.armor) {
		for (j = 0, jlen = pack.armor.length; j < jlen; j++) {
		    if (pack.armor[j].ac) {
			return pack.armor[j];
		    }
		}
	    }
	}
    };
    
    Character.prototype.calc_effective_ac = function() {
	var ac = 11;
	for (var i = 0, ilen = this.packs.length; i < ilen; i++) {
	    var pack = EQUIPMENT_PACKS[this.packs[i]];
	    if (pack && pack.armor) {
		for (j = 0, jlen = pack.armor.length; j < jlen; j++) {
		    if (pack.armor[j].ac) {
			ac = pack.armor[j].ac;
		    }
		    if (pack.armor[j].mod) {
			ac = ac + pack.armor[j].mod;
		    }
		}
	    }
	}
	return ac + this.calc_effective_ability_mod("dex");
    };

    Character.prototype.calc_effective_to_hit = function(weapon, mode) {
	var mod = 0;
	if (mode == "melee") {
	    mod = this.calc_effective_ability_mod("str");
	}
	else if (mode == "ranged") {
	    mod = this.calc_effective_ability_mod("dex");
	}
	return this.calc_attack_bonus() + mod;
    };

    Character.prototype.calc_gp = function() {
	var gp = this.starting_gp;
	for (var i = 0, len = this.packs.length; i < len; i++) {
	    var pack = EQUIPMENT_PACKS[this.packs[i]];
	    if (pack && pack.gp) {
		gp += pack.gp;
	    }
	    if (pack && pack.cost) {
		gp -= pack.cost;
	    }
	}
	return gp;
    };

    Character.prototype.calc_weight = function() {
	var weight = 0;
	for (var i = 0, len = this.packs.length; i < len; i++) {
	    var pack = EQUIPMENT_PACKS[this.packs[i]];
	    if (pack && pack.weight) {
		weight += pack.weight;
	    }
	}
	return weight;
    };

    Character.prototype.calc_load = function() {
	if (this.race) {
	    var thresholds = LOAD_RULES[this.race][this.abilities.str];
	    var weight = this.calc_weight();
	    if (weight <= thresholds[0]) {
		return "lightly loaded";
	    }
	    else if (weight <= thresholds[1]) {
		return "heavily loaded";
	    }
	    else {
		return "overloaded";
	    }
	}
	else {
	    return "lightly loaded";
	}
    };
    
    Character.prototype.calc_movement = function() {
	var load = this.calc_load();
	if (load == "overloaded") {
	    return 0;
	}
	else {
	    var armor = this.calc_armor();
	    if (armor) {
		return armor.movement[load];
	    }
	    else if (load == "lightly loaded") {
		return 40;
	    }
	    else if (load == "heavily loaded") {
		return 30;
	    }
	    else {
		return 0;
	    }
	}
    };

    // xxx

    var LOAD_RULES = {
	"Human" : {
	    // str: [light, heavy]
	    3: [25, 60],
	    4: [35, 90],
	    5: [35, 90],
	    6: [50, 120],
	    7: [50, 120],
	    8: [50, 120],
	    9: [60, 150],
	    10: [60, 150],
	    11: [60, 150],
	    12: [60, 150],
	    13: [65, 165],
	    14: [65, 165],
	    15: [65, 165],
	    16: [70, 180],
	    17: [70, 180],
	    18: [80, 195]
	},
	"Halfling" : {
	    3: [20, 40],
	    4: [30, 60],
	    5: [30, 60],
	    6: [40, 80],
	    7: [40, 80],
	    8: [40, 80],
	    9: [50, 100],
	    10: [50, 100],
	    11: [50, 100],
	    12: [50, 100],
	    13: [55, 110],
	    14: [55, 110],
	    15: [55, 110],
	    16: [60, 120],
	    17: [60, 120],
	    18: [65, 130]
	}
    }

    LOAD_RULES["Elf"] = LOAD_RULES["Dwarf"] = LOAD_RULES["Human"];
    
    var CLASS_RULES = {
	"Fighter" : {
	    is_allowed : function(character) { return character.calc_effective_ability("str") >= 9; },
	    hd : 8,
	    next_level_xp : 2000,
	    saves : { "death":12, "wands":13, "paralysis":14, "breath":15, "spells":17 }
	},
	"Cleric" : {
	    is_allowed : function(character) { return character.calc_effective_ability("wis") >= 9; },
	    hd : 6,
	    next_level_xp : 1500,
	    saves: { "death":11, "wands":12, "paralysis":14, "breath":16, "spells":15 }
	},
	"Thief" : {
	    is_allowed : function(character) { return character.calc_effective_ability("dex") >= 9; },
	    hd : 4,
	    next_level_xp : 1250,
	    saves: { "death":13, "wands":14, "paralysis":13, "breath":16, "spells":15 }
	},
	"Magic User" : {
	    is_allowed : function(character) { return character.calc_effective_ability("int") >= 9; },
	    hd : 4,
	    next_level_xp : 2500,
	    saves : { "death":13, "wands":14, "paralysis":13, "breath":16, "spells":15 }
	},
	"Fighter/Magic User" : {
	    is_allowed : function(character) { return character.calc_effective_ability("int") >= 9 && character.calc_effective_ability("str") >= 9 && character.race == "Elf"; },
	    hd : 6,
	    next_level_xp : 4500, // fighter + magic user
	    saves : { "death":12, "wands":13, "paralysis":13, "breath":15, "spells":15 }
	},
	"Magic User/Thief" : {
	    is_allowed : function(character) { return character.calc_effective_ability("dex") >= 9 && character.calc_effective_ability("int") >= 9 && character.race == "Elf"; },
	    hd : 4,
	    next_level_xp : 3750, // magic user + thief
	    saves: { "death":13, "wands":14, "paralysis":13, "breath":16, "spells":15 }
	},
    };
    
    var RACE_RULES = {
	"Human" : {
	    is_allowed : function(character) { return true; },
	},
	"Dwarf" : {
	    is_allowed : function(character) { return character.calc_effective_ability("con") >= 9; },
	    ability_maxes : { "cha" : 17 },
	    classes : ["Fighter", "Cleric", "Thief"],
	    save_mods : { "death":4, "wands":4, "paralysis":4, "breath":3, "spells":4 }
	},
	"Elf" : {
	    is_allowed: function(character) { return character.calc_effective_ability("int") >= 9 },
	    hd : 6,
	    ability_maxes : { "con" : 17 },
	    save_mods : { "paralysis":1, "wands":2, "spells":2 }
	},
	"Halfling" : {
	    is_allowed :function(character) { return character.calc_effective_ability("dex") >= 9},
	    hd:6,
	    ability_maxes : { "str" : 17},
	    classes : [ "Fighter", "Cleric", "Thief" ],
	    save_mods : { "death":4, "wands":4, "paralysis":4, "breath":3, "spells":4 }
	}
    };

    var ARMOR_AND_SHIELDS = {
    	"Leather Armor" : {
	    name: "Leather Armor",
	    ac: 13,
	    movement: { "lightly loaded" : 40, "heavily loaded" : 30 }
	},
    	"Chain Mail" : {
	    name: "Chain Mail",
	    ac: 15,
	    movement: { "lightly loaded" : 40, "heavily loaded" : 30 }
	},
    	"Plate Mail" : {
	    name: "Plate Mail",
	    ac: 17,
	    movement: { "lightly loaded" : 40, "heavily loaded" : 30 }
	},
    	"Shield" : {
	    name: "Shield",
	    mod: 1
	}
    };

    var WEAPONS = {
	"Dagger" : {
	    name: "Dagger",
	    damage: 4,
	    modes: [ "melee", "ranged" ]
	},
	"Shortsword" : {
	    name: "Shortsword",
	    damage: 6,
	    modes: [ "melee" ]
	},
	"Longsword" : {
	    name: "Longsword",
	    damage: 8,
	    modes: [ "melee" ]
	},
	"Polearm" : {
	    name: "Polearm",
	    damage: 10,
	    modes: [ "melee" ]
	},
	"Shortbow Arrow" : {
	    name: "Shortbow Arrow",
	    damage: 6,
	    modes: [ "ranged" ]
	},
	"Walking Staff" : {
	    name: "Walking Staff",
	    damage: 4,
	    modes: [ "melee" ]
	},
	"Maul" : {
	    name: "Maul",
	    damage: 10,
	    modes: [ "melee" ]
	},
	"Mace" : {
	    name: "Mace",
	    damage: 8,
	    modes: [ "melee" ]
	},
	"Sling Bullet" : {
	    name: "Sling Bullet",
	    damage: 4,
	    modes: [ "ranged" ]
	}
    };

    var CLASS_EQUIPMENT_PACKS = {
	"Fighter Pack 1" : {
	    is_allowed: function(character) { return character.cls == "Fighter" || character.cls == "Fighter/Magic User"; },
	    weight: 49,
	    items: [],
	    armor: [ ARMOR_AND_SHIELDS["Chain Mail"],
		     ARMOR_AND_SHIELDS["Shield"] ],
	    weapons: [ WEAPONS["Longsword"] ],
	    cost: 0
	},
	"Fighter Pack 2" : {
	    is_allowed: function(character) { return character.cls == "Fighter" || character.cls == "Fighter/Magic User"; },
	    weight: 55,
	    items: [],
	    armor: [ ARMOR_AND_SHIELDS["Chain Mail"] ],
	    weapons: [ WEAPONS["Polearm"] ],
	    cost: 0
	},
	"Fighter Pack 3" : {
	    is_allowed: function(character) { return character.cls == "Fighter" || character.cls == "Fighter/Magic User"; },
	    weight: 25,
	    items: [ { name: "Quiver" },
		     { name: "Shortbow" } ],
	    armor: [ ARMOR_AND_SHIELDS["Leather Armor"] ],
	    weapons: [ WEAPONS["Longsword"],
		       merge([{qty:30}, WEAPONS["Shortbow Arrow"]]) ],
	    cost: 0
	},
	"Magic User Pack 1" : {
	    is_allowed: function(character) { return character.cls == "Magic User" || character.cls == "Fighter/Magic User" || character.cls == "Magic User/Thief"; },
	    weight: 3,
	    items: [ { name: "Spell Scroll" } ],
	    weapons: [ merge([{qty:2}, WEAPONS["Dagger"]]),
		       WEAPONS["Walking Staff"] ],
	    cost: 0
	},
	"Magic User Pack 2" : {
	    is_allowed: function(character) { return character.cls == "Magic User" || character.cls == "Fighter/Magic User" || character.cls == "Magic User/Thief"; },
	    weight: 3,
	    items: [],
	    weapons: [ merge([{qty:2}, WEAPONS["Dagger"]]),
		       WEAPONS["Walking Staff"] ],
	    gp: 50,
	    cost: 0
	},
	"Cleric Pack 1" : {
	    is_allowed: function(character) { return character.cls == "Cleric"; },
	    weight: 30,
	    items: [ { name: "Holy Symbol" },
		     { name: "Holy Water, Vial", qty: 1 } ],
	    armor: [ ARMOR_AND_SHIELDS["Leather Armor"],
		     ARMOR_AND_SHIELDS["Shield"] ],
	    weapons: [ WEAPONS["Mace" ] ],
	    cost: 0
	},
	"Cleric Pack 2" : {
	    is_allowed: function(character) { return character.cls == "Cleric"; },
	    weight: 34,
	    items: [ { name: "Holy Symbol" },
		     { name: "Holy Water, Vial", qty: 1 },
		     { name: "Sling" } ],
	    armor: [ ARMOR_AND_SHIELDS["Chain Mail"] ],
	    weapons: [ WEAPONS["Maul"],
		       merge([{qty:30}, WEAPONS["Sling Bullet"]]) ],
	    cost: 0
	},
	"Thief Pack" : {
	    is_allowed: function(character) { return character.cls == "Thief" || character.cls == "Magic User/Thief"; },
	    weight: 23,
	    items: [
		{ "name" : "Thieves' picks and tools" },
		{ "name" : "Rope, silk (50')" }
	    ],
	    armor: [ ARMOR_AND_SHIELDS["Leather Armor"] ],
	    weapons: [
		WEAPONS["Dagger"],
		WEAPONS["Shortsword"]
	    ],
	    cost: 0
	}
    }

    var OTHER_EQUIPMENT_PACKS = {
    	"Basic Pack" : {
	    is_allowed: function(character) { return true; },
	    weight: 22,
	    items: [
    		{ "name" : "Backpack" },
    		{ "name" : "Torch", qty: 6 },
    		{ "name" : "Tinderbox, flint and steel" },
    		{ "name" : "Wineskin/Waterskin" },
    		{ "name" : "Winter blanket" },
    		{ "name" : "Dry rations", qty: 7 },
    		{ "name" : "Large sack" },
    		{ "name" : "Small sack", qty: 2 }
	    ]
    	},
	"Bonus Pack 1" : {
	    is_allowed: function(character) { return true; },
	    weight: 29,
	    items: [
		{ name: "Chalk, bag" },
		{ name: "Grappling Hook" },
		{ name: "Rope, hemp (50')", qty:2 },
		{ name: "Lantern, hooded" },
		{ name: "Oil, flask", qty:3},
		{ name: "Tent, small" }
	    ],
	    cost: 20
	},
	"Bonus Pack 2" : {
	    is_allowed: function(character) { return true; },
	    weight: 12,
	    items: [
		{ name: "Glass bottle" },
		{ name: "Iron spike", qty: 12 },
		{ name: "Wooden pole, 10'" },
		{ name: "Map/scroll case" },
		{ name: "Mirror, small metal" }
	    ],
	    cost: 10
	}
    };

    var EQUIPMENT_PACKS = merge([CLASS_EQUIPMENT_PACKS, OTHER_EQUIPMENT_PACKS]);

    // general

    function roll(num, die) {
	var n = 0;
	for (var i = 0; i < num; i++) {
	    n = n + Math.floor((Math.random() * die) + 1);
	}
	return n;
    }
    
    function format_mod(mod) {
	if (mod > 0) {
	    return "+" + mod;
	}
	else if (mod < 0) {
	    return mod;
	}
	else {
	    return "";
	}
    }
    
    function format_mod_pct(mod) {
	if (mod != 0) {
	    return mod + "%";
	}
	else {
	    return "0%";
	}
    }

    function add_select_options(select, opts) {
	for (var i = 0, len = opts.length; i < len; i++) {
	    var opt = document.createElement("option");
	    opt.value = opts[i];
	    opt.innerHTML = opts[i];
	    select.appendChild(opt);
	}
    }

    function merge(hs) {
	var merged = {};
	for (var i = 0, len = hs.length; i < len; i++) {
	    for (p in hs[i]) {
		if (hs[i].hasOwnProperty(p)) {
		    merged[p] = hs[i][p];
		}
	    }
	}
	return merged;
    }

    // screen update functions
    
    function update_abilities() {
	
	var abilities = [ "str", "int", "wis", "dex", "con", "cha" ];
	
	for (var i = 0, len = abilities.length; i < len; i++) {
	    
	    var ability = abilities[i];
	    var value = ch.calc_effective_ability(ability);
	    document.getElementById(ability).innerText = value;
	    
	    var dec = document.getElementById("dec" + ability);
	    if (dec) {
		if (ch.is_dec_ability_allowed(ability)) {
		    dec.disabled = false;
		    dec.classList.remove("disabled");
		    (function() {
			var a = ability;
			dec.onclick = function() {
			    ch.dec_ability(a);
			    update();
			    return false;
			};
		    })();
		}
		else {
		    dec.disabled = true;
		    dec.classList.add("disabled");
		    dec.removeAttribute("onclick");
		}
	    }

	    var inc = document.getElementById("inc" + ability);
	    if (inc) {
		if (ch.is_inc_ability_allowed(ability)) {
		    inc.disabled = false;
		    inc.classList.remove("disabled");
		    (function() {
			var a = ability;
			inc.onclick = function() {
			    ch.inc_ability(a);
			    update();
			    return false;
			};
		    })();
		}
		else {
		    inc.disabled = true;
		    inc.classList.add("disabled");
		    inc.removeAttribute("onclick");
		}
	    }

	    document.getElementById(ability + "mod").innerText = format_mod(ch.calc_effective_ability_mod(ability));
	    
	}
	
	document.getElementById("buffer").innerText = ch.buffer;

    }

    function update_class_options() {
	var cls = document.getElementById("cls");
	for (var i = 0, len = cls.options.length; i < len; i++) {
	    var opt = cls.item(i);
	    var value = opt.value;
	    if (!value) {
		opt.disabled = false;
	    }
	    else if (CLASS_RULES[value].is_allowed(ch)) {
		opt.disabled = false;
	    }
	    else {
		opt.disabled = true;
	    }
	}
    }
    
    function update_hd_hp() {
	var hd = ch.calc_hd();
	document.getElementById("hd").innerText = hd ? hd : "-";
	var hp = ch.calc_hp()
	document.getElementById("hp").innerText = hp ? hp : "-";
	var max_hp = ch.calc_max_hp()
	document.getElementById("max_hp").innerText = hp ? hp : "-";
    }

    function update_movement() {
	var movement = ch.calc_movement();
	document.getElementById("movement").innerText = movement + "'";
	var weight = ch.calc_weight();
	document.getElementById("weight").innerText = weight + " lbs.";
	var load = ch.calc_load();
	document.getElementById("load").innerText = load;
    }
    
    function update_race_options() {
	var race = document.getElementById("race");
	for (var i = 0, len = race.options.length; i  < len; i++) {
	    var opt = race.item(i);
	    var value = opt.value;
	    if (!value) {
		opt.disabled = false;
	    }
	    else if (RACE_RULES[value].is_allowed(ch)) {
		opt.disabled = false;
	    }
	    else {
		opt.disabled = true;
	    }
	}
    }
    
    function update_xp() {
	var next_level_xp = ch.calc_next_level_xp();
	document.getElementById("next_level_xp").innerText = next_level_xp ? next_level_xp : "-";
	document.getElementById("xp").innerText = ch.xp;
	document.getElementById("xp_mod").innerText = format_mod_pct(ch.calc_xp_mod());
	document.getElementById("attack_bonus").innerText = ch.calc_attack_bonus();
    }
    
    function update_saving_throws() {
	var saves = [ "death", "wands", "paralysis", "breath", "spells" ];
	for (var i = 0, len = saves.length; i < len; i++) {
	    var save = ch.calc_save(saves[i]);
	    document.getElementById(saves[i]).innerText = save ? save : "-";
	    var save_mod = ch.calc_save_mod(saves[i]);
	    document.getElementById(saves[i] + "mod").innerText = save_mod ? format_mod(save_mod) : "";
	}
    }
    
    function update_languages() {
	var lang_items = document.getElementById("languages");
	lang_items.innerHTML = "";
	var languages = ch.calc_languages();
	for (var i = 0, len = languages.length; i < len; i++) {
	    lang_items.innerHTML+="<li>"+languages[i]+"</li>";
	}
    }
    
    function update_class_skills() {
	var clses = [ "Cleric", "Thief" ];
	for (var i = 0, len = clses.length; i < len; i++) {
	    var skills = document.getElementById(clses[i]);
	    if (ch.cls.indexOf(clses[i]) != -1) {
		skills.classList.remove("hidden");
	    }
	    else {
		skills.classList.add("hidden");
	    }
	}
    }

    function update_race_description() {
	for (var race in RACE_RULES) {
	    var note = document.getElementById(race);
	    if (note) {
		if (ch.race == race) {
		    note.classList.remove("hidden");
		}
		else {
		    note.classList.add("hidden");
		}
	    }
	}
    }

    function update_equipment_options() {
	var equipment = document.getElementById("equipment");
	for (var i = 0, len = equipment.options.length; i < len; i++) {
	    var opt = equipment.item(i);
	    var value = opt.value;
	    if (!value) {
		opt.disabled = false;
	    }
	    else if (EQUIPMENT_PACKS[value].is_allowed(ch)) {
		opt.disabled = false;
	    }
	    else {
		opt.disabled = true;
	    }
	}
    }
    
    function update_inventory() {
	document.getElementById("gp").innerText = ch.calc_gp();
	var tbl = "<tr><th>Qty</th><th>Name</th></tr>";
	for (var i = 0, ilen = ch.packs.length; i < ilen; i++) {
	    var pack = EQUIPMENT_PACKS[ch.packs[i]];
	    for (var j = 0, jlen = pack.items.length; j < jlen; j++) {
		tbl = tbl + "<tr><td>" + (pack.items[j].qty ? pack.items[j].qty : 1) + "</td><td>" + pack.items[j].name + "</td></tr>";
	    }
	}
	var inventory = document.getElementById("inventory").innerHTML = tbl;
    }

    function format_to_hit(weapon) {
	var to_hit = [];
	if (weapon.modes.length > 1) {
	    for (var k = 0, klen = weapon.modes.length; k < klen; k++) {
		var val = ch.calc_effective_to_hit(weapon, weapon.modes[k]);
		if (val != 0) {
		    to_hit.push(format_mod(val) + " " + weapon.modes[k]);
		}
	    }
	}
	else {
	    to_hit.push(format_mod(ch.calc_effective_to_hit(weapon, weapon.modes[0])));
	}
	return to_hit.join(", ");
    }

    function format_damage_mode(weapon, mode) {
	if (mode == "melee") {
	    var mod = ch.calc_effective_ability_mod("str");
	    if (mod != 0) {
		return "1d"  + weapon.damage + format_mod(mod);
	    }
	    else {
		return "1d" + weapon.damage;
	    }
	}
	else {
	    return "1d" + weapon.damage;
	}
    }

    function format_damage(weapon) {
	var damage = [];
	if (weapon.modes.length == 1) {
	    damage.push(format_damage_mode(weapon, weapon.modes[0]));
	}
	else {
	    for (var i = 0, len = weapon.modes.length; i < len; i++) {
		var mode = weapon.modes[i];
		damage.push(format_damage_mode(weapon, weapon.modes[i]) + " " + weapon.modes[i]);
	    }
	}
	return damage.join(",");
    }
    
    function update_weapons() {
	var tbl = "<tr><th>Qty</th><th>Name</th><th>To Hit Mod</th><th>Damage</th></tr>";
	for (var i = 0, ilen = ch.packs.length; i < ilen; i++) {
	    var pack = EQUIPMENT_PACKS[ch.packs[i]];
	    if (pack.weapons) {
		for (var j = 0, jlen = pack.weapons.length; j < jlen; j++) {
		    var to_hit = format_to_hit(pack.weapons[j]);
		    var damage = format_damage(pack.weapons[j]);
		    tbl = tbl + "<tr>" +
			"<td>" + (pack.weapons[j].qty ? pack.weapons[j].qty : 1) + "</td>" +
			"<td>" + pack.weapons[j].name + "</td>" +
			"<td>" + to_hit + "</td>" +
			"<td>" + damage + "</td>" +
			"</tr>";
		}
	    }
	}
	document.getElementById("weapons").innerHTML = tbl;
    }	
    
    function update_armor() {
	document.getElementById("ac").innerText = ch.calc_effective_ac();
	var tbl = "<tr><th>Qty</th><th>Name</th><th>AC</th><tr>";
	for (var i = 0, ilen = ch.packs.length; i < ilen; i++) {
	    var pack = EQUIPMENT_PACKS[ch.packs[i]];
	    if (pack.armor) {
		for (var j = 0, jlen = pack.armor.length; j < jlen; j++) {
		    tbl = tbl + "<tr><td>" + (pack.armor[j].qty ? pack.armor[j].qty : 1) + "</td><td>" + pack.armor[j].name + "</td><td>" + (pack.armor[j].ac ? pack.armor[j].ac : format_mod(pack.armor[j].mod)) + "</td></tr>";
		}
	    }
	}
	document.getElementById("armor").innerHTML = tbl;
    }

    function update() {
	update_abilities();
	update_race_options();
	update_class_options();
	update_equipment_options();
	update_hd_hp();
	update_movement();
	update_xp();
	update_saving_throws();
	update_languages();
	update_class_skills();
	update_race_description();
	update_inventory();
	update_weapons();
	update_armor();
    }
    
    // screen setup functions

    function init_race() {
	var race = document.getElementById("race");
	add_select_options(race, Object.keys(RACE_RULES));
	race.onchange = function(e) { ch.set_race(e.target.value); update(); return false; };
    }

    function init_cls() {
	var cls = document.getElementById("cls");
	add_select_options(cls, Object.keys(CLASS_RULES));
	cls.onchange = function(e) { ch.set_class(e.target.value); update(); return false; };
    }

    function init_equipment() {
	var equipment = document.getElementById("equipment");
	var bonus1 = document.getElementById("bonus1");
	var bonus2 = document.getElementById("bonus2");

	add_select_options(equipment, Object.keys(CLASS_EQUIPMENT_PACKS));

	var equipment_changed = function() {
	    var packs = [];
	    if (equipment.options[equipment.selectedIndex].value) {
		packs.push(equipment.options[equipment.selectedIndex].value);
	    }
	    if (bonus1.checked) {
		packs.push(bonus1.value);
	    }
	    if (bonus2.checked) {
		packs.push(bonus2.value);
	    }
	    ch.set_packs(packs);
	    update();
	};
	
	equipment.onchange = equipment_changed;
	bonus1.onchange = equipment_changed;
	bonus2.onchange = equipment_changed;
    }

    function init() {
	init_race();
	init_cls();
	init_equipment();
	document.getElementById("reset").onclick = function() { ch.reset_ability_adjs(); update(); return false; };
	update();
    }
    
    // character data
    
    var ch = new Character();
    
    // export
    
    var m = {};
    m.init = init;
    return m;
    
}());