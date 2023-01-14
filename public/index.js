// if (location.href.substr(0, 5) !== 'https') location.href = 'https' + location.href.substr(4, location.href.length - 4)
const socket = io()
let producer = null
let rc = null

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

function appendElembeforeJoin() {
    new Promise((resolve) => {
        let participants = document.getElementById("participants");
        // localMedia = document.createElement("div");
        // remoteVideos = document.createElement("div");
        // remoteAudios = document.createElement("div");
        localMedia.id = "localMedia";
        remoteVideos.id = "remoteVideos";
        remoteAudios.id = "remoteAudios";
        localMedia.className = PARTICIPANT_MAIN_CLASS;
        remoteVideos.className = PARTICIPANT_CLASS;
        remoteVideos.style.display = "none"
        participants.appendChild(localMedia);
        participants.appendChild(remoteVideos);
        participants.appendChild(remoteAudios);
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
        settingSwicthVideos(localMedia);
        settingSwicthVideos(remoteVideos);
    }
}

function roomOpen() {
    rc.produce(mediaType.audio);
    rc.produce(mediaType.video);
}

function startScreen() {
    rc.produce(RoomClient.mediaType.screen);
}

function closeScreen() {
    rc.closeProducer(RoomClient.mediaType.screen);
}

function switchContainerClass(container) {
    if (container.className === PARTICIPANT_CLASS) {
        var elements = Array.prototype.slice.call(document.getElementsByClassName(PARTICIPANT_MAIN_CLASS));
        elements.forEach(function(item) {
            item.className = PARTICIPANT_CLASS;
        });
        container.className = PARTICIPANT_MAIN_CLASS;
    } else {
        container.className = PARTICIPANT_CLASS;
    }
}

function settingSwicthVideos(elem) {
    elem.onclick = function(){
        switchContainerClass(elem);
        console.log("click!", elem)
      };
}

//////////////// 未使用 //////////////////

function hide(elem) {
    elem.className = 'hidden'
}

function reveal(elem) {
    elem.style.display = "block";
}

function addListeners() {
    rc.on(RoomClient.EVENTS.startScreen, () => {
        hide(startScreenButton)
        reveal(stopScreenButton)
    })

    rc.on(RoomClient.EVENTS.stopScreen, () => {
        hide(stopScreenButton)
        reveal(startScreenButton)
    })

    rc.on(RoomClient.EVENTS.stopAudio, () => {
        hide(stopAudioButton)
        reveal(startAudioButton)
    })
    rc.on(RoomClient.EVENTS.startAudio, () => {
        console.log("event startAudio");
    })

    rc.on(RoomClient.EVENTS.startVideo, () => {
        console.log("event startVideo");

    })
    rc.on(RoomClient.EVENTS.stopVideo, () => {
        hide(stopVideoButton)
        reveal(startVideoButton)
    })
    rc.on(RoomClient.EVENTS.exitRoom, () => {
        hide(control)
        hide(devicesList)
        //hide(videoMedia)
        hide(devicesButton)
        reveal(login)
    })
}