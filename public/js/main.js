function LocalStream(localVideo, startBtn) {
  let localStream;
  let socket;
  const PCs = {};
  const room = 'room1';

  function connectIO() {
    socket = io(`ws://${window.location.host}`);

    socket.on('ice_candidate', async (data, id) => {
      console.log(`receive ice_candidate: ${id}`, data);
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: data.label,
        candidate: data.candidate,
      });
      await PCs[id].addIceCandidate(candidate);
    });

    socket.on('offer', async (desc, id) => {
      console.log('receive offer');
      const pc = initPeerConnection();
      PCs[id] = pc;
      await pc.setRemoteDescription(desc)
      await sendSDP(false, pc);
    });

    socket.on('bye', async (id) => {
      console.log(id, 'disconnected');
      delete PCs[id];
    });

    socket.emit('join', room);
  }

  async function createStream() {
    try {
      const constraints = {
        audio: true,
        video: true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStream = stream;
      localVideo.srcObject = stream;
    } catch (err) {
      throw err;
    }
  }

  function initPeerConnection() {
    const configuration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    };
    let peerConn = new RTCPeerConnection(configuration);

    localStream.getTracks().forEach((track) => {
      peerConn.addTrack(track, localStream);
    });

    peerConn.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('send ICE');
        socket.emit('ice_candidate', room, {
          label: e.candidate.sdpMLineIndex,
          id: e.candidate.sdpMid,
          candidate: e.candidate.candidate,
        });
      }
    }

    peerConn.oniceconnectionstatechange = (e) => {
      if (e.target.iceConnectionState === 'disconnected') {
        console.log("remote disconnected");
      }
    }

    return peerConn;
  }

  async function sendSDP(isOffer, pc) {
    try {
      if (!pc) {
        initPeerConnection();
      }

      const localSDP = await pc[isOffer ? 'createOffer' : 'createAnswer']({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });

      await pc.setLocalDescription(localSDP);

      const e = isOffer ? 'offer' : 'answer';
      socket.emit(e, room, pc.localDescription);
    } catch (err) {
      throw err;
    }
  }

  async function init() {
    await createStream();
    connectIO();
  }

  startBtn.onclick = init;
}

const video = document.querySelector('video#localVideo');
new LocalStream(video, startBtn);
