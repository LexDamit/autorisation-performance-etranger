const functions = require('firebase-functions');
const nodemailer = require('nodemailer');
const cors = require('cors')({ origin: true });
require('dotenv').config();


const transporter = nodemailer.createTransport({
  host: 'smtp.office365.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


exports.sendPerformanceEmail = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    console.log('Received body:', req.body);

    const { email, emailsCc, competitions, club } = req.body; // ✅ on récupère aussi club

    if (!email) {
      return res.status(400).send('Email principal manquant');
    }


    const htmlBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.5;">
          <p>Demande envoyée par le club : ${club}</p>
          <hr style="margin-bottom: 20px;">

          ${(competitions || []).map(comp => `
            <h2 style="color: #2a4d8f; margin-top: 0;">${comp.name}</h2>
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
        </body>
      </html>
      `;




    const mailOptions = {
      from: 'etranger@fla.lu',
      to: 'lex.damit@fla.lu',
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
