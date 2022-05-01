function RemoteStream(remoteVideo, viewBtn) {
  let peerConn;
  let socket;

  const room = 'room1';

  function connectIO() {
    socket = io(`ws://${window.location.host}`);

    socket.on('ice_candidate', async (data) => {
      console.log('receive ice_candidate')
      const candidate = new RTCIceCandidate({
        sdpMLineIndex: data.label,
        candidate: data.candidate,
      });
      await peerConn.addIceCandidate(candidate);
    });

    socket.on('answer', async (desc) => {
      console.log('receive answer');
      await peerConn.setRemoteDescription(desc);
    });

    socket.emit('join', room);
  }

  function initPeerConnection() {
    const configuration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302',
        },
      ],
    }
    peerConn = new RTCPeerConnection(configuration);

    peerConn.addTransceiver('video', { direction: 'recvonly' });
    peerConn.addTransceiver('audio', { direction: 'recvonly' });

    peerConn.onicecandidate = (e) => {
      if (e.candidate) {
        console.log('send ICE');
        socket.emit('ice_candidate', room, {
          label: e.candidate.sdpMLineIndex,
          id: e.candidate.sdpMid,
          candidate: e.candidate.candidate,
        });
      }
    };

    peerConn.oniceconnectionstatechange = (e) => {
      if (e.target.iceConnectionState === 'disconnected') {
        remoteVideo.srcObject = null;
      }
    };

    peerConn.onaddstream = ({ stream }) => {
      remoteVideo.srcObject = stream;
    };
  }

  async function sendSDP(isOffer) {
    try {
      if (!peerConn) {
        initPeerConnection();
      }

      const localSDP = await peerConn.createOffer();

      await peerConn.setLocalDescription(localSDP);
      let e = isOffer ? 'offer' : 'answer';
      socket.emit(e, room, peerConn.localDescription);
    } catch (err) {
      throw err;
    }
  }

  async function init() {
    initPeerConnection();
    connectIO();
    sendSDP(true);
  }

  viewBtn.onclick = init

}

const video = document.querySelector('video#remoteVideo');
new RemoteStream(video, viewBtn);
