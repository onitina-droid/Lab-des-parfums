const net = require('net');

console.log('=== TEST DU SERVEUR ===\n');

const client = net.createConnection({ port: 5000, host: '127.0.0.1' }, () => {
    console.log(' Connecté au serveur\n');
    
    // Écouter toutes les réponses
    client.on('data', (data) => {
        const message = data.toString();
        console.log(' SERVEUR:');
        console.log('----------------------------------------');
        console.log(message);
        console.log('----------------------------------------\n');
    });
    
    // Envoyer les commandes une par une
    setTimeout(() => {
        console.log('CLIENT: Envoi de "2" (nouvelle commande)');
        client.write('2\n');
    }, 500);
    
    setTimeout(() => {
        console.log('CLIENT: Envoi de "rose"');
        client.write('rose\n');
    }, 2000);
    
    setTimeout(() => {
        console.log(' CLIENT: Envoi de "petit"');
        client.write('petit\n');
    }, 3500);
    
    setTimeout(() => {
        console.log(' CLIENT: Envoi de "or"');
        client.write('or\n');
    }, 5000);
    
    setTimeout(() => {
        console.log(' CLIENT: Envoi de "Ma gravure"');
        client.write('Ma gravure\n');
        console.log('\n Test terminé dans 3 secondes...');
    }, 6500);
    
    setTimeout(() => {
        client.end();
        process.exit(0);
    }, 10000);
});

client.on('error', (err) => {
    console.log(' Erreur:', err.message);
});