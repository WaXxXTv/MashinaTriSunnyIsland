/* ========= reCAPTCHA + Recherche ========= */
function verifierCaptcha() {
  const response = grecaptcha.getResponse();
  if (!response || response.length === 0) {
    alert("⚠️ Merci de valider le reCAPTCHA avant de continuer.");
    return;
  }
  rechercheVehicule();
}

async function rechercheVehicule() {
  const plaque = document.getElementById("plaque").value.toUpperCase().trim();
  if (!plaque) {
    document.getElementById("resultat").innerHTML =
      '<p class="error">❌ Merci d’entrer une plaque.</p>';
    return;
  }

  const sheetId = "17ipCCHHyKkp0t8Eo-W6w5Z7_5zE1oIK0Mqu7xORn3yw";
  const apiKey  = "AIzaSyBe9E-AJcsnCbdYpf6r8Z50BaDK6b6qaVs";
  const range   = "Historique Fourrière!C8:I";

  try {
    const url  = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    const resp = await fetch(url);
    const data = await resp.json();

    let html = `<p class="error">❌ Véhicule introuvable.</p>`;
    if (data.values) {
      for (const row of data.values) {
        // C=0 Nom, D=1 Prix base, E=2 Plaque, F=3 Date entrée, G=4 Date récup, H=5 %, I=6 Total
        if (row[2] && row[2].toUpperCase() === plaque) {
          const nomVehicule = row[0] || "N/A";
          const prixBase    = parseFloat((row[1]||"").toString().replace(',', '.')) || 0;
          const dateEntree  = row[3] ? new Date(row[3]) : null;
          const perc        = parseFloat((row[5]||"").toString().replace(',', '.')) || 3;

          const now = new Date();
          let jours = 1;
          if (dateEntree && !isNaN(dateEntree)) {
            const diff = Math.ceil((now - dateEntree) / (1000*60*60*24));
            jours = Math.max(1, diff);
          }

          const fraisDossier = 150000;
          const gardiennage  = (prixBase * (perc/100)) * jours;
          const total        = Math.round(fraisDossier + gardiennage);

          html = `
            <p class="ok">✅ Véhicule trouvé</p>
            <p>🚗 Modèle : <b>${nomVehicule}</b></p>
            <p>📅 Entrée en fourrière : ${dateEntree ? dateEntree.toLocaleDateString() : "N/A"}</p>
            <p>🕒 Durée : ${jours} jour(s)</p>
            <p>💰 Montant à payer : <b>${total.toLocaleString()} $</b></p>
          `;
          break;
        }
      }
    }
    document.getElementById("resultat").innerHTML = html;
  } catch (e) {
    console.error(e);
    document.getElementById("resultat").innerHTML =
      '<p class="error">⚠️ Erreur lors de la récupération des données.</p>';
  }
}

/* ========= Révélations au scroll ========= */
document.addEventListener("DOMContentLoaded", () => {
  const toReveal = document.querySelectorAll(
    ".hero-content, .text-block, .image-block, .card, .form-container, .title-pill"
  );
  toReveal.forEach(el => el.classList.add("reveal"));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add("show");
    });
  }, { threshold: 0.14 });

  toReveal.forEach(el => io.observe(el));
});
