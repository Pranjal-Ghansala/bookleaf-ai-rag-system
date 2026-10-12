import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminDashboard({ token, user, onLogout }) {
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [aiDraft, setAiDraft] = useState('');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
    headers: { Authorization: `Bearer ${token}` }
  });

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterCategory) params.set('category', filterCategory);
      if (filterPriority) params.set('priority', filterPriority);
      if (filterFrom) params.set('from', filterFrom);
      if (filterTo) params.set('to', `${filterTo}T23:59:59.999Z`);
      const url = params.toString() ? `/tickets?${params.toString()}` : '/tickets';
      const res = await api.get(url);
      setTickets(res.data);
    } catch (err) {
      console.error('Error fetching admin tickets:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus, filterCategory, filterPriority, filterFrom, filterTo]);

  const handleGenerateAiDraft = async () => {
    if (!activeTicket) return;
    setLoadingDraft(true);
    try {
      const res = await api.get(`/tickets/${activeTicket._id}/ai-draft`);
      setAiDraft(res.data.draft);
      setReplyContent(res.data.draft); // Auto-fill into reply box
    } catch (err) {
      alert('Failed to generate AI draft response.');
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    try {
      const res = await api.post(`/tickets/${activeTicket._id}/messages`, { content: replyContent });
      setActiveTicket(res.data);
      setReplyContent('');
      setAiDraft('');
      fetchTickets();
    } catch (err) {
      alert('Failed to send reply.');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!internalNote.trim()) return;
    try {
      const res = await api.post(`/tickets/${activeTicket._id}/notes`, { note: internalNote });
      setActiveTicket(res.data);
      setInternalNote('');
    } catch (err) {
      alert('Failed to add internal note.');
    }
  };

  const handleTicketFieldChange = async (field, value) => {
    try {
      const res = await api.patch(`/tickets/${activeTicket._id}`, { [field]: value });
      setActiveTicket(res.data);
      fetchTickets();
    } catch (err) { alert(err.response?.data?.error || 'Failed to update ticket.'); }
  };

  const handleAssignToMe = async () => {
    try { const res = await api.patch(`/tickets/${activeTicket._id}`, { assignToMe: true }); setActiveTicket(res.data); fetchTickets(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to assign ticket.'); }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.patch(`/tickets/${activeTicket._id}`, { status: newStatus });
      setActiveTicket(res.data);
      fetchTickets();
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center w-full">
          <div>
            <h1 className="text-xl font-bold">BookLeaf Admin Support Command Center</h1>
            <p className="text-xs text-slate-400">Master Ticket Management & AI Knowledge Engine</p>
          </div>
          <button onClick={onLogout} className="bg-slate-700 hover:bg-slate-800 text-xs px-3 py-2 rounded">
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 w-full">
        {/* Ticket Queue Sidebar */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 flex flex-col h-[700px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-gray-800 text-sm">Master Ticket Queue</h2>
            <div className="flex flex-wrap gap-2">
            <select aria-label="Filter by category" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="text-xs border rounded p-1">
              <option value="">All Categories</option>
              {['Royalty & Payments','ISBN & Metadata Issues','Printing & Quality','Distribution & Availability','Book Status & Production Updates','General Inquiry'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
            <select aria-label="Filter by priority" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} className="text-xs border rounded p-1">
              <option value="">All Priorities</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option>
            </select>
            <input aria-label="Filter tickets from date" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="text-xs border rounded p-1" />
            <input aria-label="Filter tickets to date" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} min={filterFrom || undefined} className="text-xs border rounded p-1" />
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs border rounded p-1"
            >
              <option value="">All Statuses</option>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 space-y-2">
            {tickets.map((t) => (
              <div 
                key={t._id} 
                onClick={() => { setActiveTicket(t); setAiDraft(''); }}
                className={`p-3 rounded border cursor-pointer transition ${activeTicket?._id === t._id ? 'border-indigo-600 bg-indigo-50/50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-xs text-gray-900 truncate max-w-[150px]">{t.subject}</span>
                  <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-medium">{t.status}</span>
                </div>
                <p className="text-[11px] text-gray-500 mb-2">Author: {t.authorId?.name}</p>
                <div className="flex gap-1">
                  <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded">{t.category}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${t.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {t.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Ticket Workspace */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6 lg:col-span-2 flex flex-col h-[700px]">
          {activeTicket ? (
            <div className="flex flex-col h-full space-y-4">
              {/* Ticket Top Info */}
              <div className="flex justify-between items-start border-b pb-3">
                <div>
                  <h3 className="font-bold text-base text-gray-900">{activeTicket.subject}</h3>
                  <p className="text-xs text-gray-500">Author: {activeTicket.authorId?.name} ({activeTicket.authorId?.email})</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={handleAssignToMe} className="text-xs border rounded px-2 py-1">Assign to me</button>
                  <select aria-label="Override category" value={activeTicket.category} onChange={(e) => handleTicketFieldChange('category', e.target.value)} className="text-xs border rounded p-1">
                    {['Royalty & Payments','ISBN & Metadata Issues','Printing & Quality','Distribution & Availability','Book Status & Production Updates','General Inquiry'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select aria-label="Override priority" value={activeTicket.priority} onChange={(e) => handleTicketFieldChange('priority', e.target.value)} className="text-xs border rounded p-1">
                    {['Critical','High','Medium','Low'].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select 
                    value={activeTicket.status} 
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="text-xs border rounded p-1.5 font-semibold bg-gray-50"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {/* Chat & Notes Split Area */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
                {/* Message Thread */}
                <div className="md:col-span-2 flex flex-col h-full overflow-hidden bg-gray-50 p-3 rounded border">
                  <div className="overflow-y-auto flex-1 space-y-3 pr-2">
                    <div className="bg-white p-3 rounded shadow-sm">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Initial Request</p>
                      <p className="text-sm text-gray-700 mt-1">{activeTicket.description}</p>
                    </div>
                    {activeTicket.messages?.map((msg, idx) => (
                      <div key={idx} className={`p-3 rounded text-sm ${msg.sender === 'admin' ? 'bg-indigo-100 ml-4' : 'bg-white mr-4 shadow-sm'}`}>
                        <span className="block text-[10px] font-bold uppercase text-gray-500 mb-1">{msg.sender === 'admin' ? 'Support Admin' : 'Author'}</span>
                        <p className="text-gray-700">{msg.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Reply Form & AI Draft Generator */}
                  <div className="mt-3 pt-3 border-t space-y-2">
                    <div className="flex justify-between items-center">
                      <button 
                        onClick={handleGenerateAiDraft}
                        disabled={loadingDraft}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded font-medium flex items-center gap-1 shadow-sm"
                      >
                        {loadingDraft ? 'Generating AI RAG Draft...' : '✨ Generate AI RAG Draft'}
                      </button>
                      <span className="text-[10px] text-gray-400">Powered by Gemini AI Knowledge Base</span>
                    </div>

                    <form onSubmit={handleSendReply} className="flex gap-2">
                      <textarea 
                        rows={2} 
                        value={replyContent} 
                        onChange={(e) => setReplyContent(e.target.value)} 
                        placeholder="Type or edit official reply..." 
                        className="flex-1 border border-gray-300 rounded p-2 text-sm" 
                        required 
                      />
                      <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm hover:bg-indigo-700">
                        Send
                      </button>
                    </form>
                  </div>
                </div>

                {/* Internal Admin Notes Sidebar */}
                <div className="flex flex-col h-full bg-amber-50/50 p-3 rounded border border-amber-200">
                  <h4 className="font-bold text-xs text-amber-900 mb-2">Internal Admin Notes</h4>
                  <div className="overflow-y-auto flex-1 space-y-2 mb-3">
                    {activeTicket.internalNotes?.map((note, idx) => (
                      <div key={idx} className="bg-white p-2 rounded shadow-sm text-xs border border-amber-100">
                        <p className="text-gray-700">{note.note}</p>
                        <span className="block text-[9px] text-gray-400 mt-1">{new Date(note.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleAddNote} className="space-y-2">
                    <textarea 
                      value={internalNote} 
                      onChange={(e) => setInternalNote(e.target.value)} 
                      placeholder="Add private admin note..." 
                      rows="2" 
                      className="w-full border border-amber-300 rounded p-2 text-xs bg-white" 
                      required 
                    />
                    <button type="submit" className="w-full bg-amber-700 hover:bg-amber-800 text-white text-xs py-1.5 rounded font-medium">
                      Add Note
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Select a ticket from the queue to manage support.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}