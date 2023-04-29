const WebSocket = require("ws");
const wrtc = require("wrtc");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const signalingServerAddress = "ws://localhost:8080";
const signalingClient = new WebSocket(signalingServerAddress);

let dataChannel;

function createPeerConnection() {
  const peerConnection = new wrtc.RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });

  peerConnection.ondatachannel = (event) => {
    dataChannel = event.channel;
    setupDataChannel();
  };

  return peerConnection;
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    console.log("Data channel opened");
    startChat();
  };

  dataChannel.onmessage = (event) => {
    console.log(`> ${event.data}`);
  };
}

function startChat() {
  rl.question("Enter your username: ", (username) => {
    console.log("You can now start chatting!");

    rl.on("line", (input) => {
      const message = `${username}: ${input}`;
      dataChannel.send(message);
    });
  });
}

function handleSignalingMessage(event) {
  const message = JSON.parse(event.data);

  if (message.type === "offer") {
    peerConnection.setRemoteDescription(
      new wrtc.RTCSessionDescription(message)
    );
    peerConnection.createAnswer().then((answer) => {
      peerConnection.setLocalDescription(answer);
      signalingClient.send(JSON.stringify(answer));
    });
  } else if (message.type === "answer") {
    peerConnection.setRemoteDescription(
      new wrtc.RTCSessionDescription(message)
    );
  } else if (message.candidate) {
    peerConnection.addIceCandidate(new wrtc.RTCIceCandidate(message));
  }
}

const peerConnection = createPeerConnection();

peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    signalingClient.send(JSON.stringify(event.candidate));
  }
};

signalingClient.onopen = () => {
  console.log("Connected to signaling server:", signalingServerAddress);

  rl.question("Do you want to create a new chat room? (yes/no) ", (answer) => {
    if (answer.toLowerCase() === "yes") {
      dataChannel = peerConnection.createDataChannel("chat");
      setupDataChannel();

      peerConnection.createOffer().then((offer) => {
        peerConnection.setLocalDescription(offer);
        signalingClient.send(JSON.stringify(offer));
      });
    } else {
      console.log("Waiting for an offer...");
    }
  });
};

signalingClient.onmessage = handleSignalingMessage;

signalingClient.onclose = () => {
  console.log("Disconnected from signaling server");
  rl.close();
};
