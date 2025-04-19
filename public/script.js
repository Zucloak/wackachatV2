// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBHz_pnME24A3YalXA8OqlfJXY_fKCSpNk", // Replace with your API key
  authDomain: "wackachat.firebaseapp.com", // Replace with your auth domain
  databaseURL: "https://wackachat-default-rtdb.firebaseio.com", // Replace with your database URL
  projectId: "wackachat", // Replace with your project ID
  storageBucket: "wackachat.firebasestorage.app", // Replace with your storage bucket
  messagingSenderId: "344884471257", // Replace with your messaging sender ID
  appId: "1:344884471257:web:3d8dfb005128735ae7a5c8" // Replace with your app ID
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// PeerJS init …
let peer = new Peer({
  host: 'your-app.onrender.com',  // Your Render URL
  port: 9000,
  path: '/',
  secure: true,
  key: 'wackakey'
});

let localStream, currentCall;

// Grab the correct IDs
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const btnCall = document.getElementById("btnCall");
const btnChat = document.getElementById("btnChat");
const onlineUsersDisplay = document.getElementById("onlineUsers");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const sendMessageBtn = document.getElementById("sendMessage");
const messageInput = document.getElementById("messageInput");
const endCallBtn = document.getElementById("endCall");

// Media access …
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    localVideo.style.display = "block";  // Ensure it's visible
  }).catch(console.error);

// When PeerJS opens …
peer.on("open", id => {
  updateOnlineUserCount();
});

// COUNT ONLINE USERS
function updateOnlineUserCount() {
  database.ref("users").on("value", snap => {
    const users = snap.val() || {};
    const count = Object.values(users).filter(u => u.status === "online").length;
    onlineUsersDisplay.innerText = `Online: ${count}`;
  });
}

// INCOMING CALL
peer.on("call", call => {
  call.answer(localStream);
  call.on("stream", remoteStream => {
    remoteVideo.srcObject = remoteStream;
  });
});

// OUTGOING RANDOM CALL
btnCall.onclick = callRandomPeer;
function callRandomPeer() {
  database.ref("waiting_call").once("value").then(snap => {
    const other = snap.val();
    if (other && other !== peer.id) {
      database.ref("waiting_call").remove();
      startCall(other);
    } else {
      database.ref("waiting_call").set(peer.id).onDisconnect().remove();
    }
  });
}

function startCall(id) {
  const call = peer.call(id, localStream);
  call.on("stream", stream => remoteVideo.srcObject = stream);
  currentCall = call;
}

// OUTGOING RANDOM CHAT
btnChat.onclick = chatRandomPeer;
function chatRandomPeer() {
  database.ref("waiting_chat").once("value").then(snap => {
    const other = snap.val();
    if (other && other !== peer.id) {
      database.ref("waiting_chat").remove();
      setupChat(peer.connect(other));
    } else {
      database.ref("waiting_chat").set(peer.id).onDisconnect().remove();
    }
  });
}

// SETUP CHAT CONNECTION
peer.on("connection", conn => setupChat(conn));
function setupChat(conn) {
  chatBox.classList.remove("hidden");
  conn.on("data", data => appendMessage(`Stranger: ${data}`));
  sendMessageBtn.onclick = () => {
    const msg = messageInput.value.trim();
    if (!msg) return;
    conn.send(msg);
    appendMessage(`You: ${msg}`);
    messageInput.value = "";
  };
}

function appendMessage(txt) {
  const div = document.createElement("div");
  div.textContent = txt;
  messagesDiv.appendChild(div);
}

// END CALL FUNCTIONALITY
endCallBtn.onclick = endCall;
function endCall() {
  if (currentCall) {
    currentCall.close();
    remoteVideo.srcObject = null;
    localVideo.style.display = "block";  // Show local video again
  }
}

// DRAGGABLE LOCAL VIDEO FOR MOBILE USERS
if (window.innerWidth <= 768) {  // Only on mobile devices
  localVideo.style.position = 'absolute';
  localVideo.style.top = '10px';
  localVideo.style.left = '10px';
  
  localVideo.addEventListener('mousedown', dragStart, false);
  localVideo.addEventListener('touchstart', dragStart, false);

  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  function dragStart(e) {
    isDragging = true;
    offsetX = e.clientX || e.touches[0].clientX;
    offsetY = e.clientY || e.touches[0].clientY;
    
    document.addEventListener('mousemove', dragMove, false);
    document.addEventListener('touchmove', dragMove, false);
    document.addEventListener('mouseup', dragEnd, false);
    document.addEventListener('touchend', dragEnd, false);
  }

  function dragMove(e) {
    if (isDragging) {
      const x = (e.clientX || e.touches[0].clientX) - offsetX;
      const y = (e.clientY || e.touches[0].clientY) - offsetY;

      localVideo.style.left = `${x}px`;
      localVideo.style.top = `${y}px`;
    }
  }

  function dragEnd() {
    isDragging = false;
    document.removeEventListener('mousemove', dragMove, false);
    document.removeEventListener('touchmove', dragMove, false);
    document.removeEventListener('mouseup', dragEnd, false);
    document.removeEventListener('touchend', dragEnd, false);
  }
}