// ====== CONFIG ======
const SHEET_ID = "17ipCCHHyKkp0t8Eo-W6w5Z7_5zE1oIK0Mqu7xORn3yw";
const API_KEY  = "AIzaSyBe9E-AJcsnCbdYpf6r8Z50BaDK6b6qaVs";
// Colonnes (C:I) = [C Nom, D Prix, E Plaque, F Date entrée, G Date sortie, H %/jour, I Total]
const RANGE    = encodeURIComponent("Historique Fourrière!C8:I"); // ⚠️ encodé (espaces/accents)

// ====== HELPERS ======
function sanitizeNumber(str) {
  if (str === null || str === undefined) return NaN;
  // enlève espaces (y compris insécables) et tout sauf chiffres . , -
  const clean = String(str).replace(/\s|\u00A0/g, "").replace(/[^\d.,-]/g, "");
  // s'il y a virgule et pas de point -> on remplace virgule par point
  if (clean.includes(",") && !clean.includes(".")) return parseFloat(clean.replace(",", "."));
  // s'il y a les deux, on tente de garder le dernier séparateur comme décimal
  if (clean.includes(",") && clean.includes(".")) {
    const lastComma = clean.lastIndexOf(",");
    const lastDot   = clean.lastIndexOf(".");
    const decimalSep = lastComma > lastDot ? "," : ".";
    const normalized = clean.replace(/[.,]/g, (m, idx) => (idx === (decimalSep === "," ? lastComma : lastDot) ? "." : ""));
    return parseFloat(normalized);
  }
  return parseFloat(clean);
}

// Google Sheets peut renvoyer "10/09/2025", "2025-09-10", ou un nombre série
function parseSheetDate(value) {
  if (value === null || value === undefined || value === "") return null;

  // nombre série (Google Sheets) -> base 1899-12-30 en UTC
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && String(value).trim() === String(asNum)) {
    const base = Date.UTC(1899, 11, 30);
    return new Date(base + asNum * 86400000);
  }

  const s = String(value).trim();

  // dd/mm/yyyy
  const m1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m1) {
    const d = parseInt(m1[1], 10), mo = parseInt(m1[2], 10) - 1, y = parseInt(m1[3], 10);
    return new Date(y, mo, d); // locale -> évite décalages d’UTC
  }

  // yyyy-mm-dd (et variantes ISO)
  const m2 = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m2) {
    return new Date(parseInt(m2[1],10), parseInt(m2[2],10)-1, parseInt(m2[3],10));
  }

  // fallback
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function daysDiffInclusive(fromDate, toDate) {
  if (!fromDate || !toDate) return 1;
  // normalise à minuit local pour éviter demi-journées
  const a = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const b = new Date(toDate.getFullYear(),   toDate.getMonth(),   toDate.getDate());
  const diff = Math.ceil((b - a) / 86400000);
  return Math.max(1, diff);
}

function setLoading(loading) {
  const btn = document.getElementById("searchBtn");
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "Recherche..." : "Rechercher";
}

// ====== reCAPTCHA gate ======
function verifierCaptcha() {
  try {
    if (typeof grecaptcha !== "undefined") {
      const token = grecaptcha.getResponse();
      if (!token) {
        alert("⚠️ Merci de valider le reCAPTCHA avant de continuer.");
        return;
      }
    }
  } catch (_) {
    // si grecaptcha non chargé, on laisse passer pour ne pas bloquer en dev
  }
  rechercheVehicule();
}

// ====== MAIN ======
async function rechercheVehicule() {
  const plaqueInput = document.getElementById("plaque");
  const resultEl = document.getElementById("resultat");
  const plaque = (plaqueInput?.value || "").toUpperCase().trim();

  if (!plaque) {
    resultEl.innerHTML = '<p class="error">❌ Merci d’entrer une plaque.</p>';
    return;
  }

  setLoading(true);
  resultEl.innerHTML = "";

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();

    if (!data.values || !Array.isArray(data.values)) {
      resultEl.innerHTML = '<p class="error">⚠️ Impossible de lire la feuille (vérifie l’ID, le nom d’onglet et l’API Key).</p>';
      setLoading(false);
      return;
    }

    let found = false;

    for (const row of data.values) {
      // Indices selon C:I
      const nomVehicule = row[0] || "N/A";                // C
      const prixBrutStr = row[1];                         // D
      const plaqueFeuille = (row[2] || "").toUpperCase(); // E
      const entreeStr = row[3];                            // F
      const sortieStr = row[4];                            // G
      const pourcStr  = row[5];                            // H (peut être vide)

      if (plaqueFeuille === plaque) {
        found = true;

        const prixVehicule = sanitizeNumber(prixBrutStr) || 0;
        const dateEntree = parseSheetDate(entreeStr);
        const dateSortie = parseSheetDate(sortieStr);
        const today = new Date();

        const finCalcul = dateSortie || today;
        const jours = daysDiffInclusive(dateEntree, finCalcul);

        // % par jour (col H) si présent, sinon 3%
        const pourcentageJour = (() => {
          const n = sanitizeNumber(String(pourcStr || "").replace("%",""));
          return Number.isFinite(n) && n > 0 ? n : 3;
        })();

        // barème : 150k (dossier) + 5% (remorquage) + (prix * %/jour * nb_jours)
        const fraisDossier = 150000;
        const remorquage = prixVehicule * 0.05;
        const gardiennage = prixVehicule * (pourcentageJour / 100) * jours;
        const total = Math.round(fraisDossier + remorquage + gardiennage);

        resultEl.innerHTML = `
          <p class="ok">✅ Véhicule trouvé</p>
          <p>🚗 Modèle : <b>${nomVehicule}</b></p>
          <p>📅 Entrée en fourrière : <b>${dateEntree ? dateEntree.toLocaleDateString() : "N/A"}</b></p>
          <p>📅 Sortie (si renseignée) : <b>${dateSortie ? dateSortie.toLocaleDateString() : "—"}</b></p>
          <p>🕒 Durée : <b>${jours}</b> jour(s)</p>
          <p>💰 Montant à payer : <b>${total.toLocaleString()} $</b></p>
          <hr>
          <small>
            Détail : dossier ${fraisDossier.toLocaleString()} $ + remorquage ${(remorquage).toLocaleString()} $ 
            + gardiennage (${pourcentageJour}%/j × ${jours} j) = ${(gardiennage).toLocaleString()} $
          </small>
        `;
        break;
      }
    }

    if (!found) {
      resultEl.innerHTML = `<p class="error">❌ Véhicule introuvable.</p>`;
    }

  } catch (e) {
    console.error(e);
    document.getElementById("resultat").innerHTML =
      '<p class="error">⚠️ Erreur réseau/API. Vérifie la clé API, l’ID de la feuille et les quotas.</p>';
  } finally {
    setLoading(false);
  }
}
