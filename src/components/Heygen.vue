<script setup>

import {onBeforeUnmount, onMounted, ref} from "vue";
// import OpenAI from "openai";

const emits = defineEmits(['ready', 'close']);

// const openai = new OpenAI({
//   apiKey: import.meta.env.VITE_OPENAI_API_KEY,
// });
// const systemSetup = "You are an AI avatar designed for a live demonstration at an exhibition about artificial intelligence. " +
//   "You interact with visitors in real-time, in a clear, concise, and engaging manner. " +
//   "Your responses must always be limited to a single sentence, with no extra commentary or elaboration. " +
//   "You only respond to the most recent question asked by the user, ignoring all previous ones if they are no longer relevant. " +
//   "For every sentence the user says, you will also receive information about the user's gesture. " +
//   "You will use this information to response to the user. "

const status = ref(null);
const logs = ref(null);
const mediaElement = ref(null);
const canvasElement = ref(null);

const SERVER_URL = import.meta.env.VITE_HEYGEN_API_URL;
const API_KEY = import.meta.env.VITE_HEYGEN_API_KEY;
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

let recognition = null;
let active = false
let avatarIsSpeaking = false;
const intervalTime = 2000
let time = 0

const transcriptList = ref([]);

let sessionInfo = null;
let peerConnection = null;

const updateLogs = (message) => {
  logs.value.innerHTML += message + '<br>';
  logs.value.scrollTop = logs.value.scrollHeight;
}

const updateStatus = (message) => {
  status.value.innerHTML = message;
}

const tick = () => {
  requestAnimationFrame(tick)
  if (active) {
    updateStatus('🎙️ Listening... 🎙️');
  } else {
    updateStatus('🔇 ... 🔇');
  }

  if (avatarIsSpeaking) {
    time += 16
    if (time >= intervalTime) {
      time = 0
      avatarIsSpeaking = false
      active = true
    }
  }
}

// Create a new WebRTC session when clicking the "New" button
const createNewSession = async () => {
  const avatar = import.meta.env.VITE_HEYGEN_AVATAR_ID || '';
  const voice = import.meta.env.VITE_HEYGEN_VOICE_ID || '';

  // call the new interface to get the server's offer SDP and ICE server to create a new RTCPeerConnection
  sessionInfo = await newSession('low', avatar, voice);
  const {sdp: serverSdp, ice_servers2: iceServers} = sessionInfo;

  // Create a new RTCPeerConnection
  peerConnection = new RTCPeerConnection({iceServers: iceServers});

  // When audio and video streams are received, display them in the video element
  peerConnection.ontrack = (event) => {
    console.log('Received the track');
    if (event.track.kind === 'audio' || event.track.kind === 'video') {
      mediaElement.value.srcObject = event.streams[0];
    }
  };

  // When receiving a message, display it in the status element
  peerConnection.ondatachannel = (event) => {
    const dataChannel = event.channel;
    dataChannel.onmessage = (event => {
      console.log('Received message:', event.data);

    });
  };

  // Set server's SDP as remote description
  const remoteDescription = new RTCSessionDescription(serverSdp);
  await peerConnection.setRemoteDescription(remoteDescription);

}

// Start session and display audio and video
const startAndDisplaySession = async () => {
  if (!sessionInfo) {
    updateLogs('Please create a connection first');
    return;
  }

  updateLogs('Starting session... please wait');

  // Create and set local SDP description
  const localDescription = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(localDescription);

  // When ICE candidate is available, send to the server
  peerConnection.onicecandidate = ({candidate}) => {
    console.log('Received ICE candidate:', candidate);
    if (candidate) {
      handleICE(sessionInfo.session_id, candidate.toJSON());
    }
  };

  // When ICE connection state changes, display the new state
  peerConnection.oniceconnectionstatechange = (event) => {
    updateLogs(`ICE connection state changed to: ${peerConnection.iceConnectionState}`,);
  };

  // Start session
  await startSession(sessionInfo.session_id, localDescription);

  const receivers = peerConnection.getReceivers();

  receivers.forEach((receiver) => {
    receiver.jitterBufferTarget = 500
  });

  updateLogs('Session started successfully');
}

// Close the connection and stop the session
const closeConnectionHandler = async () => {
  if (!sessionInfo) {
    updateLogs('Please create a connection first');
    return;
  }
  updateLogs('Closing connection... please wait');
  try {
    // Close local connection
    peerConnection.close();
    // Call the close interface
    const resp = await stopSession(sessionInfo.session_id);
    console.log(resp);
  } catch (err) {
    console.error('Failed to close the connection:', err);
  }
  updateLogs('Connection closed successfully');
}

// new session
const newSession = async (quality, avatar_name, voice_id) => {
  const response = await fetch(`${SERVER_URL}/v1/streaming.new`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({
      quality,
      avatar_name,
      voice: {
        voice_id: voice_id,
      },
    }),
  });
  if (response.status === 500) {
    console.error('Server error');
    updateLogs('Server Error. Please ask the staff if the service has been turned on',);

    throw new Error('Server error');
  } else {
    const data = await response.json();
    console.log(data.data);
    return data.data;
  }
}

// start the session
const startSession = async (session_id, sdp) => {
  const response = await fetch(`${SERVER_URL}/v1/streaming.start`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({session_id, sdp}),
  });
  if (response.status === 500) {
    console.error('Server error');
    updateLogs('Server Error. Please ask the staff if the service has been turned on',);
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

// submit the ICE candidate
const handleICE = async (session_id, candidate) => {
  const response = await fetch(`${SERVER_URL}/v1/streaming.ice`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({session_id, candidate}),
  });
  if (response.status === 500) {
    console.error('Server error');
    updateLogs(
        'Server Error. Please ask the staff if the service has been turned on',
    );
    throw new Error('Server error');
  } else {
    return await response.json();
  }
}

// stop session
const stopSession = async (session_id) => {
  const response = await fetch(`${SERVER_URL}/v1/streaming.stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({session_id}),
  });
  if (response.status === 500) {
    console.error('Server error');
    updateLogs('Server Error. Please ask the staff for help');
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

// ---------------------

const talkToOpenAI = async (prompt) => {
  const response = await fetch(`${BACKEND_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({prompt}),
  });
  if (response.status === 500) {
    console.error('Server error');
    updateLogs('Server Error. Please make sure to set the openai api key',);
    throw new Error('Server error');
  } else {
    const data = await response.json();
    transcriptList.value.push(data.text);
    return data.text;
  }
  // try {
  //   const chatCompletion = await openai.chat.completions.create({
  //     messages: [
  //       { role: 'system', content: systemSetup},
  //       { role: 'user', content: prompt }
  //     ],
  //     // model: 'gpt-4',
  //     model: 'gpt-3.5-turbo',
  //   });
  //  return chatCompletion.choices[0].message.content;
  // } catch (error) {
  //   console.error('Error calling OpenAI:', error);
  //   updateLogs('Error calling OpenAI: ' + error.message);
  // }
}

const talkHandler = async (input = null) => {
  if (!sessionInfo) {
    updateLogs('Please create a connection first');
    return;
  }

  let prompt = ''
  if (input) {
    prompt = input;
  }

  if (prompt.trim() === '') {
    alert('Please enter a prompt for the LLM');
    return;
  }

  updateLogs('Talking to LLM... please wait');

  try {
    const text = await talkToOpenAI(prompt)

    if (text) {
      console.log('LLM response:', text);
      // Send the AI's response to Heygen's streaming.task API
      const resp = await repeat(sessionInfo.session_id, text);

      updateLogs('LLM response sent successfully');
    } else {
      updateLogs('Failed to get a response from AI');
    }
  } catch (error) {
    console.error('Error talking to AI:', error);
    updateLogs('Error talking to AI');
  }
}

const repeat = async (session_id, text) => {
  const response = await fetch(`${SERVER_URL}/v1/streaming.task`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify({session_id, text}),
  });
  if (response.status === 500) {
    console.error('Server error');
    updateLogs('Server Error. Please ask the staff if the service has been turned on',);
    throw new Error('Server error');
  } else {
    const data = await response.json();
    return data.data;
  }
}

// ---------------------

const onTranscriptResult = (event) => {
  let transcript = event.results[event.results.length - 1][0].transcript;
  transcriptList.value.push(transcript);
  talkHandler(transcript);
  active = false;
}

const onTranscriptEnd = () => {
  active = true
  // recognition.stop();
}

const onTranscriptError = (ev) => {
  active = true;
  console.error("Speech recognition error:", ev.error);
}

// ---------------------

const onStart = async () => {
  const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.lang = "fr-FR";
  recognition.continuous = true;
  recognition.interimResults = false;

  recognition.onresult = onTranscriptResult;
  recognition.onspeechend = onTranscriptEnd;
  recognition.onerror = onTranscriptError;

  await createNewSession()
  await startAndDisplaySession()

  setTimeout(() => {
    emits('ready');
    recognition.start();
    tick()
  }, 1500)

  // setTimeout(() => {
  // talkHandler('Bonjour')
  // avatarIsSpeaking = true;
  // }, 2500)

}

onBeforeUnmount(() => {
  if (recognition) {
    recognition.stop();
  }
  closeConnectionHandler();
  if (peerConnection) {
    peerConnection.close();
  }
  updateLogs('Component unmounted and connection closed');
  emits('close');
})

defineExpose({
  onStart,
})
</script>

<template>
  <div class="heygen">
    <div ref="logs" class="logs"></div>
    <div class="transcription">
      <h2 ref="status"></h2>
      <hr>
      <ul>
        <li v-for="(transcript, index) in transcriptList" :key="index">{{ transcript }}</li>
      </ul>
    </div>
    <div class="videoWrap">
      <video ref="mediaElement" class="videoEle show" autoplay></video>
      <canvas ref="canvasElement" class="videoEle hide"></canvas>
    </div>
    <button class="close" @click="closeConnectionHandler">CLOSE</button>
  </div>
</template>

<style scoped lang="scss">
.heygen {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.logs {
  position: absolute;
  bottom: 0px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 200px;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  overflow-y: auto;
  padding: 10px 20px;
  font-family: monospace;
  font-size: 20px;
  z-index: 10;
  border-radius: 8px;
}

.videoWrap {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  & > * {
    position: absolute;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.transcription {
  position: absolute;
  top: 50vh;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  height: 300px;
  background-color: rgba(255, 255, 255, 0.5);
  padding: 20px;
  border-radius: 10px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;

  h2 {
    margin: 0;
    font-size: 24px;
    color: #333;
  }

  ul {
    list-style-type: none;
    padding: 0;

    li {
      margin: 5px 0;
      font-size: 18px;
      color: #555;
    }
  }
}

.close {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  background-color: #ff4d4d;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}
</style>
