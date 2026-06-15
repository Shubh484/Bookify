'use client';

import { useState } from 'react';
import { format, parse } from 'date-fns';

type Booking = {
  id: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  status: string;
  room: { name: string; location: string };
};

export default function BookingsPage() {
  const [email, setEmail] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelSuccess, setCancelSuccess] = useState('');

  const fetchBookings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBookings([]);
    try {
      const res = await fetch(`/api/bookings?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to fetch bookings');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancelError('');
    setCancelSuccess('');

    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'PATCH' });
      const data = await res.json();
      if (res.ok) {
        setCancelSuccess(`Booking cancelled successfully. Status: ${data.status}`);
        // Refresh bookings
        const refreshRes = await fetch(`/api/bookings?email=${encodeURIComponent(email)}`);
        if (refreshRes.ok) {
          setBookings(await refreshRes.json());
        }
      } else {
        setCancelError(data.error || 'Failed to cancel');
      }
    } catch (err) {
      setCancelError('Network error');
    }
  };

  const isCancellable = (b: Booking) => {
    return b.status === 'CONFIRMED';
  };

  return (
    <div className="space-y-8 animate-in fade-in pt-6">
      <div className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">My Bookings</h1>
        <p className="text-gray-400">View and manage your reservations.</p>
      </div>

      <div className="max-w-2xl mx-auto glass p-6 rounded-2xl">
        <form onSubmit={fetchBookings} className="flex gap-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded p-3 outline-none focus:border-cyan-500"
            required
          />
          <button type="submit" disabled={loading} className="bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 rounded font-bold hover:shadow-lg hover:shadow-cyan-500/25 transition-all text-white">
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
      </div>

      {(cancelError || cancelSuccess) && (
        <div className="max-w-2xl mx-auto">
          {cancelError && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded">{cancelError}</div>}
          {cancelSuccess && <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded">{cancelSuccess}</div>}
        </div>
      )}

      {bookings.length > 0 && (
        <div className="max-w-4xl mx-auto space-y-4">
          {bookings.map(b => {
            const cancellable = isCancellable(b);
            const dateStr = b.date.split('T')[0];
            return (
              <div key={b.id} className={`glass p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 ${b.status !== 'CONFIRMED' ? 'opacity-60' : ''}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold">{b.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                      b.status === 'CONFIRMED' ? 'bg-green-500/20 text-green-400' :
                      b.status.includes('REFUNDABLE') ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                  <div className="text-slate-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    {b.room.name} ({b.room.location})
                  </div>
                  <div className="text-slate-400 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {format(parse(dateStr, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy')} | {b.startTime} - {b.endTime}
                  </div>
                </div>
                
                {cancellable && (
                  <button 
                    onClick={() => handleCancel(b.id)}
                    className="border border-red-500/50 text-red-400 hover:bg-red-500/10 px-4 py-2 rounded transition-colors whitespace-nowrap"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
