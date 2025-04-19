// Firebase config (already known)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "YOUR_DATABASE_URL"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const peer = new Peer(undefined, {
  host: 'wackachatv2peerserver.onrender.com',
  port: 443,
  secure: true
});

let conn;
let currentCall;
const messagesDiv = document.getElementById('messages');

peer.on('open', id => {
  console.log('My peer ID is:', id);
  db.ref('waiting').push(id);
});

peer.on('call', call => {
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      call.answer(stream);
      call.on('stream', remoteStream => {
        document.getElementById('remoteVideo').srcObject = remoteStream;
      });
      document.getElementById('localVideo').srcObject = stream;
      currentCall = call;
    });
});

peer.on('connection', connection => {
  conn = connection;
  conn.on('data', data => {
    messagesDiv.innerHTML += `<div><b>Stranger:</b> ${data}</div>`;
  });
  document.getElementById('chatBox').classList.remove('hidden');
});

function callRandomPeer() {
  db.ref('waiting').once('value', snapshot => {
    const peers = Object.entries(snapshot.val() || {}).filter(([k, v]) => v !== peer.id);
    if (peers.length === 0) return alert('No available peers.');
    const [key, targetId] = peers[Math.floor(Math.random() * peers.length)];
    db.ref(`waiting/${key}`).remove();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        const call = peer.call(targetId, stream);
        call.on('stream', remoteStream => {
          document.getElementById('remoteVideo').srcObject = remoteStream;
        });
        document.getElementById('localVideo').srcObject = stream;
        currentCall = call;
      });
  });
}

function chatRandomPeer() {
  db.ref('waiting').once('value', snapshot => {
    const peers = Object.entries(snapshot.val() || {}).filter(([k, v]) => v !== peer.id);
    if (peers.length === 0) return alert('No peers available.');
    const [key, targetId] = peers[Math.floor(Math.random() * peers.length)];
    db.ref(`waiting/${key}`).remove();

    conn = peer.connect(targetId);
    conn.on('open', () => {
      document.getElementById('chatBox').classList.remove('hidden');
    });
    conn.on('data', data => {
      messagesDiv.innerHTML += `<div><b>Stranger:</b> ${data}</div>`;
    });
  });
}

function sendMessage() {
  const msg = document.getElementById('messageInput').value;
  if (msg.trim() && conn?.open) {
    conn.send(msg);
    messagesDiv.innerHTML += `<div><b>You:</b> ${msg}</div>`;
    document.getElementById('messageInput').value = '';
  }
}
