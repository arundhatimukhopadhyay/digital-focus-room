// Parse room ID and host flag from the URL
const urlParams = new URLSearchParams(window.location.search);
let roomId = urlParams.get("room");
const isHost = urlParams.get("host") === "true";

let peer = null;
let localStream = null;
let call = null;
let chatConnection = null;

// If no room ID in the URL (e.g. someone opened this page directly), generate one
if (!roomId) {
    roomId = Math.random().toString(36).substring(2, 9);
}

// Display the shareable link (without the host flag, so guests join as guests)
document.getElementById("room-link-text").textContent =
    `${window.location.origin}${window.location.pathname}?room=${roomId}`;

function copyRoomLink() {
    const link = document.getElementById("room-link-text").textContent;
    navigator.clipboard.writeText(link).then(() => {
        alert("Link copied! Send it to your study partner.");
    }).catch(() => {
        alert("Could not copy automatically — please select and copy the link manually.");
    });
}

// ============================================
// Core Setup: camera/mic + PeerJS connection
// ============================================
async function initRoom() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById("local-video").srcObject = localStream;
    } catch (err) {
        alert("Camera/microphone access is required to join the study room.");
        console.error("getUserMedia error:", err);
        return;
    }

    if (isHost) {
        // Host registers itself under the room ID, so guests have a known address to call
        peer = new Peer(roomId);
    } else {
        // Guest gets a random PeerJS-assigned ID, then calls the host directly
        peer = new Peer();
    }

    peer.on("open", () => {
        if (!isHost) {
            // Guest initiates both the video call and the chat data connection
            call = peer.call(roomId, localStream);
            call.on("stream", (remoteStream) => {
                document.getElementById("remote-video").srcObject = remoteStream;
            });

            chatConnection = peer.connect(roomId);
            setupChatHandlers();
        }
    });

    // Host: listen for an incoming video call
    peer.on("call", (incomingCall) => {
        incomingCall.answer(localStream);
        incomingCall.on("stream", (remoteStream) => {
            document.getElementById("remote-video").srcObject = remoteStream;
        });
        call = incomingCall;
    });

    // Host: listen for the incoming chat data connection
    peer.on("connection", (conn) => {
        chatConnection = conn;
        setupChatHandlers();
    });

    peer.on("error", (err) => {
        console.error("PeerJS error:", err);
        appendChatMessage("System", "Connection error — the room may not exist yet, or your partner hasn't joined.");
    });
}

function setupChatHandlers() {
    chatConnection.on("open", () => {
        appendChatMessage("System", "Your study partner is connected!");
    });
    chatConnection.on("data", (data) => {
        appendChatMessage("Partner", data);
    });
    chatConnection.on("close", () => {
        appendChatMessage("System", "Your study partner disconnected.");
    });
}

// ============================================
// Chat UI
// ============================================
function sendChatMessage() {
    const input = document.getElementById("chat-input");
    const message = input.value.trim();
    if (!message) return;

    appendChatMessage("You", message);

    if (chatConnection && chatConnection.open) {
        chatConnection.send(message);
    }

    input.value = "";
}

function appendChatMessage(sender, text) {
    const messagesDiv = document.getElementById("chat-messages");
    const line = document.createElement("p");
    line.innerHTML = `<strong>${sender}:</strong> ${text}`;
    messagesDiv.appendChild(line);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Allow pressing Enter to send chat messages
document.getElementById("chat-input").addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendChatMessage();
});

// Kick everything off
initRoom();