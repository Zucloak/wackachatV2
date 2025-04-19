// Initialize the peer object first
const peer = new Peer({
  host: 'your-app.onrender.com',  // Replace with your Render backend URL
  port: 9000,
  path: '/',  // Default path for PeerJS
  secure: true,  // Use secure connection
  key: 'wackakey'  // Key for PeerJS
});

// Wait for the peer connection to be open
peer.on('open', (id) => {
  console.log('Peer connected with ID:', id);
  document.getElementById("localPeerId").textContent = id;  // Display the local peer ID on the page
});

peer.on('error', (err) => {
  console.log('PeerJS error:', err);
  alert('An error occurred: ' + err);
});

// Function to call a random peer
function callRandomPeer() {
  const randomPeerId = getRandomPeerId(); // Assuming you have a function to get random peer IDs
  const call = peer.call(randomPeerId, localStream);  // Assuming 'localStream' is your media stream

  call.on('stream', (remoteStream) => {
    // Display the remote stream on the remote video element
    const remoteVideo = document.getElementById('remoteVideo');
    remoteVideo.srcObject = remoteStream;
  });
}

// Function to get a random peer ID (just a placeholder for now)
function getRandomPeerId() {
  // Replace with actual logic to get a random peer ID from your database or users list
  return "randomPeerId123";
}

// Function to start chat with a random peer
function chatRandomPeer() {
  const randomPeerId = getRandomPeerId();  // Use the same random peer logic
  const chatBox = document.getElementById('chatBox');
  chatBox.classList.remove('hidden');
  
  const messagesContainer = document.getElementById('messages');
  const messageInput = document.getElementById('messageInput');
  
  // Function to send a message
  function sendMessage() {
    const message = messageInput.value;
    messagesContainer.innerHTML += `<p>You: ${message}</p>`;
    messageInput.value = ''; // Clear the input after sending
    
    // Code to send the message to the peer (using a message service like Firebase, etc.)
    sendToPeer(randomPeerId, message);  // Replace with your actual send message logic
  }

  // Call sendMessage when the send button is clicked
  document.querySelector('button[onclick="sendMessage()"]').addEventListener('click', sendMessage);
}

// Send message to the peer
function sendToPeer(peerId, message) {
  console.log('Sending message to:', peerId, 'Message:', message);
  // Use your backend (like Firebase) to send the message
}

// Display the peer ID on the page
document.getElementById("localPeerId").textContent = "Local Peer ID: " + peer.id;
