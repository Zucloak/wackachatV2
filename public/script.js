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

// PeerJS initialization
let peer = new Peer({ 
  host: 'your-app.onrender.com',  // Ensure this is the correct backend host
  port: 9000, 
  path: '/', 
  secure: true, 
  key: 'wackakey' 
});

let localStream, currentCall, currentChat;

// Grabbing DOM elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const btnCall = document.getElementById("btnCall");
const btnChat = document.getElementById("btnChat");
const onlineUsersDisplay = document.getElementById("onlineUsers");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const sendMessageBtn = document.getElementById("sendMessage");
const messageInput = document.getElementById("messageInput");

// Accessing the user's media
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  }).catch(console.error);

// When PeerJS opens
peer.on("open", id => {
  // Update Firebase database with online status
  updateOnlineUserCount();
});

// Count online users
function updateOnlineUserCount() {
  database.ref("users").on("value", snap => {
    const users = snap.val() || {};
    const count = Object.values(users).filter(u => u.status === "online").length;
    onlineUsersDisplay.innerText = `Online: ${count}`;
  });
}

// Handling incoming call
peer.on("call", call => {
  call.answer(localStream);
  call.on("stream", remoteStream => {
    remoteVideo.srcObject = remoteStream;
  });
});

// Start a random call
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

// Start the call with the other peer
function startCall(id) {
  const call = peer.call(id, localStream);
  call.on("stream", stream => remoteVideo.srcObject = stream);
  currentCall = call;
}

// Start a random chat
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

// Setup chat connection
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

// Append chat message
function appendMessage(txt) {
  const div = document.createElement("div");
  div.textContent = txt;
  messagesDiv.appendChild(div);
}

// End the call
function endCall() {
  if (currentCall) {
    currentCall.close();
    remoteVideo.srcObject = null;
  }
  if (currentChat) {
    currentChat.close();
    chatBox.classList.add("hidden");
  }
}