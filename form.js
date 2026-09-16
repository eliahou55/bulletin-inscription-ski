// Configuration
const CONFIG = {
    GOOGLE_APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbz0OWt4YlLLGOWdVZgIIdidXfcLylocvBFFX5R_Nru5eTsBdH5tOcSs5gJepSW0KJE/exec',
    EMAIL_SERVICE_URL: 'https://loisirel-ski.netlify.app/.netlify/functions',
};

// Tarifs (séjour Ski 2026 - Bardonecchia)
// Logique chambre : chaque chambre doit rapporter un minimum de ROOM_MIN_REVENUE
// et contenir entre ROOM_MIN_PEOPLE et ROOM_MAX_PEOPLE personnes (bébés exclus du calcul).
// Si les adultes de la chambre ne couvrent pas le minimum, des enfants sont "promus"
// au tarif adulte (un par un) jusqu'à ce que le minimum soit atteint.
const PRICES = {
    adulte: 1500,
    enfant: 1000,          // tarif enfant réduit (appliqué une fois le minimum de la chambre couvert)
    bebe: 450,
    locationAdulte: 150,   // location de matériel de ski / semaine
    locationEnfant: 100,
    coursSki6h: 350,       // cours de ski enfant, 6h/jour
    coursSki3h: 250,       // cours de ski enfant, 3h/jour
    acompteFixe: 1500,     // acompte fixe à la réservation
    cautionParChambre: 100,
    taxeSejourParAdulte: 10
};

const ROOM_MIN_REVENUE = 3000;
const ROOM_MIN_PEOPLE = 2;
const ROOM_MAX_PEOPLE = 4;

const NIVEAUX_SKI = [
    'Piou-Piou', 'Ourson', 'Flocon',
    '1ère étoile', '2ème étoile', '3ème étoile',
    'Étoile de bronze', "Étoile d'argent", "Étoile d'or"
];

// Les cours de ski ne sont proposés qu'aux 4-12 ans ; en dessous, les enfants
// sont pris en charge par le Mini/Baby Club plutôt que par un cours formel.
const AGE_COURS_MIN = 4;
const AGE_COURS_MAX = 12;

// État du formulaire
let familyMemberCount = 4;
let lastSubmittedData = null;
let lastAutoNom = '';

const ORGANIZER_CODE = '2861';
const ROOM_TYPES = ['double', 'familiale', 'suite', 'chalet'];
const ROOM_INPUT_IDS = {
    double: 'roomDouble',
    familiale: 'roomFamiliale',
    suite: 'roomSuite',
    chalet: 'roomChalet'
};

// Initialisations
document.addEventListener('DOMContentLoaded', function() {
    initializeFamily();
    initializeRemise();
    initializeEventListeners();
    initializeOrganizerLock();
    initializeOrganizerRooms();
    calculateTotal();
});

// ===== SECTION FAMILLE =====
function initializeFamily() {
    const tableBody = document.getElementById('familyTableBody');
    tableBody.innerHTML = '';

    for (let i = 0; i < 4; i++) {
        addFamilyRow(false);
    }
}

function addFamilyRow(shouldCalculate = true) {
    const tableBody = document.getElementById('familyTableBody');
    const rowIndex = familyMemberCount++;
    const radioName = `memberType_${rowIndex}`;

    const row = document.createElement('tr');
    row.className = 'family-row';
    row.dataset.type = '';
    row.dataset.baseTarif = '0';
    row.dataset.extraTarif = '0';
    row.dataset.roomNumber = '1';
    row.dataset.promoted = 'false';
    row.dataset.roomAutoAssigned = 'false';
    row.innerHTML = `
        <td><input type="text" class="family-nom" placeholder="Nom"></td>
        <td><input type="text" class="family-prenom" placeholder="Prénom"></td>
        <td class="date-cell">
            <div class="member-type-selector">
                <label class="type-radio-label"><input type="radio" class="member-type-radio" name="${radioName}" value="adulte"> Adulte</label>
                <label class="type-radio-label"><input type="radio" class="member-type-radio" name="${radioName}" value="enfant"> Enfant</label>
                <label class="type-radio-label"><input type="radio" class="member-type-radio" name="${radioName}" value="bebe"> Bébé</label>
            </div>
        </td>
        <td><select class="member-room" title="Chambre"><option value="1">Chambre 1</option></select></td>
        <td><span class="family-tarif-display">-</span></td>
        <td>
            <button type="button" class="btn-delete-row" onclick="deleteFamilyRow(this)">Supprimer</button>
        </td>
    `;

    const optionsRow = document.createElement('tr');
    optionsRow.className = 'family-options-row';
    optionsRow.style.display = 'none';
    optionsRow.innerHTML = `<td colspan="6"><div class="member-options"></div></td>`;

    tableBody.appendChild(row);
    tableBody.appendChild(optionsRow);

    const contactNom = document.getElementById('nomContact').value.trim();
    if (contactNom) {
        row.querySelector('.family-nom').value = contactNom;
        lastAutoNom = contactNom;
    }

    const optionsContainer = optionsRow.querySelector('.member-options');

    function niveauOptionsHTML() {
        return '<option value="">Sélectionner...</option>' +
            NIVEAUX_SKI.map(n => `<option value="${n}">${n}</option>`).join('');
    }

    function ageOptionsHTML() {
        let html = '<option value="">Sélectionner...</option>';
        for (let a = AGE_COURS_MIN; a <= AGE_COURS_MAX; a++) {
            html += `<option value="${a}">${a} ans</option>`;
        }
        return html;
    }

    function renderOptions(type) {
        if (type === 'adulte') {
            optionsContainer.innerHTML = `
                <label class="option-check"><input type="checkbox" class="opt-ski-rental"> Location de matériel de ski (+${PRICES.locationAdulte}€/semaine)</label>
            `;
        } else if (type === 'enfant') {
            optionsContainer.innerHTML = `
                <label class="option-check"><input type="checkbox" class="opt-cours-ski"> Cours de ski souhaité</label>
                <div class="opt-cours-details" style="display:none;">
                    <p class="section-info" style="margin:0 0 4px;">Cours réservés aux ${AGE_COURS_MIN}-${AGE_COURS_MAX} ans — en dessous de ${AGE_COURS_MIN} ans, les enfants sont pris en charge par le Mini/Baby Club (9h30-12h / 14h-17h30).</p>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Âge de l'enfant</label>
                        <select class="opt-age">${ageOptionsHTML()}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label>Niveau</label>
                        <select class="opt-niveau">${niveauOptionsHTML()}</select>
                    </div>
                    <div class="option-group">
                        <span class="option-label">Durée :</span>
                        <label class="option-radio"><input type="radio" name="duree_${rowIndex}" class="opt-duree" value="6h" checked> 6h/jour (${PRICES.coursSki6h}€)</label>
                        <label class="option-radio"><input type="radio" name="duree_${rowIndex}" class="opt-duree" value="3h"> 3h/jour (${PRICES.coursSki3h}€)</label>
                    </div>
                </div>
                <label class="option-check"><input type="checkbox" class="opt-ski-rental"> Location de matériel de ski (+${PRICES.locationEnfant}€/semaine)</label>
            `;
        } else {
            optionsContainer.innerHTML = '';
        }
        wireOptionEvents();
    }

    function wireOptionEvents() {
        optionsContainer.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('change', function() {
                if (el.classList.contains('opt-cours-ski')) {
                    const details = optionsContainer.querySelector('.opt-cours-details');
                    if (details) details.style.display = el.checked ? 'flex' : 'none';
                }
                updateDisplay();
            });
        });
    }

    function computeExtra(type) {
        let extra = 0;
        if (type === 'adulte') {
            const rental = optionsContainer.querySelector('.opt-ski-rental');
            if (rental && rental.checked) extra += PRICES.locationAdulte;
        } else if (type === 'enfant') {
            const rental = optionsContainer.querySelector('.opt-ski-rental');
            if (rental && rental.checked) extra += PRICES.locationEnfant;
            const cours = optionsContainer.querySelector('.opt-cours-ski');
            if (cours && cours.checked) {
                const duree = optionsContainer.querySelector('.opt-duree:checked');
                extra += (duree && duree.value === '3h') ? PRICES.coursSki3h : PRICES.coursSki6h;
            }
        }
        return extra;
    }

    // Le tarif de base (adulte/enfant/bébé, avec promotion éventuelle au tarif
    // adulte selon la composition de la chambre) est calculé globalement par
    // computeRoomAssignments() car il dépend des autres membres de la même chambre.
    function updateDisplay() {
        const typeSelected = row.querySelector('.member-type-radio:checked');
        const type = typeSelected ? typeSelected.value : '';
        row.dataset.type = type;
        row.dataset.extraTarif = type ? computeExtra(type) : 0;
        calculateTotal();
    }

    // Permettre de décocher un radio en cliquant dessus à nouveau
    row.querySelectorAll('.member-type-radio').forEach(radio => {
        radio.addEventListener('click', function() {
            if (this.dataset.wasChecked === 'true') {
                this.checked = false;
                this.dataset.wasChecked = 'false';
                optionsRow.style.display = 'none';
                optionsContainer.innerHTML = '';
            } else {
                row.querySelectorAll('.member-type-radio').forEach(r => r.dataset.wasChecked = 'false');
                this.dataset.wasChecked = 'true';
                optionsRow.style.display = '';
                renderOptions(this.value);

                // Première sélection d'une catégorie pour ce membre : on l'assigne
                // automatiquement à la première chambre non pleine (remplissage à 4
                // personnes max, bébés exclus), comme une vraie chambre par défaut.
                if (row.dataset.roomAutoAssigned !== 'true') {
                    const defaultRoom = getDefaultRoomForNewMember(row, this.value);
                    row.querySelector('.member-room').value = defaultRoom;
                    row.dataset.roomNumber = defaultRoom;
                    row.dataset.roomAutoAssigned = 'true';
                }
            }
            updateDisplay();
        });
    });

    row.querySelector('.member-room').addEventListener('change', function() {
        row.dataset.roomNumber = parseInt(this.value) || 1;
        row.dataset.roomAutoAssigned = 'true';
        calculateTotal();
    });

    if (shouldCalculate) {
        calculateTotal();
    }
}

function deleteFamilyRow(btn) {
    const row = btn.closest('tr');
    const optionsRow = row.nextElementSibling;
    if (optionsRow && optionsRow.classList.contains('family-options-row')) {
        optionsRow.remove();
    }
    row.remove();
    calculateTotal();
}

document.addEventListener('click', function(e) {
    if (e.target.id === 'addMemberBtn') {
        e.preventDefault();
        addFamilyRow(true);
    }
});

// ===== REMISE =====
function initializeRemise() {
    const remiseCheck = document.getElementById('remiseCheck');
    const remiseAmount = document.getElementById('remiseAmount');
    const remiseOptions = document.getElementById('remiseOptions');

    remiseCheck.addEventListener('change', function() {
        if (this.checked) {
            remiseOptions.style.display = 'block';
            remiseAmount.disabled = false;
            remiseAmount.value = '';
        } else {
            remiseOptions.style.display = 'none';
            remiseAmount.disabled = true;
            remiseAmount.value = '';
        }
        calculateTotal();
    });

    remiseAmount.addEventListener('change', calculateTotal);
    remiseAmount.addEventListener('input', calculateTotal);

    document.getElementById('paiementIntegral').addEventListener('change', calculateTotal);
}

// ===== ESPACE ORGANISATEUR (verrouillé par code) =====
function initializeOrganizerLock() {
    let enteredCode = '';
    const dots = document.querySelectorAll('.pin-dot');
    const pinError = document.getElementById('pinError');
    const lockedView = document.getElementById('organizerLocked');
    const unlockedView = document.getElementById('organizerUnlocked');
    const toggleBtn = document.getElementById('organizerToggleBtn');
    const content = document.getElementById('organizerContent');

    toggleBtn.addEventListener('click', function() {
        const isOpen = content.style.display === 'block';
        content.style.display = isOpen ? 'none' : 'block';
        toggleBtn.textContent = isOpen
            ? '🔒 Espace organisateur — cliquer pour ouvrir'
            : '🔓 Espace organisateur — cliquer pour fermer';
    });

    function updateDots() {
        dots.forEach((dot, i) => dot.classList.toggle('filled', i < enteredCode.length));
    }

    function resetCode() {
        enteredCode = '';
        updateDots();
    }

    function tryUnlock() {
        if (enteredCode === ORGANIZER_CODE) {
            pinError.style.display = 'none';
            lockedView.style.display = 'none';
            unlockedView.style.display = 'block';
        } else {
            pinError.style.display = 'block';
            setTimeout(() => {
                resetCode();
                pinError.style.display = 'none';
            }, 700);
        }
    }

    document.querySelectorAll('.pin-key[data-digit]').forEach(key => {
        key.addEventListener('click', function() {
            if (enteredCode.length >= 4) return;
            enteredCode += this.dataset.digit;
            updateDots();
            if (enteredCode.length === 4) {
                tryUnlock();
            }
        });
    });

    document.getElementById('pinBack').addEventListener('click', function() {
        enteredCode = enteredCode.slice(0, -1);
        updateDots();
    });

    document.getElementById('pinClear').addEventListener('click', resetCode);
}

function initializeOrganizerRooms() {
    ROOM_TYPES.forEach(room => {
        const input = document.getElementById(ROOM_INPUT_IDS[room]);
        document.querySelectorAll(`[data-room="${room}"]`).forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const delta = this.classList.contains('btn-plus') ? 1 : -1;
                input.value = Math.max(0, (parseInt(input.value) || 0) + delta);
            });
        });
    });
}

function getOrganizerRooms() {
    const rooms = {};
    ROOM_TYPES.forEach(room => {
        rooms[room] = parseInt(document.getElementById(ROOM_INPUT_IDS[room]).value) || 0;
    });
    return rooms;
}

// ===== HELPERS COMPTAGE FAMILLE =====
function getFamilyCounts() {
    let adulte = 0, enfant = 0, bebe = 0;
    document.querySelectorAll('#familyTableBody .family-row').forEach(row => {
        if (row.dataset.type === 'bebe') bebe++;
        else if (row.dataset.type === 'enfant') enfant++;
        else if (row.dataset.type === 'adulte') adulte++;
    });
    return { adulte, enfant, bebe, total: adulte + enfant + bebe };
}

function getFamilyMembers() {
    const members = [];
    document.querySelectorAll('#familyTableBody .family-row').forEach(row => {
        const nom = row.querySelector('.family-nom').value.trim();
        const prenom = row.querySelector('.family-prenom').value.trim();
        const categorie = row.dataset.type || '';
        if (!prenom && !categorie) return;

        const optionsRow = row.nextElementSibling;
        const opts = optionsRow ? optionsRow.querySelector('.member-options') : null;
        const member = {
            nom: nom || '',
            prenom: prenom || '',
            categorie: categorie,
            chambreNumero: parseInt(row.dataset.roomNumber) || 1,
            tarif: (parseInt(row.dataset.baseTarif) || 0) + (parseInt(row.dataset.extraTarif) || 0)
        };

        if (categorie === 'enfant') {
            member.tarifPromu = row.dataset.promoted === 'true';
            if (opts) {
                const cours = opts.querySelector('.opt-cours-ski');
                member.coursSki = !!(cours && cours.checked);
                if (member.coursSki) {
                    const age = opts.querySelector('.opt-age');
                    const niveau = opts.querySelector('.opt-niveau');
                    const duree = opts.querySelector('.opt-duree:checked');
                    member.age = age ? age.value : '';
                    member.niveau = niveau ? niveau.value : '';
                    member.duree = duree ? duree.value : '6h';
                }
                const rental = opts.querySelector('.opt-ski-rental');
                member.locationSki = !!(rental && rental.checked);
            }
        } else if (categorie === 'adulte' && opts) {
            const rental = opts.querySelector('.opt-ski-rental');
            member.locationSki = !!(rental && rental.checked);
        }

        members.push(member);
    });

    return members;
}

// Détermine la chambre par défaut d'un membre qui vient de recevoir sa catégorie
// pour la première fois : on remplit les chambres déjà utilisées jusqu'à
// ROOM_MAX_PEOPLE (bébés exclus), puis on ouvre une nouvelle chambre.
function getDefaultRoomForNewMember(currentRow, type) {
    if (type === 'bebe') return 1;

    const occupancy = {};
    document.querySelectorAll('#familyTableBody .family-row').forEach(row => {
        if (row === currentRow) return;
        const t = row.dataset.type;
        if (t === 'adulte' || t === 'enfant') {
            const rn = parseInt(row.dataset.roomNumber) || 1;
            occupancy[rn] = (occupancy[rn] || 0) + 1;
        }
    });

    let candidate = 1;
    while ((occupancy[candidate] || 0) >= ROOM_MAX_PEOPLE) candidate++;
    return candidate;
}

// Regénère les options de chaque menu "Chambre" pour toujours proposer au moins
// une chambre de plus que le maximum actuellement utilisé (permet d'en ouvrir une nouvelle).
function refreshRoomOptions() {
    let maxRoom = 1;
    document.querySelectorAll('#familyTableBody .family-row').forEach(row => {
        maxRoom = Math.max(maxRoom, parseInt(row.dataset.roomNumber) || 1);
    });
    const optionCount = maxRoom + 1;

    document.querySelectorAll('.member-room').forEach(select => {
        if (select.options.length === optionCount) return;
        const current = select.value;
        select.innerHTML = '';
        for (let i = 1; i <= optionCount; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = 'Chambre ' + i;
            select.appendChild(opt);
        }
        select.value = current || '1';
    });
}

// Découpe un nombre total de personnes en tailles de chambres toutes valides
// (entre ROOM_MIN_PEOPLE et ROOM_MAX_PEOPLE), en remplissant au maximum et en
// évitant de laisser un reliquat trop petit (ex: 5 -> [3, 2], jamais [4, 1]).
function computeValidRoomSizes(total) {
    if (total < ROOM_MIN_PEOPLE) return null;
    const sizes = [];
    let remaining = total;
    while (remaining > 0) {
        if (remaining <= ROOM_MAX_PEOPLE) {
            sizes.push(remaining);
            remaining = 0;
        } else if (remaining - ROOM_MAX_PEOPLE < ROOM_MIN_PEOPLE) {
            const firstSize = Math.ceil(remaining / 2);
            sizes.push(firstSize, remaining - firstSize);
            remaining = 0;
        } else {
            sizes.push(ROOM_MAX_PEOPLE);
            remaining -= ROOM_MAX_PEOPLE;
        }
    }
    return sizes;
}

// Calcule le coût théorique si tout le monde était regroupé le plus efficacement
// possible : chambres toutes valides (2 à 4 personnes), adultes concentrés à 2 par
// chambre pour couvrir le minimum de 3000€ avec le moins de promotions d'enfants
// possible. Sert de référence pour afficher le surcoût d'une répartition en
// chambres séparées — ne descend jamais sous le minimum réellement atteignable.
function computeOptimalCost(adultsCount, enfantsCount) {
    const total = adultsCount + enfantsCount;
    if (total === 0) return 0;

    const sizes = computeValidRoomSizes(total);
    if (!sizes) {
        // Pas de regroupement valide possible (ex: une seule personne) : tarif
        // plein sans mutualisation, à titre indicatif uniquement.
        return adultsCount * PRICES.adulte + enfantsCount * PRICES.enfant;
    }

    let remainingAdults = adultsCount;
    let remainingEnfants = enfantsCount;
    let total_cost = 0;

    sizes.forEach(size => {
        const roomAdults = Math.min(2, remainingAdults, size);
        remainingAdults -= roomAdults;
        const roomEnfants = Math.min(size - roomAdults, remainingEnfants);
        remainingEnfants -= roomEnfants;

        const adultsRevenue = roomAdults * PRICES.adulte;
        const remaining = Math.max(0, ROOM_MIN_REVENUE - adultsRevenue);
        const promoteCount = Math.min(roomEnfants, Math.ceil(remaining / PRICES.adulte));

        total_cost += adultsRevenue + promoteCount * PRICES.adulte + (roomEnfants - promoteCount) * PRICES.enfant;
    });

    return total_cost;
}

// ===== RÉPARTITION PAR CHAMBRE =====
// Chaque chambre doit contenir entre ROOM_MIN_PEOPLE et ROOM_MAX_PEOPLE personnes
// (adultes + enfants ; les bébés ne comptent pas) et rapporter au moins
// ROOM_MIN_REVENUE. Si les adultes de la chambre ne couvrent pas ce minimum,
// des enfants sont promus au tarif adulte (un par un, dans l'ordre du tableau)
// jusqu'à ce que le minimum soit atteint ; les enfants restants gardent le tarif réduit.
function computeRoomAssignments() {
    refreshRoomOptions();

    const rows = Array.from(document.querySelectorAll('#familyTableBody .family-row'));
    const rooms = {};

    rows.forEach(row => {
        const roomSelect = row.querySelector('.member-room');
        const roomNumber = parseInt(roomSelect.value) || 1;
        row.dataset.roomNumber = roomNumber;

        const type = row.dataset.type;
        if (!type) return;

        if (!rooms[roomNumber]) rooms[roomNumber] = { adults: [], enfants: [], bebes: [] };
        if (type === 'adulte') rooms[roomNumber].adults.push(row);
        else if (type === 'enfant') rooms[roomNumber].enfants.push(row);
        else if (type === 'bebe') rooms[roomNumber].bebes.push(row);
    });

    const roomSummaries = [];
    const errors = [];

    Object.keys(rooms)
        .map(Number)
        .sort((a, b) => a - b)
        .forEach(roomNumber => {
            const group = rooms[roomNumber];
            const peopleCount = group.adults.length + group.enfants.length;
            let valid = true;
            let issue = '';

            if (peopleCount < ROOM_MIN_PEOPLE) {
                valid = false;
                const missing = ROOM_MIN_PEOPLE - peopleCount;
                issue = `ne contient qu'${peopleCount} personne${peopleCount > 1 ? 's' : ''} — ajoutez ${missing} personne${missing > 1 ? 's' : ''} ou regroupez avec une autre chambre`;
            } else if (peopleCount > ROOM_MAX_PEOPLE) {
                valid = false;
                issue = `contient ${peopleCount} personnes (maximum ${ROOM_MAX_PEOPLE}, bébés non comptés) — déplacez quelqu'un vers une autre chambre`;
            }

            group.adults.forEach(row => {
                row.dataset.baseTarif = PRICES.adulte;
                row.dataset.promoted = 'false';
            });

            const adultsRevenue = group.adults.length * PRICES.adulte;
            const remaining = Math.max(0, ROOM_MIN_REVENUE - adultsRevenue);
            const promoteCount = valid ? Math.min(group.enfants.length, Math.ceil(remaining / PRICES.adulte)) : 0;

            group.enfants.forEach((row, i) => {
                const promoted = i < promoteCount;
                row.dataset.baseTarif = promoted ? PRICES.adulte : PRICES.enfant;
                row.dataset.promoted = promoted ? 'true' : 'false';
            });

            group.bebes.forEach(row => {
                row.dataset.baseTarif = PRICES.bebe;
                row.dataset.promoted = 'false';
            });

            const roomTotal = group.adults.length * PRICES.adulte
                + group.enfants.reduce((sum, r) => sum + (parseInt(r.dataset.baseTarif) || 0), 0)
                + group.bebes.length * PRICES.bebe;

            roomSummaries.push({
                roomNumber,
                adults: group.adults.length,
                enfants: group.enfants.length,
                bebes: group.bebes.length,
                promoted: promoteCount,
                valid,
                issue,
                total: roomTotal
            });

            if (!valid) {
                errors.push(`Chambre ${roomNumber} ${issue}`);
            }

            [...group.adults, ...group.enfants, ...group.bebes].forEach(row => {
                row.querySelector('.member-room').classList.toggle('invalid-room', !valid);
            });
        });

    // Rafraîchir l'affichage du tarif de chaque ligne
    rows.forEach(row => {
        const tarifDisplay = row.querySelector('.family-tarif-display');
        if (!row.dataset.type) {
            tarifDisplay.textContent = '-';
            row.querySelector('.member-room').classList.remove('invalid-room');
            return;
        }
        const base = parseInt(row.dataset.baseTarif) || 0;
        const extra = parseInt(row.dataset.extraTarif) || 0;
        tarifDisplay.textContent = (base + extra) + '€';
    });

    return { roomSummaries, errors };
}

function renderRoomsBreakdown(roomSummaries, errors) {
    const container = document.getElementById('roomsBreakdown');
    if (!roomSummaries.length) {
        container.innerHTML = '';
        return;
    }

    const CAT_PLURAL = (n, s, p) => `${n} ${n > 1 ? p : s}`;

    let html = '<div class="rooms-breakdown-list">';
    roomSummaries.forEach(r => {
        const parts = [];
        if (r.adults > 0) parts.push(CAT_PLURAL(r.adults, 'adulte', 'adultes'));
        if (r.enfants > 0) {
            let enfantLabel = CAT_PLURAL(r.enfants, 'enfant', 'enfants');
            if (r.promoted > 0) enfantLabel += ` (dont ${r.promoted} au tarif adulte)`;
            parts.push(enfantLabel);
        }
        if (r.bebes > 0) parts.push(CAT_PLURAL(r.bebes, 'bébé', 'bébés'));

        html += `<div class="room-summary-item${r.valid ? '' : ' room-summary-error'}">
            <span>Chambre ${r.roomNumber} : ${parts.join(' + ') || 'vide'}</span>
            <span>${r.valid ? formatPrice(r.total) : '⚠️ ' + r.issue}</span>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

// ===== CALCULS =====
function calculateTotal() {
    const { roomSummaries, errors } = computeRoomAssignments();

    let tarifAdulte = 0, tarifEnfant = 0, tarifBebe = 0, tarifOptions = 0;
    let countAdulte = 0, countEnfant = 0, countBebe = 0;

    document.querySelectorAll('#familyTableBody .family-row').forEach(row => {
        const type = row.dataset.type;
        const base = parseInt(row.dataset.baseTarif) || 0;
        const extra = parseInt(row.dataset.extraTarif) || 0;

        if (type === 'bebe') { tarifBebe += base; countBebe++; }
        else if (type === 'enfant') { tarifEnfant += base; countEnfant++; tarifOptions += extra; }
        else if (type === 'adulte') { tarifAdulte += base; countAdulte++; tarifOptions += extra; }
    });

    const total = tarifAdulte + tarifEnfant + tarifBebe + tarifOptions;

    renderRoomsBreakdown(roomSummaries, errors);

    // Calculer la remise
    let remiseAmount = 0;
    let remisePercentage = 0;
    if (document.getElementById('remiseCheck').checked) {
        remiseAmount = parseInt(document.getElementById('remiseAmount').value) || 0;
        if (remiseAmount > 0 && total > 0) {
            remisePercentage = Math.round(((total - remiseAmount) / total) * 100);
        }
    }

    const finalTotal = remiseAmount > 0 ? remiseAmount : total;
    const acompte = Math.min(PRICES.acompteFixe, finalTotal);
    const solde = finalTotal - acompte;

    // Mettre à jour le récapitulatif
    document.getElementById('recapAdulteLabel').textContent =
        countAdulte > 0 ? `Adultes : ${countAdulte} × ${PRICES.adulte}€` : 'Adultes :';
    document.getElementById('recapAdulte').textContent = formatPrice(tarifAdulte);

    document.getElementById('recapEnfantLabel').textContent =
        countEnfant > 0 ? `Enfants : ${countEnfant}` : 'Enfants :';
    document.getElementById('recapEnfant').textContent = formatPrice(tarifEnfant);

    document.getElementById('recapBebeLabel').textContent =
        countBebe > 0 ? `Bébés : ${countBebe} × ${PRICES.bebe}€` : 'Bébés :';
    document.getElementById('recapBebe').textContent = formatPrice(tarifBebe);

    const recapOptionsRow = document.getElementById('recapOptionsRow');
    if (tarifOptions > 0) {
        recapOptionsRow.style.display = '';
        document.getElementById('recapOptions').textContent = formatPrice(tarifOptions);
    } else {
        recapOptionsRow.style.display = 'none';
    }

    // Supplément lié au choix de séparer la famille en plusieurs chambres, par
    // rapport au regroupement le plus économique possible (référence informative).
    const recapSupplementRow = document.getElementById('recapSupplementRow');
    if (errors.length === 0 && (countAdulte + countEnfant) > 0) {
        const optimalCost = computeOptimalCost(countAdulte, countEnfant);
        const supplement = Math.max(0, (tarifAdulte + tarifEnfant) - optimalCost);
        if (supplement > 0) {
            recapSupplementRow.style.display = '';
            document.getElementById('recapSupplement').textContent = '+' + formatPrice(supplement);
        } else {
            recapSupplementRow.style.display = 'none';
        }
    } else {
        recapSupplementRow.style.display = 'none';
    }

    // Nombre total de chambres réservées
    const recapRoomsCountRow = document.getElementById('recapRoomsCountRow');
    if (errors.length === 0 && roomSummaries.length > 0) {
        recapRoomsCountRow.style.display = '';
        document.getElementById('recapRoomsCount').textContent = roomSummaries.length;
    } else {
        recapRoomsCountRow.style.display = 'none';
    }

    // Bloquer la soumission tant qu'une chambre est invalide
    document.querySelector('.btn-submit').disabled = errors.length > 0;

    // Afficher le total correct (avec ou sans remise)
    if (remiseAmount > 0 && remisePercentage > 0) {
        document.getElementById('recapTotal').textContent = formatPrice(remiseAmount);

        const recapRemise = document.getElementById('recapRemise');
        recapRemise.style.display = 'block';
        recapRemise.innerHTML = `<span style="color: #27ae60; font-weight: 600;">Réduction appliquée: ${formatPrice(total - remiseAmount)} (-${remisePercentage}%)</span>`;
    } else {
        document.getElementById('recapTotal').textContent = formatPrice(total);

        const recapRemise = document.getElementById('recapRemise');
        recapRemise.style.display = 'none';
    }

    const paiementIntegral = document.getElementById('paiementIntegral').checked;
    if (paiementIntegral) {
        document.getElementById('recapAcompteRow').style.display = 'none';
        document.getElementById('recapSoldeRow').style.display = 'none';
        document.getElementById('recapRegleRow').style.display = '';
        document.getElementById('recapRegle').textContent = formatPrice(finalTotal);
    } else {
        document.getElementById('recapAcompteRow').style.display = '';
        document.getElementById('recapSoldeRow').style.display = '';
        document.getElementById('recapRegleRow').style.display = 'none';
        document.getElementById('recapAcompte').textContent = formatPrice(acompte);
        document.getElementById('recapSolde').textContent = formatPrice(solde);
    }
}

function formatPrice(price) {
    return price.toLocaleString('fr-FR') + '€';
}

// ===== ÉVÉNEMENTS FORMULAIRE =====
function initializeEventListeners() {
    const form = document.getElementById('inscriptionForm');
    form.addEventListener('submit', handleFormSubmit);

    document.getElementById('nomContact').addEventListener('input', function() {
        const newNom = this.value.trim();
        // Ne recopie que sur les lignes pas encore touchées à la main (vides ou encore
        // égales au dernier nom auto-rempli), pour ne jamais écraser un nom de famille
        // saisi manuellement (ex: membre avec un nom différent du contact).
        document.querySelectorAll('#familyTableBody .family-nom').forEach(input => {
            if (input.value.trim() === '' || input.value === lastAutoNom) {
                input.value = newNom;
            }
        });
        lastAutoNom = newNom;
    });
}

function showStatus(message, type = 'info') {
    const statusMessage = document.getElementById('statusMessage');
    statusMessage.textContent = message;
    statusMessage.className = 'status-message ' + type;

    if (type === 'success') {
        setTimeout(() => {
            statusMessage.className = 'status-message';
        }, 5000);
    }
}

function validateForm() {
    const nomContact = document.getElementById('nomContact').value.trim();
    const prenomContact = document.getElementById('prenomContact').value.trim();

    if (!nomContact) {
        showStatus('⚠️ Veuillez saisir votre nom', 'error');
        return false;
    }

    if (!prenomContact) {
        showStatus('⚠️ Veuillez saisir votre prénom', 'error');
        return false;
    }

    const { errors } = computeRoomAssignments();
    if (errors.length > 0) {
        showStatus('⚠️ Configuration de chambre invalide — ' + errors.join(' | '), 'error');
        return false;
    }

    return true;
}

function getFormData() {
    const { roomSummaries } = computeRoomAssignments();

    let tarifAdulte = 0, tarifEnfant = 0, tarifBebe = 0, tarifOptions = 0;
    let countAdulte = 0, countEnfant = 0, countBebe = 0;

    document.querySelectorAll('#familyTableBody .family-row').forEach(row => {
        const type = row.dataset.type;
        const base = parseInt(row.dataset.baseTarif) || 0;
        const extra = parseInt(row.dataset.extraTarif) || 0;

        if (type === 'bebe') { tarifBebe += base; countBebe++; }
        else if (type === 'enfant') { tarifEnfant += base; countEnfant++; tarifOptions += extra; }
        else if (type === 'adulte') { tarifAdulte += base; countAdulte++; tarifOptions += extra; }
    });

    const total = tarifAdulte + tarifEnfant + tarifBebe + tarifOptions;

    // Calculer la remise
    let remiseAmount = 0;
    if (document.getElementById('remiseCheck').checked) {
        remiseAmount = parseInt(document.getElementById('remiseAmount').value) || 0;
    }

    const finalTotal = remiseAmount > 0 ? remiseAmount : total;
    const acompte = Math.min(PRICES.acompteFixe, finalTotal);
    const solde = finalTotal - acompte;
    const remiseDifference = remiseAmount > 0 ? (total - remiseAmount) : 0;
    const remisePourcentage = (remiseAmount > 0 && total > 0) ? Math.round((remiseDifference / total) * 100) : 0;
    const taxeSejour = countAdulte * PRICES.taxeSejourParAdulte;
    const optimalCost = computeOptimalCost(countAdulte, countEnfant);
    const supplementChambres = Math.max(0, (tarifAdulte + tarifEnfant) - optimalCost);

    return {
        nomContact: document.getElementById('nomContact').value.trim(),
        prenomContact: document.getElementById('prenomContact').value.trim(),
        portable: document.getElementById('portable').value.trim() || '',
        emailContact: document.getElementById('emailContact').value.trim() || '',
        familleMembers: getFamilyMembers(),
        familleJSON: JSON.stringify(getFamilyMembers()),
        nombrePersonnes: getFamilyMembers().length,
        chambresAdultes: countAdulte,
        chambresEnfants: countEnfant,
        bebes: countBebe,
        tarifChambresAdultes: tarifAdulte,
        tarifChambresEnfants: tarifEnfant,
        tarifBebes: tarifBebe,
        tarifOptions: tarifOptions,
        tarifChambresOptimal: optimalCost,
        supplementChambres: supplementChambres,
        nombreChambresReservees: roomSummaries.length,
        chambresDetail: roomSummaries.map(r => ({
            numero: r.roomNumber,
            adultes: r.adults,
            enfants: r.enfants,
            bebes: r.bebes,
            promus: r.promoted,
            total: r.total
        })),
        chambresDetailJSON: JSON.stringify(roomSummaries.map(r => ({
            numero: r.roomNumber,
            adultes: r.adults,
            enfants: r.enfants,
            bebes: r.bebes,
            promus: r.promoted,
            total: r.total
        }))),
        roomsOrganisateur: getOrganizerRooms(),
        notes: document.getElementById('notes').value.trim() || '',
        paiementIntegral: document.getElementById('paiementIntegral').checked,
        remiseAppliquee: remiseAmount > 0 ? 'Oui' : 'Non',
        remiseAmount: remiseAmount,
        remiseDifference: remiseDifference,
        remisePourcentage: remisePourcentage,
        totalEUR: total,
        totalApresRemise: finalTotal,
        acomptEUR: acompte,
        soldeEUR: solde,
        taxeSejourEUR: taxeSejour,
        cautionEUR: PRICES.cautionParChambre,
        dateSoumission: new Date().toLocaleDateString('fr-FR'),
        timestamp: new Date().toISOString()
    };
}

async function handleFormSubmit(e) {
    e.preventDefault();

    if (!validateForm()) {
        return;
    }

    showStatus('⏳ Envoi de votre inscription...', 'loading');

    const submitBtn = document.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
        const formData = getFormData();
        lastSubmittedData = formData;

        // 1. Envoyer à Google Apps Script (sheets uniquement — inchangé)
        await fetch(CONFIG.GOOGLE_APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        // 2. Générer le PDF et envoyer au backend pour l'email
        const pdfBase64 = generateDevisPDF(formData, false);
        if (CONFIG.EMAIL_SERVICE_URL && CONFIG.EMAIL_SERVICE_URL !== 'YOUR_SKI_EMAIL_SERVICE_URL') {
            fetch(CONFIG.EMAIL_SERVICE_URL + '/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ formData, pdfBase64 })
            }).catch(err => console.warn('Email non envoyé:', err));
        }

        const statusMessage = document.getElementById('statusMessage');
        statusMessage.innerHTML = `
            ✅ Inscription envoyée avec succès ! Un email de confirmation va vous être envoyé.
            <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                <button type="button" id="downloadPdfBtn" class="btn-download-pdf">📄 Télécharger mon devis</button>
                <button type="button" id="newInscriptionBtn" class="btn-reset" style="margin:0;">🆕 Nouvelle inscription</button>
            </div>
            <p style="margin:8px 0 0;font-size:0.88em;opacity:0.85;">Vous pouvez corriger le formulaire et le re-soumettre si nécessaire.</p>
            <p style="margin:8px 0 0;font-size:0.88em;opacity:0.85;">💡 Vous ne recevez pas l'email ? Pensez à vérifier vos spams / courriers indésirables.</p>
        `;
        statusMessage.className = 'status-message success';
        submitBtn.disabled = false;
        statusMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });

        if (typeof launchCelebration === 'function') {
            launchCelebration();
        }

        document.getElementById('downloadPdfBtn').onclick = () => generateDevisPDF(formData, true);
        document.getElementById('newInscriptionBtn').onclick = () => {
            document.getElementById('inscriptionForm').reset();
            initializeFamily();
            calculateTotal();
            statusMessage.className = 'status-message';
            statusMessage.innerHTML = '';
        };

    } catch (error) {
        console.error('Erreur lors de l\'envoi:', error);
        showStatus('❌ Une erreur s\'est produite lors de l\'envoi. Veuillez réessayer ou contacter l\'administrateur.', 'error');
        submitBtn.disabled = false;
    }
}

// ===== PDF GENERATION =====
function generateDevisPDF(formData, download = true) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const primaryColor   = [11, 95, 138];
    const secondaryColor = [31, 143, 196];
    const greenColor     = [39, 174, 96];
    const orangeColor    = [255, 140, 58];

    let y = 10;

    function checkBreak(needed) {
        if (y + (needed || 10) > 278) { doc.addPage(); y = 12; }
    }

    function sectionHead(title) {
        checkBreak(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...primaryColor);
        doc.setFontSize(10);
        doc.text(title, 10, y);
        y += 7;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8.5);
    }

    // ── HEADER ──────────────────────────────────────────────
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 24, 'F');
    if (typeof LOGO_BASE64 !== 'undefined') {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(6, 4, 26.5, 16, 2, 2, 'F');
        doc.addImage(LOGO_BASE64, 'PNG', 7.3, 6.7, 24, 13.6);
    }
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("CONFIRMATION D'INSCRIPTION", 105, 10, { align: 'center' });
    doc.setFontSize(11);
    doc.text('LOISIREL SKI 2026 - HÔTEL SAVOIA RESORT BARDONECCHIA', 105, 18, { align: 'center' });
    y = 29;

    // Badge PENSION COMPLÈTE
    doc.setFillColor(...orangeColor);
    doc.roundedRect(60, y - 5, 90, 7, 2, 2, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(58, 32, 0);
    doc.setFontSize(9);
    doc.text('PENSION COMPLÈTE GLATT CACHER', 105, y, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    y += 9;

    // ── INFORMATIONS DE CONTACT ──────────────────────────────
    sectionHead('INFORMATIONS DE CONTACT');
    doc.setFontSize(9);
    doc.text('Nom : ' + formData.nomContact + '     Prénom : ' + formData.prenomContact + '     Tél : ' + (formData.portable || 'N/A'), 10, y);
    y += 5;
    doc.text('Email : ' + (formData.emailContact || 'N/A'), 10, y);
    y += 8;

    // ── MEMBRES DE LA FAMILLE ────────────────────────────────
    sectionHead('MEMBRES DE LA FAMILLE');
    doc.setFontSize(8.5);
    if (formData.familleMembers && formData.familleMembers.length > 0) {
        const CAT_LABELS = { adulte: 'Adulte', enfant: 'Enfant', bebe: 'Bébé' };
        formData.familleMembers.forEach((m, i) => {
            checkBreak(5);
            let info = m.categorie ? ' (' + (CAT_LABELS[m.categorie] || m.categorie) + ')' : '';
            info += ' - chambre ' + (m.chambreNumero || 1);
            if (m.categorie === 'enfant') {
                if (m.tarifPromu) info += ' - tarif adulte (chambre)';
                if (m.coursSki) info += ' - cours de ski ' + (m.age ? m.age + ' ans, ' : '') + (m.niveau || '') + ' (' + m.duree + '/jour)';
                if (m.locationSki) info += ' - location ski';
            } else if (m.categorie === 'adulte' && m.locationSki) {
                info += ' - location ski';
            }
            info += ' : ' + (m.tarif || 0) + '€';
            const lines = doc.splitTextToSize((i + 1) + '. ' + m.nom + ' ' + m.prenom + info, 190);
            doc.text(lines, 10, y);
            y += lines.length * 5;
        });
    }
    y += 4;

    // ── TARIF PAR CATÉGORIE ───────────────────────────────────
    sectionHead('TARIF PAR CATÉGORIE');
    doc.setFontSize(8.5);
    if ((formData.chambresAdultes || 0) > 0) {
        doc.text('Adultes : ' + formData.chambresAdultes + ' x ' + PRICES.adulte + '€ = ' + formData.tarifChambresAdultes + '€', 10, y); y += 5;
    }
    if ((formData.chambresEnfants || 0) > 0) {
        doc.text('Enfants : ' + formData.chambresEnfants + ' = ' + formData.tarifChambresEnfants + '€', 10, y); y += 5;
    }
    if ((formData.bebes || 0) > 0) {
        doc.text('Bébés : ' + formData.bebes + ' x ' + PRICES.bebe + '€ = ' + formData.tarifBebes + '€', 10, y); y += 5;
    }
    if ((formData.tarifOptions || 0) > 0) {
        doc.text('Options ski (location / cours) : ' + formData.tarifOptions + '€', 10, y); y += 5;
    }
    if ((formData.supplementChambres || 0) > 0) {
        doc.text('Supplément choix de chambres séparées : +' + formData.supplementChambres + '€', 10, y); y += 5;
    }
    y += 4;

    // ── RÉPARTITION PAR CHAMBRE ────────────────────────────────
    if (formData.chambresDetail && formData.chambresDetail.length > 0) {
        sectionHead('RÉPARTITION PAR CHAMBRE (' + formData.nombreChambresReservees + ' chambre' + (formData.nombreChambresReservees > 1 ? 's' : '') + ' réservée' + (formData.nombreChambresReservees > 1 ? 's' : '') + ')');
        doc.setFontSize(8.5);
        formData.chambresDetail.forEach(c => {
            checkBreak(5);
            let line = 'Chambre ' + c.numero + ' : ' + c.adultes + ' adulte(s)';
            if (c.enfants > 0) {
                line += ' + ' + c.enfants + ' enfant(s)' + (c.promus > 0 ? ' (dont ' + c.promus + ' au tarif adulte)' : '');
            }
            if (c.bebes > 0) line += ' + ' + c.bebes + ' bébé(s)';
            line += ' = ' + c.total + '€';
            doc.text(line, 10, y); y += 5;
        });
        y += 3;
    }

    // ── NOTES ────────────────────────────────────────────────
    if (formData.notes) {
        sectionHead('NOTES');
        doc.setFontSize(8.5);
        const noteLines = doc.splitTextToSize(formData.notes, 190);
        doc.text(noteLines, 10, y);
        y += noteLines.length * 5 + 4;
    }

    // ── RÉSUMÉ FINANCIER ─────────────────────────────────────
    checkBreak(40);
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.8);
    doc.line(10, y, 200, y);
    y += 5;

    sectionHead('RÉSUMÉ FINANCIER');
    doc.setFontSize(9);

    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    // Total avant remise (uniquement si remise appliquée)
    const hasRemise = formData.remiseAppliquee === 'Oui' && (formData.remiseAmount || 0) > 0;
    if (hasRemise) {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.text('Total avant remise :', 10, y);
        doc.text(formData.totalEUR + '€', 180, y, { align: 'right' });
        y += 6;
    }

    // Bannière TOTAL
    const finalTotal = hasRemise ? formData.totalApresRemise : formData.totalEUR;
    doc.setFillColor(...secondaryColor);
    doc.rect(10, y - 2, 190, 7, 'F');
    doc.setFont(undefined, 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text(hasRemise ? 'TOTAL APRES REMISE :' : 'TOTAL :', 10, y + 2);
    doc.text(finalTotal + '€', 180, y + 2, { align: 'right' });
    y += 10;

    // Remise en vert à gauche (uniquement si remise appliquée)
    if (hasRemise && formData.totalEUR > 0) {
        const pct = Math.round(((formData.totalEUR - formData.remiseAmount) / formData.totalEUR) * 100);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(...greenColor);
        doc.setFontSize(11);
        doc.text('REDUCTION : -' + pct + '%', 10, y);
        y += 7;
    }

    doc.setFont(undefined, 'bold');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(9);
    if (formData.paiementIntegral) {
        doc.setTextColor(...greenColor);
        doc.setFontSize(10);
        doc.text('TOTAL RÉGLÉ EN INTÉGRALITÉ', 10, y);
        doc.text(finalTotal + '€', 180, y, { align: 'right' });
        y += 8;
        doc.setTextColor(...primaryColor);
        doc.setFontSize(9);
    } else {
        doc.text('Acompte à la réservation :', 10, y);
        doc.text(formData.acomptEUR + '€', 180, y, { align: 'right' });
        y += 5;
        doc.text('Solde :', 10, y);
        doc.text(formData.soldeEUR + '€', 180, y, { align: 'right' });
        y += 8;
    }

    // ── FRAIS COMPLÉMENTAIRES ─────────────────────────────────
    sectionHead('FRAIS COMPLÉMENTAIRES (non inclus dans le total)');
    doc.setFontSize(8.5);
    doc.text('Nombre de chambres réservées : ' + (formData.nombreChambresReservees || 0), 10, y); y += 5;
    doc.text('Caution : ' + formData.cautionEUR + '€ par chambre (remboursable), soit ' + ((formData.cautionEUR || 0) * (formData.nombreChambresReservees || 0)) + '€ au total', 10, y); y += 5;
    doc.text('Taxe de séjour : ' + formData.taxeSejourEUR + '€ (' + formData.chambresAdultes + ' adulte(s) x ' + PRICES.taxeSejourParAdulte + '€), payable sur place', 10, y); y += 5;
    doc.text('Skipass à acheter sur place ou en ligne (non inclus)', 10, y); y += 8;

    // ── RÈGLEMENT ────────────────────────────────────────────
    sectionHead('REGLEMENT');
    doc.setFontSize(8.5);
    doc.setFont(undefined, 'bold');
    doc.text('Titulaire du compte : TOVEL', 10, y); y += 5;
    doc.setFont(undefined, 'normal');
    doc.text('IBAN : FR76 1820 6002 1365 0425 2422 502   |   BIC : AGRFRPP882', 10, y); y += 5;
    doc.text('Libelle du virement : Nom Prenom - Ski 2026', 10, y); y += 7;

    // ── CONDITIONS GÉNÉRALES ─────────────────────────────────
    sectionHead('CONDITIONS GENERALES');
    doc.setFontSize(8);
    const conds = [
        'Chambres disponibles le dimanche a partir de 14h00.',
        'Acompte de 1500 euros a la reservation.',
        'Caution de 100 euros par chambre (remboursable).',
        "Taxe d'hebergement de 10 euros par adulte (+12 ans), payable sur place.",
        'Skipass a acheter sur place ou en ligne. Adhesion TOVEL incluse.'
    ];
    conds.forEach(c => {
        const lines = doc.splitTextToSize('- ' + c, 186);
        checkBreak(lines.length * 3.8 + 1);
        doc.text(lines, 10, y);
        y += lines.length * 3.8 + 0.5;
    });
    y += 3;

    // ── CONTACT ────────────────────────────────────────────
    sectionHead('QUESTIONS / INFORMATIONS');
    doc.setFontSize(8.5);
    doc.text('Téléphone / WhatsApp : 06 12 20 28 61   |   Email : loisirel@hotmail.fr   |   www.loisirel.net', 10, y); y += 5;

    // ── FOOTER — fixé au bas de la page ──────────────────────
    y = Math.max(y + 4, 270);
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.5);
    doc.line(10, 276, 200, 276);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 100, 100);
    doc.text('Hôtel Savoia Resort **** - Bardonecchia, Italie   |   Date : ' + formData.dateSoumission, 105, 281, { align: 'center' });

    // ── SAVE / RETURN ─────────────────────────────────────────
    const filename = 'Devis_Ski_' + formData.nomContact + '_' + formData.prenomContact + '_' + new Date().getTime() + '.pdf';
    if (download) {
        doc.save(filename);
    }
    // Toujours retourner le base64 pour l'envoi email
    return doc.output('datauristring').split(',')[1];
}
