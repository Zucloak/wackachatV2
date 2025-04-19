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

// ================== PeerJS Init ========================
const peer = new Peer({
  host: 'wackachat-peer-server.onrender.com',
  port: 9000,
  path: '/',
  key: 'wackakey',
  secure: true,
});

let localStream = null;
let currentCall = null;

// ================== DOM Elements ========================
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const btnCall = document.getElementById("btnCall");
const btnChat = document.getElementById("btnChat");
const endCallBtn = document.getElementById("endCall");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const sendMessageBtn = document.getElementById("sendMessage");
const messageInput = document.getElementById("messageInput");
const onlineUsersDisplay = document.getElementById("onlineUsers");

// =============== Access Camera & Mic ====================
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  })
  .catch(error => {
    alert("Camera/Mic access denied.");
    console.error(error);
  });

// =============== Peer Events =============================
peer.on("open", id => {
  const userRef = database.ref(`users/${id}`);
  userRef.set({ status: "online" });
  userRef.onDisconnect().remove();
  updateOnlineUserCount();
});

peer.on("call", call => {
  call.answer(localStream);
  currentCall = call;
  call.on("stream", stream => {
    remoteVideo.srcObject = stream;
  });
});

peer.on("connection", conn => setupChat(conn));

// =============== Update Online Users =====================
function updateOnlineUserCount() {
  database.ref("users").on("value", snap => {
    const users = snap.val() || {};
    const count = Object.values(users).filter(u => u.status === "online").length;
    onlineUsersDisplay.innerText = `Online: ${count}`;
  });
}

// =============== Random Call =============================
btnCall.onclick = () => {
  const waitingRef = database.ref("waiting_call");
  waitingRef.once("value").then(snap => {
    const otherId = snap.val();
    if (otherId && otherId !== peer.id) {
      waitingRef.remove();
      startCall(otherId);
    } else {
      waitingRef.set(peer.id);
      waitingRef.onDisconnect().remove();
    }
  });
};

function startCall(peerId) {
  const call = peer.call(peerId, localStream);
  currentCall = call;
  call.on("stream", stream => {
    remoteVideo.srcObject = stream;
  });
}

// =============== Random Chat =============================
btnChat.onclick = () => {
  const chatRef = database.ref("waiting_chat");
  chatRef.once("value").then(snap => {
    const otherId = snap.val();
    if (otherId && otherId !== peer.id) {
      chatRef.remove();
      const conn = peer.connect(otherId);
      setupChat(conn);
    } else {
      chatRef.set(peer.id);
      chatRef.onDisconnect().remove();
    }
  });
};

// =============== Chat Setup ==============================
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

// =============== End Call ================================
endCallBtn.onclick = () => {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
    remoteVideo.srcObject = null;
  }
};

// =============== Make Local Video Draggable ===============
localVideo.style.position = 'absolute';
localVideo.style.left = '10px';
localVideo.style.bottom = '10px';
localVideo.style.zIndex = 1000;

localVideo.addEventListener('mousedown', function (e) {
  const offsetX = e.clientX - localVideo.offsetLeft;
  const offsetY = e.clientY - localVideo.offsetTop;

  function onMouseMove(e) {
    localVideo.style.left = `${e.clientX - offsetX}px`;
    localVideo.style.top = `${e.clientY - offsetY}px`;
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
});