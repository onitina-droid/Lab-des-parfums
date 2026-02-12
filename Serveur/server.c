#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#include <pthread.h>
#include <time.h>
#include <stdint.h> // pour uintptr_t
#include <ctype.h>

#pragma comment(lib, "ws2_32.lib")

typedef struct sockaddr sockaddr;
typedef struct sockaddr_in sockaddr_in;

/* ------------------- Stock ------------------- */
typedef struct {
    int rose, ambre, florabloom;
} Essences;

typedef struct {
    int petit, moyen, grand;
} Flacons;

typedef struct {
    int or, argent;
} Cordons;

// Stock initial par défaut
Essences stock_essences = {0, 80, 120};
Flacons stock_flacons = {100, 100, 70};
Cordons stock_cordons = {100, 100};

/* Mutex pour protéger l'accès au stock et au fichier */
pthread_mutex_t mutex_stock = PTHREAD_MUTEX_INITIALIZER;
pthread_mutex_t mutex_fichier = PTHREAD_MUTEX_INITIALIZER;

/* ------------------- Fonctions réseau utilitaires ------------------- */

// reçoit un message, retourne 1 si ok, 0 sinon
int recevoir(SOCKET sock, char *buffer, int taille) {
    int len = recv(sock, buffer, taille - 1, 0); // garder 1 octet pour '\0'
    if (len <= 0) return 0;
    buffer[len] = '\0';
    return 1;
}

// envoie un message (assume chaîne terminée)
void envoyer(SOCKET sock, const char *msg) {
    send(sock, msg, (int)strlen(msg), 0); //FONCTION DE BASE POUR ENVOYER UN MESSAGE AU CLIENT
}

/* ------------------- Affichages ------------------- */

void afficher_stock() {

    pthread_mutex_lock(&mutex_stock);
    printf("\n--- STOCK ACTUEL ---\n");
    printf("Essences : rose=%d, ambre=%d, florabloom=%d\n",
           stock_essences.rose, stock_essences.ambre, stock_essences.florabloom);
    printf("Flacons  : petit=%d, moyen=%d, grand=%d\n",
           stock_flacons.petit, stock_flacons.moyen, stock_flacons.grand);
    printf("Cordons  : or=%d, argent=%d\n",
           stock_cordons.or, stock_cordons.argent);
    printf("-------------------\n");
    pthread_mutex_unlock(&mutex_stock);
}

void afficher_commandes() {

    pthread_mutex_lock(&mutex_fichier);

    FILE *f = fopen("commandes.txt", "r");
    char ligne[1024];

    if (f == NULL) {
        printf("Aucune commande enregistree.\n");
        pthread_mutex_unlock(&mutex_fichier);
        return;
    }

    printf("\n--- LISTE DES COMMANDES ---\n");
    while (fgets(ligne, sizeof(ligne), f)) {
        char code[64];
        sscanf(ligne, "%s |", code);
        printf("%s\n", code);
    }
    printf("---------------------------\n");
    fclose(f);
    pthread_mutex_unlock(&mutex_fichier);
}
// supprime les CR/LF de fin de chaîne
void strip_newline(char *s) {
    int len = (int)strlen(s);
    while (len > 0 && (s[len-1] == '\n' || s[len-1] == '\r')) {
        s[len-1] = '\0';
        len--;
    }
}

// copie dans dest la version minuscules de src
void to_lower(const char *src, char *dest, int dest_size) {
    int i;
    for (i = 0; src[i] != '\0' && i < dest_size - 1; ++i) {
        dest[i] = (char)tolower((unsigned char)src[i]);
    }
    dest[i] = '\0';
}

void interaction_personnalisee(SOCKET sock) {
    char essence[256], flacon[256], cordon[256], gravure[256];
    char buffer[1024];
    char code[64];
    int valide = 0;

    // Étape 1 – Essence + couleur
    while (!valide) {
        envoyer(sock,
            "\n=== ETAPE 1 : ESSENCE ET COULEUR ===\n"

            "Choisissez l'essence : rose, ambre, florabloom\n> ");
        if (!recevoir(sock, essence, sizeof(essence))) {
            pthread_mutex_unlock(&mutex_fichier); // au cas où
            pthread_mutex_unlock(&mutex_stock);// au cas où
            return;
        }

        strip_newline(essence);// Nettoyage de l'entrée

        char choix_lc[256];
        to_lower(essence, choix_lc, sizeof(choix_lc));//pour faciliter les comparaisons, on convertit en minuscules. On peut garder l'entrée originale pour l'affichage final (ex: "Rose" au lieu de "rose")

        // d'abord vérifier si l'option existe
        if (strcmp(choix_lc, "rose") != 0 &&
            strcmp(choix_lc, "ambre") != 0 &&
            strcmp(choix_lc, "florabloom") != 0) {
            envoyer(sock, "Ce choix n'existe pas. Entrez : rose, ambre, ou florabloom.\n");
            continue; // redemander
        }

        // ensuite vérifier le stock
        if ((strcmp(choix_lc, "rose") == 0 && stock_essences.rose > 0) ||
            (strcmp(choix_lc, "ambre") == 0 && stock_essences.ambre > 0) ||
            (strcmp(choix_lc, "florabloom") == 0 && stock_essences.florabloom > 0)) {
            // enregistrer le vrai choix (on peut garder l'entrée originale ou la version lowercase)
            strcpy(essence, choix_lc);
            valide = 1;
        } else {
            // la valeur existe mais stock nul
            envoyer(sock, "Cette essence est en rupture. Choisissez une autre.\n");
        }
    }
    
    //protection au moment de decrementer le stock

    pthread_mutex_lock(&mutex_stock);
    if (strcmp(essence, "rose") == 0) stock_essences.rose--;
    if (strcmp(essence, "ambre") == 0) stock_essences.ambre--;
    if (strcmp(essence, "florabloom") == 0) stock_essences.florabloom--;
    pthread_mutex_unlock(&mutex_stock);


    // Étape 2 – Flacon (taille)
    valide = 0;
    while (!valide) {
        envoyer(sock,
            "\n=== ETAPE 2 : FLACON ET STYLE ===\n"
            "Choisissez le type de flacon : petit, moyen, grand\n> ");
        if (!recevoir(sock, flacon, sizeof(flacon))) {
            pthread_mutex_unlock(&mutex_fichier);
            pthread_mutex_unlock(&mutex_stock);
            return;
        }
        strip_newline(flacon);
        char choix_lc[256];
        to_lower(flacon, choix_lc, sizeof(choix_lc));

        if (strcmp(choix_lc, "petit") != 0 &&
            strcmp(choix_lc, "moyen") != 0 &&
            strcmp(choix_lc, "grand") != 0) {
            envoyer(sock, "Ce choix n'existe pas. Entrez : petit, moyen, ou grand.\n");
            continue;
        }

        if ((strcmp(choix_lc, "petit") == 0 && stock_flacons.petit > 0) ||
            (strcmp(choix_lc, "moyen") == 0 && stock_flacons.moyen > 0) ||
            (strcmp(choix_lc, "grand") == 0 && stock_flacons.grand > 0)) {
            strcpy(flacon, choix_lc);
            valide = 1;
        } else {
            envoyer(sock, "Ce flacon est en rupture. Choisissez un autre.\n");
        }
    }
    pthread_mutex_lock(&mutex_stock);
    if (strcmp(flacon, "petit") == 0) stock_flacons.petit--;
    if (strcmp(flacon, "moyen") == 0) stock_flacons.moyen--;
    if (strcmp(flacon, "grand") == 0) stock_flacons.grand--;
    pthread_mutex_unlock(&mutex_stock);
    // Étape 3 – Cordon
    valide = 0;
    while (!valide) {
        envoyer(sock,
            "\n=== ETAPE 3 : CHOIX DU CORDON ===\n"
            "Choisissez un cordon : or, argent\n> ");
        if (!recevoir(sock, cordon, sizeof(cordon))) {
            pthread_mutex_unlock(&mutex_fichier);
            pthread_mutex_unlock(&mutex_stock);
            return;
        }

        strip_newline(cordon);
        char choix_lc2[256];
        to_lower(cordon, choix_lc2, sizeof(choix_lc2));

        if (strcmp(choix_lc2, "or") != 0 && strcmp(choix_lc2, "argent") != 0) {
            envoyer(sock, "Ce choix n'existe pas. Entrez : or ou argent.\n");
            continue;
        }

        if ((strcmp(choix_lc2, "or") == 0 && stock_cordons.or > 0) ||
            (strcmp(choix_lc2, "argent") == 0 && stock_cordons.argent > 0)) {
            strcpy(cordon, choix_lc2);
            valide = 1;
        } else {
            envoyer(sock, "Ce cordon est en rupture. Choisissez un autre.\n");
        }
    }
    pthread_mutex_lock(&mutex_stock);
    if (strcmp(cordon, "or") == 0) stock_cordons.or--;
    if (strcmp(cordon, "argent") == 0) stock_cordons.argent--;
    pthread_mutex_unlock(&mutex_stock);
    // Étape 4 – Gravure (on garde la gravure telle quelle, sans tolower)
    envoyer(sock,
        "\n=== ETAPE 4 : GRAVURE PERSONNALISEE ===\n"
        "Entrez un texte a graver :\n> ");
    if (!recevoir(sock, gravure, sizeof(gravure))) {
        pthread_mutex_unlock(&mutex_fichier);
        pthread_mutex_unlock(&mutex_stock);
        return;
    }
    strip_newline(gravure);

    // ... génération du code, enregistrement, envoi du récapitulatif comme avant ...
    time_t t = time(NULL);
    struct tm tm_info;
    struct tm *tm_ptr = localtime(&t);
    tm_info = *tm_ptr;

    int alea = rand() % 1000;
    sprintf(code, "CMD-%04d%02d%02d%02d%02d%02d-%03d",
            tm_info.tm_year + 1900,
            tm_info.tm_mon + 1,
            tm_info.tm_mday,
            tm_info.tm_hour,
            tm_info.tm_min,
            tm_info.tm_sec,
            alea);

    snprintf(buffer, sizeof(buffer),
        "\n=== RECAPITULATIF DE VOTRE CREATION ===\n"
        "Essence : %s\n"
        "Flacon : %s\n"
        "Cordon : %s\n"
        "Gravure : %s\n"
        "\nVotre creation est enregistree sous le code : %s\n",
        essence, flacon, cordon, gravure, code
    );
    envoyer(sock, buffer);
    printf("Nouvelle commande enregistree : %s\n", code);
    pthread_mutex_lock(&mutex_fichier);

    FILE *f = fopen("commandes.txt", "a");
    if (f != NULL) {
        fprintf(f, "%s | Essence: %s | Flacon: %s | Cordon: %s | Gravure: %s\n",
                code, essence, flacon, cordon, gravure);
        fclose(f);
    } else {
        printf("Erreur ouverture commandes.txt pour ecriture.\n");
    }
    pthread_mutex_unlock(&mutex_fichier);//protection de l'ecriture dans le fichier
    printf("Commande enregistree avec code : %s\n", code);
    afficher_stock();
    afficher_commandes();
    
    }


/* ------------------- Recherche commande ------------------- */

void rechercher_commande(SOCKET sock) {
    char code[256];
    char ligne[1024];
    char buffer[1024];
    int trouve = 0;

    envoyer(sock, "\nEntrez le code de votre commande :\n> ");
    if (!recevoir(sock, code, sizeof(code))) return;

    // CORRECTION : Nettoyer les sauts de ligne du code reçu
    strip_newline(code);  // ← AJOUTER CETTE LIGNE

    pthread_mutex_lock(&mutex_fichier);
    FILE *f = fopen("commandes.txt", "r");
    if (f != NULL) {
        while (fgets(ligne, sizeof(ligne), f)) {
            // CORRECTION : Comparer avec le début de la ligne (le code)
            char code_fichier[256];
            sscanf(ligne, "%255s |", code_fichier);  // Extraire le code du fichier
            
            if (strcmp(code_fichier, code) == 0) {  // ← CORRECTION : strcmp au lieu de strstr
                snprintf(buffer, sizeof(buffer), "\nCommande trouvee :\n%s\n", ligne);
                envoyer(sock, buffer);
                trouve = 1;
                break;
            }
        }
        fclose(f);
    }
    pthread_mutex_unlock(&mutex_fichier);

    if (!trouve) {
        envoyer(sock, "\nCommande non trouvee.Cliquez sur Entrer pour continuer\n");
    }
}

/* ------------------- Thread client ------------------- */

void* gerer_client(void* arg) {
    SOCKET sock = (SOCKET)(uintptr_t)arg;
    char choix[256];

    while (1)     {
    
    envoyer(sock,
            "\nVoulez-vous :\n1 - Retrouver une commande existante\n2 - Creer une nouvelle commande\n3 - Quitter\n> ");

    if (!recevoir(sock, choix, sizeof(choix))) {
        printf("Client deconnecte abruptement.\n");
        break;
    }
    strip_newline(choix); //Important 
    if (strcmp(choix, "1") == 0) {
        rechercher_commande(sock);
        envoyer(sock, "\nRecherche terminee. Retour au menu principal.\n");
    }
    else if (strcmp(choix, "2") == 0) {
        interaction_personnalisee(sock);
        envoyer(sock, "\nVotre commande est terminee. Retour au menu principal.\n");
    }
    else if (strcmp(choix, "3") == 0) {
        envoyer(sock, "Au revoir !.\n");
        break;
    }
    else {
        envoyer(sock, "Choix invalide. Veuillez reessayer.\n"); 
    }
    }


    closesocket(sock);

    printf("Client deconnecte (thread termine).\n");
    return NULL;
}

/* ------------------- Main ------------------- */

int main() {
    WSADATA wsa;
    SOCKET socket_descriptor = INVALID_SOCKET, nouv_socket_descriptor = INVALID_SOCKET;
    sockaddr_in adresse_locale, adresse_client_courant;
    int longueur_adresse_courante;
    int opt = 1;

    srand((unsigned int)time(NULL)); // initialisation RNG

    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        printf("Erreur : WSAStartup a echoue\n");
        return 1;
    }

    socket_descriptor = socket(AF_INET, SOCK_STREAM, 0);
    if (socket_descriptor == INVALID_SOCKET) {
        printf("Erreur : impossible de creer la socket\n");
        WSACleanup();
        return 1;
    }

    // Evite erreur 10048 lors de relancement rapide
    setsockopt(socket_descriptor, SOL_SOCKET, SO_REUSEADDR, (char*)&opt, sizeof(opt));

    adresse_locale.sin_family = AF_INET;
    adresse_locale.sin_addr.s_addr = INADDR_ANY;
    adresse_locale.sin_port = htons(5000);

    if (bind(socket_descriptor, (sockaddr*)&adresse_locale, sizeof(adresse_locale)) == SOCKET_ERROR) {
        printf("Erreur : bind echoue (code %d)\n", WSAGetLastError());
        closesocket(socket_descriptor);
        WSACleanup();
        return 1;
    }

    listen(socket_descriptor, 10);
    printf("Serveur en ecoute sur le port 5000...\n");

    while (1) {
        longueur_adresse_courante = sizeof(adresse_client_courant);
        nouv_socket_descriptor = accept(
            socket_descriptor,
            (sockaddr*)&adresse_client_courant,
            &longueur_adresse_courante
        );

        if (nouv_socket_descriptor == INVALID_SOCKET) {
            printf("Erreur : accept echoue (code %d)\n", WSAGetLastError());
            continue;
        }

        printf("\nUn client s'est connecte.\n");

        pthread_t thread;// treads pour gerer les clients en parallele
        // on passe le SOCKET en tant que uintptr_t -> void*
        //gestion des clients en parallele avec pthreads
        if (pthread_create(&thread, NULL, gerer_client, (void*)(uintptr_t)nouv_socket_descriptor) != 0) {
            printf("Erreur : pthread_create a echoue\n");
            closesocket(nouv_socket_descriptor);
        } else {
            pthread_detach(thread);
        }
    }

    closesocket(socket_descriptor);
    WSACleanup();
    return 0;
}
