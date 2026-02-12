/*------------------------------------------------------
Client Windows pour serveur multi-étapes
Affiche le code unique généré par le serveur
------------------------------------------------------*/
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <winsock2.h>
#include <ws2tcpip.h>

#pragma comment(lib, "ws2_32.lib")

typedef struct sockaddr sockaddr;
typedef struct sockaddr_in sockaddr_in;

int main()
{
    WSADATA wsa;
    SOCKET sock;
    sockaddr_in serveur_addr;
    char buffer[1024];
    int recv_len;

    // Initialisation WinSock
    //Sans ça : toutes les fonctions réseau échouent.on a besoin d'initialiser la DLL Winsock pour pouvoir utiliser les fonctions réseau.
    if (WSAStartup(MAKEWORD(2, 2), &wsa) != 0) {
        printf("Erreur : WSAStartup a échoué\n");
        return 1;
    }

    // Création du socket
    sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock == INVALID_SOCKET) {
        printf("Erreur : impossible de créer la socket\n");
        WSACleanup();
        return 1;
    }

    // Adresse du serveur
    serveur_addr.sin_family = AF_INET;
    serveur_addr.sin_port = htons(5000);
    serveur_addr.sin_addr.s_addr = inet_addr("127.0.0.1");  // localhost

    // Connexion au serveur
    if (connect(sock, (sockaddr*)&serveur_addr, sizeof(serveur_addr)) == SOCKET_ERROR) {
        printf("Erreur : connexion échouée\n");
        closesocket(sock);
        WSACleanup();
        return 1;
    }

    printf("Connexion au serveur réussie.\n\n");

    // Boucle de dialogue tant que le serveur envoie des questions
    while (1)
    {
        // Réception du message (question ou récapitulatif final)
        recv_len = recv(sock, buffer, sizeof(buffer) - 1, 0);
        if (recv_len <= 0) {
            printf("Connexion fermée par le serveur.\n");
            break;
        }

        buffer[recv_len] = '\0';  // Terminaison chaîne
        printf("%s", buffer);     // Affiche la question ou récapitulatif

        // Détection de la fin (message final avec code unique : date et numero de commande     )
        if (strstr(buffer, "RÉCAPITULATIF") != NULL) {
            printf("\nFin de la commande. Code unique reçu.\n");
            break;  // On ne demande plus de réponse, ca s'arrête ici
        }

        // Lecture de la réponse utilisateur
        char reponse[256];
        printf(">>");
        fgets(reponse, sizeof(reponse), stdin);
        reponse[strcspn(reponse, "\n")] = '\0';  // Supprime \n

        // Envoi de la réponse au serveur
        send(sock, reponse, strlen(reponse), 0);
    }

    // Fermeture du socket et nettoyage
    closesocket(sock);
    WSACleanup();

    return 0;
}
