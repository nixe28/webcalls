import { useParams } from "react-router-dom";
import { useRef, useEffect } from "react";
import socketio from "socket.io-client";
import "./CallScreen.css";

export const img_url="https://klike.net/uploads/posts/2019-07/medium/1562335929_10.jpg"

function CallScreen() {
    const params = useParams();
    const localUsername = params.username;
    const roomName = params.room;
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const saveCallRef = useRef(null);
    const socket = socketio("https://signaling-server-flask.herokuapp.com/", {
        autoConnect: false,
    });

    let pc; // For RTCPeerConnection Object

    const sendData = (data) => {
        socket.emit("data", {
            username: localUsername,
            room: roomName,
            data: data,
        });
    };

    const startConnection = () => {
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                // video: 
                // {
                //     height: 350,
                //     width: 350,
                // },
            })
            .then((stream) => {
                console.log("Local Stream found");
                localVideoRef.current.srcObject = stream;
                socket.connect();
                socket.emit("join", { username: localUsername, room: roomName });
            })
            .catch((error) => {
                console.error("Stream not found: ", error);
            });
    };

    const onIceCandidate = (event) => {
        if (event.candidate) {
            console.log("Sending ICE candidate");
            sendData({
                type: "candidate",
                candidate: event.candidate,
            });
        }
    };

    const onTrack = (event) => {
        console.log("Adding remote track");
        remoteVideoRef.current.srcObject = event.streams[0];
    };

    const saveCall = (event) => {
        console.log("Adding remote track");
        saveCallRef.current.srcObject = event.streams[0];
    };

    const createPeerConnection = () => {
        try {
            pc = new RTCPeerConnection({
                iceServers: [
                    {
                        urls: "stun:openrelay.metered.ca:80",
                    },
                    {
                        urls: "turn:openrelay.metered.ca:80",
                        username: "openrelayproject",
                        credential: "openrelayproject",
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443",
                        username: "openrelayproject",
                        credential: "openrelayproject",
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443?transport=tcp",
                        username: "openrelayproject",
                        credential: "openrelayproject",
                    },
                ],
            });
            pc.onicecandidate = onIceCandidate;
            pc.ontrack = onTrack;
            pc.savecall = saveCall;
            const localStream = localVideoRef.current.srcObject;
            for (const track of localStream.getTracks()) {
                pc.addTrack(track, localStream);
            }
            console.log("PeerConnection created");
        } catch (error) {
            console.error("PeerConnection failed: ", error);
        }
    };

    const setAndSendLocalDescription = (sessionDescription) => {
        pc.setLocalDescription(sessionDescription);
        console.log("Local description set");
        sendData(sessionDescription);
    };

    const sendOffer = () => {
        console.log("Sending offer");
        pc.createOffer().then(setAndSendLocalDescription, (error) => {
            console.error("Send offer failed: ", error);
        });
    };

    const sendAnswer = () => {
        console.log("Sending answer");
        pc.createAnswer().then(setAndSendLocalDescription, (error) => {
            console.error("Send answer failed: ", error);
        });
    };

    const signalingDataHandler = (data) => {
        if (data.type === "offer") {
            createPeerConnection();
            pc.setRemoteDescription(new RTCSessionDescription(data));
            sendAnswer();
        } else if (data.type === "answer") {
            pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === "candidate") {
            pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
            console.log("Unknown Data");
        }
    };

    socket.on("ready", () => {
        console.log("Ready to Connect!");
        createPeerConnection();
        sendOffer();
    });

    socket.on("data", (data) => {
        console.log("Data received: ", data);
        signalingDataHandler(data);
    });

    useEffect(() => {
        startConnection();
        return function cleanup() {
            pc?.close();
        };
    }, []);

    return (
        <div>
            <div>
                <label>{"User: " + localUsername}</label>
                <label>{"Room: " + roomName}</label>
                <audio autoPlay controls ref={remoteVideoRef}/>
                {/* <video autoPlay muted controls height='350' width='350' poster={img_url} playsInline ref={remoteVideoRef} /> */}
            </div>
            <div class="invisible_div">
                <audio autoPlay muted controls ref={localVideoRef}/>
                {/* <video autoPlay muted controls height='350' width='350' poster={img_url} playsInline ref={localVideoRef} /> */}
            </div>
        </div>
    );
}

export default CallScreen;