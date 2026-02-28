
import React, { useState, useRef, useEffect } from 'react';
import { useVoiceAgent } from './useVoiceAgent';
import { Mic, MicOff, X, MessageSquare, Loader2, Volume2 } from '@/components/icons';

export default function VoiceWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const { isConnecting, isConnected, isSpeaking, messages, toggleCall, handleUserMessage } = useVoiceAgent();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [inputText, setInputText] = useState("");

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleOpen = () => {
        setIsOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;
        handleUserMessage(inputText);
        setInputText("");
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Chat Window */}
            {isOpen && (
                <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col h-[500px] transition-all duration-300 ease-in-out transform origin-bottom-right">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-amber-700 to-amber-900 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : isConnecting ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`}></div>
                            <h3 className="font-medium">Concierge AI</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-amber-800 p-1 rounded-full transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-gray-400 mt-10 text-sm">
                                <p>Hello! I can help you check availability and book rooms.</p>
                                <p className="mt-2">Connecting to audio is required to speak.</p>
                            </div>
                        )}

                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                        ? 'bg-amber-700 text-white rounded-br-none'
                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                                        }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Controls */}
                    <div className="p-4 bg-white border-t border-gray-100">
                        {/* Status Indicators */}
                        <div className="flex justify-center mb-4 min-h-[24px]">
                            {isConnecting && (
                                <span className="text-xs font-semibold text-amber-500 animate-pulse flex items-center gap-1">
                                    <Loader2 size={12} className="animate-spin" /> Connecting...
                                </span>
                            )}
                            {isConnected && !isSpeaking && (
                                <span className="text-xs font-semibold text-green-500 flex items-center gap-1">
                                    <Mic size={12} /> Listening...
                                </span>
                            )}
                            {isSpeaking && (
                                <span className="text-xs font-semibold text-blue-500 flex items-center gap-1">
                                    <Volume2 size={12} /> Speaking...
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleCall}
                                className={`p-3 rounded-full transition-all duration-300 ${isConnected
                                    ? 'bg-red-500 text-white shadow-lg ring-4 ring-red-100'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {isConnected ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>

                            <form onSubmit={handleSubmit} className="flex-1 flex gap-2">
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all disabled:opacity-50"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputText.trim()}
                                    className="p-2 bg-amber-600 text-white rounded-full hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <MessageSquare size={18} />
                                </button>
                            </form>
                        </div>
                    </div>

                </div>
            )}

            {/* Floating Toggle Button */}
            {!isOpen && (
                <button
                    onClick={handleOpen}
                    className="group relative flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                >
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    <MessageSquare size={24} className="group-hover:hidden" />
                    <span className="hidden group-hover:block text-xs font-bold">Ask</span>
                </button>
            )}
        </div>
    );
}
