# ⚡ Démarrage Rapide en 5 Minutes

## 🎯 Résumé

Vous avez maintenant tous les fichiers pour créer un bulletin d'inscription online pour le séjour au ski. Voici le processus simplifié:

---

## 1️⃣ Créer un Google Sheet
→ https://sheets.google.com/create

Donner lui un nom (ex: "Ski 2027")

---

## 2️⃣ Créer Google Apps Script
→ https://script.google.com

- Cliquer "Nouveau projet"
- Copier le code de `script.gs`
- Sauvegarder (Ctrl+S)

---

## 3️⃣ Lier le Sheet au Script

Dans le dropdown en haut → Sélectionner votre Google Sheet

---

## 4️⃣ Déployer le Script

1. Cliquer `Déployer` → `Nouveau déploiement`
2. Type: `Application web`
3. Exécuter en tant que: Votre compte
4. Qui a accès: `Tout le monde`
5. Cliquer `Déployer`
6. **Copier l'URL** (elle ressemble à: `https://script.google.com/macros/d/1-xxxxxXXXxx/usercopy`)

---

## 5️⃣ Configurer le Formulaire

Ouvrir `form.js` et remplacer:

```javascript
const CONFIG = {
    GOOGLE_APPS_SCRIPT_URL: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE',
};
```

Par votre URL copiée.

---

## 6️⃣ Tester Localement

Double-cliquer sur `index.html` → Remplir et soumettre → Vérifier dans Google Sheet

---

## 7️⃣ Déployer en Ligne

### Option A: Netlify Drop (le plus simple)
1. Aller sur https://netlify.com
2. Drag-and-drop votre dossier
3. Voilà ✨

### Option B: GitHub + Netlify
1. Créer un repo GitHub
2. Uploader tous les fichiers du projet
3. Connecter Netlify à votre repo
4. Voilà ✨

---

## ✅ Vérification

- [x] Formulaire s'affiche
- [x] Sélectionner Enfant/Adulte affiche les options ski correspondantes
- [x] Calculs en temps réel
- [x] Données sauvegardées
- [x] Site en ligne

**C'est prêt ! 🚀**

---

## 📁 Fichiers Nécessaires

```
bulletin-inscription-ski/
├── index.html              ← Formulaire
├── styles.css              ← Design
├── form.js                 ← Logique (À CONFIGURER)
├── effects.js               ← Animations (confettis, carrousel, lightbox)
├── script.gs               ← Google Apps Script (À déployer)
├── image/hotel/             ← Photos de l'hôtel (à ajouter)
├── image/traiteur/          ← Photos du traiteur (à ajouter)
├── README.md               ← Guide complet
└── QUICKSTART.md           ← Ce fichier
```

---

## 🔗 Liens Utiles

- [Google Sheets](https://sheets.google.com)
- [Google Apps Script](https://script.google.com)
- [Netlify](https://netlify.com)
- [GitHub](https://github.com)

---

## 💡 Tips

1. **Testez toujours localement d'abord** (avant de déployer)
2. **Gardez votre URL de script secrète** (elle peut être abusée)
3. **Vérifiez le Google Sheet régulièrement** pour les nouvelles inscriptions
4. **Exportez les données** en tant que CSV pour backup

---

## 🆘 Besoin d'aide?

1. Les données ne s'ajoutent pas?
   → Vérifier l'URL dans form.js
   → Vérifier que le script est bien déployé

2. Le formulaire ne s'affiche pas?
   → Ouvrir index.html directement
   → Vérifier la console (F12)

3. Erreur de CORS?
   → Ce n'est pas un problème avec Google Apps Script
   → Rafraîchir la page

---

**Bon courage et bonne gestion des inscriptions! 🎉**
