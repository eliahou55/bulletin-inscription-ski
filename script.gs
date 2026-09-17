// ============================================================
// GOOGLE APPS SCRIPT - SKI 2027 (BARDONECCHIA)
// ============================================================
// Écrit dans 4 feuilles séparées à chaque inscription :
//   - "Inscriptions"  : vue générale / tarification (une ligne par inscription)
//   - "Cours de Ski"  : une ligne par enfant ayant demandé un cours de ski
//   - "Locations"     : une ligne par personne ayant loué du matériel de ski
//   - "Chambres"      : une ligne par chambre réservée dans l'inscription

const SHEET_INSCRIPTIONS = "Inscriptions";
const SHEET_COURS_SKI = "Cours de Ski";
const SHEET_LOCATIONS = "Locations";
const SHEET_CHAMBRES = "Chambres";

// ---- Headers (doivent correspondre exactement aux colonnes de chaque feuille) ----

const HEADERS_INSCRIPTIONS = [
  "ID Inscription", "Date Soumission",
  "Nom", "Prenom", "Telephone", "Email",
  "Total Membre", "Membre Famille",
  "Adultes", "Enfants", "Bébés",
  "Tarif Total Adultes", "Tarif Total Enfants", "Tarif Bébés",
  "Tarif Options Ski (location/cours)",
  "Tarif Optimal Chambres (€)", "Supplément Chambres Séparées (€)",
  "Nombre de Chambres Réservées",
  "Notes",
  "Reduction (€)",
  "Total", "Acompte", "Solde Restant",
  "Total avant remise (€)", "Réduction (%)",
  "Paiement Intégral",
  "Taxe de Séjour (€)", "Caution par Chambre (€)",
  "Chambre Double", "Chambre Familiale", "Suite", "Chalet"
];

const HEADERS_COURS_SKI = [
  "ID Inscription", "Date Soumission", "Nom Contact", "Prenom Contact",
  "Nom Enfant", "Prenom Enfant", "Âge", "Niveau", "Durée", "Tarif Cours (€)"
];

const HEADERS_LOCATIONS = [
  "ID Inscription", "Date Soumission", "Nom Contact", "Prenom Contact",
  "Nom Personne", "Prenom Personne", "Catégorie", "Tarif Location (€)"
];

const HEADERS_CHAMBRES = [
  "ID Inscription", "Date Soumission", "Nom Contact", "Prenom Contact",
  "N° Chambre", "Adultes", "Enfants", "Enfants au tarif adulte", "Bébés", "Total Chambre (€)"
];

// ============================================================
// POINT D'ENTRÉE POST
// ============================================================

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);

    if (!payload.nomContact || !payload.prenomContact) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: 'error', message: 'Nom et prénom de contact requis' })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    const result = addDataToSheets(payload);

    return ContentService.createTextOutput(
      JSON.stringify(result.success
        ? { status: 'success', message: 'Inscription reçue', confirmationId: result.confirmationId }
        : { status: 'error', message: result.error }
      )
    ).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: 'error', message: 'Erreur serveur: ' + error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// FONCTION PRINCIPALE
// ============================================================

function addDataToSheets(data) {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const color = generateRandomColor();
    const dateSoumission = data.dateSoumission || new Date().toLocaleDateString('fr-FR');

    // ---- Feuille générale "Inscriptions" ----
    const sheetInscriptions = getOrCreateSheet(spreadsheet, SHEET_INSCRIPTIONS, HEADERS_INSCRIPTIONS);
    const inscriptionId = 'SKI-2027-' + (sheetInscriptions.getLastRow());

    let membres = [];
    try {
      membres = JSON.parse(data.familleJSON || '[]');
    } catch (e) {
      membres = [];
    }

    let chambresDetail = [];
    try {
      chambresDetail = JSON.parse(data.chambresDetailJSON || '[]');
    } catch (e) {
      chambresDetail = [];
    }

    const membresTexte = membres.map(m => {
      let info = m.nom + ' ' + m.prenom + (m.categorie ? ' (' + m.categorie + ')' : '');
      info += ' [chambre ' + (m.chambreNumero || 1) + ']';
      if (m.categorie === 'enfant') {
        if (m.tarifPromu) info += ' [tarif adulte - chambre]';
        if (m.coursSki) info += ' [cours ski ' + (m.age ? m.age + ' ans, ' : '') + (m.niveau || '') + ' - ' + m.duree + '/j]';
        if (m.locationSki) info += ' [location ski]';
      } else if (m.categorie === 'adulte' && m.locationSki) {
        info += ' [location ski]';
      }
      return info;
    }).join(' | ');

    const finalTotal = (data.remiseAmount > 0) ? data.remiseAmount : data.totalEUR;
    const rooms = data.roomsOrganisateur || {};

    const rowInscription = [
      inscriptionId,
      dateSoumission,
      data.nomContact,
      data.prenomContact,
      data.portable || '',
      data.emailContact || '',
      membres.length,
      membresTexte,
      data.chambresAdultes || 0,
      data.chambresEnfants || 0,
      data.bebes || 0,
      data.tarifChambresAdultes || 0,
      data.tarifChambresEnfants || 0,
      data.tarifBebes || 0,
      data.tarifOptions || 0,
      data.tarifChambresOptimal || 0,
      data.supplementChambres || 0,
      data.nombreChambresReservees || chambresDetail.length || 0,
      data.notes || '',
      (data.remiseAppliquee === 'Oui' && data.remiseAmount > 0) ? (data.totalEUR - data.remiseAmount) : 0,
      finalTotal || 0,
      data.acomptEUR || 0,
      data.soldeEUR || 0,
      data.totalEUR || 0,
      data.remisePourcentage || 0,
      data.paiementIntegral ? 'Oui' : 'Non',
      data.taxeSejourEUR || 0,
      data.cautionEUR || 0,
      rooms.double || 0,
      rooms.familiale || 0,
      rooms.suite || 0,
      rooms.chalet || 0
    ];

    sheetInscriptions.appendRow(rowInscription);
    coloriserLigne(sheetInscriptions, sheetInscriptions.getLastRow(), color);

    // ---- Feuille "Cours de Ski" : une ligne par enfant inscrit à un cours ----
    const enfantsAvecCours = membres.filter(m => m.categorie === 'enfant' && m.coursSki);
    if (enfantsAvecCours.length > 0) {
      const sheetCours = getOrCreateSheet(spreadsheet, SHEET_COURS_SKI, HEADERS_COURS_SKI);
      enfantsAvecCours.forEach(m => {
        const tarifCours = m.duree === '3h' ? 250 : 350;
        sheetCours.appendRow([
          inscriptionId, dateSoumission, data.nomContact, data.prenomContact,
          m.nom, m.prenom, m.age || '', m.niveau || '', m.duree || '', tarifCours
        ]);
        coloriserLigne(sheetCours, sheetCours.getLastRow(), color);
      });
    }

    // ---- Feuille "Locations" : une ligne par personne ayant loué du matériel ----
    const personnesAvecLocation = membres.filter(m => m.locationSki);
    if (personnesAvecLocation.length > 0) {
      const sheetLocations = getOrCreateSheet(spreadsheet, SHEET_LOCATIONS, HEADERS_LOCATIONS);
      personnesAvecLocation.forEach(m => {
        const tarifLocation = m.categorie === 'adulte' ? 150 : 100;
        sheetLocations.appendRow([
          inscriptionId, dateSoumission, data.nomContact, data.prenomContact,
          m.nom, m.prenom, m.categorie, tarifLocation
        ]);
        coloriserLigne(sheetLocations, sheetLocations.getLastRow(), color);
      });
    }

    // ---- Feuille "Chambres" : une ligne par chambre réservée ----
    if (chambresDetail.length > 0) {
      const sheetChambres = getOrCreateSheet(spreadsheet, SHEET_CHAMBRES, HEADERS_CHAMBRES);
      chambresDetail.forEach(c => {
        sheetChambres.appendRow([
          inscriptionId, dateSoumission, data.nomContact, data.prenomContact,
          c.numero, c.adultes || 0, c.enfants || 0, c.promus || 0, c.bebes || 0, c.total || 0
        ]);
        coloriserLigne(sheetChambres, sheetChambres.getLastRow(), color);
      });
    }

    Logger.log('Inscription enregistrée: ' + inscriptionId + ' - ' + data.nomContact + ' ' + data.prenomContact);

    return { success: true, confirmationId: inscriptionId };

  } catch (error) {
    Logger.log('Erreur: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

// ============================================================
// HELPERS
// ============================================================

function getOrCreateSheet(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#0b5f8a');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function coloriserLigne(sheet, rowIndex, color) {
  const range = sheet.getRange(rowIndex, 1, 1, sheet.getLastColumn());
  range.setBackground(color);
}

function generateRandomColor() {
  const colors = [
    '#FFE6E6', '#E6F2FF', '#E6FFE6', '#FFFFE6',
    '#FFE6F2', '#E6FFFF', '#FFF0E6', '#F0E6FF',
    '#E6FFE6', '#FFE6CC', '#E6F9FF', '#F9FFE6'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ============================================================
// TEST LOCAL (à lancer depuis Apps Script pour tester)
// ============================================================

function testDoPost() {
  const testData = {
    nomContact: 'Cohen',
    prenomContact: 'David',
    portable: '0612345678',
    emailContact: 'david.cohen@example.com',
    familleJSON: '[{"nom":"Cohen","prenom":"David","categorie":"adulte","chambreNumero":1,"locationSki":true,"tarif":1650},{"nom":"Cohen","prenom":"Sarah","categorie":"adulte","chambreNumero":1,"locationSki":false,"tarif":1500},{"nom":"Cohen","prenom":"Tom","categorie":"enfant","chambreNumero":1,"tarifPromu":false,"coursSki":true,"age":"8","niveau":"Flocon","duree":"6h","locationSki":true,"tarif":1450},{"nom":"Cohen","prenom":"Leia","categorie":"bebe","chambreNumero":1,"tarif":500}]',
    chambresDetailJSON: '[{"numero":1,"adultes":2,"enfants":1,"bebes":1,"promus":0,"total":4000}]',
    chambresAdultes: 2,
    chambresEnfants: 1,
    bebes: 1,
    tarifChambresAdultes: 3000,
    tarifChambresEnfants: 1000,
    tarifBebes: 500,
    tarifOptions: 600,
    tarifChambresOptimal: 4000,
    supplementChambres: 0,
    nombreChambresReservees: 1,
    notes: 'Régime casher strict',
    remiseAppliquee: 'Non',
    remiseAmount: 0,
    totalEUR: 5050,
    totalApresRemise: 5050,
    acomptEUR: 1500,
    soldeEUR: 3550,
    taxeSejourEUR: 20,
    cautionEUR: 100,
    paiementIntegral: false,
    roomsOrganisateur: { double: 1, familiale: 1, suite: 0, chalet: 0 },
    dateSoumission: new Date().toLocaleDateString('fr-FR'),
    timestamp: new Date().toISOString()
  };

  const result = addDataToSheets(testData);
  Logger.log('Résultat: ' + JSON.stringify(result));
}
