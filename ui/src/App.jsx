import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const messageEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const chatSessionRef = useRef({
    sessionId: Date.now().toString(),
    startTime: new Date().toISOString(),
    messages: []
  });

  // --- Speech Recognition ---
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        addMessage(`Speech recognition error: ${event.error}`, 'system');
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    return () => recognitionRef.current?.stop();
  }, []);

  // --- Helpers ---
  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const addMessage = (text, sender) => {
    const newMessage = { text, sender, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, newMessage]);
    chatSessionRef.current.messages.push(newMessage);
  };

  const saveChatLog = async () => {
    const chatLog = {
      sessionId: chatSessionRef.current.sessionId,
      startTime: chatSessionRef.current.startTime,
      endTime: new Date().toISOString(),
      messages: chatSessionRef.current.messages,
      messageCount: chatSessionRef.current.messages.length
    };

    try {
      await axios.post(
        `http://localhost:5000/api/save_log/${chatSessionRef.current.sessionId}`,
        chatLog,
        { headers: { "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Error saving log:", err);
      addMessage("Failed to save chat log to server.", "system");
    }
    return chatLog;
  };

  // --- Voice Functions ---
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      stopSpeaking();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };

  const clearChat = () => {
    stopSpeaking();
    setMessages([]);
    chatSessionRef.current.messages = [];
  };

  // --- Messaging ---
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input;

    stopSpeaking();

    addMessage(userMessage, 'user');
    setInput('');
    setLoading(true);

    const goodbyePattern = /\b(bye|goodbye|exit|quit|see you|farewell)\b/i;
    if (goodbyePattern.test(userMessage)) {
      setTimeout(async () => {
        const botMessage = "Goodbye!";
        addMessage(botMessage, 'bot');
        speak(botMessage);
        setLoading(false);
        await saveChatLog();
        chatSessionRef.current = {
          sessionId: Date.now().toString(),
          startTime: new Date().toISOString(),
          messages: []
        };
        setSessionId(null);
      }, 1000);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        message: userMessage,
        session_id: sessionId
      });
      const botMessage = response.data.response;
      addMessage(botMessage, 'bot');
      speak(botMessage);
      if (!sessionId && response.data.session_id) {
        setSessionId(response.data.session_id);
        chatSessionRef.current.sessionId = response.data.session_id;
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = 'Sorry, there was an error connecting to the chatbot.';
      addMessage(errorMessage, 'bot');
      speak(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- UI ---
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-100 text-gray-900 font-inter p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col border border-gray-100 transition-all duration-300 hover:shadow-2xl">

        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-lg text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">iCustoms Voice Assistant</h1>
              <p className="text-sm text-indigo-100">Ask me about HS codes, customs, or trade compliance</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-indigo-100 bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm">
              ID: <span className="font-mono">{chatSessionRef.current.sessionId.slice(-6)}</span>
            </span>
            <button
              onClick={clearChat}
              className="p-2 text-indigo-100 hover:text-white transition-all duration-200 hover:scale-110 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm"
              title="Clear Chat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 p-6 space-y-4 overflow-y-auto custom-scrollbar bg-gradient-to-b from-white to-indigo-50/30">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 p-8 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-indigo-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-indigo-900">Hello! I'm iCody, your iCustoms assistant.</p>
              <p className="text-indigo-700">You can type or use the microphone to ask questions.</p>
              <p className="text-sm text-indigo-400">
                Say <span className="font-semibold">"bye"</span> to save the chat log.
              </p>
            </div>
          )}
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div
                className={`px-5 py-3 rounded-2xl max-w-[75%] text-base shadow-sm transition-all duration-300 transform hover:scale-[1.02] border
                  ${msg.sender === 'user' 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none border-indigo-700' 
                    : msg.sender === 'bot' 
                    ? 'bg-white text-gray-800 rounded-bl-none border-gray-200 shadow-md' 
                    : 'bg-red-100 text-red-800 rounded-xl border-red-200'}
                `}
              >
                {msg.text}
                <div className={`text-xs mt-1 text-right ${msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-5 py-3 rounded-2xl bg-white text-gray-600 flex items-center space-x-2 border border-gray-200 shadow-sm">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-500">iCody is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messageEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-gray-200 flex items-center space-x-4">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={loading}
              className="w-full px-5 py-3.5 rounded-full bg-gray-100 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 pr-12"
            />
            {input && (
              <button 
                onClick={() => setInput('')}
                className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-12 h-12 flex items-center justify-center rounded-full transition-all duration-300 hover:scale-110 shadow-sm
              ${isListening 
                ? 'bg-red-500 text-white shadow-lg animate-pulse' 
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600'}
            `}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 text-white shadow-md hover:shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 24 24" 
              fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>

        {/* Voice Status */}
        <div className="text-xs text-center p-3 bg-indigo-50 text-indigo-700 border-t border-indigo-100">
          {isListening ? (
            <div className="flex items-center justify-center space-x-2 animate-pulse">
              <div className="h-2 w-2 bg-red-500 rounded-full"></div>
              <span>Listening... Speak now</span>
            </div>
          ) : (
            <span>Click the microphone to use voice input. Say 'bye' to save and end session.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;