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

// PeerJS init
const peer = new Peer(undefined, {
  host: "wackachat-peer-server.onrender.com",
  port: 9000,
  path: "/",
  key: "wackakey"
});

let localStream = null;
let currentCall = null;
let currentConn = null;

// DOM elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const btnCall = document.getElementById("btnCall");
const btnChat = document.getElementById("btnChat");
const endCallBtn = document.getElementById("endCall");
const onlineUsersDisplay = document.getElementById("onlineUsers");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const sendMessageBtn = document.getElementById("sendMessage");
const messageInput = document.getElementById("messageInput");

// Ensure local media is only initialized after interaction
btnCall.addEventListener('click', () => {
  initializeMediaIfNeeded().then(() => callRandomPeer());
});
btnChat.addEventListener('click', () => {
  initializeMediaIfNeeded().then(() => chatRandomPeer());
});
endCallBtn.addEventListener('click', endCall);

function initializeMediaIfNeeded() {
  return new Promise((resolve, reject) => {
    if (localStream) return resolve();

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        localStream = stream;
        localVideo.srcObject = stream;
        localVideo.muted = true;
        localVideo.play();
        resolve();
      })
      .catch(err => {
        alert("Permission denied or device not found.");
        reject(err);
      });
  });
}

// Update online users
peer.on("open", id => {
  const userRef = database.ref(`users/${id}`);
  userRef.set({ status: "online" });
  userRef.onDisconnect().remove();

  database.ref("users").on("value", snap => {
    const users = snap.val() || {};
    const count = Object.values(users).filter(u => u.status === "online").length;
    onlineUsersDisplay.innerText = `Online: ${count}`;
  });
});

// Handle incoming call
peer.on("call", call => {
  call.answer(localStream);
  call.on("stream", remoteStream => {
    remoteVideo.srcObject = remoteStream;
  });
  currentCall = call;
});

// Handle incoming chat
peer.on("connection", conn => {
  setupChat(conn);
});

// Call Random Peer
function callRandomPeer() {
  database.ref("waiting_call").once("value").then(snap => {
    const other = snap.val();
    if (other && other !== peer.id) {
      database.ref("waiting_call").remove();
      const call = peer.call(other, localStream);
      call.on("stream", stream => {
        remoteVideo.srcObject = stream;
      });
      currentCall = call;
    } else {
      database.ref("waiting_call").set(peer.id).onDisconnect().remove();
    }
  });
}

// Chat Random Peer
function chatRandomPeer() {
  database.ref("waiting_chat").once("value").then(snap => {
    const other = snap.val();
    if (other && other !== peer.id) {
      database.ref("waiting_chat").remove();
      const conn = peer.connect(other);
      setupChat(conn);
    } else {
      database.ref("waiting_chat").set(peer.id).onDisconnect().remove();
    }
  });
}

// Chat setup
function setupChat(conn) {
  chatBox.classList.remove("hidden");
  currentConn = conn;

  conn.on("data", data => appendMessage(`Stranger: ${data}`));
  sendMessageBtn.onclick = () => {
    const msg = messageInput.value.trim();
    if (!msg) return;
    conn.send(msg);
    appendMessage(`You: ${msg}`);
    messageInput.value = "";
  };
}

function appendMessage(text) {
  const msgDiv = document.createElement("div");
  msgDiv.textContent = text;
  messagesDiv.appendChild(msgDiv);
}

// End call logic
function endCall() {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
    remoteVideo.srcObject = null;
  }
  if (currentConn) {
    currentConn.close();
    currentConn = null;
    chatBox.classList.add("hidden");
  }
}

// Draggable local video
localVideo.addEventListener("mousedown", dragMouseDown);
function dragMouseDown(e) {
  e.preventDefault();
  let pos3 = e.clientX, pos4 = e.clientY;

  function elementDrag(e) {
    localVideo.style.top = (localVideo.offsetTop - (pos4 - e.clientY)) + "px";
    localVideo.style.left = (localVideo.offsetLeft - (pos3 - e.clientX)) + "px";
    pos3 = e.clientX;
    pos4 = e.clientY;
  }

  function stopDrag() {
    document.removeEventListener("mousemove", elementDrag);
    document.removeEventListener("mouseup", stopDrag);
  }

  document.addEventListener("mousemove", elementDrag);
  document.addEventListener("mouseup", stopDrag);
}