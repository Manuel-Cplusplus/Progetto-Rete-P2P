import firebase from 'firebase/app';
import 'firebase/firestore';
import{peerConnection, peer_1, peer_2} from './main'

// Variabili per lo stato della webcam e del microfono
let isWebcamActive = false;
let isMicrophoneActive = false;

// Cambio icona disattivare/attivare microfono
document.getElementById('mic-btn').addEventListener('click', function() {

    const micIcon = this.querySelector('i');
    if (micIcon.classList.contains('fa-microphone')) {
        micIcon.classList.remove('fa-microphone');
        micIcon.classList.add('fa-microphone-slash');
    } else {
        micIcon.classList.remove('fa-microphone-slash');
        micIcon.classList.add('fa-microphone');
    }
});

// Cambio icona disattivare/attivare webcam
document.getElementById('camera-btn').addEventListener('click', function() {

    const webcamIcon = this.querySelector('i');
    if (webcamIcon.classList.contains('fa-video')) {
        webcamIcon.classList.remove('fa-video');
        webcamIcon.classList.add('fa-video-slash');
    } else {
        webcamIcon.classList.remove('fa-video-slash');
        webcamIcon.classList.add('fa-video');
    }
});


// Aggiungi event listener per i pulsanti di webcam e microfono
document.getElementById('camera-btn').addEventListener('click', toggleWebcam);
document.getElementById('mic-btn').addEventListener('click', toggleMicrophone);


// Funzione per attivare/disattivare la webcam
async function toggleWebcam() {


  const webcamIcon = document.getElementById('camera-btn').querySelector('i');
  if (isWebcamActive) {
    // Disattiva la webcam
    peer_1.getVideoTracks().forEach(track => track.enabled = false);
    webcamIcon.classList.remove('fa-video');
    webcamIcon.classList.add('fa-video-slash');
  } else {
    // Attiva la webcam
    peer_1.getVideoTracks().forEach(track => track.enabled = true);
    webcamIcon.classList.remove('fa-video-slash');
    webcamIcon.classList.add('fa-video');
  }
  isWebcamActive = !isWebcamActive;
}


// Funzione per attivare/disattivare il microfono
async function toggleMicrophone() {

  const micIcon = document.getElementById('mic-btn').querySelector('i');
  if (isMicrophoneActive) {
    // Disattiva il microfono
    peer_1.getAudioTracks().forEach(track => track.enabled = false);
    micIcon.classList.remove('fa-microphone');
    micIcon.classList.add('fa-microphone-slash');
  } else {
    // Attiva il microfono
    peer_1.getAudioTracks().forEach(track => track.enabled = true);
    micIcon.classList.remove('fa-microphone-slash');
    micIcon.classList.add('fa-microphone');
  }
  isMicrophoneActive = !isMicrophoneActive;
}


// Funzione per avviare/terminare la chiamata/ Gestione Tracce
callButton.onclick = async () => {

    const videoCallSection = document.getElementById('videoCallSection');
    if (videoCallSection.style.display === 'none' || videoCallSection.style.display === '') {
      // Apri la sezione della videochiamata
      videoCallSection.style.display = 'block';
      callButton.textContent = 'Termina Chiamata';
      callButton.classList.add('active');
  
      // Aggiorna lo stato iniziale
      isWebcamActive = false;
      isMicrophoneActive = false;
  
      // Aggiorna le icone
      document.getElementById('camera-btn').querySelector('i').classList.add('fa-video-slash');
      document.getElementById('mic-btn').querySelector('i').classList.add('fa-microphone-slash');
  
      // Mostra i video nel DOM
      webcamVideo.srcObject = peer_1;
      remoteVideo.srcObject = peer_2;
      
    } else {
      // Chiudi la sezione della videochiamata
      videoCallSection.style.display = 'none';
      callButton.textContent = 'Avvia Videochiamata';
      callButton.classList.remove('active');
  
      // Disattiva webcam e microfono
      peer_1.getTracks().forEach(track => track.stop());  // Ferma tutte le tracce
      peer_2.getTracks().forEach(track => track.stop());  // Ferma tutte le tracce
      webcamVideo.srcObject = null;                       // Rimuove il flusso video dal DOM
      remoteVideo.srcObject = null;                       // Rimuove il flusso video remoto dal DOM

      // Resetta lo stato
      isWebcamActive = false;
      isMicrophoneActive = false;
  
      // Aggiorna le icone
      document.getElementById('camera-btn').querySelector('i').classList.remove('fa-video');
      document.getElementById('camera-btn').querySelector('i').classList.add('fa-video-slash');
      document.getElementById('mic-btn').querySelector('i').classList.remove('fa-microphone');
      document.getElementById('mic-btn').querySelector('i').classList.add('fa-microphone-slash');
    }
  };