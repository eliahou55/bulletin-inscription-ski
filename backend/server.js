const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');

const app = express();
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// ── Route santé ──────────────────────────────────────────────
app.get('/', (req, res) => res.send('Ski 2027 - Email Service OK'));

// ── Envoi du devis par email ─────────────────────────────────
app.post('/send-email', async (req, res) => {
    const { formData, pdfBase64 } = req.body;

    if (!formData || !formData.emailContact) {
        return res.status(400).json({ success: false, error: 'Email manquant' });
    }

    const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@loisirel.online';
    const ORGANIZER_EMAIL = process.env.ORGANIZER_EMAIL || 'loisirel@hotmail.fr';

    const finalTotal = (formData.remiseAmount > 0) ? formData.totalApresRemise : formData.totalEUR;
    const pdfAttachment = pdfBase64
        ? [{ filename: `Devis_Ski_${formData.nomContact}_${formData.prenomContact}.pdf`, content: pdfBase64 }]
        : [];

    try {
        // ── Email de confirmation au client ──────────────────
        await resend.emails.send({
            from: `Loisirel Ski 2027 <${FROM_EMAIL}>`,
            to: formData.emailContact,
            subject: "Confirmation d'inscription - Ski 2027",
            html: buildClientEmail(formData, finalTotal),
            attachments: pdfAttachment
        });

        // ── Notification à l'organisateur ────────────────────
        await resend.emails.send({
            from: `Formulaire Ski 2027 <${FROM_EMAIL}>`,
            to: ORGANIZER_EMAIL,
            subject: `Nouvelle inscription - ${formData.nomContact} ${formData.prenomContact} - Ski 2027`,
            html: buildOrganizerEmail(formData, finalTotal),
            attachments: pdfAttachment
        });

        console.log(`Emails envoyés pour ${formData.nomContact} ${formData.prenomContact} (${formData.emailContact})`);
        res.json({ success: true });

    } catch (error) {
        console.error('Erreur envoi email:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ── Templates HTML ────────────────────────────────────────────
function buildClientEmail(data, finalTotal) {
    return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <tr>
      <td style="background:#0b5f8a;padding:25px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">LOISIREL SKI 2027</h1>
        <p style="color:#dcf0fa;margin:5px 0 0;">Hôtel Savoia Resort **** - Bardonecchia, Italie</p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <h2 style="color:#0b5f8a;margin-top:0;">Confirmation d'inscription</h2>
        <p>Bonjour <strong>${data.prenomContact} ${data.nomContact}</strong>,</p>
        <p>Nous avons bien reçu votre inscription pour le séjour au ski 2027. Votre devis complet est joint en pièce attachée.</p>

        <p style="display:inline-block;background:#ff8c3a;color:#3a2000;font-weight:800;padding:6px 16px;border-radius:999px;font-size:13px;">PENSION COMPLÈTE GASTRONOMIQUE</p>

        <h3 style="color:#0b5f8a;border-bottom:2px solid #0b5f8a;padding-bottom:6px;">Récapitulatif</h3>
        <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <tr style="background:#e7f4fb;">
            <td style="border:1px solid #ddd;"><strong>Contact</strong></td>
            <td style="border:1px solid #ddd;">${data.prenomContact} ${data.nomContact} — ${data.portable || 'N/A'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #ddd;"><strong>Nombre de personnes</strong></td>
            <td style="border:1px solid #ddd;">${data.nombrePersonnes}</td>
          </tr>
          ${data.remiseAppliquee === 'Oui' && data.remiseAmount > 0 ? `
          <tr>
            <td style="border:1px solid #ddd;"><strong>Total avant remise</strong></td>
            <td style="border:1px solid #ddd;">${data.totalEUR}€</td>
          </tr>` : ''}
          <tr style="background:#0b5f8a;">
            <td style="border:1px solid #0b5f8a;color:#fff;padding:10px;"><strong>TOTAL</strong></td>
            <td style="border:1px solid #0b5f8a;color:#fff;padding:10px;"><strong>${finalTotal}€</strong></td>
          </tr>
          <tr>
            <td style="border:1px solid #ddd;">Acompte 50%</td>
            <td style="border:1px solid #ddd;">${data.acomptEUR}€</td>
          </tr>
          <tr style="background:#e7f4fb;">
            <td style="border:1px solid #ddd;">Solde</td>
            <td style="border:1px solid #ddd;">${data.soldeEUR}€</td>
          </tr>
        </table>

        <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:15px;margin-top:20px;border-radius:4px;">
          <strong>Frais complémentaires (non inclus) :</strong><br>
          Caution : ${data.cautionEUR}€ par chambre (remboursable)<br>
          Taxe de séjour : ${data.taxeSejourEUR}€, payable sur place<br>
          Skipass à acheter sur place ou en ligne
        </div>

        <div style="background:#fff8e1;border-left:4px solid #f59e0b;padding:15px;margin-top:15px;border-radius:4px;">
          <strong>Règlement par virement :</strong><br>
          <strong style="color:#0b5f8a;">Titulaire du compte : TOVEL</strong><br>
          IBAN : FR76 1820 6002 1365 0425 2422 502<br>
          BIC : AGRFRPP882<br>
          Libellé : <strong>${data.nomContact} ${data.prenomContact} - Ski 2027</strong>
        </div>

        <p style="margin-top:20px;color:#555;">Pour toute question, contactez-nous par téléphone / WhatsApp au <strong>06 12 20 28 61</strong> ou par email à <a href="mailto:loisirel@hotmail.fr">loisirel@hotmail.fr</a>.</p>
      </td>
    </tr>
    <tr>
      <td style="background:#e7f4fb;padding:15px;text-align:center;font-size:12px;color:#888;">
        Hôtel Savoia Resort **** — Bardonecchia, Italie
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOrganizerEmail(data, finalTotal) {
    const membres = Array.isArray(data.familleMembers) ? data.familleMembers : [];
    const CAT_LABELS = { adulte: 'Adulte', enfant: 'Enfant', bebe: 'Bébé' };
    const membresHTML = membres.map((m, i) => {
        let detail = CAT_LABELS[m.categorie] || m.categorie || 'N/A';
        detail += ' - chambre ' + (m.chambreNumero || 1);
        if (m.categorie === 'enfant') {
            if (m.tarifPromu) detail += ' - tarif adulte (chambre)';
            if (m.coursSki) detail += ' - cours ' + (m.age ? m.age + ' ans, ' : '') + (m.niveau || '') + ' (' + m.duree + '/j)';
            if (m.locationSki) detail += ' - location ski';
        } else if (m.categorie === 'adulte' && m.locationSki) {
            detail += ' - location ski';
        }
        return `<tr style="${i % 2 === 0 ? 'background:#e7f4fb;' : ''}">
            <td style="border:1px solid #ddd;padding:6px;">${m.nom} ${m.prenom}</td>
            <td style="border:1px solid #ddd;padding:6px;">${detail}</td>
            <td style="border:1px solid #ddd;padding:6px;">${m.tarif || 0}€</td>
        </tr>`;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <tr>
      <td style="background:#0b5f8a;padding:20px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:18px;">NOUVELLE INSCRIPTION — SKI 2027</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:25px;">
        <h2 style="color:#0b5f8a;margin-top:0;">${data.prenomContact} ${data.nomContact}</h2>
        <table width="100%" cellpadding="7" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <tr style="background:#e7f4fb;">
            <td style="border:1px solid #ddd;width:40%;"><strong>Téléphone</strong></td>
            <td style="border:1px solid #ddd;">${data.portable || 'N/A'}</td>
          </tr>
          <tr>
            <td style="border:1px solid #ddd;"><strong>Email</strong></td>
            <td style="border:1px solid #ddd;">${data.emailContact}</td>
          </tr>
          <tr style="background:#e7f4fb;">
            <td style="border:1px solid #ddd;"><strong>Personnes</strong></td>
            <td style="border:1px solid #ddd;">${data.nombrePersonnes} (${data.chambresAdultes} adultes, ${data.chambresEnfants} enfants, ${data.bebes} bébés)</td>
          </tr>
          ${data.notes ? `<tr><td style="border:1px solid #ddd;"><strong>Notes</strong></td><td style="border:1px solid #ddd;">${data.notes}</td></tr>` : ''}
          ${data.remiseAppliquee === 'Oui' ? `
          <tr style="background:#e7f4fb;">
            <td style="border:1px solid #ddd;"><strong>Total avant remise</strong></td>
            <td style="border:1px solid #ddd;">${data.totalEUR}€</td>
          </tr>` : ''}
          <tr style="background:#0b5f8a;">
            <td style="border:1px solid #0b5f8a;color:#fff;padding:10px;"><strong>TOTAL</strong></td>
            <td style="border:1px solid #0b5f8a;color:#fff;padding:10px;"><strong>${finalTotal}€</strong></td>
          </tr>
          <tr>
            <td style="border:1px solid #ddd;">Acompte 50%</td>
            <td style="border:1px solid #ddd;">${data.acomptEUR}€</td>
          </tr>
          <tr style="background:#e7f4fb;">
            <td style="border:1px solid #ddd;">Solde</td>
            <td style="border:1px solid #ddd;">${data.soldeEUR}€</td>
          </tr>
          <tr>
            <td style="border:1px solid #ddd;">Taxe de séjour / Caution</td>
            <td style="border:1px solid #ddd;">${data.taxeSejourEUR}€ / ${data.cautionEUR}€ par chambre</td>
          </tr>
          <tr style="background:#e7f4fb;">
            <td style="border:1px solid #ddd;"><strong>Chambres réservées</strong></td>
            <td style="border:1px solid #ddd;">${data.nombreChambresReservees || 0}</td>
          </tr>
        </table>

        ${membres.length > 0 ? `
        <h3 style="color:#0b5f8a;margin-top:20px;">Membres de la famille</h3>
        <table width="100%" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
          <tr style="background:#0b5f8a;color:#fff;">
            <th style="padding:8px;text-align:left;">Nom Prénom</th>
            <th style="padding:8px;text-align:left;">Détails</th>
            <th style="padding:8px;text-align:left;">Tarif</th>
          </tr>
          ${membresHTML}
        </table>` : ''}

        <p style="color:#888;font-size:12px;margin-top:20px;">Soumis le ${data.dateSoumission}</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
