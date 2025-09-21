// Vérification du reCAPTCHA avant recherche
function verifierCaptcha() {
  const response = grecaptcha.getResponse();
  if (response.length === 0) {
    alert("❌ Merci de valider le reCAPTCHA avant de continuer.");
    return;
  }
  rechercheVehicule();
}

// Recherche véhicule dans Google Sheets
async function rechercheVehicule() {
  const plaque = document.getElementById("plaque").value.toUpperCase().trim();
  const sheetId = "17ipCCHHyKkp0t8Eo-W6w5Z7_5zE1oIK0Mqu7xORn3yw"; 
  const apiKey = "AIzaSyBe9E-AJcsnCbdYpf6r8Z50BaDK6b6qaVs"; 
  const range = "Historique Fourrière!C8:H"; // Lecture de C à H

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  let resultat = `<p class="error">❌ Véhicule introuvable.</p>`;

  if (data.values) {
    data.values.forEach(row => {
      // row[2] = Plaque (colonne E)
      if (row[2] && row[2].toUpperCase() === plaque) {
        const modele = row[0]; // Colonne C
        const prixVehicule = parseFloat(row[1].replace(/\s/g, '').replace(',', '.')) || 0; // Colonne D
        const dateEntree = row[3]; // Colonne F
        const pourcentage = parseFloat(row[5].replace(',', '.')) || 0; // Colonne H

        // ✅ Conversion date
        let dateIn = null;
        if (dateEntree.includes("/")) {
          const [jour, mois, annee] = dateEntree.split("/");
          dateIn = new Date(`${annee}-${mois}-${jour}`);
        } else {
          dateIn = new Date(dateEntree);
        }

        const dateNow = new Date();
        let diffDays = 0;
        if (!isNaN(dateIn)) {
          const diffTime = Math.abs(dateNow - dateIn);
          diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        // ✅ Calcul du prix
        const fraisDossier = 150000;
        const fraisPourcentage = (prixVehicule / 100) * pourcentage;
        const fraisGardiennage = (prixVehicule * 0.03) * diffDays;
        const prixTotal = Math.round(fraisDossier + fraisPourcentage + fraisGardiennage);

        resultat = `<p class="ok">✅ Véhicule trouvé</p>
                    <p>🚗 Modèle : <b>${modele}</b></p>
                    <p>📅 En fourrière depuis : <b>${dateEntree}</b></p>
                    <p>🕒 Durée : <b>${diffDays} jour(s)</b></p>
                    <p>💰 Montant à payer : <b>${prixTotal.toLocaleString()} $</b></p>`;
      }
    });
  }

  document.getElementById("resultat").innerHTML = resultat;
}
