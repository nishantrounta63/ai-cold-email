import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const Inbox = () => {
    const [threads, setThreads] = useState([]);
    const [activeThread, setActiveThread] = useState(null);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        fetchThreads();
    }, []);

    const fetchThreads = async () => {
        try {
            const { data } = await api.get('/inbox');
            setThreads(data.threads);
        } catch (error) {
            console.error('Error fetching threads:', error);
            toast.error('Failed to load inbox');
        } finally {
            setLoading(false);
        }
    };

    const fetchThreadMessages = async (thread) => {
        setActiveThread(thread);
        try {
            const { data } = await api.get(`/inbox/${thread._id}`);
            setMessages(data.messages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            toast.error('Failed to load thread');
        }
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !activeThread) return;

        setSending(true);
        try {
            await api.post(`/inbox/${activeThread._id}/reply`, { message: replyText });
            toast.success('Reply sent!');
            setReplyText('');
            fetchThreadMessages(activeThread); // Refresh messages
        } catch (error) {
            console.error('Error sending reply:', error);
            toast.error('Failed to send reply');
        } finally {
            setSending(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Inbox...</div>;

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Sidebar / Threads List */}
            <div className="w-1/3 border-r border-gray-200 overflow-y-auto bg-gray-50">
                <div className="p-4 bg-white border-b border-gray-200 sticky top-0">
                    <h2 className="text-lg font-semibold text-gray-800">Inbox</h2>
                </div>
                <div className="divide-y divide-gray-200">
                    {threads.length === 0 ? (
                        <div className="p-4 text-sm text-gray-500 text-center">No emails sent yet.</div>
                    ) : (
                        threads.map(thread => (
                            <div 
                                key={thread._id} 
                                onClick={() => fetchThreadMessages(thread)}
                                className={`p-4 cursor-pointer hover:bg-gray-100 transition-colors ${activeThread?._id === thread._id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-sm font-medium text-gray-900 truncate pr-2">{thread.targetEmail}</h3>
                                    <span className="text-xs text-gray-500 whitespace-nowrap">
                                        {new Date(thread.lastMessageAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-800 font-medium mb-1 truncate">{thread.subject}</p>
                                <p className="text-xs text-gray-500 truncate">{thread.latestSnippet}</p>
                                {thread.status === 'replied' && (
                                    <span className="mt-2 inline-block px-2 py-0.5 bg-green-100 text-green-800 text-[10px] font-semibold rounded-full">New Reply</span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat / Message View */}
            <div className="w-2/3 flex flex-col bg-white">
                {activeThread ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-200 bg-white">
                            <h2 className="text-lg font-medium text-gray-900">{activeThread.subject}</h2>
                            <p className="text-sm text-gray-500">Conversation with {activeThread.targetEmail}</p>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                            {messages.map((msg, index) => {
                                const isFromTarget = msg.from.toLowerCase().includes(activeThread.targetEmail.toLowerCase());
                                const isActuallyFromUser = !isFromTarget;
                                
                                return (
                                <div key={index} className={`flex flex-col ${isActuallyFromUser ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-medium text-gray-600">{msg.from}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(msg.sentAt).toLocaleString()}</span>
                                    </div>
                                    <div className={`p-3 rounded-lg max-w-[80%] text-sm shadow-sm ${isActuallyFromUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                                        <div dangerouslySetInnerHTML={{ __html: msg.bodyHtml || msg.bodyText?.replace(/\n/g, '<br/>') || msg.snippet }} />
                                    </div>
                                </div>
                                );
                            })}
                        </div>

                        {/* Reply Input */}
                        <div className="p-4 bg-white border-t border-gray-200">
                            <form onSubmit={handleReply} className="flex flex-col gap-2">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your reply here..."
                                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 resize-none h-24"
                                />
                                <div className="flex justify-end">
                                    <button 
                                        type="submit" 
                                        disabled={!replyText.trim() || sending}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors disabled:opacity-50"
                                    >
                                        {sending ? 'Sending...' : 'Send Reply'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-500 flex-col gap-2">
                        <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <p>Select a conversation to view messages</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Inbox;
