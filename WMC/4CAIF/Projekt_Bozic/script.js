// ==========================================
// 1. INITIALISIERUNG
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
    const currentPage = window.location.pathname.split("/").pop();
    
    if (currentPage === 'er.html') {
        loadGameDataFromAPI();
    } else if (currentPage === 'nr.html') {
        loadNightreignData(); // NEU: Lädt das Nightreign System
    }
});

// ==========================================
// 2. BUILD ALS DATEI HERUNTERLADEN
// ==========================================

function saveBuild(gameType) {
    let buildData = {};

    if (gameType === 'eldenring') {
        let equippedItems = [];
        document.querySelectorAll('.equip-select').forEach(select => {
            // Checkt, ob wir nicht auf der Nightreign Seite sind (verhindert Bugs)
            if (select.value !== "" && !select.classList.contains('nr-equip-select')) {
                equippedItems.push(select.options[select.selectedIndex].text);
            }
        });

        buildData = {
            game: "Elden Ring",
            date: new Date().toLocaleString(),
            equipment: equippedItems
        };
    } 
    else if (gameType === 'nightreign') {
        let equippedItems = [];
        // NEU: Sammelt ALLE neuen Felder (Charaktere, Bosse, Waffen und Relikte) auf der Nightreign Seite
        document.querySelectorAll('.nr-equip-select').forEach(select => {
            if (select.value !== "") {
                // Wir speichern, was es ist (z.B. Platzhalter "Waffe 1") und wie das Item heißt
                let slotName = select.options[0].text; 
                let itemName = select.options[select.selectedIndex].text;
                equippedItems.push(`${slotName}: ${itemName}`);
            }
        });

        buildData = {
            game: "Elden Ring Nightreign",
            date: new Date().toLocaleString(),
            build: equippedItems
        };
    }

    // 1. Daten in einen formatierten JSON-Text umwandeln
    const dataString = JSON.stringify(buildData, null, 4);

    // 2. Aus dem Text eine (Blob) Datei machen
    const blob = new Blob([dataString], { type: "application/json" });

    // 3. Einen unsichtbaren Download-Link auf der Seite generieren
    const url = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    
    // So heoßt die Datei in deinem Download-Ordner
    downloadLink.download = `${gameType}_build.json`; 

    // 4. Den Link automatisch anklicken, um den Download zu starten, und danach aufräumen
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
}

// ==========================================
// 3. ELDEN RING PLANER LOGIK (API, DOM, MATH)
// ==========================================

let fetchedWeapons = []; 
let fetchedArmors = [];
let fetchedTalismans = [];
let fetchedAmmos = [];

const wondrousTears = [
    { id: "t1", name: "Purpurkristallträne", type: "Träne", weight: 0.0, effect: "Stellt die Hälfte der LP wieder her." },
    { id: "t2", name: "Purpurrote Blasenträne", type: "Träne", weight: 0.0, effect: "Heilt LP, wenn sie kurz vor dem Tod sind." },
    { id: "t3", name: "Himmelblaue Kristallträne", type: "Träne", weight: 0.0, effect: "Stellt die Hälfte der FP wieder her." },
    { id: "t4", name: "Himmelblaue Geheimnisträne", type: "Träne", weight: 0.0, effect: "Kein FP-Verbrauch für 15 Sekunden." },
    { id: "t5", name: "Grünspill-Kristallträne", type: "Träne", weight: 0.0, effect: "Erhöht max. Ausdauer." },
    { id: "t6", name: "Grünspreng-Kristallträne", type: "Träne", weight: 0.0, effect: "Erhöht Ausdauerregeneration drastisch." },
    { id: "t7", name: "Bleiharte Flaschenträne", type: "Träne", weight: 0.0, effect: "Erhöht Gleichgewicht (Poise) enorm für 10s." },
    { id: "t8", name: "Opalene Blasenträne", type: "Träne", weight: 0.0, effect: "Negiert 90% des Schadens eines Angriffs." },
    { id: "t9", name: "Opalene Verhärtungsträne", type: "Träne", weight: 0.0, effect: "Erhöht alle Schadensnegierungen für 3 Min." },
    { id: "t10", name: "Flammenspalt-Kristallträne", type: "Träne", weight: 0.0, effect: "Erhöht Feuerschaden um 20%." },
    { id: "t11", name: "Magieschimmer-Kristallträne", type: "Träne", weight: 0.0, effect: "Erhöht Magieschaden um 20%." },
    { id: "t12", name: "Blitzschimmer-Kristallträne", type: "Träne", weight: 0.0, effect: "Erhöht Blitzschaden um 20%." },
    { id: "t13", name: "Heiligschimmer-Kristallträne", type: "Träne", weight: 0.0, effect: "Erhöht Heiligschaden um 20%." },
    { id: "t14", name: "Steinstachel-Kristallträne", type: "Träne", weight: 0.0, effect: "Erhöht Haltungsschaden an Gegnern." },
    { id: "t15", name: "Dornen-Kristallträne", type: "Träne", weight: 0.0, effect: "Erhöht Schaden bei aufeinanderfolgenden Angriffen." },
    { id: "t16", name: "Geflügelte Kristallträne", type: "Träne", weight: 0.0, effect: "Verringert die Ausrüstungslast auf ein Minimum." }
];

async function fetchSafe(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const data = await response.json();
        return data.data || [];
    } catch (error) {
        console.error("Fehler beim API-Abruf:", url, error);
        return [];
    }
}

async function fetchMultiplePages(endpoint, pages = 3) {
    let allResults = [];
    for (let i = 0; i < pages; i++) {
        let data = await fetchSafe(`https://eldenring.fanapis.com/api/${endpoint}?limit=100&page=${i}`);
        allResults = allResults.concat(data);
    }
    return allResults;
}

async function loadGameDataFromAPI() {
    document.getElementById('detail-name').innerText = "Schmiede Ausrüstung... (Das dauert kurz)";
    
    fetchedWeapons = await fetchMultiplePages('weapons', 4);
    fetchedArmors = await fetchMultiplePages('armors', 6); 
    fetchedTalismans = await fetchMultiplePages('talismans', 2);
    fetchedAmmos = await fetchMultiplePages('ammos', 2);

    populateDropdowns();
    calculateStats(); 
    document.getElementById('detail-name').innerText = "Wähle ein Item";
}

function populateDropdowns() {
    document.querySelectorAll('.wpn-select').forEach(select => {
        fetchedWeapons.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id; opt.textContent = item.name;
            select.appendChild(opt);
        });
    });

    document.querySelectorAll('.arm-select').forEach(select => {
        fetchedArmors.forEach(item => {
            let cat = (item.category || "").toLowerCase();
            let name = (item.name || "").toLowerCase();
            let shouldAdd = false;

            let isHead = cat.includes('helm') || cat.includes('head') || cat.includes('hood') || cat.includes('mask') || cat.includes('crown') || name.includes('helm') || name.includes('hood') || name.includes('mask');
            let isArms = cat.includes('gauntlet') || cat.includes('glove') || cat.includes('bracer') || name.includes('gauntlet') || name.includes('glove') || name.includes('bracer');
            let isLegs = cat.includes('leg') || cat.includes('greave') || cat.includes('boot') || cat.includes('trouser') || name.includes('greave') || name.includes('boot') || name.includes('legging') || name.includes('skirt') || name.includes('pant');
            let isChest = cat.includes('chest') || cat === 'armor' || cat.includes('garb') || cat.includes('robe') || name.includes('armor') || name.includes('garb') || name.includes('robe');

            if (select.classList.contains('head-select') && isHead) shouldAdd = true;
            else if (select.classList.contains('arms-select') && isArms && !isHead) shouldAdd = true;
            else if (select.classList.contains('legs-select') && isLegs && !isHead && !isArms) shouldAdd = true;
            else if (select.classList.contains('chest-select') && isChest && !isHead && !isArms && !isLegs) shouldAdd = true;

            if (shouldAdd) {
                const opt = document.createElement('option');
                opt.value = item.id; opt.textContent = item.name;
                select.appendChild(opt);
            }
        });
    });

    document.querySelectorAll('.tali-select').forEach(select => {
        fetchedTalismans.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id; opt.textContent = item.name;
            select.appendChild(opt);
        });
    });

    document.querySelectorAll('.ammo-select').forEach(select => {
        fetchedAmmos.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id; opt.textContent = item.name;
            select.appendChild(opt);
        });
    });

    document.querySelectorAll('.tear-select').forEach(select => {
        wondrousTears.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.id; opt.textContent = item.name;
            select.appendChild(opt);
        });
    });
}

function equipItem(selectElement, category) {
    const itemId = selectElement.value;
    let item = null;

    document.getElementById('tear-effect-text').style.display = 'none';

    if (!itemId) {
        selectElement.dataset.weight = 0;
        selectElement.dataset.poise = 0;
        calculateStats();
        return;
    }

    if (category === 'weapon') item = fetchedWeapons.find(i => i.id === itemId);
    if (category === 'armor') item = fetchedArmors.find(i => i.id === itemId);
    if (category === 'talisman') item = fetchedTalismans.find(i => i.id === itemId);
    if (category === 'ammo') item = fetchedAmmos.find(i => i.id === itemId);
    if (category === 'tear') item = wondrousTears.find(i => i.id === itemId);

    if (!item) return;

    document.getElementById('detail-name').innerText = item.name;
    document.getElementById('detail-type').innerText = item.category || item.type || "Ausrüstung";
    document.getElementById('detail-weight').innerText = item.weight || "0.0";

    const statsToReset = ['atk-phys', 'atk-mag', 'atk-fire', 'atk-light', 'atk-holy', 'def-phys', 'def-mag', 'def-fire', 'def-light', 'def-holy', 'req-str', 'req-dex', 'req-int', 'req-fai', 'req-arc', 'scale-str', 'scale-dex', 'scale-int', 'scale-fai', 'scale-arc'];
    statsToReset.forEach(id => document.getElementById(id).innerText = (id.includes('scale') ? '-' : '0'));
    document.getElementById('atk-crit').innerText = "100";

    const findStat = (array, searchTerms) => {
        if (!array || !Array.isArray(array)) return null;
        let found = array.find(a => {
            if (!a.name) return false;
            return searchTerms.some(term => a.name.toLowerCase().includes(term));
        });
        
        if (found) {
            if (found.scaling !== undefined && found.scaling !== null) return found.scaling;
            if (found.amount !== undefined && found.amount !== null) return found.amount;
        }
        return null;
    };

    if (category === 'weapon' || category === 'ammo') {
        const attackData = item.attack || item.attackPower || [];
        // Schadenstypen 
        document.getElementById('atk-phys').innerText = findStat(attackData, ['phy', 'physical']) || 0;
        document.getElementById('atk-mag').innerText = findStat(attackData, ['mag', 'magic']) || 0;
        document.getElementById('atk-fire').innerText = findStat(attackData, ['fire']) || 0;
        document.getElementById('atk-light').innerText = findStat(attackData, ['light', 'lightning']) || 0;
        document.getElementById('atk-holy').innerText = findStat(attackData, ['holy']) || 0;
        document.getElementById('atk-crit').innerText = findStat(attackData, ['crit', 'critical']) || 100;

        // Skalierung der Waffen
        document.getElementById('scale-str').innerText = findStat(item.scalesWith, ['str', 'strength']) || '-';
        document.getElementById('scale-dex').innerText = findStat(item.scalesWith, ['dex', 'dexterity']) || '-';
        document.getElementById('scale-int').innerText = findStat(item.scalesWith, ['int', 'intelligence']) || '-';
        document.getElementById('scale-fai').innerText = findStat(item.scalesWith, ['fai', 'faith']) || '-';
        document.getElementById('scale-arc').innerText = findStat(item.scalesWith, ['arc', 'arcane']) || '-';

        // Anforderungen für die Waffen
        document.getElementById('req-str').innerText = findStat(item.requiredAttributes, ['str', 'strength']) || 0;
        document.getElementById('req-dex').innerText = findStat(item.requiredAttributes, ['dex', 'dexterity']) || 0;
        document.getElementById('req-int').innerText = findStat(item.requiredAttributes, ['int', 'intelligence']) || 0;
        document.getElementById('req-fai').innerText = findStat(item.requiredAttributes, ['fai', 'faith']) || 0;
        document.getElementById('req-arc').innerText = findStat(item.requiredAttributes, ['arc', 'arcane']) || 0;
    }

    let itemPoise = 0;
    if (category === 'armor') {
        // Resistenzen
        document.getElementById('def-phys').innerText = findStat(item.dmgNegation, ['phy', 'physical']) || 0;
        document.getElementById('def-mag').innerText = findStat(item.dmgNegation, ['mag', 'magic']) || 0;
        document.getElementById('def-fire').innerText = findStat(item.dmgNegation, ['fire']) || 0;
        document.getElementById('def-light').innerText = findStat(item.dmgNegation, ['light', 'lightning']) || 0;
        document.getElementById('def-holy').innerText = findStat(item.dmgNegation, ['holy']) || 0;
        
        // Poise
        itemPoise = findStat(item.resistance, ['poise', 'gleichgewicht']) || 0;
    }


    if (category === 'tear' || category === 'talisman') {
        const effectEl = document.getElementById('tear-effect-text');
        effectEl.innerText = "Effekt: " + item.effect;
        effectEl.style.display = 'block';
    }

    selectElement.dataset.weight = item.weight || 0;
    selectElement.dataset.poise = itemPoise;

    calculateStats();
}

function calculateStats() {
    const vig = parseInt(document.getElementById('attr-vig').value) || 10;
    const mind = parseInt(document.getElementById('attr-mind').value) || 10;
    const end = parseInt(document.getElementById('attr-end').value) || 10;
    const arc = parseInt(document.getElementById('attr-arc').value) || 10;

    let totalStats = 0;
    ['vig', 'mind', 'end', 'str', 'dex', 'int', 'fai', 'arc'].forEach(stat => {
        totalStats += parseInt(document.getElementById('attr-' + stat).value) || 10;
    });
    document.getElementById('char-level').innerText = totalStats - 79;

    // Realistische Berechnung wie im Spiel der Verschiedenen Werte
    const calculatedHP = Math.floor(vig * 28.5 + 100); 
    const calculatedFP = Math.floor(mind * 5 + 40);
    const calculatedStamina = Math.floor(end * 1.5 + 80);
    const maxEquipLoad = (end * 1.5 + 40).toFixed(1);

    document.getElementById('stat-hp').innerText = calculatedHP;
    document.getElementById('stat-fp').innerText = calculatedFP;
    document.getElementById('stat-stam').innerText = calculatedStamina;
    document.getElementById('stat-equip-max').innerText = maxEquipLoad;
    document.getElementById('stat-discovery').innerText = (100 + arc).toFixed(1);

    let totalWeight = 0;
    let totalPoise = 0;
    
    document.querySelectorAll('.equip-select').forEach(select => {
        let weight = parseFloat(select.dataset.weight);
        let poise = parseFloat(select.dataset.poise);
        
        if (!isNaN(weight)) totalWeight += weight;
        if (!isNaN(poise)) totalPoise += poise;
    });
    
    document.getElementById('stat-equip-current').innerText = totalWeight.toFixed(1);
    document.getElementById('stat-poise').innerText = totalPoise.toFixed(0);

    // Gewicht berechnung wie im Spiel
    const weightRatio = totalWeight / parseFloat(maxEquipLoad);
    const rollStatus = document.getElementById('stat-roll');
    if (weightRatio <= 0.299) { rollStatus.innerText = "Leichte Last"; rollStatus.style.color = "lightblue"; }
    else if (weightRatio <= 0.699) { rollStatus.innerText = "Mittlere Last"; rollStatus.style.color = "lightgreen"; }
    else if (weightRatio <= 0.999) { rollStatus.innerText = "Schwere Last"; rollStatus.style.color = "orange"; }
    else { rollStatus.innerText = "Überladen!"; rollStatus.style.color = "red"; }
}

// ==========================================
// 5. NIGHTREIGN PLANER LOGIK (OFFIZIELLE DATEN)
// ==========================================

// Charaktere 
const nrCharacters = [
    { id: "c1", name: "Wylder", type: "Ausgewogener Nahkämpfer", desc: "Ein vielseitiger Kämpfer, der in jeder Situation bestehen kann.", passive: "Ausgewogene Skalierung auf alle physischen Waffen.", stats: { vig: 14, mind: 10, end: 12, str: 14, dex: 14, int: 9, fai: 9, arc: 9 } },
    { id: "c2", name: "Guardian", type: "Tank / Verteidiger", desc: "Ein Bollwerk in der Dunkelheit, fokussiert auf pure Überlebensfähigkeit.", passive: "Erhöhte Schadensnegierung bei erhobenem Schild.", stats: { vig: 16, mind: 9, end: 15, str: 16, dex: 10, int: 7, fai: 10, arc: 7 } },
    { id: "c3", name: "Ironeye", type: "Fernkämpfer (Bogen)", desc: "Trifft seine Ziele aus der Dunkelheit mit tödlicher Präzision.", passive: "Erhöhte Reichweite und Schaden mit Bögen.", stats: { vig: 11, mind: 12, end: 14, str: 10, dex: 18, int: 8, fai: 8, arc: 10 } },
    { id: "c4", name: "Duchess", type: "Schneller Assassine", desc: "Tödlich und agil, schlägt zu, bevor der Feind reagieren kann.", passive: "Kritischer Schaden durch Backstabs massiv erhöht.", stats: { vig: 10, mind: 11, end: 13, str: 9, dex: 20, int: 9, fai: 8, arc: 12 } },
    { id: "c5", name: "Raider", type: "Stärke-Bruiser", desc: "Rohe Gewalt ist die einzige Antwort auf die Nacht.", passive: "Erhöhter Haltungsschaden bei schweren Angriffen.", stats: { vig: 15, mind: 8, end: 14, str: 20, dex: 10, int: 7, fai: 8, arc: 8 } },
    { id: "c6", name: "Revenant", type: "Beschwörer / Support", desc: "Ruft Geister der Gefallenen, um für ihn zu kämpfen.", passive: "Geister-Beschwörungen verbrauchen weniger FP.", stats: { vig: 12, mind: 16, end: 10, str: 10, dex: 10, int: 14, fai: 14, arc: 10 } },
    { id: "c7", name: "Recluse", type: "Magierin", desc: "Meisterin der arkanen Künste, verborgen vor der Welt.", passive: "Zauber wirken schneller und verbrauchen weniger FP.", stats: { vig: 9, mind: 20, end: 9, str: 8, dex: 12, int: 18, fai: 7, arc: 9 } },
    { id: "c8", name: "Executor", type: "Katana- & Parier-Spezialist", desc: "Ein Meister der Klinge. Bestraft jeden Fehler des Gegners.", passive: "Das Zeitfenster für erfolgreiche Paraden ist leicht vergrößert.", stats: { vig: 12, mind: 10, end: 13, str: 11, dex: 17, int: 9, fai: 8, arc: 13 } }
];

const nrWeapons = [
    // Schwerter
    { id: "w1", name: "Longsword", type: "Gerades Schwert", desc: "Ein verlässliches, gerades Schwert." },
    { id: "w2", name: "Claymore", type: "Großschwert", desc: "Klassisches Großschwert mit hervorragendem Stoßangriff." },
    { id: "w3", name: "Bastard Sword", type: "Großschwert", desc: "Ein schweres, breites Schwert für weite Schwünge." },
    { id: "w4", name: "Lordsworn's Greatsword", type: "Großschwert", desc: "Wird von den vereidigten Rittern geführt. Hoher kritischer Schaden." },
    { id: "w5", name: "Dark Moon Greatsword", type: "Großschwert", desc: "Ein legendäres Schwert, durchdrungen von Frost und Mondmagie." },
    { id: "w6", name: "Blasphemous Blade", type: "Großschwert", desc: "Heilt den Träger bei jedem besiegten Feind." },
    { id: "w7", name: "Sword of Night and Flame", type: "Gerades Schwert", desc: "Kann sowohl Feuer als auch Nachtmagie kanalisieren." },
    { id: "w8", name: "Greatsword", type: "Kolossales Schwert", desc: "Ein massiver Eisenklumpen. Zerschmettert alles." },
    { id: "w9", name: "Maliketh's Black Blade", type: "Kolossales Schwert", desc: "Befleckt mit der Rune des Todes. Reduziert max. LP des Gegners." },
    // Katanas
    { id: "w10", name: "Uchigatana", type: "Katana", desc: "Ein scharfes Katana, das Blutungsschaden verursacht." },
    { id: "w11", name: "Nagakiba", type: "Katana", desc: "Ein Katana mit abnorm hoher Reichweite." },
    { id: "w12", name: "Rivers of Blood", type: "Katana", desc: "Eine verfluchte Klinge, die schnelle Blutungssalven abfeuert." },
    { id: "w13", name: "Moonveil", type: "Katana", desc: "Schießt bei Waffenfertigkeiten magische Lichtwellen." },
    { id: "w14", name: "Hand of Malenia", type: "Katana", desc: "Ermöglicht den vernichtenden Wassertanz." },
    // Hämmer & Colossal Weapons
    { id: "w15", name: "Giant-Crusher", type: "Kolossale Waffe", desc: "Der schwerste Hammer im Spiel." },
    { id: "w16", name: "Great Club", type: "Kolossale Waffe", desc: "Ein massiver Holzpfahl. Ignoriert Rüstung durch rohe Kraft." },
    { id: "w17", name: "Dragon Greatclaw", type: "Kolossale Waffe", desc: "Von rotem Blitz durchdrungen." },
    { id: "w18", name: "Axe of Godfrey", type: "Kolossale Waffe", desc: "Die Waffe des ersten Eldenfürsten." },
    { id: "w19", name: "Prelate's Inferno Crozier", type: "Kolossale Waffe", desc: "Ein massiver Hammer, der Gegner in Flammen hüllt." },
    // Speere & Hellebarden
    { id: "w20", name: "Golden Halberd", type: "Hellebarde", desc: "Eine schwere, heilige Hellebarde." },
    { id: "w21", name: "Banished Knight's Halberd", type: "Hellebarde", desc: "Eine elegante und sehr verlässliche Stangenwaffe." },
    { id: "w22", name: "Nightrider Glaive", type: "Hellebarde", desc: "Die bevorzugte Waffe der nächtlichen Kavallerie." },
    { id: "w23", name: "Cross-Naginata", type: "Speer", desc: "Ein Speer mit Klinge, der Blutungsschaden verursacht." },
    { id: "w24", name: "Pike", type: "Speer", desc: "Der Speer mit der höchsten Reichweite." },
    // Bögen
    { id: "w25", name: "Longbow", type: "Bogen", desc: "Der Standard-Bogen für Distanzangriffe." },
    { id: "w26", name: "Horn Bow", type: "Bogen", desc: "Verursacht zusätzlich magischen Schaden." },
    { id: "w27", name: "Black Bow", type: "Bogen", desc: "Erlaubt extrem schnelle Schüsse nach einer Ausweichrolle." },
    { id: "w28", name: "Erdtree Bow", type: "Bogen", desc: "Verursacht starken Heiligschaden." },
    { id: "w29", name: "Pulley Bow", type: "Bogen", desc: "Ein komplexer Bogen mit enormer Reichweite." },
    // Magie & Heilig
    { id: "w30", name: "Carian Regal Scepter", type: "Schimmersteinstab", desc: "Der beste Stab für königliche Magie." },
    { id: "w31", name: "Lusat's Glintstone Staff", type: "Schimmersteinstab", desc: "Erhöht Zauberschaden massiv, kostet aber mehr FP." },
    { id: "w32", name: "Staff of Loss", type: "Schimmersteinstab", desc: "Verstärkt Unsichtbarkeits- und Nachtzauber." },
    { id: "w33", name: "Prince of Death's Staff", type: "Schimmersteinstab", desc: "Skaliert extrem gut im Lategame mit Weisheit und Glaube." },
    { id: "w34", name: "Coded Sword", type: "Gerades Schwert", desc: "Eine Klinge aus reinem Licht, unblockbar." },
    { id: "w35", name: "Cipher Pata", type: "Faustwaffe", desc: "Verborgene Klingen aus goldenem Licht." },
    { id: "w36", name: "Golden Order Greatsword", type: "Großschwert", desc: "Ein legendäres Schwert des Goldenen Ordens." },
    { id: "w37", name: "Envoy's Long Horn", type: "Großer Hammer", desc: "Schießt eine Salve aus heiligen Blasen." }
];

// Relikte
const nrRelics = [
    { id: "r1", name: "Night of the Beast", type: "Relikt (Grün)", desc: "Ausdauerregeneration bei Treffern +1. Startwaffe verursacht Feuerschaden." },
    { id: "r2", name: "Night of the Baron", type: "Relikt (Blau)", desc: "Verbesserte kritische Treffer +1. Kunst-Leiste (Art gauge) füllt sich moderat bei kritischen Treffern. Kritische Treffer erhöhen Ausdauerregeneration." },
    { id: "r3", name: "Night of the Wise", type: "Relikt (Gelb)", desc: "Erhöhte maximale FP. Startwaffe verursacht Gift. Gift & Fäulnis in der Nähe erhöhen die Angriffskraft." },
    { id: "r4", name: "Night of the Fathom", type: "Relikt (Rot)", desc: "Erhöhte maximale LP. Flasche heilt auch Verbündete. Items gewähren Effekte auch nahen Verbündeten." },
    { id: "r5", name: "Night of the Demon", type: "Relikt (Rot)", desc: "Riesiger Runen-Rabatt bei Shop-Käufen während der Expedition. Geste 'Crossed Legs' baut Wahnsinn auf. Wahnsinn regeneriert kontinuierlich FP." },
    { id: "r6", name: "Night of the Champion", type: "Relikt (Grün)", desc: "Erhöhte maximale Ausdauer. Abwehrkonter erhalten Bonus basierend auf aktuellen LP. LP-Wiederherstellung bei Stoß-Konterangriffen." },
    { id: "r7", name: "Night of the Miasma", type: "Relikt (Gelb)", desc: "Frostbefall in der Nähe macht unsichtbar. Ändert Fähigkeit kompatibler Waffen zu Beginn der Expedition zu Eisiger Nebel (Chilling Mist). Erhöhte Angriffskraft gegen Feinde mit Frostbefall." },
    { id: "r8", name: "Night of the Lord", type: "Relikt (Blau)", desc: "Waffenwechsel fügt Affinitäts-Angriff hinzu. Erhöht Angriffskraft von Affinitäts-Angriffen. Waffenwechsel erhöht Angriffskraft." },
    { id: "r9", name: "The Will of the Balancers", type: "Relikt (Blau)", desc: "Verbesserte Nahkampf-Angriffskraft. Verbesserte Talent-Angriffskraft (Skill). Kontinuierliche FP-Regeneration." },
    { id: "r10", name: "The Night of Dregs", type: "Relikt (Rot)", desc: "Status-Leisten erhöhen langsam Angriffskraft. Angriffe verursachen Fäulnis, wenn Schaden erlitten wird. Fäulnis in der Nähe verursacht kontinuierliche LP-Regeneration." }
];
// Bosse
const nrBosses = [
    { id: "b1", name: "Gladius, Beast of Night", type: "Nightlord", desc: "Eine wilde Bestie, die sich durch die Dunkelheit reißt.", weakness: "Feuer, Schnittwaffen (Slash)" },
    { id: "b2", name: "Adel, Baron of Night", type: "Nightlord", desc: "Ein korrumpierter Adliger, der finstere Magie nutzt.", weakness: "Heiligschaden, Blutung" },
    { id: "b3", name: "Gnoster, Wisdom of Night", type: "Nightlord", desc: "Ein uraltes Wesen, dessen Wissen den Verstand zersprengt.", weakness: "Physischer Wuchtschaden (Strike), Gift" },
    { id: "b4", name: "Maris, Fathom of Night", type: "Nightlord", desc: "Ein Lord aus den endlosen Tiefen des schwarzen Ozeans.", weakness: "Blitzschaden" },
    { id: "b5", name: "Libra, Creature of Night", type: "Nightlord", desc: "Eine unberechenbare, schwer fassbare Kreatur.", weakness: "Frost, Stichwaffen (Pierce)" },
    { id: "b6", name: "Fulghor, Champion of Nightglow", type: "Nightlord", desc: "Ein strahlender Ritter, dessen Licht trügerisch ist.", weakness: "Dunkelmagie, Parieren" },
    { id: "b7", name: "Caligo, Miasma of Night", type: "Nightlord", desc: "Eine wandelnde Wolke aus Tod und Verfall.", weakness: "Feuer, Hohe Resistenz gegen Statusveränderungen" },
    { id: "b8", name: "Heolstor, The Nightlord", type: "The Shape of Night", desc: "Der absolute Herrscher der Finsternis.", weakness: "Reiner physischer Schaden. Immun gegen Status-Effekte." }
];

function loadNightreignData() {
    // 1. Charakter-Dropdown füllen
    const charSelect = document.getElementById('nr-char');
    charSelect.innerHTML = '<option value="">-- Charakter wählen --</option>';
    nrCharacters.forEach(c => charSelect.appendChild(new Option(c.name, c.id)));

    // 2. Waffen-Dropdowns füllen
    const wpnSelect1 = document.getElementById('nr-wpn1');
    const wpnSelect2 = document.getElementById('nr-wpn2');
    wpnSelect1.innerHTML = '<option value="">Waffe 1</option>';
    wpnSelect2.innerHTML = '<option value="">Waffe 2</option>';
    nrWeapons.forEach(w => {
        wpnSelect1.appendChild(new Option(w.name, w.id));
        wpnSelect2.appendChild(new Option(w.name, w.id));
    });

    // 3. Relikte-Dropdowns füllen
    const relSelects = [document.getElementById('nr-rel1'), document.getElementById('nr-rel2'), document.getElementById('nr-rel3')];
    relSelects.forEach((select, index) => {
        select.innerHTML = `<option value="">Relikt ${index + 1}</option>`;
        nrRelics.forEach(r => select.appendChild(new Option(r.name, r.id)));
    });

    // 4. Boss-Dropdown füllen
    const bossSelect = document.getElementById('nr-boss');
    bossSelect.innerHTML = '<option value="">-- Boss wählen --</option>';
    nrBosses.forEach(b => bossSelect.appendChild(new Option(b.name, b.id)));
}

// Wird ausgeführt, wenn man ein Item in Nightreign auswählt
function equipNRItem(selectElement, category) {
    const itemId = selectElement.value;
    let item = null;

    const nameEl = document.getElementById('nr-detail-name');
    const typeEl = document.getElementById('nr-detail-type');
    const descEl = document.getElementById('nr-detail-desc');
    const weakBox = document.getElementById('nr-boss-weakness-box');
    const weakText = document.getElementById('nr-boss-weakness');

    weakBox.style.display = 'none';

    if (!itemId) {
        nameEl.innerText = "Wähle etwas aus";
        typeEl.innerText = "-";
        descEl.innerText = "";
        
        if (category === 'character') {
            ['vig', 'mind', 'end', 'str', 'dex', 'int', 'fai', 'arc'].forEach(stat => {
                document.getElementById('nr-stat-' + stat).innerText = "-";
            });
            document.getElementById('nr-stat-passive').innerText = "-";
        }
        return;
    }

    if (category === 'character') item = nrCharacters.find(i => i.id === itemId);
    if (category === 'weapon') item = nrWeapons.find(i => i.id === itemId);
    if (category === 'relic') item = nrRelics.find(i => i.id === itemId);
    if (category === 'boss') item = nrBosses.find(i => i.id === itemId);

    if (!item) return;

    nameEl.innerText = item.name;
    typeEl.innerText = item.type;
    descEl.innerText = item.desc || "";

    if (category === 'boss') {
        weakText.innerText = item.weakness;
        weakBox.style.display = 'block';
    }

    if (category === 'character') {
        document.getElementById('nr-stat-vig').innerText = item.stats.vig;
        document.getElementById('nr-stat-mind').innerText = item.stats.mind;
        document.getElementById('nr-stat-end').innerText = item.stats.end;
        document.getElementById('nr-stat-str').innerText = item.stats.str;
        document.getElementById('nr-stat-dex').innerText = item.stats.dex;
        document.getElementById('nr-stat-int').innerText = item.stats.int;
        document.getElementById('nr-stat-fai').innerText = item.stats.fai;
        document.getElementById('nr-stat-arc').innerText = item.stats.arc;
        
        document.getElementById('nr-stat-passive').innerText = item.passive;
    }
}