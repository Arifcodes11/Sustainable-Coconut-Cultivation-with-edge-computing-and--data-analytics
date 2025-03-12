import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./LLM.css";

export default function ChatApp() {
  const [messages, setMessages] = useState([]); // Store chat messages
  const [input, setInput] = useState(""); // User input
  const [image, setImage] = useState(null); // Uploaded image
  const [loading, setLoading] = useState(false); // Loading state
  const [language, setLanguage] = useState("EN"); // Language state (EN or KN)
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Load chat history from local storage on mount
    const savedMessages = localStorage.getItem("chatMessages");
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, []);

  useEffect(() => {
    // Save chat history to local storage on change
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  // Initialize Gemini API
  const genAI = new GoogleGenerativeAI("AIzaSyBgz4J0HYRz01irawofvnlSCwAPWLTG69k"); // Replace with your Gemini API Key
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const formatTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendMessage = async () => {
    if (!input && !image) return; // Ensure at least text or image is sent

    const newMessage = {
      text: input,
      image,
      isUser: true,
      timestamp: formatTime(),
    };
    setMessages((prev) => [...prev, newMessage]);

    // Clear input fields
    setInput("");
    setImage(null);

    // Prepare the prompt
    let prompt = input || " Analyze this image of coconut tree. Tell the disease and give some suggestions to cure it based on the Indian agriculture market.";
    if (language === "KN") {
      prompt += "give response in full Kannada";
    }
    prompt += "in summary";

    // Include context from previous messages
    const context = messages
      .filter((message) => !message.image) // Exclude image-related messages from context
      .map((message) => message.text)
      .join("\n");

    const contentParts = [context, prompt];

    if (image) {
      // Convert file to Base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(image);
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = (error) => reject(error);
      });
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: image.type,
        },
      };
      contentParts.push(imagePart);
    }

    // Send request to Gemini API
    setLoading(true);
    try {
      const result = await model.generateContent(contentParts);
      const aiMessage = { text: result.response.text(), isUser: false, timestamp: formatTime() };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Error communicating with Gemini API:", error);
    }
    setLoading(false);

    // Scroll to the latest message
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="chat-container">
      <header className="chat-header">
        <h1>AI Crop Disease Consultant</h1>
        <p>Upload an image and ask questions about plant diseases</p>
        <div className="language-switch">
          <label className="switch">
            <input
              type="checkbox"
              checked={language === "KN"}
              onChange={() => setLanguage(language === "EN" ? "KN" : "EN")}
            />
            <span className="slider"></span>
          </label>
          <span>{language === "EN" ? "English" : "Kannada"}</span>
        </div>
      </header>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`message ${message.isUser ? "user" : "ai"} fade-in"`}
          >
            {message.image && (
              <div className="image-container">
                <img
                  src={URL.createObjectURL(message.image)}
                  alt="Uploaded"
                  className="uploaded-image"
                />
              </div>
            )}
            <div className="message-content">
              <p>{message.text}</p>
              <span className="timestamp">{message.timestamp}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="loading-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={chatEndRef}></div>
      </div>

      <div className="input-container">
        <div className="file-upload">
          <label htmlFor="file-input" className="file-label">
            {image ? "✓ Image Ready" : "📷 Add Image"}
          </label>
          <input
            id="file-input"
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="hidden"
          />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about crop diseases..."
          className="text-input"
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
        />
        <button
          onClick={handleSendMessage}
          className="send-button"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
