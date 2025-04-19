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

// ===== PEERJS INIT (Render-hosted) =====
let peer = new Peer({
  host: 'wackachat-peer-server.onrender.com', // Replace with your actual Render subdomain
  port: 9000,
  path: '/',
  secure: true,
  key: 'wackakey'
});

let localStream, currentCall;

// ===== DOM REFERENCES =====
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const btnCall = document.getElementById("btnCall");
const btnChat = document.getElementById("btnChat");
const endCallBtn = document.getElementById("btnEndCall");
const onlineUsersDisplay = document.getElementById("onlineUsers");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const sendMessageBtn = document.getElementById("sendMessage");
const messageInput = document.getElementById("messageInput");

// ===== GET USER MEDIA =====
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
    makeLocalVideoDraggable();
  }).catch(err => {
    alert("Camera or mic access denied.");
    console.error(err);
  });

// ===== PEER EVENTS =====
peer.on("open", id => {
  const userRef = database.ref("users/" + id);
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

// ===== UPDATE ONLINE COUNT =====
function updateOnlineUserCount() {
  database.ref("users").on("value", snap => {
    const users = snap.val() || {};
    const count = Object.values(users).filter(u => u.status === "online").length;
    onlineUsersDisplay.innerText = `Online: ${count}`;
  });
}

// ===== RANDOM CALL LOGIC =====
btnCall.onclick = () => {
  database.ref("waiting_call").once("value").then(snap => {
    const other = snap.val();
    if (other && other !== peer.id) {
      database.ref("waiting_call").remove();
      startCall(other);
    } else {
      database.ref("waiting_call").set(peer.id);
      database.ref("waiting_call").onDisconnect().remove();
    }
  });
};

function startCall(id) {
  const call = peer.call(id, localStream);
  currentCall = call;
  call.on("stream", stream => {
    remoteVideo.srcObject = stream;
  });
}

// ===== RANDOM CHAT LOGIC =====
btnChat.onclick = () => {
  database.ref("waiting_chat").once("value").then(snap => {
    const other = snap.val();
    if (other && other !== peer.id) {
      database.ref("waiting_chat").remove();
      setupChat(peer.connect(other));
    } else {
      database.ref("waiting_chat").set(peer.id);
      database.ref("waiting_chat").onDisconnect().remove();
    }
  });
};

// ===== CHAT SETUP =====
function setupChat(conn) {
  chatBox.classList.remove("hidden");

  conn.on("data", data => {
    appendMessage(`Stranger: ${data}`);
  });

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

// ===== END CALL FUNCTION =====
endCallBtn.onclick = () => {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
    remoteVideo.srcObject = null;
  }
};

// ===== MAKE LOCAL VIDEO DRAGGABLE ON MOBILE & DESKTOP =====
function makeLocalVideoDraggable() {
  localVideo.style.position = "absolute";
  localVideo.style.zIndex = 1000;
  localVideo.style.cursor = "move";

  let offsetX, offsetY, dragging = false;

  const startDrag = e => {
    dragging = true;
    const rect = localVideo.getBoundingClientRect();
    offsetX = e.touches ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    offsetY = e.touches ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
  };

  const duringDrag = e => {
    if (!dragging) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    localVideo.style.left = `${x - offsetX}px`;
    localVideo.style.top = `${y - offsetY}px`;
  };

  const endDrag = () => dragging = false;

  localVideo.addEventListener("mousedown", startDrag);
  localVideo.addEventListener("mousemove", duringDrag);
  localVideo.addEventListener("mouseup", endDrag);
  localVideo.addEventListener("mouseleave", endDrag);

  localVideo.addEventListener("touchstart", startDrag);
  localVideo.addEventListener("touchmove", duringDrag);
  localVideo.addEventListener("touchend", endDrag);
}