var roomName;
var userName;
const rootContainer = document.getElementById("root");
const createRoot = ReactDOM.createRoot(rootContainer);

let isEnumerateDevices = false
document.getElementById("nameInput").value = 'user_' + Math.round(Math.random() * 1000)

function Modal() {
    return (
        <div id="deviceListView">
            <div id="modalOverlay"></div>
            <div className='enter-room-modal dialog fade-in'>
                <form>
                    Audio:
                    <select id="audioSelect">
                    </select>
                    <br />
                    Video:
                    <select id="videoSelect">
                    </select>
                    <br />
                    <input type="button" value="change Device" onClick={() => changeDevice()} />
                    <br />
                    <input id="enterRoomButton" type='submit' value='Enter room' onClick={() => renderReactMeetingRoom()} />
                </form>
                <div className='video-container' id="previewVideo">
                </div>
            </div>
        </div>
    )
}

function App() {
    React.useEffect(() => {
        deviceLoad()
    });
    return (
        <Modal />
    )
}

function renderReact() {
    roomName = document.getElementById("roomInput").value;
    userName = document.getElementById("nameInput").value;
    console.log(roomName, userName)
    document.getElementById("login").style.display = "none";
    createRoot.render(<App />);
}

function RoomContainer() {
    React.useEffect(() => {
        appendElembeforeJoin()
    });
    return (
        <div className="container">
            <div id="participants"></div>
            <button id="startScreenButton" className="" onClick={ () => startScreen() }>
                    <i className="fas fa-desktop"></i> Open screen
                </button>
            <button id="stopScreenButton" className="hidden" onClick={ () => closeScreen() }>
                    <i className="fas fa-desktop"></i> Close screen
                </button>
        </div>
    )
}

function renderReactMeetingRoom() {
    document.getElementById("deviceListView").style.display = "none";
    createRoot.render(<RoomContainer />);
      
    window.stream.getTracks().forEach( (camera) => {
        camera.stop();
      });
}

function deviceLoad() {
    createVideoPreView();
    initEnumerateDevices();
}
function createVideoPreView() {
    let video = document.createElement('video');
    video.id = "previewVideoElement"
    var container = document.getElementById("previewVideo");
    container.appendChild(video);
    getMedia("default", "default");
}

function getMedia(videoDeviceId, audioDeviceId) {
    let videoElement = document.getElementById("previewVideoElement");
    let option = {
        video: { deviceId: videoDeviceId},
        audio: { deviceId: audioDeviceId }
    };
    if (window.stream){
        window.stream.getTracks().forEach( (camera) => {
            camera.stop();
          });
    }
    navigator.mediaDevices.getUserMedia(option)
        .then((stream) => {
            window.stream = stream;
            playVideo(videoElement, stream);
        })
    .catch(err => alert(`${err.name} ${err.message}`));
}

function playVideo(element, stream) {// videoタグにstreamを映す
    if ('srcObject' in element) {
      element.srcObject = stream;
    }
    else {
      element.src = window.URL.createObjectURL(stream);
    }
    element.play();
    element.volume = 0;
  }

  function changeDevice() {
    var audioSelect = document.getElementById("audioSelect");
    var videoSelect = document.getElementById("videoSelect");
    getMedia(videoSelect.value, audioSelect.value);
  }

function initEnumerateDevices() {
    // Many browsers, without the consent of getUserMedia, cannot enumerate the devices.
    if (isEnumerateDevices) return

    const constraints = {
        audio: true,
        video: true
    }

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
            enumerateDevices()
            stream.getTracks().forEach(function(track) {
                track.stop()
            })
        })
        .catch((err) => {
            console.error('Access denied for audio/video: ', err)
        })
}

function enumerateDevices() {
    // Load mediaDevice options
    navigator.mediaDevices.enumerateDevices().then((devices) =>
        devices.forEach((device) => {
            let el = null
            if ('audioinput' === device.kind) {
                el = audioSelect
            } else if ('videoinput' === device.kind) {
                el = videoSelect
            }
            if (!el) return

            let option = document.createElement('option')
            option.value = device.deviceId
            option.innerText = device.label
            el.appendChild(option)
            isEnumerateDevices = true
        })
    )
}
