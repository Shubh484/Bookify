'use client';

import { useState, useEffect } from 'react';
import { format, parse } from 'date-fns';

type Availability = {
  slotStart: string;
  available: boolean;
  bookingId: string | null;
};

export default function SlotGrid({ roomId, roomName }: { roomId: string, roomName: string }) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<Availability[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');

  const fetchAvailability = async (selectedDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/availability?date=${selectedDate}`);
      const data = await res.json();
      if (res.ok) setSlots(data);
      else setError(data.error || 'Failed to fetch slots');
    } catch (e) {
      setError('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability(date);
    setSelectedSlots([]);
    setSuccess('');
    setError('');
  }, [date, roomId]);

  const toggleSlot = (slot: string) => {
    if (selectedSlots.includes(slot)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slot));
    } else {
      setSelectedSlots([...selectedSlots, slot].sort());
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (selectedSlots.length === 0) return;

    // End time is 30 mins after the last selected slot
    const lastSlot = selectedSlots[selectedSlots.length - 1];
    const lastSlotDate = parse(`${date} ${lastSlot}`, 'yyyy-MM-dd HH:mm', new Date());
    const endSlotDate = new Date(lastSlotDate.getTime() + 30 * 60000);
    const endTime = format(endSlotDate, 'HH:mm');

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          date,
          startTime: selectedSlots[0],
          endTime,
          bookedBy: name,
          email,
          title
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('Booking confirmed!');
        setSelectedSlots([]);
        setName('');
        setEmail('');
        setTitle('');
        fetchAvailability(date);
      } else {
        setError(data.error || 'Failed to book');
        if (res.status === 409) {
          fetchAvailability(date); // Refresh to show taken slots
        }
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const joinWaitlist = async (slotStart: string) => {
    if (!name || !email) {
      setError('Please enter Name and Email to join waitlist.');
      return;
    }
    
    // find booking id
    const slot = slots.find(s => s.slotStart === slotStart);
    if (!slot || !slot.bookingId) return;

    try {
      const res = await fetch(`/api/bookings/${slot.bookingId}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotStart, userName: name, email })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Joined waitlist for ${slotStart}!`);
      } else {
        setError(data.error);
      }
    } catch(err) {
      setError('Network error');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Col: Grid */}
        <div className="flex-1 space-y-6 glass p-6 rounded-2xl">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Select Slots</h2>
            <input 
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded p-2 text-white outline-none focus:border-cyan-500"
            />
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {slots.map(s => (
                <div key={s.slotStart} className="relative group">
                  <button
                    disabled={!s.available}
                    onClick={() => toggleSlot(s.slotStart)}
                    className={`
                      w-full py-3 rounded-xl text-sm font-medium transition-all duration-200 border
                      ${!s.available 
                        ? 'bg-slate-800/50 border-red-500/30 text-slate-500 cursor-not-allowed' 
                        : selectedSlots.includes(s.slotStart)
                          ? 'bg-cyan-500 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-700'
                      }
                    `}
                  >
                    {s.slotStart}
                  </button>
                  
                  {/* Waitlist button overlay on hover for booked slots */}
                  {!s.available && s.bookingId && (
                    <div className="absolute inset-0 hidden group-hover:flex items-center justify-center">
                      <button 
                        onClick={() => joinWaitlist(s.slotStart)}
                        className="bg-purple-600 text-xs px-2 py-1 rounded text-white font-bold opacity-90 hover:opacity-100"
                        title="Join Waitlist"
                      >
                        Waitlist
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Form */}
        <div className="w-full md:w-96 space-y-6">
          <div className="glass p-6 rounded-2xl sticky top-24">
            <h3 className="text-xl font-bold mb-4">Book {roomName}</h3>
            
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded mb-4 text-sm">{error}</div>}
            {success && <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-3 rounded mb-4 text-sm">{success}</div>}
            
            {selectedSlots.length > 0 ? (
              <div className="mb-4 text-sm text-cyan-400">
                Selected: {selectedSlots[0]} - {format(new Date(parse(`${date} ${selectedSlots[selectedSlots.length - 1]}`, 'yyyy-MM-dd HH:mm', new Date()).getTime() + 30*60000), 'HH:mm')} ({selectedSlots.length * 0.5} hrs)
              </div>
            ) : (
              <div className="mb-4 text-sm text-slate-400">Select available slots to book.</div>
            )}

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Email</label>
                <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 outline-none focus:border-cyan-500" />
                <p className="text-xs text-slate-500 mt-1">Daily quota: 4 hours max.</p>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Meeting Title</label>
                <input required type="text" value={title} onChange={e=>setTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded p-2.5 outline-none focus:border-cyan-500" />
              </div>
              
              <button 
                type="submit" 
                disabled={selectedSlots.length === 0}
                className={`w-full py-3 rounded font-bold transition-all ${selectedSlots.length > 0 ? 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-lg shadow-cyan-500/25' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
              >
                Confirm Booking
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
