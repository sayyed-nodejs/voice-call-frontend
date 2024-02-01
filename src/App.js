import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import PhoneIcon from '@mui/icons-material/Phone'
import React, { useEffect, useRef, useState } from 'react'
import Peer from 'simple-peer'
import io from 'socket.io-client'
import './App.css'

const socket = io.connect('https://voice-call-backend.onrender.com')
// const socket = io.connect('http://localhost:4500')

// const Peer = window.SimplePeer

function App() {
  const [me, setMe] = useState('')

  const [calling, setCalling] = useState(false)

  const [localStream, setLocalStream] = useState()
  const [ongoingCall, setOngoingCall] = useState(false)
  const remoteAudioRef = useRef()

  console.log('remoteAudioRef', remoteAudioRef)

  const [isCalling, setIsCalling] = useState(false)

  console.log('me', me)

  const handleCallClick = () => {
    socket.emit('call')

    setIsCalling(true)
  }

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(stream => {
        setLocalStream(stream)
      })
      .catch(error => {
        console.error('Error accessing user media:', error)
      })

    socket.on('me', ({ id }) => {
      setMe(id)
    })
  }, [])

  useEffect(() => {
    // Listen for the "startCall" event from the server
    if (localStream) {
      socket.on('startCall', otherUserId => {
        console.log(`Starting call with:${otherUserId} by me ${me}`)
        // Initialize simple-peer with socket.io
        const peer = new Peer({
          initiator: true,
          trickle: false,
          stream: localStream,
        })

        console.log('peer.destroyed', peer.destroyed)

        peer.on('error', err => console.log('peer error', err))

        peer.on('signal', data => {
          console.log('SIGNAL inside peer', JSON.stringify(data))
          // Send signal to the other user
          socket.emit('signal', { signal: data, to: otherUserId })
        })

        peer._debug = console.log

        // Handle incoming signal from the other user
        socket.on('signal', data => {
          console.log('SIGNAL inside socket', JSON.stringify(data))

          if (data.from === otherUserId && data.signal) {
            peer.signal(data.signal)
          }
        })

        // Handle connection established
        peer.on('connect', () => {
          console.log('Connection established')
          // Now you can start sending and receiving data
        })

        peer.on('close', () => {
          console.log('peer closed')
        })

        // Listen for remote audio stream
        peer.on('stream', stream => {
          console.log('peer.on stream', stream)
          if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream
        })
      })
    }
    // eslint-disable-next-line
  }, [localStream])

  return (
    <>
      <h1 style={{ textAlign: 'center', color: '#fff' }}>
        Voice Calling Demo{' '}
      </h1>

      <>
        <div className="container">
          <div className="main-box">
            <div className="video-container">
              <audio
                playsInline
                ref={remoteAudioRef}
                autoPlay
                style={{ width: '300px' }}
              />
            </div>
            <div className="myId">
              <span className="text-center">
                {/* Online members: {onlineUsersExceptMe.length} */}
              </span>
              <div className="call-button">
                {/* Display online members count */}

                {ongoingCall ? (
                  <Button
                    variant="contained"
                    color="secondary"
                    // onClick={leaveCall}
                  >
                    Skip Call
                  </Button>
                ) : (
                  <>
                    <IconButton
                      color="primary"
                      aria-label="call"
                      onClick={handleCallClick}>
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
          </div>
        </div>
      </>
    </>
  )
}

export default App
