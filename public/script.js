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
let peer = new Peer({ /* ... */ });
let localStream, currentCall;

// Grab the **correct** IDs
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const btnCall = document.getElementById("btnCall");
const btnChat = document.getElementById("btnChat");
const btnEndCall = document.getElementById("btnEndCall"); // End call button
const onlineUsersDisplay = document.getElementById("onlineUsers");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const sendMessageBtn = document.getElementById("sendMessage");
const messageInput = document.getElementById("messageInput");

// Media access …
navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: "user", // Ensure front-facing camera on mobile
    width: { ideal: 1280 },
    height: { ideal: 720 }
  },
  audio: true
})
  .then(stream => {
    console.log("✅ Media stream initialized:", stream);
    localStream = stream;
    localVideo.srcObject = stream;
  }).catch(err => console.error("🚫 Failed to access media devices:", err));

// When PeerJS opens …
peer.on("open", id => {
  // … register online user, onDisconnect, count, etc.
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

// END CALL FUNCTION
function endCall() {
  if (currentCall) {
    currentCall.close();
    remoteVideo.srcObject = null;
    currentCall = null;
  }
  // Optionally, also stop the local video stream when ending the call
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localVideo.srcObject = null;
  }
}

// Make local video draggable
localVideo.addEventListener("mousedown", (e) => {
  let offsetX = e.clientX - localVideo.offsetLeft;
  let offsetY = e.clientY - localVideo.offsetTop;

  function moveAt(e) {
    localVideo.style.left = e.clientX - offsetX + "px";
    localVideo.style.top = e.clientY - offsetY + "px";
  }

  function onMouseMove(e) {
    moveAt(e);
  }

  document.addEventListener("mousemove", onMouseMove);

  localVideo.onmouseup = () => {
    document.removeEventListener("mousemove", onMouseMove);
    localVideo.onmouseup = null;
  };
});

// Add styles for draggable video in CSS
localVideo.style.position = "absolute";
localVideo.style.zIndex = "10"; // Ensures the local video is on top of other elements

// Add Event Listener to End Call Button
btnEndCall.addEventListener("click", endCall);