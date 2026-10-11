import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AuthorDashboard({ token, user, onLogout }) {
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchData = async () => {
    try {
      const [booksRes, ticketsRes] = await Promise.all([
        api.get('/books'),
        api.get('/tickets')
      ]);
      setBooks(booksRes.data);
      setTickets(ticketsRes.data);
    } catch (err) {
      console.error('Error fetching author dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
      await api.post('/tickets', {
        bookId: selectedBook || null,
        subject,
        description
      });
      setSubject('');
      setDescription('');
      setSelectedBook('');
      fetchData();
      alert('Support ticket created successfully! AI has auto-classified your query.');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create ticket.');
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    try {
      const res = await api.post(`/tickets/${activeTicket._id}/messages`, {
        content: replyContent
      });
      setActiveTicket(res.data);
      setReplyContent('');
      fetchData();
    } catch (err) {
      alert('Failed to send message.');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-600">Loading Author Portal...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-900 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">BookLeaf Author Portal</h1>
            <p className="text-xs text-indigo-200">Welcome back, {user.name}</p>
          </div>
          <button onClick={onLogout} className="bg-indigo-700 hover:bg-indigo-800 text-xs px-3 py-2 rounded">
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Books Inventory & Royalties */}
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-4">My Published Books & Royalties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {books.map((book) => (
              <div key={book._id} className="bg-white p-5 rounded-lg shadow border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-indigo-900">{book.title}</h3>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-medium">{book.status}</span>
                </div>
                <p className="text-xs text-gray-500 mb-4">ISBN: {book.isbn} | Genre: {book.genre}</p>
                <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded text-center text-xs">
                  <div>
                    <span className="block text-gray-400">Copies Sold</span>
                    <span className="font-bold text-gray-700">{book.totalCopiesSold}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400">Total Earned</span>
                    <span className="font-bold text-gray-700">₹{book.totalRoyaltyEarned}</span>
                  </div>
                  <div>
                    <span className="block text-gray-400">Pending Payout</span>
                    <span className="font-bold text-indigo-600">₹{book.royaltyPending}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Support Ticket Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Ticket Form */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 lg:col-span-1">
            <h3 className="font-bold text-gray-800 mb-4">Raise Support Ticket</h3>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Related Book (Optional)</label>
                <select 
                  value={selectedBook} 
                  onChange={(e) => setSelectedBook(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                >
                  <option value="">-- General Account Inquiry --</option>
                  {books.map(b => <option key={b._id} value={b._id}>{b.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                <input 
                  type="text" 
                  value={subject} 
                  onChange={(e) => setSubject(e.target.value)} 
                  className="w-full border border-gray-300 rounded p-2 text-sm" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows="4" 
                  className="w-full border border-gray-300 rounded p-2 text-sm" 
                  required 
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-semibold py-2 rounded text-sm hover:bg-indigo-700">
                Submit Ticket
              </button>
            </form>
          </div>

          {/* Ticket List & Thread */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200 lg:col-span-2 flex flex-col h-[600px]">
            <h3 className="font-bold text-gray-800 mb-4">My Support Tickets</h3>
            
            {activeTicket ? (
              <div className="flex flex-col h-full">
                <button onClick={() => setActiveTicket(null)} className="text-xs text-indigo-600 mb-3 hover:underline text-left">
                  &larr; Back to all tickets
                </button>
                <div className="bg-indigo-50 p-3 rounded mb-3">
                  <div className="flex justify-between">
                    <h4 className="font-bold text-indigo-900 text-sm">{activeTicket.subject}</h4>
                    <span className="text-xs bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded">{activeTicket.status}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Category: {activeTicket.category} | Priority: {activeTicket.priority}</p>
                </div>

                {/* Messages Thread */}
                <div className="flex-1 overflow-y-auto space-y-3 p-3 bg-gray-50 rounded border mb-3">
                  <div className="bg-white p-3 rounded shadow-sm">
                    <p className="text-xs font-bold text-gray-700">Original Description:</p>
                    <p className="text-sm text-gray-600 mt-1">{activeTicket.description}</p>
                  </div>
                  {activeTicket.messages?.map((msg, idx) => (
                    <div key={idx} className={`p-3 rounded text-sm ${msg.sender === 'admin' ? 'bg-indigo-100 ml-6' : 'bg-white mr-6 shadow-sm'}`}>
                      <span className="block text-[10px] font-bold uppercase text-gray-500 mb-1">{msg.sender === 'admin' ? 'Support Team' : 'You'}</span>
                      <p className="text-gray-700">{msg.content}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input 
                    type="text" 
                    value={replyContent} 
                    onChange={(e) => setReplyContent(e.target.value)} 
                    placeholder="Type your reply..." 
                    className="flex-1 border border-gray-300 rounded p-2 text-sm" 
                    required 
                  />
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">
                    Send
                  </button>
                </form>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1 space-y-3">
                {tickets.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No tickets raised yet.</p>
                ) : (
                  tickets.map((ticket) => (
                    <div 
                      key={ticket._id} 
                      onClick={() => setActiveTicket(ticket)}
                      className="p-4 border rounded hover:border-indigo-500 cursor-pointer transition bg-white"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-sm text-gray-800">{ticket.subject}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-medium">{ticket.status}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-2">{ticket.description}</p>
                      <div className="flex gap-2 text-[10px]">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{ticket.category}</span>
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">Priority: {ticket.priority}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}