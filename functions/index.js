const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });
require('dotenv').config();

// Reusable transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// === 📩 PERFORMANCE EMAIL ===
exports.sendPerformanceEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    console.log('Received body (performance):', req.body);

    // ✅ Added remarks (optional)
    const { email, emailsCc, competitions, club, remarks } = req.body;

    if (!email) return res.status(400).send('Email principal manquant');

    const remarksBlock = (remarks && String(remarks).trim())
      ? `
        <h3 style="margin-top: 20px; margin-bottom: 8px;">Remarques</h3>
        <div style="white-space: pre-wrap; background:#fafafa; border:1px solid #e6e6e6; padding:10px; border-radius:6px;">
          ${String(remarks).trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      `
      : '';

    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Demande envoyée par le club : ${club}</p>
          <hr style="margin-bottom: 20px;">

          ${(competitions || []).map(comp => `
            <h2 style="color: #2a4d8f;">${comp.name}</h2>
            <p><strong>Lieu :</strong> ${comp.place}, ${comp.country}</p>
            <p><strong>Date :</strong> ${comp.date}</p>
            <p><strong>Site :</strong> <a href="${comp.site}">${comp.site}</a></p>

            <table border="1" cellpadding="5" cellspacing="0" 
                  style="border-collapse: collapse; width: 100%; margin-top: 15px;">
              <thead style="background-color: #f2f2f2;">
                <tr>
                  <th>Nom</th>
                  <th>Sexe</th>
                  <th>Catégorie</th>
                  <th>Épreuve</th>
                  <th>Résultat</th>
                  <th>Vent</th>
                  <th>Rang</th>
                </tr>
              </thead>
              <tbody>
                ${(comp.athletes || []).map(ath => 
                  (ath.performances || []).map(perf => `
                    <tr>
                      <td>${ath.firstName} ${ath.lastName}</td>
                      <td>${ath.sex}</td>
                      <td>${ath.category}</td>
                      <td>${perf.event}</td>
                      <td>${perf.result} ${perf.unit || ''}</td>
                      <td>${perf.wind}</td>
                      <td>${perf.rank}</td>
                    </tr>
                  `).join('')
                ).join('')}
              </tbody>
            </table>
            <hr style="margin: 30px 0;">
          `).join('')}

          ${remarksBlock}
        </body>
      </html>
    `;

    const mailOptions = {
      from: 'etranger@fla.lu',
      to: 'beschteleschten@fla.lu',
      cc: emailsCc,
      subject: 'Nouveau formulaire de performance',
      html: htmlBody
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).send('Email envoyé');
    } catch (err) {
      console.error('Erreur lors de l\'envoi', err);
      res.status(500).send('Erreur lors de l\'envoi');
    }
  });
});


// === 📩 AUTHORISATION EMAIL ===
exports.sendAuthorisationEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    console.log('Received body (authorisation):', req.body);

    // ✅ Added remarks (optional)
    const { email, emailsCc, club, competitions, firstName, lastName, remarks } = req.body;

    if (!email) return res.status(400).send('Email principal manquant');

    // Helper: render athlete events safely (events can be array, string, or missing)
    const renderEventsHtml = (events) => {
      if (Array.isArray(events)) {
        const cleaned = events.map(e => (e ?? '').toString().trim()).filter(Boolean);
        if (cleaned.length === 0) return '<em>(non renseigné)</em>';
        return `<ul style="margin: 6px 0 0 18px; padding: 0;">
          ${cleaned.map(e => `<li>${e}</li>`).join('')}
        </ul>`;
      }

      if (typeof events === 'string') {
        const s = events.trim();
        return s ? `<div>${s}</div>` : '<em>(non renseigné)</em>';
      }

      return '<em>(non renseigné)</em>';
    };

    // ✅ Remarks block at the end (HTML-safe)
    const remarksBlock = (remarks && String(remarks).trim())
      ? `
        <h3 style="margin-top: 10px;">Remarques:</h3>


        <div style="white-space: pre-wrap; background:#fafafa; border:1px solid #e6e6e6; padding:12px; border-radius:6px;">
          ${String(remarks).trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}
        </div>
      `
      : '';

    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Demande d'autorisation envoyée par le club : <strong>${club || ''}</strong></p>
          <p>Demandeur : <strong>${firstName || ''} ${lastName || ''}</strong></p>
          <p>Email du demandeur : <strong>${email}</strong></p>
          <hr style="margin-bottom: 20px;">

          ${(competitions || []).map(comp => `
            <h2 style="color: #2a4d8f; margin-bottom: 6px;">${comp.name || ''}</h2>
            <p style="margin: 4px 0;"><strong>Lieu :</strong> ${comp.place || ''}, ${comp.country || ''}</p>

            <p style="margin: 10px 0 4px 0;"><strong>Dates :</strong></p>
            <ul style="margin: 0 0 10px 18px; padding: 0;">
              ${(comp.dates || []).map(d => `<li>${d}</li>`).join('')}
            </ul>

            <p style="margin: 4px 0;"><strong>Organisateur :</strong> ${comp.organiser || ''}</p>
            <p style="margin: 4px 0;"><strong>Site :</strong> ${
              comp.site ? `<a href="${comp.site}">${comp.site}</a>` : '<em>(non renseigné)</em>'
            }</p>

            <h3 style="margin-top: 18px; margin-bottom: 8px;">Athlètes et épreuves</h3>

            <table border="1" cellpadding="6" cellspacing="0"
              style="border-collapse: collapse; width: 100%; margin-top: 10px;">
              <thead style="background-color: #f2f2f2;">
                <tr>
                  <th style="text-align:left;">Athlète</th>
                  <th style="text-align:left;">Épreuves</th>
                </tr>
              </thead>
              <tbody>
                ${(comp.athletes || []).map(ath => `
                  <tr>
                    <td>${ath.firstName || ''} ${ath.lastName || ''}</td>
                    <td>${renderEventsHtml(ath.events)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <hr style="margin: 30px 0;">
          `).join('')}

          ${remarksBlock}
        </body>
      </html>
    `;

    // CC: include requester + optional extra CCs
    const ccList = Array.from(
      new Set([email, ...(Array.isArray(emailsCc) ? emailsCc : [])].filter(Boolean))
    );
  //,
    const mailOptions = {
      from: 'etranger@fla.lu',
      to: 'autorisation@fla.lu',
      cc: ccList,
      subject: 'Demande d’autorisation pour compétition à l’étranger',
      html: htmlBody
    };


    try {
      await transporter.sendMail(mailOptions);
      res.status(200).send('Email envoyé avec succès');
    } catch (err) {
      console.error("Erreur lors de l'envoi", err);
      res.status(500).send("Erreur lors de l'envoi");
    }
  });
});