var localVideo;
var localStream;
var remoteVideo;
var peerConnection;
var uuid;
var serverConnection;

var peerConnectionConfig = {
  'iceServers': [

    {"url":"stun:ss-turn1.xirsys.com"},
    {"username":"7cef6120-ee1b-11e8-871a-509c8360beb6",
      "url":"turn:ss-turn1.xirsys.com:80?transport=udp",
      "credential":"7cef61ca-ee1b-11e8-ab91-c997a309a135"},
    {"username":"7cef6120-ee1b-11e8-871a-509c8360beb6",
      "url":"turn:ss-turn1.xirsys.com:3478?transport=udp",
      "credential":"7cef61ca-ee1b-11e8-ab91-c997a309a135"},
    {"username":"7cef6120-ee1b-11e8-871a-509c8360beb6",
      "url":"turn:ss-turn1.xirsys.com:80?transport=tcp",
      "credential":"7cef61ca-ee1b-11e8-ab91-c997a309a135"},
    {"username":"7cef6120-ee1b-11e8-871a-509c8360beb6",
      "url":"turn:ss-turn1.xirsys.com:3478?transport=tcp",
      "credential":"7cef61ca-ee1b-11e8-ab91-c997a309a135"},
    {"username":"7cef6120-ee1b-11e8-871a-509c8360beb6",
      "url":"turns:ss-turn1.xirsys.com:443?transport=tcp",
      "credential":"7cef61ca-ee1b-11e8-ab91-c997a309a135"},
    {"username":"7cef6120-ee1b-11e8-871a-509c8360beb6",
      "url":"turns:ss-turn1.xirsys.com:5349?transport=tcp",
      "credential":"7cef61ca-ee1b-11e8-ab91-c997a309a135"},
    {
      'urls': [
        'stun:stun.l.google.com:19302',
        'stun:stun.l.google.com:19302?transport=udp',
      ]
    }


  ]

};

function pageReady()
{

  uuid = createUUID();

  localVideo = document.getElementById('localVideo');
  remoteVideo = document.getElementById('remoteVideo');

  serverConnection = new WebSocket('wss://' + window.location.hostname + ':8443');
  serverConnection.onmessage = gotMessageFromServer;

  var constraints = {
    video: true,
    audio: true,
  };

  if(navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then(getUserMediaSuccess).catch(errorHandler);
  } else {
    alert('Your browser does not support getUserMedia API');
  }
}

function getUserMediaSuccess(stream) {
  localStream = stream;
  localVideo.srcObject = stream;
}

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;
  peerConnection.addStream(localStream);

  if(isCaller) {
    peerConnection.createOffer().then(createdDescription).catch(errorHandler);
  }
}

function gotMessageFromServer(message) {
  if(!peerConnection) start(false);

  var signal = JSON.parse(message.data);

  // Ignore messages from ourself
  console.log(message, ' ',signal.uuid);
  if(signal.uuid == uuid) return;


  if(signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(function() {
      // Only create answers in response to offers
      if(signal.sdp.type == 'offer') {
        peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
      }
    }).catch(errorHandler);
  } else if(signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if(event.candidate != null) {
    serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
  }
}

function createdDescription(description) {
  console.log('got description');

  peerConnection.setLocalDescription(description).then(function() {
    serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteVideo.srcObject = event.streams[0];
}

function errorHandler(error) {
  console.log(error);
}

// Taken from http://stackoverflow.com/a/105074/515584
// Strictly speaking, it's not a real UUID, but it gets the job done here
function createUUID() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }

  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
