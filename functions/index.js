const functions  = require('firebase-functions');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin      = require('firebase-admin');
const nodemailer = require('nodemailer');
const cors       = require('cors')({ origin: true });
require('dotenv').config();

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const SELTEC_API = 'https://flabl.laportal.net/api/external';
const SELTEC_KEY = '23011293-d527-4bcf-88a5-bca83efd7791';
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

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


// === ✅ ACCEPTANCE EMAIL (sent when fed staff accepts an authorisation) ===
exports.sendAcceptanceEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    const { email, emailsCc, club, firstName, lastName, competitions, comment } = req.body;
    if (!email) return res.status(400).send('Email manquant');

    const commentBlock = (comment && String(comment).trim())
      ? `
        <div style="margin:20px 0;padding:14px;background:#fffde7;border-left:4px solid #f59e0b;border-radius:4px;">
          <strong style="color:#92400e;">Commentaire de la fédération :</strong><br/>
          <span style="white-space:pre-wrap;">${String(comment).trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</span>
        </div>
      `
      : '';

    const htmlBody = `
      <html><body style="font-family:Arial,sans-serif;line-height:1.6;">
        <h2 style="color:#2e7d32;">✅ Autorisation accordée</h2>
        <p>Bonjour <strong>${firstName || ''} ${lastName || ''}</strong>,</p>
        <p>La Fédération Luxembourgeoise d'Athlétisme a <strong>accepté</strong> votre demande d'autorisation pour les compétitions suivantes :</p>
        ${(competitions || []).map(c => `
          <div style="margin:12px 0;padding:12px;background:#f0fff4;border-left:4px solid #2e7d32;border-radius:4px;">
            <strong>${c.name || ''}</strong><br/>
            ${c.place || ''}, ${c.country || ''} — ${(c.dates || []).join(', ')}
          </div>
        `).join('')}
        ${commentBlock}
        <p>Bonne chance à vos athlètes !</p>
        <hr/>
        <p style="color:#888;font-size:0.85em;">Fédération Luxembourgeoise d'Athlétisme</p>
      </body></html>
    `;

    const ccList = Array.from(new Set([...(Array.isArray(emailsCc) ? emailsCc : [])].filter(Boolean)));

    try {
      await transporter.sendMail({
        from: 'etranger@fla.lu',
        to: email,
        cc: ccList,
        subject: '✅ Autorisation accordée — FLA',
        html: htmlBody,
      });
      res.status(200).send('Email envoyé');
    } catch (err) {
      console.error('Erreur acceptance email', err);
      res.status(500).send('Erreur envoi');
    }
  });
});


// === 🔄 SELTEC AUTO-CHECK (runs every 12 hours) ===
exports.checkSeltecStatuses = onSchedule({
  schedule: 'every 12 hours',
  timeZone: 'Europe/Luxembourg',
}, async () => {
  console.log('SELTEC auto-check started');

  // Fetch all submitted declarations not yet resolved
  const snap = await db.collection('performanceDeclarations')
    .where('status', '==', 'submitted')
    .get();

  const toCheck = snap.docs.filter(d => {
    const s = d.data().seltecStatus;
    return s !== 'green' && s !== 'red';
  });

  console.log(`${toCheck.length} declaration(s) to check`);

  const now = Date.now();

  for (const docSnap of toCheck) {
    const data = docSnap.data();
    const ageMs  = now - (data.createdAt?.toMillis() || now);
    const isOld  = ageMs > TWO_WEEKS_MS;

    // Collect unique bib numbers across all athletes in this declaration
    const bibs = [...new Set(
      (data.competitions || [])
        .flatMap(c => c.athletes || [])
        .map(a => String(a.bib || '').trim())
        .filter(Boolean)
    )];

    if (bibs.length === 0) {
      // No bib → can't check; mark red if overdue
      if (isOld) {
        await docSnap.ref.update({
          seltecStatus: 'red',
          lastSeltecCheck: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      continue;
    }

    // Gather all submitted event discipline names for this declaration
    const submittedEvents = (data.competitions || [])
      .flatMap(c => c.athletes || [])
      .flatMap(a => a.performances || [])
      .map(p => (p.event || '').trim())
      .filter(Boolean);

    let found = false;

    for (const bib of bibs) {
      try {
        const res = await fetch(`${SELTEC_API}/fullathleteprofile/lux/${bib}`, {
          headers: { ApiKey: SELTEC_KEY },
        });
        if (!res.ok) {
          console.warn(`SELTEC returned ${res.status} for bib ${bib}`);
          continue;
        }
        const profile = await res.json();
        const competitor = profile?.competitors?.[0];
        if (!competitor) continue;

        const seltecShortcodes = (competitor.bestPerformances || [])
          .map(p => p.eventShortcode || '')
          .filter(Boolean);

        const hasMatch = submittedEvents.some(se =>
          seltecShortcodes.some(sc => eventsMatch(se, sc))
        );

        if (hasMatch) { found = true; break; }

        // Small delay to be polite to the API
        await sleep(300);
      } catch (e) {
        console.warn(`SELTEC lookup failed for bib ${bib}:`, e.message);
      }
    }

    if (found) {
      await docSnap.ref.update({
        seltecStatus: 'green',
        lastSeltecCheck: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  ✅ ${docSnap.id} → green`);
    } else if (isOld) {
      await docSnap.ref.update({
        seltecStatus: 'red',
        lastSeltecCheck: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  🔴 ${docSnap.id} → red (> 2 weeks, not found)`);
    } else {
      // Still within 2 weeks, still not found — keep orange, log the check time
      await docSnap.ref.update({
        lastSeltecCheck: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log(`  🟠 ${docSnap.id} → still orange`);
    }
  }

  console.log('SELTEC auto-check complete');
});

// ── Discipline name → SELTEC shortcode ───────────────────────────────────────
const DISCIPLINE_CODE = {
  '60 m':'60','100 m':'100','200 m':'200','400 m':'400','800 m':'800',
  '1000m':'1K','1500 m':'1K5','Mile (1609m)':'Mile',
  '2000m':'2K','3000 m':'3K','5000 m':'5K','10 000 m':'10K',
  'Semi-Marathon':'HMar','Marathon':'Mar',
  'Hauteur':'HJ','Perche':'PV','Longueur':'LJ','Triple Saut':'TJ',
  'Poids':'SP','Disque':'DT','Marteau':'HT','Javelot':'JT',
  'Heptathlon':'Hep','Décathlon':'Dec','Pentathlon':'Pen',
};

function toShortcode(discipline) {
  if (!discipline) return null;
  const d = discipline.trim();
  if (DISCIPLINE_CODE[d]) return DISCIPLINE_CODE[d];
  for (const [key, code] of Object.entries(DISCIPLINE_CODE)) {
    if (d.toLowerCase().startsWith(key.toLowerCase())) return code;
  }
  const hm = d.match(/^(\d+)mH/i);
  if (hm) return `${hm[1]}H`;
  return null;
}

function eventsMatch(submitted, shortcode) {
  if (!submitted || !shortcode) return false;
  const code = toShortcode(submitted);
  if (code) return code.toUpperCase() === shortcode.toUpperCase();
  const a = submitted.replace(/\s/g,'').toUpperCase();
  const b = shortcode.replace(/\s/g,'').toUpperCase();
  return a.includes(b) || b.includes(a);
}

function normalizeEvent(str) {
  return str.replace(/\s/g, '').toUpperCase();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}