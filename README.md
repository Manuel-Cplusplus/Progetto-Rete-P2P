# Rete P2P - Progetto Universitario

Questo progetto universitario, sviluppato per il corso di **Reti e Comunicazione Digitale**, consiste nella realizzazione di una rete **peer-to-peer (P2P)** per la condivisione di messaggi e file tra utenti.

## Tecnologie Utilizzate
- **WebRTC** per la comunicazione diretta tra peer
- **Firebase** per la gestione del signaling
- **Vite** come sistema di build per l'ambiente di sviluppo
- **JavaScript**, **Node.js**, **HTML** e **CSS** per la realizzazione dell'interfaccia e della logica applicativa

## Passaggi per l'installazione

1. **Creare un account Firebase** (se non lo si possiede già).
2. **Creare un nuovo progetto Firebase**.
3. **Recuperare le variabili di configurazione del progetto Firebase**, definite come segue:
   ```javascript
   const firebaseConfig = {
       apiKey: "Your API Key",
       authDomain: "Your Auth Domain",
       projectId: "Your Project ID",
       storageBucket: "Your Storage Bucket",
       messagingSenderId: "Your Messaging Sender ID",
       appId: "Your App ID",
       measurementId: "Your Measurement ID"
   };
   ```
4. **Clonare la repository GitHub**:
   ```sh
   git clone https://github.com/Manuel-Cplusplus/Rete-P2P.git
   ```
5. **Inserire le variabili di configurazione** all'interno di un file `.env`, seguendo l'esempio fornito nella repository.

## Installazione e Avvio

Dopo aver clonato la repository, eseguire i seguenti comandi nella directory del progetto:

```sh
npm install
npm install -g firebase-tools
firebase login
```

Per avviare il progetto in locale:
```sh
npm run dev
```

Per costruire e distribuire il progetto su Firebase:
```sh
npm run build
firebase deploy
```

## Sistema di Build
Il sistema di build utilizzato è **Vite**, che ottimizza il processo di sviluppo e distribuzione.

## Risoluzione Problemi
Se si verificano problemi durante la build, seguire questi passaggi:
1. Eliminare le seguenti directory e file:
   ```sh
   rm -rf node_modules dist package-lock.json
   ```
2. Reinstallare i pacchetti:
   ```sh
   npm install
   ```

## Autori
- Carlucci Manuel
- Nitti Vittorio


## Licenza
Questo progetto è sviluppato esclusivamente per scopi accademici e non è destinato ad un utilizzo commerciale.

