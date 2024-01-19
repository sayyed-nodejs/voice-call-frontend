import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import PhoneIcon from '@mui/icons-material/Phone'
import React, { useEffect, useRef, useState } from 'react'
// import Peer from "simple-peer";
import io from 'socket.io-client'
import './App.css'

// const socket = io.connect('https://voice-call-backend.onrender.com')
const socket = io.connect("http://localhost:5000");

const Peer = window.SimplePeer

function App() {
  const [me, setMe] = useState('')
  const [stream, setStream] = useState()
  const [receivingCall, setReceivingCall] = useState(false)
  const [caller, setCaller] = useState('')
  const [callerSignal, setCallerSignal] = useState()
  const [callAccepted, setCallAccepted] = useState(false)
  const [callEnded, setCallEnded] = useState(false)
  const [name, setName] = useState('')
  const [namePresent, setNamePresent] = useState('')

  console.log(name, 'name')
  console.log(me, 'me')

  console.log(namePresent, 'namePresent')
  console.log(caller, 'caller')

  const myAudio = useRef()
  const userAudio = useRef()
  const connectionRef = useRef()
  const [ongoingCall, setOngoingCall] = useState(null)
  const [onlineUsers, setonlineUsers] = useState(null)
  const [onlineUsersExceptMe, setonlineUsersExceptMe] = useState([])
  const [isCalling, setIsCalling] = useState(false)
  const [callerName, setCallerName] = useState('')
  console.log('isCalling', isCalling)
  console.log('onlineUsersExceptMe', onlineUsersExceptMe.length)

  console.log('myAudio', myAudio)
  console.log('stream', stream)
  console.log('onlineUsers', onlineUsers)
  console.log('receivingCall', receivingCall)
  console.log('callAccepted', callAccepted)

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        setStream(stream)
        if (myAudio.current) myAudio.current.srcObject = stream
      })
      .catch(err => {
        console.warn('err', err)
      })

    socket.on('me', ({ id, name }) => {
      console.log('socketId', id)
      setMe(id)
      setName(name)
    })

    console.log('socket', socket)

    socket.on('callUser', data => {
      setReceivingCall(true)
      setCaller(data.from)
      setCallerName(data.name)
      setCallerSignal(data.signal)
      setOngoingCall(true)
    })

    socket.on('onlineUsers', data => {
      console.log(data, 'datadata')
      setonlineUsers(data)
    })

    socket.on('callEnded', data => {
      console.log(data,"dataincallended")
      console.log('Client: Call ended')
      if (data?.id === me){
        leaveCall()
      }
      setOngoingCall(false)
      setReceivingCall(false)
    })

    socket.on('callDeclined', () => {
      setReceivingCall(false)
      setIsCalling(false)
    })

    // socket.close()
    // eslint-disable-next-line
  }, [])

  const callUser = () => {
    setIsCalling(true)

    const onlineUsersExceptMe = onlineUsers.filter(user => user.id !== me)

    if (onlineUsersExceptMe.length > 0) {
      // Select a random user from the list
      const randomUser =
        onlineUsersExceptMe[
          Math.floor(Math.random() * onlineUsersExceptMe.length)
        ]

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream,
      })

      peer.on('signal', data => {
        socket.emit('callUser', {
          userToCall: randomUser.id,
          signalData: data,
          from: me,
          name: name,
        })
      })

      peer.on('stream', stream => {
        if (userAudio.current) userAudio.current.srcObject = stream
      })

      console.log(onlineUsersExceptMe, 'onlineUsersExceptMe')

      socket.on('callAccepted', signal => {
        setCallAccepted(true)
        setOngoingCall(true)
        setIsCalling(false)
        peer.signal(signal)
      })

      // You might want to add a state variable or some indication that a call is in progress
      // setCalling(true);
    }
  }

  const answerCall = () => {
    setCallAccepted(true)
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    })
    peer.on('signal', data => {
      socket.emit('answerCall', { signal: data, to: caller })
    })
    peer.on('stream', stream => {
      if (userAudio.current) userAudio.current.srcObject = stream
    })

    peer.signal(callerSignal)
    if (connectionRef.current) connectionRef.current = peer

    setOngoingCall(true)
  }

  const declineCall = () => {
    setReceivingCall(false)
    setCaller('')
    setCallerSignal(null)
    setCallAccepted(false)
    setOngoingCall(false)
    // Notify the server that the call has been declined
    socket.emit('callDeclined', { to: caller })
  }

  const leaveCall = () => {
    // socket.emit('callEnded', { to: caller })
    setCallEnded(true)
    connectionRef.current?.destroy()
    setTimeout(() => {
      window.location.reload()
    }, 1000)
    console.log('call ended success', true)
    setOngoingCall(false)
    setCallAccepted(false)
  }

  const setUserName = () => {
    socket.emit('setUserName', name || localStorage.getItem('userName'))
  }

  useEffect(() => {
    if (localStorage.getItem('userName')) {
      setName(localStorage.getItem('userName'))
      setNamePresent(localStorage.getItem('userName'))
      setUserName()
    }
    // eslint-disable-next-line
  }, [])

  useEffect(() => {
    if (onlineUsers) {
      const onlineUsersExceptMe = onlineUsers.filter(user => user.id !== me)
      setonlineUsersExceptMe(onlineUsersExceptMe)
    }
  }, [onlineUsers, me])

  return (
    <>
      <h1 style={{ textAlign: 'center', color: '#fff' }}>
        Voice Calling Demo{' '}
      </h1>
      {namePresent === '' || namePresent === null ? (
        <>
          <div className="container">
            <div className="myId">
              <TextField
                id="filled-basic"
                label="Name"
                variant="filled"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ marginBottom: '20px' }}
              />

              <div className="call-button">
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => {
                    setNamePresent(name)
                    setUserName()
                    localStorage.setItem('userName', name)
                  }}>
                  Submit
                </Button>
              </div>
            </div>
            <div>
              {receivingCall && !callAccepted ? (
                <div className="caller">
                  <h1>{callerName} is calling...</h1>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={answerCall}>
                    Answers
                  </Button>

                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={declineCall}>
                    Decline
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="container">
            <div className="video-container">
              <div className="video">
                {stream && (
                  <>
                    <audio
                      playsInline
                      muted
                      ref={myAudio}
                      autoPlay
                      style={{ width: '300px' }}
                    />
                    {ongoingCall && <h1>Ongoing call</h1>}
                  </>
                )}
              </div>
              <div className="video">
                {callAccepted && !callEnded ? (
                  <>
                    <audio
                      playsInline
                      ref={userAudio}
                      autoPlay
                      style={{ width: '300px' }}
                    />
                  </>
                ) : null}
              </div>
            </div>
            <div className="myId">
              <TextField
                id="filled-basic"
                label="Name"
                variant="filled"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ marginBottom: '20px' }}
              />
              {/* <CopyToClipboard text={me} style={{ marginBottom: "2rem" }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AssignmentIcon fontSize="large" />}
                >
                  Copy ID
                </Button>
              </CopyToClipboard> */}

              {/* <TextField
                id="filled-basic"
                label="ID to call"
                variant="filled"
                value={idToCall}
                onChange={(e) => setIdToCall(e.target.value)}
              /> */}
              <span className="text-center">
                Online members: {onlineUsersExceptMe.length}
              </span>
              <div className="call-button">
                {/* Display online members count */}

                {callAccepted && !callEnded ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={leaveCall}>
                    End Call
                  </Button>
                ) : (
                  <>
                    <IconButton
                      color="primary"
                      aria-label="call"
                      onClick={() => callUser()}>
                      {isCalling ? (
                        // Display a different icon or text when calling
                        // For example, you can use a CircularProgress or other icon
                        <>Calling...</>
                      ) : (
                        <>
                          <PhoneIcon fontSize="large" />
                          <p>Call</p>
                        </>
                      )}
                    </IconButton>
                  </>
                )}
              </div>
            </div>
            <div>
              {receivingCall && !callAccepted ? (
                <div className="caller">
                  <h1>
                    {/* {callerName}  */}
                    is calling...
                  </h1>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={answerCall}>
                    Answers
                  </Button>

                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={declineCall}>
                    Decline
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default App
