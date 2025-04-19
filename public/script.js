console.log('script.js loaded');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHz_pnME24A3YalXA8OqlfJXY_fKCSpNk",
  authDomain: "wackachat.firebaseapp.com",
  databaseURL: "https://wackachat-default-rtdb.firebaseio.com",
  projectId: "wackachat",
  storageBucket: "wackachat.appspot.com",
  messagingSenderId: "344884471257",
  appId: "1:344884471257:web:3d8dfb005128735ae7a5c8",
  measurementId: "G-MZM4LSXWFG"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentUserID = peer.id; // Use the PeerJS ID as a unique identifier for each user

// Initialize PeerJS to your Render server
const peer = new Peer(undefined, {
  host: 'wackachatv2peerserver.onrender.com', // your Render URL
  port: 443,
  path: '/',
  secure: true,
  key: 'wackakey'
});

let conn, currentCall;
const messagesDiv = document.getElementById('messages');
const onlineUsersDiv = document.getElementById('onlineUsers');

// Track online users
function updateOnlineUsers() {
  db.ref('users').once('value')
    .then(snapshot => {
      const users = snapshot.val();
      onlineUsersDiv.innerHTML = "<h3>Online Users</h3>";
      for (const userID in users) {
        if (users[userID].status === "online") {
          onlineUsersDiv.innerHTML += `<div>${users[userID].name}</div>`;
        }
      }
    })
    .catch(err => console.error('Error fetching online users:', err));
}

// When PeerJS connection is opened
peer.on('open', id => {
  console.log('Peer opened with ID:', id);
  currentUserID = id;

  // Mark user as online in Firebase
  db.ref('users/' + id).set({
    name: 'User ' + id,  // You can customize the name as needed
    status: 'online'
  });

  // Update the list of online users
  updateOnlineUsers();
  
  // Monitor changes in the 'users' node
  db.ref('users').on('value', () => {
    updateOnlineUsers();
  });
});

peer.on('call', call => {
  console.log('Incoming call from', call.peer);
  navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    .then(stream => {
      document.getElementById('localVideo').srcObject = stream;
      call.answer(stream);
      call.on('stream', remoteStream => {
        document.getElementById('remoteVideo').srcObject = remoteStream;
      });
      currentCall = call;
    })
    .catch(err => console.error('getUserMedia error', err));
});

peer.on('connection', connection => {
  console.log('Incoming chat connection from', connection.peer);
  conn = connection;
  conn.on('data', data => {
    messagesDiv.innerHTML += `<div><strong>Stranger:</strong> ${data}</div>`;
  });
  document.getElementById('chatBox').classList.remove('hidden');
});

function callRandomPeer() {
  console.log('callRandomPeer()');
  db.ref('waiting').once('value')
    .then(snapshot => {
      const list = snapshot.val() || {};
      const peers = Object.entries(list).filter(([k, id]) => id !== peer.id);
      console.log('Available peers:', peers);
      if (!peers.length) {
        return alert('No available peers right now.');
      }
      const [key, targetId] = peers[Math.floor(Math.random() * peers.length)];
      db.ref(`waiting/${key}`).remove();

      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          document.getElementById('localVideo').srcObject = stream;
          const call = peer.call(targetId, stream);
          call.on('stream', remoteStream => {
            document.getElementById('remoteVideo').srcObject = remoteStream;
          });
          currentCall = call;
        })
        .catch(err => console.error('getUserMedia error', err));
    })
    .catch(err => console.error('Firebase read error', err));
}

function chatRandomPeer() {
  console.log('chatRandomPeer()');
  db.ref('waiting').once('value')
    .then(snapshot => {
      const list = snapshot.val() || {};
      const peers = Object.entries(list).filter(([k, id]) => id !== peer.id);
      console.log('Available peers for chat:', peers);
      if (!peers.length) {
        return alert('No peers available for chat.');
      }
      const [key, targetId] = peers[Math.floor(Math.random() * peers.length)];
      db.ref(`waiting/${key}`).remove();

      conn = peer.connect(targetId);
      conn.on('open', () => {
        console.log('Chat connection open with', targetId);
        document.getElementById('chatBox').classList.remove('hidden');
      });
      conn.on('data', data => {
        messagesDiv.innerHTML += `<div><strong>Stranger:</strong> ${data}</div>`;
      });
    })
    .catch(err => console.error('Firebase read error', err));
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const msg = input.value.trim();
  if (msg && conn && conn.open) {
    conn.send(msg);
    messagesDiv.innerHTML += `<div><strong>You:</strong> ${msg}</div>`;
    input.value = '';
  }
}

// Listen for user disconnect
window.onbeforeunload = () => {
  db.ref('users/' + currentUserID).remove();
};
