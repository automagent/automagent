import { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router';

export default function Layout() {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      const q = search.trim();
      navigate(q ? `/?q=${encodeURIComponent(q)}` : '/');
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      <header className="bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight">
            automagent
          </Link>
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-64 rounded-md bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-500"
          />
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between text-sm text-gray-400">
          <span>automagent.dev</span>
          <a
            href="https://github.com/automagent-dev/automagent"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-600"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}
