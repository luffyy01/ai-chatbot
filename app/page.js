"use client";

import { useState, useRef, useEffect } from "react";

const SUGGESTIONS = [
  "Explain quantum computing in simple terms",
  "Write a short poem about the ocean",
  "What is the meaning of life?",
  "Generate an image of a sunset over mountains",
];

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState("chat"); // "chat" or "image"
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [input]);

  async function handleSend(overrideInput) {
    const text = (overrideInput || input).trim();
    if (!text || isLoading) return;

    const userMessage = {
      role: "user",
      content: text,
      type: mode,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (mode === "chat") {
        // Build messages array for API
        const apiMessages = [
          ...messages
            .filter((m) => m.type === "chat" || m.role === "assistant")
            .map((m) => ({ role: m.role, content: m.content })),
          { role: "user", content: text },
        ];

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: apiMessages,
            model: "meta-llama/llama-3.3-70b-instruct:free",
          }),
        });

        const data = await res.json();

        if (data.error) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `⚠️ Error: ${data.error}`,
              isError: true,
              timestamp: Date.now(),
            },
          ]);
        } else {
          const reply =
            data.choices?.[0]?.message?.content ||
            "Sorry, I could not generate a response.";
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: reply,
              timestamp: Date.now(),
            },
          ]);
        }
      } else {
        // Image generation mode
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: text }),
        });

        const data = await res.json();

        if (data.error) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `⚠️ Image generation error: ${data.error}`,
              isError: true,
              timestamp: Date.now(),
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Here's your generated image:",
              image: data.image,
              prompt: text,
              timestamp: Date.now(),
            },
          ]);
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ Network error: ${err.message}`,
          isError: true,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSuggestionClick(text) {
    if (text.toLowerCase().startsWith("generate an image")) {
      setMode("image");
      handleSend(text.replace("Generate an image of ", ""));
    } else {
      setMode("chat");
      handleSend(text);
    }
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo-icon">🤖</div>
          <h1>
            AI <span>Chatbot</span>
          </h1>
        </div>
        <div className="header-status">Online</div>
      </header>

      {/* Mode Toggle */}
      <div className="mode-toggle">
        <button
          id="btn-chat-mode"
          className={`mode-btn ${mode === "chat" ? "active" : ""}`}
          onClick={() => setMode("chat")}
        >
          💬 Chat
        </button>
        <button
          id="btn-image-mode"
          className={`mode-btn ${mode === "image" ? "active" : ""}`}
          onClick={() => setMode("image")}
        >
          🎨 Generate Image
        </button>
      </div>

      {/* Messages Area */}
      <div className="chat-messages" id="chat-messages">
        {messages.length === 0 && !isLoading ? (
          <div className="welcome">
            <div className="welcome-icon">✨</div>
            <h2>
              Welcome to <span>AI Chatbot</span>
            </h2>
            <p>
              Chat with AI or generate stunning images. Switch between modes
              using the toggle above.
            </p>
            <div className="welcome-chips">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="welcome-chip"
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role === "user" ? "user" : "bot"}`}>
                <div className="message-avatar">
                  {msg.role === "user" ? "👤" : "🤖"}
                </div>
                <div
                  className={`message-content ${msg.isError ? "error-content" : ""}`}
                >
                  {msg.content}
                  {msg.image && (
                    <div className="generated-image-wrapper">
                      <img
                        src={msg.image}
                        alt={`Generated: ${msg.prompt}`}
                      />
                      <p>Prompt: &quot;{msg.prompt}&quot;</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Typing Indicator */}
        {isLoading && (
          <div className="typing-indicator">
            <div className="message-avatar">🤖</div>
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="input-wrapper">
          <textarea
            id="chat-input"
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "chat"
                ? "Type your message..."
                : "Describe the image you want to generate..."
            }
            rows={1}
            disabled={isLoading}
          />
          <button
            id="send-button"
            className="send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            aria-label="Send message"
          >
            {mode === "chat" ? "➤" : "🎨"}
          </button>
        </div>
        <div className="input-hint">
          {mode === "chat"
            ? "Press Enter to send, Shift+Enter for new line"
            : "Describe your image and press Enter to generate"}
        </div>
      </div>
    </div>
  );
}
