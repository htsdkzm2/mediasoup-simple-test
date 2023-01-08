var roomName;
var userName;
const { useState } = React

function Modal() {
    return (
        <div>
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
                    <input id="submitButton" type='submit' value='Enter room'/>
                </form>
                <div className='video-container' id="previewVideo">
                    <button onClick={() => changeDevice()}>Click</button>
                </div>
            </div>
        </div>
    )
}

function App() {
    return (
        <div>
            <Modal />
        </div>
    )
}

function renderReact() {
    document.getElementById("login").style.display = "none";
    ReactDOM.render(<App />, document.getElementById('root'))
    deviceLoad();
}

function deviceLoad() {
    createVideoPreView()
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
