import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PhoneIcon from '@mui/icons-material/Phone'
import React, { useEffect, useRef, useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import Peer from 'simple-peer'
import io from 'socket.io-client'
import './App.css'

const socket = io.connect('https://voice-call-backend.onrender.com')

function App() {
  const [me, setMe] = useState('')
  const [stream, setStream] = useState()
  const [receivingCall, setReceivingCall] = useState(false)
  const [caller, setCaller] = useState('')
  const [callerSignal, setCallerSignal] = useState()
  const [callAccepted, setCallAccepted] = useState(false)
  const [idToCall, setIdToCall] = useState('')
  const [callEnded, setCallEnded] = useState(false)
  const [name, setName] = useState('')
  const [onlineUsers, setOnlineUsers] = useState([])
  const myAudio = useRef()
  const userAudio = useRef()
  const connectionRef = useRef()

  console.log('userAudio', userAudio)
  console.log('myAudio', myAudio)
  console.log('connectionRef', connectionRef)
  console.log('stream', stream)
  console.log('me', me)

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

    socket.on('me', id => {
      console.log('socketId', id)
      setMe(id)
    })

    socket.on('callUser', data => {
      setReceivingCall(true)
      setCaller(data.from)
      setName(data.name)
      setCallerSignal(data.signal)
    })

    socket.on('callEnded', () => {
      setReceivingCall(false)
    })

    socket.on('onlineUsers', users => {
      setOnlineUsers(users.filter(user => user !== me))
    })
  }, [me])

  useEffect(() => {
    const online = [...onlineUsers]
    const filtered = online.filter(e => e !== me)
    setOnlineUsers(filtered)
    console.log('')
  }, [me])

  const callUser = id => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    })
    peer.on('signal', data => {
      socket.emit('callUser', {
        userToCall: id,
        signalData: data,
        from: me,
        name: name,
      })
    })
    peer.on('stream', stream => {
      if (userAudio.current) userAudio.current.srcObject = stream
    })
    socket.on('callAccepted', signal => {
      peer.signal(signal)
    })

    connectionRef.current = peer
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
  }

  const leaveCall = () => {
    setCallEnded(true)
    if (connectionRef.current) connectionRef.current.destroy()

    console.log('call ended success', true)
  }

  return (
    <>
      <h1 style={{ textAlign: 'center', color: '#fff' }}>Voice Caller App</h1>
      <div className="container">
        <div className="main-content">
          <div className="myId">
            <TextField
              id="filled-basic"
              label="Name"
              variant="filled"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ marginBottom: '20px' }}
            />
            <CopyToClipboard text={me} style={{ marginBottom: '2rem' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<AssignmentIcon fontSize="large" />}>
                Copy ID
              </Button>
            </CopyToClipboard>

            <TextField
              id="filled-basic"
              label="ID to call"
              variant="filled"
              value={idToCall}
              onChange={e => setIdToCall(e.target.value)}
            />
            <div className="call-button">
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
                    onClick={() => callUser(idToCall)}>
                    <PhoneIcon fontSize="large" />
                  </IconButton>
                  <TextField
                    id="filled-basic"
                    label="ID to call"
                    variant="filled"
                    value={idToCall}
                    onChange={e => setIdToCall(e.target.value)}
                  />
                  <div>
                    <p>Online Users: {onlineUsers.length}</p>
                    {onlineUsers.map(user => (
                      <Button
                        style={{ display: 'block' }}
                        key={user}
                        variant="outlined"
                        color="primary"
                        onClick={() => callUser(user)}>
                        {user}
                      </Button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          <div>
            {receivingCall && !callAccepted && (
              <div className="caller">
                <h1>{name} is calling...</h1>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={answerCall}>
                  Answer
                </Button>
              </div>
            )}

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
          </div>
        </div>
      </div>
    </>
  )
}

export default App
