const socket = io()
let producer = null
let rc = null
let localMedia = document.createElement("div");
let remoteVideos = document.createElement("div");
let remoteAudios = document.createElement("div");
let isScreenSharing = false;
let isShowingVideo = false;
let isShowingAudio = false;
let selectedDeviceVideoID;
let selectedDeviceAudioID;

const PARTICIPANT_MAIN_CLASS = 'participant main';
const PARTICIPANT_CLASS = 'participant';

socket.request = function request(type, data = {}) {
    return new Promise((resolve, reject) => {
        socket.emit(type, data, (data) => {
            if (data.error) {
                reject(data.error)
            } else {
                resolve(data)
            }
        })
    })
}

function appendElembeforeJoin(audioId, videoId) {
    new Promise((resolve) => {
        let participants = document.getElementById("participants");
        localMedia.id = "localMedia";
        remoteVideos.id = "remoteVideos";
        remoteAudios.id = "remoteAudios";
        localMedia.className = PARTICIPANT_MAIN_CLASS;
        // remoteVideos.className = PARTICIPANT_CLASS;
        remoteVideos.style.display = "none"
        participants.appendChild(localMedia);
        participants.appendChild(remoteVideos);
        participants.appendChild(remoteAudios);
        selectedDeviceAudioID = audioId
        selectedDeviceVideoID = videoId
        resolve();
      }).then(() => {
        joinRoom(userName, roomName);
      });
}   

function joinRoom(name, room_id) {
    if (rc && rc.isOpen()) {
        console.log('Already connected to a room')
    } else {
        rc = new RoomClient(localMedia, remoteVideos, remoteAudios, window.mediasoupClient, socket, room_id, name, roomOpen)
        //settingSwicthVideos(localMedia);
        //settingSwicthVideos(remoteVideos);
        addListeners();
    }
}

function roomOpen() {
    rc.produce(mediaType.audio, selectedDeviceAudioID);
    rc.produce(mediaType.video, selectedDeviceVideoID);
}

function screenSharing() {
    if (!isScreenSharing) {
        rc.produce(RoomClient.mediaType.screen);
    } else {
        rc.closeProducer(RoomClient.mediaType.screen);
    }
}

function startScreenHandler() {
    isScreenSharing = true;
    const screenButton = document.getElementById("screenShareOnOffButton");
    screenButton.firstElementChild.textContent = "stop_screen_share";
}

function closeScreenHandler() {
    isScreenSharing = false;
    const screenButton = document.getElementById("screenShareOnOffButton");
    screenButton.firstElementChild.textContent = "screen_share";
}

function didTapVideoButton() {
    if (!isShowingVideo) {
        rc.produce(RoomClient.mediaType.video);
    } else {
        rc.closeProducer(RoomClient.mediaType.video);
    }
}

function didTapAudioButton() {

    if (!isShowingAudio) {
        rc.produce(RoomClient.mediaType.audio);
    } else {
        rc.closeProducer(RoomClient.mediaType.audio);
    }
}

function didTapExitButton() {
    rc.exit();
}

function didTapExitButton() {
    rc.exit();
}

// function switchContainerClass(container) {
//     if (container.className === PARTICIPANT_CLASS) {
//         var elements = Array.prototype.slice.call(document.getElementsByClassName(PARTICIPANT_MAIN_CLASS));
//         elements.forEach(function(item) {
//             item.className = PARTICIPANT_CLASS;
//         });
//         container.className = PARTICIPANT_MAIN_CLASS;
//     } else {
//         container.className = PARTICIPANT_CLASS;
//     }
// }

// function settingSwicthVideos(elem) {
//     elem.onclick = function(){
//         switchContainerClass(elem);
//       };
// }

function addListeners() {
    rc.on(RoomClient.EVENTS.startScreen, () => {
        startScreenHandler();
    })
    rc.on(RoomClient.EVENTS.stopScreen, () => {
        closeScreenHandler();
    })
    rc.on(RoomClient.EVENTS.startAudio, () => {
        isShowingAudio = true;
        const screenButton = document.getElementById("micOnOffButton");
        screenButton.firstElementChild.textContent = "mic";
    })
    rc.on(RoomClient.EVENTS.stopAudio, () => {
        isShowingAudio = false;
        const screenButton = document.getElementById("micOnOffButton");
        screenButton.firstElementChild.textContent = "mic_off";
    })
    rc.on(RoomClient.EVENTS.startVideo, () => {
        isShowingVideo = true;
        const screenButton = document.getElementById("videoOnOffButton");
        screenButton.firstElementChild.textContent = "videocam";
    })
    rc.on(RoomClient.EVENTS.stopVideo, () => {
        isShowingVideo = false;
        const screenButton = document.getElementById("videoOnOffButton");
        screenButton.firstElementChild.textContent = "videocam_off";
    })
    rc.on(RoomClient.EVENTS.exitRoom, () => {
        location.reload();
    })
}