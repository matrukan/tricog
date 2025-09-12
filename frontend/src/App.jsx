import { useState, useEffect, useRef } from 'react'
import io from 'socket.io-client'
import './App.css'

function App() {
  const [socket, setSocket] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:3001')
    setSocket(newSocket)

    newSocket.on('connect', () => {
      setIsConnected(true)
      console.log('Connected to server')
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
      console.log('Disconnected from server')
    })

    newSocket.on('message', (message) => {
      setMessages(prev => [...prev, message])
      setIsTyping(false)
      // Auto-scroll to bottom
      setTimeout(() => scrollToBottom(), 100)
    })

    return () => {
      newSocket.close()
    }
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const startChat = () => {
    if (socket && isConnected) {
      socket.emit('start-chat')
      setMessages([])
    }
  }

  const sendMessage = (e) => {
    e.preventDefault()
    if (inputMessage.trim() && socket && isConnected) {
      setIsTyping(true)
      socket.emit('message', { message: inputMessage.trim() })
      setInputMessage('')
      inputRef.current?.focus()
    }
  }

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="app">
      <div className="header">
        <div className="header-content">
          <div className="logo">
            <h1>🏥 Tricog Health</h1>
            <p>Digital Assistant</p>
          </div>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
        </div>
      </div>

      <div className="chat-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-content">
              <div className="welcome-icon">🩺</div>
              <h2>Welcome to Tricog Health Digital Assistant</h2>
              <p>
                I'm here to help collect information about your symptoms before your 
                consultation with our cardiologist. This will help our doctor prepare 
                better for your appointment.
              </p>
              <button 
                className="start-chat-btn"
                onClick={startChat}
                disabled={!isConnected}
              >
                {isConnected ? 'Start Consultation' : 'Connecting...'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.sender}`}>
                  <div className="message-content">
                    <div className="message-bubble">
                      <div className="message-text">
                        {message.message.split('\n').map((line, i) => (
                          <div key={i}>{line}</div>
                        ))}
                      </div>
                      <div className="message-time">
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="message bot">
                  <div className="message-content">
                    <div className="message-bubble typing">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="message-input-form" onSubmit={sendMessage}>
              <div className="input-group">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled={!isConnected}
                  className="message-input"
                  autoFocus
                />
                <button 
                  type="submit" 
                  disabled={!inputMessage.trim() || !isConnected}
                  className="send-button"
                >
                  📤
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default App
