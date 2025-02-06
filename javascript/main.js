import firebase from 'firebase/app';
import 'firebase/firestore';

// Variabile globale per il DataChannel
export let dataChannel;

var localUsername;
var remoteUsername;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};



if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const firestore = firebase.firestore();

// Stun server gratis di google
const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Genera un Peer considerando gli ice candidates usando gli stun server definiti sopra
export const peerConnection = new RTCPeerConnection(servers);  
export let peer_1 = new MediaStream();
export let peer_2 = new MediaStream();

// HTML elements
const webcamVideo = document.getElementById('webcamVideo');
const remoteVideo = document.getElementById('remoteVideo');
const establishConnection = document.getElementById('ConnectionButton');
const callInput = document.getElementById('callInput');
const answerButton = document.getElementById('answerButton');
const hangupButton = document.getElementById('hangupButton');
const submitNameButton = document.getElementById('submitNameButton');

const localUsernameElement = document.getElementById('localUsername');
const remoteUsernameElement = document.getElementById('remoteUsername');

const constraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  },
  video: true
};


//! Crea una offerta usando il signaling server
establishConnection.onclick = async () => {

  // Prendiamo tracce audio e video per generare correttamente l'SDP
  // Non verranno trasferite al peer 2 perchè se avvia la chiamata la sua webcam e mic vengono spenti
  peer_1 = await navigator.mediaDevices.getUserMedia(constraints); // aspetta "accetta i permessi su webcam e audio"

  // Prende Tracce Audio/Video
  peer_1.getTracks().forEach((track) => {
    // Aggiungi le tracce alla peer connection
    peerConnection.addTrack(track, peer_1);
  });
  /* Spiegazione Passi:
      peer_1.getTracks() ottiene tutte le tracce (audio e video) dal flusso.
      .forEach(...) - per ogni traccia trovata, la aggiungiamo a pc (la WebRTC Peer Connection).
      track può essere:
      video - la traccia della webcam.
      audio - la traccia del microfono.
  */
  peer_1.getVideoTracks().forEach(track => track.enabled = false);
  peer_1.getAudioTracks().forEach(track => track.enabled = false);

  // Creiamo un nuovo oggetto MediaStream per il peer remoto
  peer_2 = new MediaStream();

  // Gestisce le tracce ricevute dal peer remoto
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      peer_2.addTrack(track);
    });
  };
  /* Speigazione passi:
  Il parametro event contiene le informazioni sulla traccia ricevuta.  
  pc.ontrack viene chiamato quando il peer riceve una traccia video/audio.
  event.streams è un array che contiene i flussi multimediali ricevuti.
  Un peer può inviare più flussi multimediali contemporaneamente (esempio: una webcam e la condivisione dello schermo). 
  Qui prendiamo solo il primo perché, in molti casi, è quello principale.
  event.streams[0] - Il primo flusso ricevuto (di solito la webcam).
  event.streams[1] - Il secondo flusso (es. screen sharing).
  event.streams[2] - Un altro flusso (es. un microfono separato).
  */


  // Crea il DataChannel
  dataChannel = peerConnection.createDataChannel('chatChannel');
  setupDataChannel(dataChannel);
  
  // Referenziamo firestore per il signaling server
  // Creiamo un nuovo documento in Firestore nella collezione calls.
  const callDoc = firestore.collection('calls').doc();
  // Creiamo due sottocollezion delle offer e answer candidates
  const offerCandidates = callDoc.collection('offerCandidates');
  const answerCandidates = callDoc.collection('answerCandidates');
  
  callInput.value = callDoc.id; // id generato automaticamente da firestore

  // Ottiene i candidates per l'offer e li manda al peer connection
  peerConnection.onicecandidate = (event) => {
    // console.log("ICE Candidate trovato:", event.candidate);
    event.candidate && offerCandidates.add(event.candidate.toJSON()); // settiamo il listener per i candidates
  };
  /* Spiegazione Passi:
      pc.onicecandidate si attiva quando il browser scopre un candidato ICE
      Se il candidato ICE esiste, viene salvato in Firestore.
  */
  
     
  // Create offer
  const offerDescription = await peerConnection.createOffer();
  // console.log("SDP:", offerDescription.sdp);
  await peerConnection.setLocalDescription(offerDescription); // avrà l'SDP

  // convertiamo in un formato json per poterlo mandare al signaling server
  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
    username: localUsername
  };

  await callDoc.set({ offer });

  // Listener per la risposta
  callDoc.onSnapshot((snapshot) => {
    // osserviamo cambiamenti del db di firestore
    const data = snapshot.data();
    // Controlliamo se il peer non ha ancora ricevuto una risposta (!pc.currentRemoteDescription).
    // La proprietà currentRemoteDescription rappresenta la descrizione della sessione remota (SDP) ricevuta dal peer remoto.
    // data è il risultato di snapshot.data(), che contiene i dati aggiornati dal documento Firestore.
    // "?." è l'Optional Chaining, una sintassi di JavaScript che evita errori se data è null o undefined.
    if (!peerConnection.currentRemoteDescription && data?.answer) {   
      // Se nel database è presente un campo answer, significa che l'altro peer ha risposto.
      const answerDescription = new RTCSessionDescription(data.answer);
      remoteUsername = data.answer.username;

      remoteUsernameElement.textContent = remoteUsername;
      peerConnection.setRemoteDescription(answerDescription);
    }
  });

  // Se c'è una risposta, la mandiamo al peer connection
  answerCandidates.onSnapshot((snapshot) => {
    // snapshot.docChanges() restituisce un array di tutte le modifiche (aggiunta, modifica o rimozione) nella collezione Firestore.
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added') {
        // Ogni volta che viene aggiunto un candidato, lo mandiamo al peer connection
        // Gli altri possibili valori per change.type sono:
        // 'modified' - Un documento è stato aggiornato.
        // 'removed' - Un documento è stato eliminato.

        const candidate = new RTCIceCandidate(change.doc.data());
        peerConnection.addIceCandidate(candidate);
      }
    });
  });

   // Mostra i video nel DOM
   webcamVideo.srcObject = peer_1;
   remoteVideo.srcObject = peer_2;
   webcamVideo.muted = true; // Disattiva l'audio locale per evitare eco

   answerButton.disabled = true;
   hangupButton.disabled = false;
   answerButton.classList.add("disabled-button"); // Aggiunge la classe CSS
};



//! Rispondi alla chiamata con l'ID del documento creato dalla chiamata
answerButton.onclick = async () => {

  // Prendiamo tracce audio e video per generare correttamente l'SDP
  // Non verranno trasferite al peer 2 perchè se avvia la chiamata la sua webcam e mic vengono spenti
  peer_1 = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); // aspetta "accetta i permessi su webcam e audio"
  // Prende Tracce Audio/Video
  peer_1.getTracks().forEach((track) => {
    // Aggiungi le tracce alla peer connection
    peerConnection.addTrack(track, peer_2);
  });
  peer_1.getVideoTracks().forEach(track => track.enabled = false);
  peer_1.getAudioTracks().forEach(track => track.enabled = false);

  // Creiamo un nuovo oggetto MediaStream per il peer remoto
  peer_2 = new MediaStream();

  // Gestisce le tracce ricevute dal peer remoto
  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      peer_2.addTrack(track);
    });
  };


  const callId = callInput.value;
  const callDoc = firestore.collection('calls').doc(callId);
  const answerCandidates = callDoc.collection('answerCandidates');
  const offerCandidates = callDoc.collection('offerCandidates');

  peerConnection.onicecandidate = (event) => {
    event.candidate && answerCandidates.add(event.candidate.toJSON());
  };

  const callData = (await callDoc.get()).data();

  const offerDescription = callData.offer;
  remoteUsername = offerDescription.username;
  remoteUsernameElement.textContent = remoteUsername;
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
    username: localUsername
  };

  await callDoc.update({ answer });

   // Mostra i video nel DOM
   webcamVideo.srcObject = peer_1;
   remoteVideo.srcObject = peer_2;
   webcamVideo.muted = true; // Disattiva l'audio locale per evitare eco

   answerButton.disabled = true;
   hangupButton.disabled = false;
   answerButton.classList.add("disabled-button"); // Aggiunge la classe CSS
   

  // Aggiungiamo i candidates all'offerta
  offerCandidates.onSnapshot((snapshot) => {
    snapshot.docChanges().forEach((change) => {

      if (change.type === 'added') {
        let data = change.doc.data();
        peerConnection.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};


/* ---------------------------------- Gestione username ---------------------------------- */
submitNameButton.onclick = () => {
  localUsername = document.getElementById('usernameInput').value;

  if (localUsername.trim() !== "") {
      document.getElementById('nameRequest').style.visibility = 'hidden'; // Nasconde la div
      localUsernameElement.textContent = localUsername;
  } else {
      alert('Per favore inserisci un nome!');
  }
};



/* ---------------------------------- Gestione chat ---------------------------------- */
let alreadyPrinted = false;
// Configura il DataChannel per il peer remoto
peerConnection.ondatachannel = (event) => {
  console.log('DataChannel ricevuto dal peer remoto!');
  const remoteDataChannel = event.channel;
  setupDataChannel(remoteDataChannel); // Configura il DataChannel per il peer remoto

  if (!alreadyPrinted) {
    const chatMessages = document.getElementById('chatMessages');
    
    const newMessage = document.createElement('div');
    newMessage.classList.add('message');
    newMessage.textContent = `🔗 La connessione fra i due Peer è stata stabilita con successo! 🔗`;
    newMessage.style.textAlign = 'center'; // Centra il testo inline
    
    chatMessages.appendChild(newMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    alreadyPrinted = !alreadyPrinted;
  }
};


function setupDataChannel(channel) {
 channel.onopen = () => {
   console.log('DataChannel aperto!');
 };


 channel.onerror = (error) => {
    console.error('Errore nel DataChannel:', error);
 };

 channel.onclose = () => {
    console.log('DataChannel chiuso!');
 };
}

dataChannel = peerConnection.createDataChannel('chatChannel');
function sendMessage() {
  const chatInput = document.getElementById('chatInput');
  const chatMessages = document.getElementById('chatMessages');
  
  if (chatInput.value.trim() !== '') {
      const newMessage = document.createElement('div');
      newMessage.classList.add('message');
      newMessage.textContent = `Tu: ${chatInput.value}`;
      chatMessages.appendChild(newMessage);
      dataChannel.send(chatInput.value);
      chatInput.value = '';
      chatMessages.scrollTop = chatMessages.scrollHeight;
      
  }
 }


// Input file
document.getElementById('fileInput').addEventListener('change', handleFileUpload);

// Invio con tasto Enter
document.getElementById('chatInput').addEventListener('keypress', handleChatKeyPress);

// Pulsante di invio messaggio
document.getElementById('sendMessageButton').addEventListener('click', sendMessage);


// Funzione per inviare un file mockato
function handleFileUpload(event) {
  const file = event.target.files[0];
  
  if (file) {
      const chatMessages = document.getElementById('chatMessages');
      const fileMessage = document.createElement('div');
      fileMessage.classList.add('message');
      const fileLink = document.createElement('a');
      fileLink.href = URL.createObjectURL(file);
      fileLink.textContent = `Tu: 📎 ${file.name}`;
      fileLink.download = file.name;
      fileMessage.appendChild(fileLink);
      chatMessages.appendChild(fileMessage);
      chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}



// Funzione per gestire la pressione del tasto Invio nella chat
function handleChatKeyPress(event) {
  if (event.key === 'Enter') {
      sendMessage();
  }
}





/* ---------------------------------- Gestione file ---------------------------------- */

const BYTES_PER_CHUNK = 1200;   // Ogni volta che il file viene letto, viene suddiviso in blocchi di 1200 byte.
var file;
var currentChunk;
var fileInput = $( 'input[type=file]' );

// Crea un'istanza di FileReader, un oggetto JavaScript che permette di leggere i contenuti di file locali.
var fileReader = new FileReader();


/* Spiegazione:
Calcola il punto di inizio e fine del blocco da leggere:
  start è l'inizio del blocco, basato sul numero di blocchi già inviati (currentChunk).
  end è la fine del blocco, calcolato come la minima dimensione tra il file intero e la somma dello start più la grandezza massima di un chunk.
Legge il blocco come ArrayBuffer (un formato binario adatto alla trasmissione via WebRTC).
*/
function readNextChunk() {
    var start = BYTES_PER_CHUNK * currentChunk;
    var end = Math.min( file.size, start + BYTES_PER_CHUNK );
    fileReader.readAsArrayBuffer( file.slice( start, end ) );
}


// Quando il fileReader ha finito di leggere un blocco, questo viene inviato tramite il dataChannel.
fileReader.onload = function() {
  dataChannel.send( fileReader.result );
    currentChunk++;
    
    // Se non si è ancora inviato tutto il file, chiama di nuovo readNextChunk() per leggere e inviare il prossimo blocco.
    if( BYTES_PER_CHUNK * currentChunk < file.size ) {
        readNextChunk();
    }
};


// Quando l'Utente Seleziona un File
fileInput.on( 'change', function() {
    file = fileInput[ 0 ].files[ 0 ];
    currentChunk = 0;
    // send some metadata about our file
    // to the receiver
    dataChannel.send(JSON.stringify({
        fileName: file.name,
        fileSize: file.size
    }));
    readNextChunk();
});

var incomingFileInfo;
var incomingFileData;
var bytesReceived;
var downloadInProgress = false;

peerConnection.addEventListener('datachannel', event => {
  const dataChannel = event.channel; // Get the data channel
  
  dataChannel.onmessage = event => {
      const data = event.data;
      const endConnectionMessage = "⛓️‍💥 La connessione fra i due Peer si è interrotta con successo!⛓️‍💥";
      const jsonFormatRegex = /^{.*"fileName":".+","fileSize":\d+.*}$/;
      /* Spiegazione Regex:
          ^ e $: Assicurano che la regex corrisponda all'intera stringa.
          {.*: Inizia con { e può contenere qualsiasi carattere (.*) prima di "fileName".
        "fileName":".+": Cerca "fileName":" seguito da qualsiasi sequenza di caratteri (".+").
        ,"fileSize":\d+: Cerca ,"fileSize": seguito da uno o più numeri (\d+).
        .*}$: Può contenere qualsiasi carattere (.*) prima di chiudere con }.
      */
        if (!jsonFormatRegex.test(data)) {
          if (typeof event.data === 'string' && data != endConnectionMessage) {
        // È un messaggio di chat
        const chatMessages = document.getElementById('chatMessages');
        const newMessage = document.createElement('div');
        newMessage.classList.add('message');
        newMessage.textContent = `${remoteUsername}: ${event.data}`;
        chatMessages.appendChild(newMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

    if (data === endConnectionMessage){
        const chatMessages = document.getElementById('chatMessages');
        const newMessage = document.createElement('div');
        newMessage.classList.add('message');
        newMessage.textContent = `${event.data}`;
        newMessage.style.textAlign = 'center'; // Centra il testo inline
        chatMessages.appendChild(newMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

      if (downloadInProgress === false) {
          startDownload(data);
      } else {
          progressDownload(data);
      }
  };
});



function startDownload( data ) {
    incomingFileInfo = JSON.parse( data.toString() );
    incomingFileData = [];
    bytesReceived = 0;
    downloadInProgress = true;
}

function progressDownload( data ) {
    bytesReceived += data.byteLength;
    incomingFileData.push( data );
    if( bytesReceived === incomingFileInfo.fileSize ) {
        endDownload();
    }
}



function endDownload() {
  downloadInProgress = false;
  
  //Crea il Blob dai file chunks ricevuti
  let blob = new Blob(incomingFileData);
  let blobUrl = URL.createObjectURL(blob);

  // Crea link cliccabile
  let anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = incomingFileInfo.fileName;
  anchor.textContent = `${remoteUsername}:📎Download ${incomingFileInfo.fileName}`;

  // Aggiungiamo il link alla chat
  const chatMessages = document.getElementById('chatMessages');
  const newMessage = document.createElement('div');
  newMessage.classList.add('message');
  
  // facciamo la append del link <a>
  newMessage.appendChild(anchor);
  chatMessages.appendChild(newMessage);

  // Fai lo scroll all'ultimo mesaggio
  chatMessages.scrollTop = chatMessages.scrollHeight;
}



/* ---------------------------------- Disconnessione dei peers ---------------------------------- */
document.getElementById('hangupButton').addEventListener('click', disconnectPeers);

function displayDisconnectMessage() {
  const chatMessages = document.getElementById('chatMessages');
  const newMessage = document.createElement('div');
  newMessage.classList.add('message');
  newMessage.textContent = `⛓️‍💥 La connessione fra i due Peer si è interrotta con successo!⛓️‍💥`;
  newMessage.style.textAlign = 'center'; // Centra il testo inline
  chatMessages.appendChild(newMessage);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}


function disconnectPeers() {

  // Invia un messaggio di disconnessione attraverso il DataChannel
    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send('⛓️‍💥 La connessione fra i due Peer si è interrotta con successo!⛓️‍💥' );
    }

    // Mostra il messaggio localmente
    displayDisconnectMessage();

    // Chiudere il RTCDataChannel e la RTCPeerConnection
    if (dataChannel) dataChannel.close();
    if (peerConnection) peerConnection.close();

    // Disabilita il pulsante "Hangup"
    hangupButton.disabled = true;
    hangupButton.classList.add("disabled-button");
}
