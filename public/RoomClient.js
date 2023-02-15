const mediaType = {
    audio: 'audioType',
    video: 'videoType',
    screen: 'screenType'
}
const _EVENTS = {
    exitRoom: 'exitRoom',
    openRoom: 'openRoom',
    startVideo: 'startVideo',
    stopVideo: 'stopVideo',
    startAudio: 'startAudio',
    stopAudio: 'stopAudio',
    startScreen: 'startScreen',
    stopScreen: 'stopScreen'
}

let roomList = new Map()
let myName;
let userList = [];

class RoomClient {
    constructor(localMediaEl, container, remoteAudioEl, mediasoupClient, socket, room_id, name, successCallback) {
        this.name = name
        this.localMediaEl = localMediaEl
        this.container = container
        this.remoteAudioEl = remoteAudioEl
        this.mediasoupClient = mediasoupClient
        this.successCallback = successCallback

        this.socket = socket
        this.producerTransport = null
        this.consumerTransport = null
        this.device = null
        this.room_id = room_id

        this.isVideoOnFullScreen = false
        this.isDevicesVisible = false

        this.consumers = new Map()
        this.producers = new Map()
        myName = name

        console.log('Mediasoup client', mediasoupClient)

        /**
         * map that contains a mediatype as key and producer_id as value
         */
        this.producerLabel = new Map()

        this._isOpen = false
        this.eventListeners = new Map()

        Object.keys(_EVENTS).forEach(
            function(evt) {
                this.eventListeners.set(evt, [])
            }.bind(this)
        )

        this.createRoom(room_id).then(
            async function() {
                await this.join(name, room_id)
                this.initSockets()
                this._isOpen = true
                //successCallback()
            }.bind(this)
        )
    }

    ////////// INIT /////////

    async createRoom(room_id) {
        await this.socket
            .request('createRoom', {
                room_id
            })
            .catch((err) => {
                console.log('Create room error:', err)
            })
    }

    async join(name, room_id) {
        socket
            .request('join', {
                name,
                room_id
            })
            .then(
                async function(e) {
                    console.log('Joined to room', e)
                    const data = await this.socket.request('getRouterRtpCapabilities')
                    let device = await this.loadDevice(data)
                    this.device = device
                    await this.initTransports(device)
                    this.socket.emit('getProducers')
                    this.successCallback()
                }.bind(this)
            )
            .catch((err) => {
                console.log('Join error:', err)
            })
    }

    async loadDevice(routerRtpCapabilities) {
        let device
        try {
            device = new this.mediasoupClient.Device()
        } catch (error) {
            if (error.name === 'UnsupportedError') {
                console.error('Browser not supported')
                alert('Browser not supported')
            }
            console.error(error)
        }
        await device.load({
            routerRtpCapabilities
        })
        return device
    }

    async initTransports(device) {
        // init producerTransport
        {
            const data = await this.socket.request('createWebRtcTransport', {
                forceTcp: false,
                rtpCapabilities: device.rtpCapabilities
            })

            if (data.error) {
                console.error(data.error)
                return
            }

            this.producerTransport = device.createSendTransport(data)

            this.producerTransport.on(
                'connect',
                async function({ dtlsParameters }, callback, errback) {
                    this.socket
                        .request('connectTransport', {
                            dtlsParameters,
                            transport_id: data.id
                        })
                        .then(callback)
                        .catch(errback)
                }.bind(this)
            )

            this.producerTransport.on(
                'produce',
                async function({ kind, rtpParameters }, callback, errback) {
                    try {
                        const { producer_id } = await this.socket.request('produce', {
                            producerTransportId: this.producerTransport.id,
                            kind,
                            rtpParameters
                        })
                        callback({
                            id: producer_id
                        })
                    } catch (err) {
                        errback(err)
                    }
                }.bind(this)
            )

            this.producerTransport.on(
                'connectionstatechange',
                function(state) {
                    switch (state) {
                        case 'connecting':
                            break

                        case 'connected':
                            //localVideo.srcObject = stream
                            break

                        case 'failed':
                            this.producerTransport.close()
                            break

                        default:
                            break
                    }
                }.bind(this)
            )
        }

        // init consumerTransport
        {
            const data = await this.socket.request('createWebRtcTransport', {
                forceTcp: false
            })

            if (data.error) {
                console.error(data.error)
                return
            }

            // only one needed
            this.consumerTransport = device.createRecvTransport(data)
            this.consumerTransport.on(
                'connect',
                function({ dtlsParameters }, callback, errback) {
                    this.socket
                        .request('connectTransport', {
                            transport_id: this.consumerTransport.id,
                            dtlsParameters
                        })
                        .then(callback)
                        .catch(errback)
                }.bind(this)
            )

            this.consumerTransport.on(
                'connectionstatechange',
                async function(state) {
                    switch (state) {
                        case 'connecting':
                            break

                        case 'connected':
                            //remoteVideo.srcObject = await stream;
                            //await socket.request('resume');
                            break

                        case 'failed':
                            this.consumerTransport.close()
                            break

                        default:
                            break
                    }
                }.bind(this)
            )
        }
    }

    initSockets() {
        this.socket.on(
            'consumerClosed',
            function({ consumer_id }) {
                console.log('Closing consumer:', consumer_id)
                // if (document.getElementsByClassName('remoteVideo').length == 0) {
                //     // TODO: 要確認
                //     //this.remoteVideoEl.style.display = "none"
                //     document.getElementsByClassName('remoteVideo').style.display = "none"
                // }
                this.removeConsumer(consumer_id)
            }.bind(this)
        )

        /**
         * data: [ {
         *  producer_id:
         *  producer_socket_id:
         * }]
         */
        this.socket.on(
            'newProducers',
            async function(data) {
                console.log('///////////New producers', data)
                for (let { producer_id, producer_socket_id }
                    of data) {
                    await this.consume(producer_id, producer_socket_id)
                }
            }.bind(this)
        )

        this.socket.on(
            'alreadyProducersForNewProducers',
            async function(data) {
                console.log('///////////alreadyProducersForNewProducers', data)
                for (let { producer_id, producer_socket_id }
                    of data) {
                    await this.consume(producer_id, producer_socket_id)
                }
            }.bind(this)
        )

        this.socket.on(
            'disconnect',
            function() {
                this.exit(true)
            }.bind(this)
        )

        this.socket.on(
            'audioMute',
            function(data) {
                console.log('data is', data.length);
                
                if (data.isShowingAudio) {
                    // TODO: divのidか何かをsocketIDにして、対象のdivを取得してmuteの画像を取得
                    console.log(data.socketID, "がmuteしたよ！！！")
                } else {
                    // TODO: divのidか何かをsocketIDにして、対象のdivを取得してmute画像を取り除く
                    console.log(data.socketID, "がunMuteしたよ！！！")
                }
            }.bind(this)
        )
    }

    //////// MAIN FUNCTIONS /////////////

    async produce(type, deviceId) {
        let mediaConstraints = {}
        let audio = false
        let video = false
        let screen = false
        if (userList.indexOf(myName) == -1){
            userList.push(myName);
        }
        
        switch (type) {
            case mediaType.audio:
                mediaConstraints = {
                    audio: { deviceId: deviceId },
                    video: false
                }
                audio = true
                break
            case mediaType.video:
                mediaConstraints = {
                    audio: false,
                    video: { deviceId: deviceId }
                }
                video = true
                break
            case mediaType.screen:
                mediaConstraints = false
                screen = true
                break
            default:
                return
        }
        if (!this.device.canProduce('video') && !audio) {
        //if (!video && !audio) {
            console.error('Cannot produce video')
            return
        }
        if (this.producerLabel.has(type)) {
            console.log('Producer already exists for this type ' + type)
            return
        }
        console.log('Mediacontraints:', mediaConstraints)
        let stream
        try {
            stream = screen ?
                await navigator.mediaDevices.getDisplayMedia() :
                await navigator.mediaDevices.getUserMedia(mediaConstraints)
            console.log(navigator.mediaDevices.getSupportedConstraints())

            const track = audio ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0]
            const params = {
                track
            }
            if (!audio && !screen) {
                params.encodings = [{
                    rid: 'r0',
                    maxBitrate: 100000,
                    //scaleResolutionDownBy: 10.0,
                    scalabilityMode: 'S1T3'
                },
                {
                    rid: 'r1',
                    maxBitrate: 300000,
                    scalabilityMode: 'S1T3'
                },
                {
                    rid: 'r2',
                    maxBitrate: 900000,
                    scalabilityMode: 'S1T3'
                }
                ]
                params.codecOptions = {
                    videoGoogleStartBitrate: 1000
                }
            }
            producer = await this.producerTransport.produce(params)

            console.log('Producer', producer)

            this.producers.set(producer.id, producer)

            let elem
            let nameTag
            if (!audio) {
                elem = document.createElement('video')
                nameTag = document.createElement('p')

                elem.srcObject = stream
                elem.id = producer.id
                elem.playsinline = false
                elem.autoplay = true
                elem.className = 'vid'
                elem.setAttribute("name", myName)
                nameTag.textContent = myName
                if (screen) {
                    elem.controls = true
                }

                this.localMediaEl.appendChild(elem)
                this.localMediaEl.appendChild(nameTag)
                //this.handleFS(elem.id)
            }

            producer.on('trackended', () => {
                this.closeProducer(type)
            })

            producer.on('transportclose', () => {
                console.log('Producer transport close')
                if (!audio) {
                    elem.srcObject.getTracks().forEach(function(track) {
                        track.stop()
                    })
                    elem.parentNode.removeChild(elem)
                }
                this.producers.delete(producer.id)
            })

            producer.on('close', () => {
                console.log('Closing producer')
                if (!audio) {
                    elem.srcObject.getTracks().forEach(function(track) {
                        track.stop()
                    })
                    elem.parentNode.removeChild(elem)
                }
                this.producers.delete(producer.id)
            })

            this.producerLabel.set(type, producer.id)

            switch (type) {
                case mediaType.audio:
                    this.event(_EVENTS.startAudio)
                    break
                case mediaType.video:
                    this.event(_EVENTS.startVideo)
                    break
                case mediaType.screen:
                    this.event(_EVENTS.startScreen)
                    break
                default:
                    return
            }
        } catch (err) {
            console.log('Produce error:', err)
        }
    }

    async consume(producer_id, socket_id) {
        //let info = await this.roomInfo()

        this.getConsumeStream(producer_id, socket_id).then(
            function({ consumer, stream, kind, participantUserName }) {
                this.consumers.set(consumer.id, consumer)

                let div
                let nameTag
                let elem

                if (kind === 'video') {
                    div = document.createElement('div')
                    nameTag = document.createElement('p')
                    elem = document.createElement('video')

                    elem.setAttribute("name", participantUserName);
                    elem.srcObject = stream
                    elem.id = consumer.id
                    elem.playsinline = false
                    elem.autoplay = true
                    elem.className = 'vid'
                    nameTag.textContent = participantUserName
                    //elem.controls = true

                    div.appendChild(elem)
                    div.appendChild(nameTag)
                    this.container.appendChild(div)

                    this.resizeVideo(this.container, userList)
                    //this.handleFS(elem.id)
                } else {
                    elem = document.createElement('audio')

                    elem.srcObject = stream
                    elem.id = consumer.id
                    elem.playsinline = false
                    elem.autoplay = true
                    elem.setAttribute("name", participantUserName);

                    this.remoteAudioEl.appendChild(elem)
                }

                consumer.on(
                    'trackended',
                    function() {
                        this.removeConsumer(consumer.id)
                    }.bind(this)
                )

                consumer.on(
                    'transportclose',
                    function() {
                        this.removeConsumer(consumer.id)
                    }.bind(this)
                )
            }.bind(this)
        )
    }

    async getConsumeStream(producerId, socket_id) {
        const { rtpCapabilities } = this.device
        const data = await this.socket.request('consume', {
            rtpCapabilities,
            consumerTransportId: this.consumerTransport.id, // might be
            producerId
        })
        const { id, kind, rtpParameters } = data

        // [["WZPM6gwZKMQXeYtZAAAr",
        // {"id":"WZPM6gwZKMQXeYtZAAAr","name":"user_329","transports":{},"consumers":{},"producers":{}}],
        // ["lXtNZWYy-ew5yVhNAAAt",
        // {"id":"lXtNZWYy-ew5yVhNAAAt","name":"user_712","transports":{},"consumers":{},"producers":{}}]] 

        const obj = JSON.parse(data.peerList.peers);
        console.log('obj', obj)
        let participantsList = obj.filter(function(e) {
            return e[1].name != myName;
        }).filter(function(element) {
            return element[1].id == socket_id
        }).filter(function(element) {
            return element[1].id == socket_id
        }).map(function(e) {
            return e[1].name
        })
        let participantUserName = participantsList[0]
        if (userList.indexOf(participantUserName) == -1){
            userList.push(participantUserName);
        }
        console.log('///// participantsList name is ', userList);
        
        let codecOptions = {}
        const consumer = await this.consumerTransport.consume({
            id,
            producerId,
            kind,
            rtpParameters,
            codecOptions
        })

        const stream = new MediaStream()
        stream.addTrack(consumer.track)

        return {
            consumer,
            stream,
            kind,
            participantUserName
        }
    }

    async resizeVideo(container, roomInfo) {
        let elements = container.children;

        for (var i = 0, l = elements.length; i < l; i++) {
            elements[i].className = "userLine" + elements.length;
        }
        // elements.map(function(e) {
        //     return console.log('きとるがな')
        // })
    }

    closeProducer(type) {
        if (!this.producerLabel.has(type)) {
            console.log('There is no producer for this type ' + type)
            return
        }

        let producer_id = this.producerLabel.get(type)
        console.log('Close producer', producer_id)

        this.socket.emit('producerClosed', {
            producer_id
        })

        this.producers.get(producer_id).close()
        this.producers.delete(producer_id)
        this.producerLabel.delete(type)

        if (type !== mediaType.audio) {
            let elem = document.getElementById(producer_id)
            elem.srcObject.getTracks().forEach(function(track) {
                track.stop()
            })
            elem.parentNode.removeChild(elem)
        }

        switch (type) {
            case mediaType.audio:
                this.event(_EVENTS.stopAudio)
                break
            case mediaType.video:
                this.event(_EVENTS.stopVideo)
                break
            case mediaType.screen:
                this.event(_EVENTS.stopScreen)
                break
            default:
                return
        }
    }

    pauseProducer(type) {
        if (!this.producerLabel.has(type)) {
            console.log('There is no producer for this type ' + type)
            return
        }

        let producer_id = this.producerLabel.get(type)
        this.producers.get(producer_id).pause()
    }

    resumeProducer(type) {
        if (!this.producerLabel.has(type)) {
            console.log('There is no producer for this type ' + type)
            return
        }

        let producer_id = this.producerLabel.get(type)
        this.producers.get(producer_id).resume()
    }

    removeConsumer(consumer_id) {
        let elem = document.getElementById(consumer_id)
        elem.srcObject.getTracks().forEach(function(track) {
            track.stop()
        })
        elem.parentNode.remove();

        this.consumers.delete(consumer_id)
    }

    exit(offline = false) {
        let clean = function() {
            this._isOpen = false
            this.consumerTransport.close()
            this.producerTransport.close()
            this.socket.off('disconnect')
            this.socket.off('newProducers')
            this.socket.off('consumerClosed')
        }.bind(this)

        if (!offline) {
            this.socket
                .request('exitRoom')
                .then((e) => console.log(e))
                .catch((e) => console.warn(e))
                .finally(
                    function() {
                        clean()
                    }.bind(this)
                )
        } else {
            clean()
        }

        this.event(_EVENTS.exitRoom)
    }

    ///////  HELPERS //////////

    async roomInfo() {
        let info = await this.socket.request('getMyRoomInfo')
        return info
    }

    static get mediaType() {
        return mediaType
    }

    event(evt) {
        if (this.eventListeners.has(evt)) {
            this.eventListeners.get(evt).forEach((callback) => callback())
        }
    }

    on(evt, callback) {
        this.eventListeners.get(evt).push(callback)
    }

    //////// GETTERS ////////

    isOpen() {
        return this._isOpen
    }

    static get EVENTS() {
        return _EVENTS
    }

    //////// UTILITY ////////

    // copyURL() {
    //   let tmpInput = document.createElement('input')
    //   document.body.appendChild(tmpInput)
    //   tmpInput.value = window.location.href
    //   tmpInput.select()
    //   document.execCommand('copy')
    //   document.body.removeChild(tmpInput)
    //   console.log('URL copied to clipboard 👍')
    // }

    handleFS(id) {
        let videoPlayer = document.getElementById(id)
        videoPlayer.addEventListener('fullscreenchange', (e) => {
            if (videoPlayer.controls) return
            let fullscreenElement = document.fullscreenElement
            if (!fullscreenElement) {
                videoPlayer.style.pointerEvents = 'auto'
                this.isVideoOnFullScreen = false
            }
        })
        videoPlayer.addEventListener('webkitfullscreenchange', (e) => {
            if (videoPlayer.controls) return
            let webkitIsFullScreen = document.webkitIsFullScreen
            if (!webkitIsFullScreen) {
                videoPlayer.style.pointerEvents = 'auto'
                this.isVideoOnFullScreen = false
            }
        })
        videoPlayer.addEventListener('click', (e) => {
            if (videoPlayer.controls) return
            if (!this.isVideoOnFullScreen) {
                if (videoPlayer.requestFullscreen) {
                    videoPlayer.requestFullscreen()
                } else if (videoPlayer.webkitRequestFullscreen) {
                    videoPlayer.webkitRequestFullscreen()
                } else if (videoPlayer.msRequestFullscreen) {
                    videoPlayer.msRequestFullscreen()
                }
                this.isVideoOnFullScreen = true
                videoPlayer.style.pointerEvents = 'none'
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen()
                } else if (document.webkitCancelFullScreen) {
                    document.webkitCancelFullScreen()
                } else if (document.msExitFullscreen) {
                    document.msExitFullscreen()
                }
                this.isVideoOnFullScreen = false
                videoPlayer.style.pointerEvents = 'auto'
            }
        })
    }
}