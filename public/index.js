// if (location.href.substr(0, 5) !== 'https') location.href = 'https' + location.href.substr(4, location.href.length - 4)
const socket = io()
let producer = null
let rc = null
let remoteVideos = document.getElementById("remoteVideos");
let remoteAudios = document.getElementById("remoteAudios");

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

function joinRoom(name, room_id) {
    if (rc && rc.isOpen()) {
        console.log('Already connected to a room')
    } else {
        console.log("join room localmedia");
        let localMedia = document.getElementById("localMedia");
        console.log(localMedia);
        rc = new RoomClient(localMedia, remoteVideos, remoteAudios, window.mediasoupClient, socket, room_id, name, roomOpen)
    }
}

function roomOpen() {
    rc.produce(mediaType.audio);
    rc.produce(mediaType.video);
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
        hide(videoMedia)
        hide(devicesButton)
        reveal(login)
    })
}
