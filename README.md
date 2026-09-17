# Bulletin d'Inscription Ski 2027 - Guide d'Installation

## 📋 Vue d'ensemble

Ce projet est un bulletin d'inscription en ligne pour le séjour au ski 2027 (du 14 février au 21 février 2027, 7 nuits / 8 jours) à l'Hôtel Savoia Resort **** à Bardonecchia, Italie. Les inscriptions sont automatiquement sauvegardées dans un Google Sheet réparti en 4 feuilles (voir plus bas).

**Caractéristiques:**
- ✅ Formulaire responsive et professionnel (style "verre liquide")
- ✅ Calcul automatique du total selon les options choisies (chambre enfant, location de ski, cours de ski)
- ✅ Validation côté client et serveur
- ✅ Synchronisation directe avec Google Sheets
- ✅ Pas de frais d'hébergement (GitHub Pages / Netlify gratuit)

---

## 🚀 Installation Étape par Étape

### **ÉTAPE 1: Préparer Google Sheets**

1. Allez sur [Google Sheets](https://sheets.google.com)
2. Créez un nouveau Google Sheet (donner-lui un nom, ex: "Inscriptions Ski 2027")
3. Vous pouvez laisser la première feuille vide - le script créera automatiquement les headers
4. ⚠️ Ce Google Sheet doit être **différent** de celui utilisé pour Souccot/Pessah - chaque événement a son propre Sheet et son propre déploiement Apps Script

**4 feuilles créées automatiquement par le script (colonnes générées au premier envoi):**

- **Inscriptions** (vue générale / tarification) : ID Inscription, Date Soumission, Nom, Prenom, Telephone, Email, Total Membre, Membre Famille, Adultes, Enfants, Bébés, Tarif Total Adultes, Tarif Total Enfants, Tarif Bébés, Tarif Options Ski, Tarif Optimal Chambres, Supplément Chambres Séparées, Nombre de Chambres Réservées, Notes, Réduction (€), Total, Acompte, Solde Restant, Total avant remise (€), Réduction (%), Paiement Intégral, Taxe de Séjour (€), Caution par Chambre (€), Chambre Double/Familiale/Suite/Chalet (organisateur)
- **Cours de Ski** : une ligne par enfant inscrit à un cours (ID Inscription, Nom Contact, Nom/Prénom Enfant, Âge, Niveau, Durée, Tarif Cours)
- **Locations** : une ligne par personne ayant loué du matériel de ski (ID Inscription, Nom Contact, Nom/Prénom, Catégorie, Tarif Location)
- **Chambres** : une ligne par chambre réservée (ID Inscription, Nom Contact, N° Chambre, Adultes, Enfants, Enfants au tarif adulte, Bébés, Total Chambre)

---

### **ÉTAPE 2: Configurer Google Apps Script**

1. **Ouvrir Google Apps Script:**
   - Depuis votre Google Sheet: `Outils` → `Éditeur de script`
   - Ou allez directement à [script.google.com](https://script.google.com)

2. **Créer un nouveau projet:**
   - Cliquer sur "Nouveau projet"
   - Donner un nom au projet (ex: "Ski Inscription API")

3. **Copier le code du backend:**
   - Supprimer le code par défaut dans `Code.gs`
   - Copier-coller tout le contenu du fichier `script.gs` fourni (version Ski 2027)
   - Sauvegarder: `Ctrl+S` (ou `Cmd+S` sur Mac)

4. **Lier le Google Sheet au Script:**
   - Cliquer sur le nom du projet en haut: `Éditeur de script non associé`
   - Sélectionner le Google Sheet créé à l'étape 1

5. **Déployer comme application Web:**
   - Cliquer sur `Déployer` → `Nouveau déploiement`
   - Choisir le type: `Application web`
   - Remplir:
     - **Exécuter en tant que:** Votre compte (xxx@gmail.com)
     - **Qui a accès:** Tout le monde
   - Cliquer sur `Déployer`

6. **Autoriser les permissions:**
   - Une fenêtre pop-up demandera la permission
   - Cliquer sur votre compte Gmail
   - Cliquer sur "Autoriser"
   - Copier l'URL de déploiement (elle ressemble à: `https://script.google.com/macros/d/1-xxxxxxxxxxx/usercopy`)

⚠️ **Important:** Cette URL est essentielle - gardez-la précieusement !

---

### **ÉTAPE 3: Configurer le formulaire**

1. **Ouvrir le fichier `form.js`**

2. **Remplacer l'URL Google Apps Script (et celle du service email si utilisé):**
   ```javascript
   const CONFIG = {
       GOOGLE_APPS_SCRIPT_URL: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE',
       EMAIL_SERVICE_URL: 'https://loisirel-ski.netlify.app/.netlify/functions',
   };
   ```

   Remplacer par l'URL de déploiement copiée à l'étape 2.6, et par l'URL réelle de votre site Netlify une fois déployé (étape 5).

3. **Sauvegarder le fichier**

---

### **ÉTAPE 4: Tester localement**

1. **Ouvrir le formulaire:**
   - Double-cliquer sur `index.html` depuis l'explorateur de fichiers
   - Ou ouvrir avec votre navigateur préféré

2. **Test complet:**
   - Remplir le formulaire avec des données de test (essayer un enfant avec cours de ski + un adulte avec location de ski)
   - Vérifier que les calculs du total sont corrects
   - Cliquer sur "Soumettre l'Inscription"
   - Un message vert devrait apparaître: "✅ Inscription envoyée avec succès!"

3. **Vérifier dans Google Sheets:**
   - Aller sur votre Google Sheet "Inscriptions Ski 2027"
   - Les données de test doivent apparaître dans une nouvelle ligne

---

### **ÉTAPE 5: Déployer sur Netlify (Gratuit)**

#### Option A: Via l'interface Netlify (le plus simple)

1. Aller sur [netlify.com](https://netlify.com), créer un compte (ou en utiliser un dédié, distinct de celui de Souccot)
2. "Sites" → "Add new site" → "Deploy manually"
3. Glisser-déposer le dossier du projet entier
4. Netlify génère automatiquement une URL (ex: `https://votre-site.netlify.app`)

#### Option B: Via GitHub + Netlify (plus robuste, permet les mises à jour faciles)

1. Créer un repo GitHub (ex: `ski-inscription`)
2. Uploader tous les fichiers du projet
3. Dans Netlify: "Add new site" → "Import an existing project" → connecter le repo
4. Déployer

---

### **ÉTAPE 6: Photos de l'hôtel et du traiteur**

Les dossiers `image/hotel/` et `image/traiteur/` sont prêts à recevoir vos photos (`.jpg`, `.jpeg`, `.png` ou `.webp`). Une fois les photos ajoutées, il suffira de le signaler pour que les carrousels "Découvrez l'Hôtel" et "Notre Traiteur" soient intégrés à la page (même style que le projet Souccot : carrousel avec effet de défilement, lightbox au clic).

---

## 🧪 Tests Complets

### Checklist avant mise en production:

- [ ] Formulaire s'affiche correctement
- [ ] Sélectionner "Enfant" fait apparaître les options (chambre, cours de ski, location)
- [ ] Sélectionner "Adulte" fait apparaître l'option de location de ski
- [ ] Calcul du total fonctionne en temps réel avec toutes les options
- [ ] Acompte = 50% du total
- [ ] Bouton "Soumettre" envoie bien les données
- [ ] Les données s'ajoutent au Google Sheet
- [ ] Le formulaire fonctionne sur mobile

---

## 🔧 Dépannage

Voir le fichier `QUICKSTART.md` pour les problèmes les plus courants (URL non configurée, CORS, etc.) — le fonctionnement est identique au projet Souccot.

---

## 👤 Infos Hôtel

```
Hôtel Savoia Resort **** - Bardonecchia, Italie
Accès via aéroports de Turin ou Milan (transport aller-retour en train en option)

Séjour 2027: du 14 février au 21 février 2027 (7 nuits / 8 jours)

Sous la supervision du Dayan Rav Ephraïm Cremisi

Titulaire du compte: TOVEL
IBAN: FR76 1820 6002 1365 0425 2422 502
Code AGRFRPP882

Contact: Téléphone/WhatsApp 06 12 20 28 61 - loisirel@hotmail.fr - www.loisirel.net
Code espace organisateur (sélection de chambres / remise): 2861
```

---

## 📝 Notes Importantes

- ✅ L'acompte est de 50% du total (même logique que le projet Souccot)
- ✅ Adulte : 1 500 € — Enfant (tarif réduit) : 1 000 € — Bébé : 500 €
- ✅ **Logique chambre** : chaque chambre (2 à 4 personnes, bébés non comptés) doit rapporter au minimum 3 000 €. Si les adultes d'une chambre ne couvrent pas ce minimum, des enfants de cette chambre sont automatiquement "promus" au tarif adulte (1 500 €) jusqu'à l'atteindre ; les enfants suivants dans la même chambre restent au tarif réduit. Une chambre à moins de 2 ou plus de 4 personnes (hors bébés) est signalée en erreur.
- ✅ Chaque membre est assigné par défaut à la Chambre 1 (remplissage automatique à 4 personnes max) ; un menu déroulant permet de le déplacer vers une nouvelle chambre. Le récapitulatif affiche le détail et les éventuelles erreurs par chambre, ainsi que le nombre total de chambres réservées
- ✅ Location de matériel de ski : 150 € (adulte) / 100 € (enfant), par semaine
- ✅ Cours de ski enfant : réservé aux 4-12 ans (âge sélectionné dans le formulaire), 350 € (6h/jour) ou 250 € (3h/jour) — en dessous de 4 ans, les enfants sont pris en charge par le Mini/Baby Club
- ✅ Caution (100 €/chambre) et taxe de séjour (10 €/adulte) sont informatives, non incluses dans le total
- ✅ Tous les champs marqués avec * sont obligatoires

---

**Bonne saison de ski avec Loisirel! 🎿**
