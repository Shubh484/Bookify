import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="glass sticky top-0 z-50 px-6 py-4 mb-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-purple-500">
          Bookify
        </Link>
        <div className="flex gap-6">
          <Link href="/rooms" className="text-gray-300 hover:text-white transition-colors">
            Rooms
          </Link>
          <Link href="/bookings" className="text-gray-300 hover:text-white transition-colors">
            My Bookings
          </Link>
        </div>
      </div>
    </nav>
  );
}
