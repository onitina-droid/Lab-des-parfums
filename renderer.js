const net = require("net");
// ------------- RENDERER.JS -------------
let socket = null;
let etapeActuelle = 0;
let selectionEssence = null;
let selectionFlacon = null;
let selectionCordon = null;
let numeroCommande = null;
let modeRecherche = false; // Nouvelle variable pour savoir si on est en mode recherche

function log(msg) {
    const logElement = document.getElementById("log");
    if (logElement) {
        logElement.textContent += msg + "\n";
        logElement.scrollTop = logElement.scrollHeight;
    }
    console.log(msg);
}

function connecter() {
    socket = new net.Socket();
    
    socket.connect(5000, "127.0.0.1", () => {
        log(" Connecté au serveur sur le port 5000");
        afficherMenuPrincipal();
    });

    socket.on("data", (data) => {
        const message = data.toString();
        console.log(" Serveur:", message.substring(0, 100));
        traiterMessageServeur(message);
    });

    socket.on("error", (err) => {
        log(" Erreur: " + err.message);
    });

    socket.on("close", () => {
        log(" Connexion fermée");
    });
}

function traiterMessageServeur(message) {
    if (message.includes("ETAPE 1") || message.includes("Choisissez l'essence")) {
        console.log("→ Étape 1 détectée");
        etapeActuelle = 1;
        modeRecherche = false;
        afficherEtapeEssence();
    }
    else if (message.includes("ETAPE 2") || message.includes("Choisissez le type de flacon")) {
        console.log("→ Étape 2 détectée");
        etapeActuelle = 2;
        afficherEtapeFlacon();
    }
    else if (message.includes("ETAPE 3") || message.includes("Choisissez un cordon")) {
        console.log("→ Étape 3 détectée");
        etapeActuelle = 3;
        afficherEtapeCordon();
    }
    else if (message.includes("ETAPE 4") || message.includes("Entrez un texte a graver")) {
        console.log("→ Étape 4 détectée");
        etapeActuelle = 4;
        modeRecherche = false;
        afficherEtapeGravure();
    }
    else if (message.includes("Entrez le code")) {
        console.log("→ Mode recherche détecté");
        modeRecherche = true;
        afficherRechercheCommande();
    }
    else if (message.includes("Commande trouvee") || message.includes("Commande non trouvee")) {
        console.log("→ Résultat de recherche");
        afficherResultatRecherche(message);
    }
    else if (message.includes("CMD-")) {
        const match = message.match(/CMD-\d{14}-\d{3}/);
        if (match) {
            numeroCommande = match[0];
            log(`🎉 Commande: ${numeroCommande}`);
            afficherNumeroCommande(numeroCommande);
        }
    }
}

function envoyerAuServeur(message) {
    if (!socket) {
        log(" Pas de connexion");
        return;
    }
    
    socket.write(message + "\n");
    log(` Envoyé: ${message}`);
}

// ==================== FONCTIONS D'AFFICHAGE ====================

function afficherMenuPrincipal() {
    console.log(" Affichage menu principal");
    etapeActuelle = 0;
    modeRecherche = false;
    
    // Cacher la barre de progression
    document.querySelector('.progress-bar').style.display = 'none';
    
    // Afficher l'interface
    document.querySelector('.pixel-text').textContent = "Lab Parfum";
    
    const essenceGrid = document.querySelector('.essence-grid');
    if (essenceGrid) {
        essenceGrid.innerHTML = `
            <div class="option-card menu-card" onclick="demarrerNouvelleCommande()">
                <span class="emoji"><img src="assets/images/commande.png" alt="Recherche" width="30" height="30"></span>
                <h3>Nouvelle Commande</h3>
                <p>Créer un parfum personnalisé</p>
            </div>
            <div class="option-card menu-card" onclick="demarrerRecherche()">
                <span class="emoji"><img src="assets/images/rechercher.png" alt="Recherche" width="30" height="30"></span>
                <h3>Rechercher une Commande</h3>
                <p>Trouver une commande par son code</p>
            </div>
            ${numeroCommande ? `
            <div class="option-card menu-card" onclick="rechercherMaDerniereCommande()">
                <span class="emoji"><img src="assets/images/commande.png" alt="Recherche" width="30" height="30"></span>
                <h3>Ma Dernière Commande</h3>
                <p>${numeroCommande}</p>
            </div>` : ''}
            <div class="option-card menu-card" onclick="quitterApp()">
                <span class="emoji"><img src="assets/images/deconnecter.png" alt="Recherche" width="30" height="30"></span>
                <h3>Quitter</h3>
                <p>Fermer l'application</p>
            </div>
        `;
    }
    
    // Cacher le champ de texte et bouton
    cacherChampEtBouton();
    
    // Afficher seulement le bouton Menu principal
    document.querySelector('.controls').innerHTML = `
        <button class="btn" onclick="afficherMenuPrincipal()" style="background: #ff6b6b; color: white;">
            Menu principal
        </button>
    `;
}

function afficherEtapeEssence() {
    console.log(" Affichage étape 1 - Essence");
    etapeActuelle = 1;
    modeRecherche = false;
    
    // Afficher barre de progression
    document.querySelector('.progress-bar').style.display = 'flex';
    mettreAJourBarreProgression(1);
    
    document.querySelector('.pixel-text').textContent = "Choisir l'Essence";
    
    const essenceGrid = document.querySelector('.essence-grid');
    if (essenceGrid) {
        essenceGrid.innerHTML = `
            <div class="option-card" onclick="choisirEssence('rose')">
                <span class="emoji"><img src="assets/images/rose.png" alt="Rose" width="40" height="40"></span>
                <p>Rose</p>
            </div>
            <div class="option-card" onclick="choisirEssence('ambre')">
                <span class="emoji"><img src="assets/images/ambre.png" alt="Ambre" width="40" height="40"></span>
                <p>Ambre</p>
            </div>
            <div class="option-card" onclick="choisirEssence('florabloom')">
                <span class="emoji"><img src="assets/images/florabloom.png" alt="Florabloom" width="40" height="40"></span>
                <p>Florabloom</p>
            </div>
        `;
    }
    
    // Cacher le champ de texte
    cacherChampEtBouton();
}
//afficherEtapeFlacon, afficherEtapeCordon, afficherEtapeGravure, afficherRechercheCommande, afficherResultatRecherche, afficherNumeroCommande
function afficherEtapeFlacon() {
    console.log("Affichage étape 2 - Flacon");
    etapeActuelle = 2;
    mettreAJourBarreProgression(2);
    
    document.querySelector('.pixel-text').textContent = "Choisir le Flacon";
    
    const essenceGrid = document.querySelector('.essence-grid');
    if (essenceGrid) {
        essenceGrid.innerHTML = `
            <div class="option-card" onclick="choisirFlacon('petit')">
                <span class="emoji"><img src="assets/images/petit.png" alt="Recherche" width="40" height="40"></span>
                <p>Petit</p>
            </div>
            <div class="option-card" onclick="choisirFlacon('moyen')">
                <span class="emoji"><img src="assets/images/moyen.png" alt="Recherche" width="40" height="40"></span>
                <p>Moyen</p>
            </div>
            <div class="option-card" onclick="choisirFlacon('grand')">
                <span class="emoji"><img src="assets/images/grand.png" alt="Recherche" width="40" height="40"></span>
                <p>Grand</p>
            </div>
        `;
    }
    
    cacherChampEtBouton();
}
// Affichage étape 3 - Cordon
function afficherEtapeCordon() {
    console.log(" Affichage étape 3 - Cordon");
    etapeActuelle = 3;
    mettreAJourBarreProgression(3);
    
    document.querySelector('.pixel-text').textContent = "Choisir le Cordon";
    
    const essenceGrid = document.querySelector('.essence-grid');
    if (essenceGrid) {
        essenceGrid.innerHTML = `
            <div class="option-card" onclick="choisirCordon('or')">
                <span class="emoji"><img src="assets/images/or.png" alt="Or" width="40" height="40"></span>
                <p>Or</p>
            </div>
            <div class="option-card" onclick="choisirCordon('argent')">
                <span class="emoji"><img src="assets/images/argent.png" alt="Argent" width="40" height="40"></span>
                <p>Argent</p>
            </div>
        `;
    }
    
    cacherChampEtBouton();
}

function afficherEtapeGravure() {
    console.log(" Affichage étape 4 - Gravure");
    etapeActuelle = 4;
    modeRecherche = false;
    
    mettreAJourBarreProgression(4);
    document.querySelector('.pixel-text').textContent = "Personnaliser la Gravure";
    
    const essenceGrid = document.querySelector('.essence-grid');
    if (essenceGrid) {
        essenceGrid.innerHTML = `
            <div class="gravure-instruction">
                <p>  <img src="assets/images/lecriture.png" alt="Argent" width="30" height="30"> Écrivez le texte à graver sur votre flacon </p>
                <p class="recap-texte">
                    <strong>Votre sélection:</strong><br>
                    Essence: ${selectionEssence}<br>
                    Flacon: ${selectionFlacon}<br>
                    Cordon: ${selectionCordon}
                </p>
            </div>
        `;
    }
    
    // Afficher le champ de texte et le bouton pour la gravure
    afficherChampEtBouton(
        "Ex: Mon prénom, une date spéciale...",
        "✓ Finaliser la commande",
        "envoyerGravure()"
    );
    
    // Cacher le bouton "Menu principal" pendant la création
    document.querySelector('.controls').innerHTML = `
        <button class="btn secondary" onclick="annulerCommande()">Annuler</button>
    `;
}

function afficherRechercheCommande() {
    console.log("Affichage recherche");
    modeRecherche = true;
    
    document.querySelector('.pixel-text').textContent = "Rechercher une Commande";
    document.querySelector('.progress-bar').style.display = 'none';
    
    const essenceGrid = document.querySelector('.essence-grid');
    if (essenceGrid) {
        essenceGrid.innerHTML = `
            <div class="recherche-instruction">
                <h3> Recherche de commande</h3>
                <p>Entrez le code de commande complet</p>
                <p><small>Format: CMD-AAAAMMJJHHMMSS-NNN</small></p>
                ${numeroCommande ? `
                <div class="suggestion">
                    <p>Votre dernière commande:</p>
                    <p><strong>${numeroCommande}</strong></p>
                    <button class="btn small" onclick="utiliserDerniereCommande()">
                        Utiliser ce code
                    </button>
                </div>` : ''}
            </div>
        `;
    }
    
    // Afficher champ et bouton pour recherche (champ vide par défaut)
    afficherChampEtBouton(
        "CMD-20241225143045-123",
        "🔍 Rechercher",
        "executerRecherche()"
    );
    
    // Vider le champ par défaut
    const messageInput = document.getElementById("message");
    if (messageInput) {
        messageInput.value = "";
    }
    
    document.querySelector('.controls').innerHTML = `
        <button class="btn secondary" onclick="afficherMenuPrincipal()">Retour au menu</button>
        <button class="btn" onclick="nouvelleRecherche()">Nouvelle recherche</button>
    `;
}

function afficherResultatRecherche(message) {
    console.log("🖥️ Affichage résultat recherche");
    
    const essenceGrid = document.querySelector('.essence-grid');
    if (essenceGrid) {
        const estTrouve = message.includes("Commande trouvee");
        essenceGrid.innerHTML = `
            <div class="resultat-recherche ${estTrouve ? 'success' : 'error'}">
                <div class="emoji">${estTrouve ? '✅' : '❌'}</div>
                <h3>${estTrouve ? 'Commande trouvée !' : 'Commande non trouvée'}</h3>
                <div class="commande-details">
                    ${message.split('\n').map(line => 
                        line.trim() ? `<p>${line}</p>` : ''
                    ).join('')}
                </div>
                <div class="actions-recherche">
                    <button class="btn secondary" onclick="afficherMenuPrincipal()">
                        Retour au menu
                    </button>
                    <button class="btn" onclick="demarrerRecherche()">
                        Nouvelle recherche
                    </button>
                </div>
            </div>
        `;
    }
    
    // Cacher le champ de texte après résultat
    cacherChampEtBouton();
}

function afficherNumeroCommande(numero) {
    numeroCommande = numero;
    
    const popup = document.createElement('div');
    popup.className = 'commande-popup';
    popup.innerHTML = `
        <div class="popup-content">
            <div class="emoji">🎉</div>
            <h3>Commande créée avec succès !</h3>
            <p>Votre numéro de commande :</p>
            <div class="numero-commande">${numero}</div>
            <p>Gardez précieusement ce numéro pour suivre votre commande.</p>
            <div class="actions-popup">
                <button class="btn primary" onclick="fermerPopup()">OK</button>
                <button class="btn secondary" onclick="rechercherCetteCommande('${numero}')">
                    Voir cette commande
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
}

// ==================== FONCTIONS UTILITAIRES ====================

function cacherChampEtBouton() {
    const messageInput = document.getElementById("message");
    const ctaButton = document.getElementById("cta");
    
    if (messageInput) messageInput.style.display = "none";
    if (ctaButton) ctaButton.style.display = "none";
}

function afficherChampEtBouton(placeholder, texteBouton, onClickFunction) {
    const messageInput = document.getElementById("message");
    const ctaButton = document.getElementById("cta");
    
    if (messageInput) {
        messageInput.style.display = "block";
        messageInput.placeholder = placeholder;
        messageInput.value = ""; // Toujours vider par défaut
    }
    
    if (ctaButton) {
        ctaButton.style.display = "block";
        ctaButton.textContent = texteBouton;
        ctaButton.disabled = false;
        ctaButton.onclick = new Function(onClickFunction);
    }
    
    // Focus sur le champ
    setTimeout(() => {
        if (messageInput) {
            messageInput.focus();
            messageInput.select();
        }
    }, 100);
}

function mettreAJourBarreProgression(etape) {
    const steps = document.querySelectorAll('.progress-bar .step');
    steps.forEach((step, index) => {
        if (index + 1 <= etape) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
}

// ==================== FONCTIONS D'ACTION ====================

function demarrerNouvelleCommande() {
    console.log("Démarrage nouvelle commande");
    envoyerAuServeur("2");
    
    setTimeout(() => {
        if (etapeActuelle === 0) {
            etapeActuelle = 1;
            afficherEtapeEssence();
        }
    }, 1000);
}

function demarrerRecherche() {
    console.log("Démarrage recherche");
    envoyerAuServeur("1");
    
    setTimeout(() => {
        afficherRechercheCommande();
    }, 500);
}

function rechercherMaDerniereCommande() {
    if (numeroCommande) {
        envoyerAuServeur("1");
        setTimeout(() => {
            envoyerAuServeur(numeroCommande);
        }, 100);
    }
}

function rechercherCetteCommande(code) {
    envoyerAuServeur("1");
    setTimeout(() => {
        envoyerAuServeur(code);
    }, 100);
    fermerPopup();
}

function utiliserDerniereCommande() {
    const messageInput = document.getElementById("message");
    if (messageInput && numeroCommande) {
        messageInput.value = numeroCommande;
        messageInput.select();
    }
}

function executerRecherche() {
    const messageInput = document.getElementById("message");
    const code = messageInput ? messageInput.value.trim() : "";
    
    if (!code) {
        log("⚠️ Veuillez entrer un code de commande");
        return;
    }
    
    envoyerAuServeur(code);
    
    const ctaButton = document.getElementById("cta");
    if (ctaButton) {
        ctaButton.disabled = true;
        ctaButton.textContent = "⌛ Recherche en cours...";
    }
}

function nouvelleRecherche() {
    const messageInput = document.getElementById("message");
    if (messageInput) {
        messageInput.value = "";
        messageInput.focus();
    }
}

function quitterApp() {
    envoyerAuServeur("3");
    setTimeout(() => {
        if (typeof window.close === 'function') window.close();
    }, 1000);
}

function annulerCommande() {
    selectionEssence = null;
    selectionFlacon = null;
    selectionCordon = null;
    afficherMenuPrincipal();
}

function choisirEssence(essence) {
    console.log(`🌹 Choix essence: ${essence}`);
    selectionEssence = essence;
    envoyerAuServeur(essence);
    
    setTimeout(() => {
        if (etapeActuelle === 1) {
            etapeActuelle = 2;
            afficherEtapeFlacon();
        }
    }, 1000);
}

function choisirFlacon(flacon) {
    console.log(`💎 Choix flacon: ${flacon}`);
    selectionFlacon = flacon;
    envoyerAuServeur(flacon);
    
    setTimeout(() => {
        if (etapeActuelle === 2) {
            etapeActuelle = 3;
            afficherEtapeCordon();
        }
    }, 1000);
}

function choisirCordon(cordon) {
    console.log(`🌟 Choix cordon: ${cordon}`);
    selectionCordon = cordon;
    envoyerAuServeur(cordon);
    
    setTimeout(() => {
        if (etapeActuelle === 3) {
            etapeActuelle = 4;
            afficherEtapeGravure();
        }
    }, 1000);
}

function envoyerGravure() {
    console.log("📝 Envoi gravure");
    const messageInput = document.getElementById("message");
    const texte = messageInput ? messageInput.value.trim() : "";
    
    if (!texte) {
        log("⚠️ Veuillez entrer un texte de gravure");
        return;
    }
    
    envoyerAuServeur(texte);
    
    const ctaButton = document.getElementById("cta");
    if (ctaButton) {
        ctaButton.disabled = true;
        ctaButton.textContent = "⌛ Envoi en cours...";
    }
}

function fermerPopup() {
    const popup = document.querySelector('.commande-popup');
    if (popup) popup.remove();
    afficherMenuPrincipal();
}

// ==================== Pour afficher ====================

window.onload = function() {
    console.log("=== APPLICATION DÉMARRÉE ===");
    connecter();
    
    // Exposer les fonctions globalement
    window.demarrerNouvelleCommande = demarrerNouvelleCommande;
    window.demarrerRecherche = demarrerRecherche;
    window.rechercherMaDerniereCommande = rechercherMaDerniereCommande;
    window.rechercherCetteCommande = rechercherCetteCommande;
    window.utiliserDerniereCommande = utiliserDerniereCommande;
    window.executerRecherche = executerRecherche;
    window.nouvelleRecherche = nouvelleRecherche;
    window.quitterApp = quitterApp;
    window.annulerCommande = annulerCommande;
    window.choisirEssence = choisirEssence;
    window.choisirFlacon = choisirFlacon;
    window.choisirCordon = choisirCordon;
    window.envoyerGravure = envoyerGravure;
    window.fermerPopup = fermerPopup;
    window.afficherMenuPrincipal = afficherMenuPrincipal;
};