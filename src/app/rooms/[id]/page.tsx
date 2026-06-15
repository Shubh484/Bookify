import prisma from '@/lib/prisma';
import SlotGrid from '@/components/SlotGrid';
import { notFound } from 'next/navigation';

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const room = await prisma.room.findUnique({
    where: { id }
  });

  if (!room) {
    notFound();
  }

  return (
    <div className="space-y-6 pt-6">
      <div>
        <h1 className="text-3xl font-bold">{room.name}</h1>
        <p className="text-gray-400">{room.location} • Capacity: {room.capacity}</p>
      </div>

      <SlotGrid roomId={room.id} roomName={room.name} />
    </div>
  );
}
