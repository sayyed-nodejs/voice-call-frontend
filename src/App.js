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
  const myAudio = useRef()
  const userAudio = useRef()
  const connectionRef = useRef()
  const [ongoingCall, setOngoingCall] = useState(null)

  console.log('userAudio', userAudio)
  console.log('myAudio', myAudio)
  console.log('stream', stream)

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

    console.log('socket', socket)

    socket.on('callUser', data => {
      setReceivingCall(true)
      setCaller(data.from)
      setName(data.name)
      setCallerSignal(data.signal)
      setOngoingCall(true)
    })

    socket.on('callEnded', () => {
      setOngoingCall(false)
      setReceivingCall(false)
    })
  }, [])

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
      setCallAccepted(true)
      setOngoingCall(true)
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

    setOngoingCall(true)
  }

  const leaveCall = () => {
    setCallEnded(true)
    if (connectionRef.current) connectionRef.current.destroy()

    console.log('call ended success', true)
    setOngoingCall(false)
  }

  return (
    <>
      <h1 style={{ textAlign: 'center', color: '#fff' }}>Caller</h1>
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
              <Button variant="contained" color="secondary" onClick={leaveCall}>
                End Call
              </Button>
            ) : (
              <IconButton
                color="primary"
                aria-label="call"
                onClick={() => callUser(idToCall)}>
                <PhoneIcon fontSize="large" />
              </IconButton>
            )}
            {idToCall}
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1>{name} is calling...</h1>
              <Button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  )
}

export default App
