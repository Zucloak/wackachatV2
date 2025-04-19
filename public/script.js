// Initialize Firebase with your real config
const firebaseConfig = {
  apiKey: "AIzaSyA1Htn_xlJcwwnk8AP_mKMrM-VysOnILpY",
  authDomain: "wackachat-4e717.firebaseapp.com",
  databaseURL: "https://wackachat-4e717-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "wackachat-4e717",
  storageBucket: "wackachat-4e717.appspot.com",
  messagingSenderId: "88450699359",
  appId: "1:88450699359:web:86c21d8d0a8005db2a1391"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// PeerJS initialization
let peer;
let localStream;
let currentCall;

window.addEventListener('load', () => {
  peer = new Peer({
    host: 'wackachat-peer-server.onrender.com',
    port: 9000,
    path: '/',
    secure: true,
    key: 'wackakey'
  });

  peer.on('open', (id) => {
    const userRef = database.ref('users/' + id);
    userRef.set({ name: id, status: 'online' });
    userRef.onDisconnect().remove();
    updateOnlineUserCount();
  });

  peer.on('call', (call) => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        localStream = stream;
        document.getElementById('localVideo').srcObject = stream;
        call.answer(stream);
        call.on('stream', (remoteStream) => {
          document.getElementById('remoteVideo').srcObject = remoteStream;
        });
        currentCall = call;
      });
  });

  peer.on('connection', (conn) => {
    setupConnection(conn);
  });
});

// Show live online count
function updateOnlineUserCount() {
  const onlineUsersRef = database.ref('users');
  onlineUsersRef.on('value', (snapshot) => {
    const users = snapshot.val();
    const count = Object.values(users || {}).filter(u => u.status === 'online').length;
    document.getElementById('onlineCount').innerText = `Online Users: ${count}`;
  });
}

// Call random peer
function callRandomPeer() {
  database.ref('users').once('value').then(snapshot => {
    const users = snapshot.val();
    const others = Object.keys(users || {}).filter(uid => uid !== peer.id);
    if (others.length === 0) return alert('No one is available to call.');

    const randomId = others[Math.floor(Math.random() * others.length)];

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
      localStream = stream;
      document.getElementById('localVideo').srcObject = stream;

      const call = peer.call(randomId, stream);
      call.on('stream', (remoteStream) => {
        document.getElementById('remoteVideo').srcObject = remoteStream;
      });
      currentCall = call;
    });
  });
}

// Chat random peer
function chatRandomPeer() {
  database.ref('users').once('value').then(snapshot => {
    const users = snapshot.val();
    const others = Object.keys(users || {}).filter(uid => uid !== peer.id);
    if (others.length === 0) return alert('No one is available to chat.');

    const randomId = others[Math.floor(Math.random() * others.length)];
    const conn = peer.connect(randomId);
    setupConnection(conn);
  });
}

function setupConnection(conn) {
  document.getElementById('chatBox').classList.remove('hidden');
  conn.on('data', (data) => {
    appendMessage(`Stranger: ${data}`);
  });

  document.getElementById('sendMessage').onclick = function () {
    const input = document.getElementById('messageInput');
    const msg = input.value.trim();
    if (!msg) return;
    conn.send(msg);
    appendMessage(`You: ${msg}`);
    input.value = '';
  };
}

function appendMessage(msg) {
  const messages = document.getElementById('messages');
  const msgElem = document.createElement('div');
  msgElem.textContent = msg;
  messages.appendChild(msgElem);
}
