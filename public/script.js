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

// === PEERJS SETUP ===
const peer = new Peer();
let localStream, currentCall;

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const btnCall = document.getElementById("btnCall");
const btnChat = document.getElementById("btnChat");
const btnEndCall = document.getElementById("btnEndCall");
const onlineUsersDisplay = document.getElementById("onlineUsers");
const chatBox = document.getElementById("chatBox");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessage");

// === MEDIA ACCESS ===
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  .then(stream => {
    localStream = stream;
    localVideo.srcObject = stream;
  }).catch(console.error);

// === ON PEER OPEN ===
peer.on("open", id => {
  database.ref(`users/${id}`).set({ status: "online" });
  database.ref(`users/${id}`).onDisconnect().remove();
  updateOnlineUserCount();
});

function updateOnlineUserCount() {
  database.ref("users").on("value", snap => {
    const users = snap.val() || {};
    const count = Object.values(users).filter(u => u.status === "online").length;
    onlineUsersDisplay.innerText = `Online: ${count}`;
  });
}

// === HANDLE INCOMING CALL ===
peer.on("call", call => {
  call.answer(localStream);
  call.on("stream", stream => {
    remoteVideo.srcObject = stream;
  });
  currentCall = call;
  btnEndCall.classList.remove("hidden");
});

// === HANDLE INCOMING CHAT ===
peer.on("connection", conn => {
  chatBox.classList.remove("hidden");
  conn.on("data", msg => appendMessage(`Stranger: ${msg}`));
  sendMessageBtn.onclick = () => {
    const msg = messageInput.value.trim();
    if (!msg) return;
    conn.send(msg);
    appendMessage(`You: ${msg}`);
    messageInput.value = "";
  };
});

// === CALL RANDOM PEER ===
btnCall.onclick = () => {
  database.ref("waiting_call").once("value").then(snap => {
    const other = snap.val();
    if (other && other !== peer.id) {
      database.ref("waiting_call").remove();
      const call = peer.call(other, localStream);
      call.on("stream", stream => remoteVideo.srcObject = stream);
      currentCall = call;
      btnEndCall.classList.remove("hidden");
    } else {
      database.ref("waiting_call").set(peer.id).onDisconnect().remove();
    }
  });
};

// === CHAT RANDOM PEER ===
btnChat.onclick = () => {
  database.ref("waiting_chat").once("value").then(snap => {
    const other = snap.val();
    if (other && other !== peer.id) {
      database.ref("waiting_chat").remove();
      const conn = peer.connect(other);
      conn.on("open", () => {
        chatBox.classList.remove("hidden");
        conn.on("data", msg => appendMessage(`Stranger: ${msg}`));
        sendMessageBtn.onclick = () => {
          const msg = messageInput.value.trim();
          if (!msg) return;
          conn.send(msg);
          appendMessage(`You: ${msg}`);
          messageInput.value = "";
        };
      });
    } else {
      database.ref("waiting_chat").set(peer.id).onDisconnect().remove();
    }
  });
};

// === END CALL ===
btnEndCall.onclick = () => {
  if (currentCall) {
    currentCall.close();
    remoteVideo.srcObject = null;
    btnEndCall.classList.add("hidden");
  }
};

// === APPEND CHAT MESSAGE ===
function appendMessage(text) {
  const div = document.createElement("div");
  div.textContent = text;
  messagesDiv.appendChild(div);
}

// === DRAGGABLE LOCAL VIDEO ===
localVideo.addEventListener('mousedown', dragStart);
let offset = { x: 0, y: 0 };

function dragStart(e) {
  offset.x = e.clientX - localVideo.offsetLeft;
  offset.y = e.clientY - localVideo.offsetTop;
  document.addEventListener('mousemove', dragMove);
  document.addEventListener('mouseup', dragEnd);
}

function dragMove(e) {
  localVideo.style.left = `${e.clientX - offset.x}px`;
  localVideo.style.top = `${e.clientY - offset.y}px`;
}

function dragEnd() {
  document.removeEventListener('mousemove', dragMove);
  document.removeEventListener('mouseup', dragEnd);
}