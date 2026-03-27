import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Home from './pages/Home.tsx';
import Reader from './pages/Reader.tsx';
import Upload from './pages/Upload.tsx';
import { RiHome3Line as Home3LineIcon, RiUploadCloud2Line as UploadCloud2LineIcon } from '@remixicon/react';

const PageWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <motion.main
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.3 }}
    className="flex-1 container mx-auto max-w-5xl px-4 py-8" // Retained original main padding/max-width
  >
    {children}
  </motion.main>
);

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/index" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/upload" element={<PageWrapper><Upload /></PageWrapper>} />
        {/* Changed: Render Home for slugs too, so it can act as a background */}
        <Route path="/:slug" element={<PageWrapper><Home /></PageWrapper>} />
        <Route path="/read/:slug" element={<PageWrapper><Reader isFullPage /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-[var(--color-ceda-bg)] selection:bg-zinc-200 dark:selection:bg-zinc-800">
        <header className="sticky top-0 z-50 border-b border-[var(--color-ceda-border)] bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl">
          <nav className="container mx-auto px-6 h-14 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <span className="text-xl font-bold font-serif tracking-tight text-zinc-900 dark:text-white">NanoBase</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link to="/" className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                Home
              </Link>
              <Link to="/upload" className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all">
                Upload
              </Link>
            </div>
          </nav>
        </header>

        <AnimatedRoutes />

        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-20"> {/* Changed py-8 to py-20 */}
          <div className="container mx-auto px-4 text-center text-xs text-zinc-500 dark:text-zinc-600">
            &copy; {new Date().getFullYear()} NanoBase. Built with Cloudflare & GitHub.
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
