async function rechercheVehicule() {
  const plaque = document.getElementById("plaque").value.toUpperCase().trim();
  const sheetId = "17ipCCHHyKkp0t8Eo-W6w5Z7_5zE1oIK0Mqu7xORn3yw"; // ID de ta feuille
  const apiKey = "AIzaSyBe9E-AJcsnCbdYpf6r8Z50BaDK6b6qaVs";      // ta clé API
  const range = "Historique Fourrière!C8:I"; // C=Nom véhicule, D=Prix, E=Plaque, F=Date entrée, G=Date sortie, H=%, I=Prix total

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  const response = await fetch(url);
  const data = await response.json();

  let resultat = `<p class="error">❌ Véhicule introuvable.</p>`;

  data.values.forEach(row => {
    const nomVehicule = row[0];
    const prixVehicule = parseFloat(row[1]) || 0;
    const plaqueVehicule = row[2]?.toUpperCase();
    const dateEntreeStr = row[3]; // Colonne F
    // const dateSortieStr = row[4]; // Colonne G (si jamais tu veux plus tard)

    if (plaqueVehicule === plaque) {
      // 🔹 Convertir la date entrée
      const dateEntree = new Date(dateEntreeStr);
      const today = new Date();

      // 🔹 Calcul du nombre de jours écoulés
      const diffTime = today - dateEntree;
      const jours = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

      // 🔹 Calcul du montant total
      const fraisDossier = 150000;
      const fraisRemorquage = prixVehicule * 0.05;
      const fraisGardiennage = prixVehicule * 0.03 * jours;
      const montantTotal = fraisDossier + fraisRemorquage + fraisGardiennage;

      resultat = `
        <p class="ok">✅ Véhicule trouvé</p>
        <p>🚗 Modèle : <b>${nomVehicule}</b></p>
        <p>📅 Entrée en fourrière : <b>${dateEntree.toLocaleDateString()}</b></p>
        <p>🕒 Durée : <b>${jours} jour(s)</b></p>
        <p>💰 Montant à payer : <b>${montantTotal.toLocaleString()} $</b></p>
      `;
    }
  });

  document.getElementById("resultat").innerHTML = resultat;
}
