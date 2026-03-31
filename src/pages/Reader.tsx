import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  RiExternalLinkLine as ExternalLinkLineIcon, 
  RiShareForwardLine as ShareForwardLineIcon,
  RiCloseLine as CloseIcon,
  RiLink as LinkIcon,
  RiArrowLeftSLine as ArrowLeftSLineIcon,
  RiArrowRightSLine as ArrowRightSLineIcon,
  RiListOrdered2 as ListOrderedIcon
} from '@remixicon/react';
import dayjs from 'dayjs';
import { IndexData, Document } from '../types';


const Reader: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<IndexData | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/data/index.json')
      .then(res => res.json())
      .then((json: any) => {
        const indexData = json as IndexData;
        setData(indexData);
        const found = indexData.documents.find(d => d.slug === slug);
        if (found) {
          setDoc(found);
        } else {
          navigate('/');
        }
        setLoading(false);
      });
  }, [slug, navigate]);

  // Handle SEO metadata
  useEffect(() => {
    if (doc) {
      document.title = `${doc.title} | NanoBase`;
    }
  }, [doc]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/${doc?.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-zinc-200 border-t-zinc-800 animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Loading Content...</p>
        </div>
      </div>
    );
  }

  if (!doc) return <div className="p-20 text-center text-zinc-500">Document not found</div>;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-white dark:bg-zinc-950 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-none border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* --- Responsive Header --- */}
      <header className="shrink-0 h-16 md:h-20 px-6 md:px-10 border-b border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-4 min-w-0">
          <button 
            onClick={() => navigate('/')}
            className="group w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-900 dark:hover:bg-white text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-all shadow-sm"
          >
            <CloseIcon size={20} className="transition-transform group-hover:rotate-90" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm md:text-lg font-bold font-serif truncate text-zinc-900 dark:text-white leading-none">
              {doc.title}
            </h1>
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mt-1">
              {dayjs(doc.upload_date).format('MMMM DD, YYYY')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/read/${doc.slug}`}
            className="hidden sm:flex w-10 h-10 items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all border border-zinc-100 dark:border-zinc-800"
            title="Direct Open (Native Render)"
          >
            <ExternalLinkLineIcon size={18} />
          </a>
          
          <button
            onClick={handleCopyLink}
            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all border ${
              copied 
                ? "bg-green-500 text-white border-green-500" 
                : "bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-900 dark:hover:text-white border-zinc-100 dark:border-zinc-800"
            }`}
            title="Copy Shared Link"
          >
            {copied ? <div className="text-[10px] font-bold">OK</div> : <ShareForwardLineIcon size={18} />}
          </button>

          {doc.original_url && (
            <a 
              href={doc.original_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all border border-zinc-100 dark:border-zinc-800"
              title="View Source"
            >
              <LinkIcon size={18} />
            </a>
          )}
        </div>
      </header>

      {/* --- Main Reading Surface --- */}
      <div className="flex-1 min-h-0 flex bg-zinc-50/30 dark:bg-zinc-950">
        {/* --- Series / Global Sidebar --- */}
        <nav className="hidden xl:flex w-72 shrink-0 flex-col border-r border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 p-6 space-y-6">
           <div className="space-y-1">
             <div className="flex items-center gap-2 mb-4">
               <ListOrderedIcon size={14} className="text-zinc-400" />
               <h3 className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-400">
                 {doc.series_id ? 'Series Collection' : 'Archive Navigator'}
               </h3>
             </div>
             
             <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {(doc.series_id 
                  ? data?.documents.filter(d => d.series_id === doc.series_id).sort((a, b) => (a.part_number || 0) - (b.part_number || 0))
                  : data?.documents.slice(0, 15)
                )?.map(d => (
                  <Link 
                    key={d.id} 
                    to={`/${d.slug}`}
                    className={`group block p-3 rounded-xl transition-all ${d.slug === slug ? 'bg-zinc-900 text-white shadow-lg' : 'hover:bg-white dark:hover:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}
                  >
                    <div className="flex items-center gap-2">
                      {d.part_number && (
                        <span className={`text-[8px] font-black uppercase tracking-tighter shrink-0 ${d.slug === slug ? 'text-zinc-400' : 'text-zinc-300 group-hover:text-zinc-500'}`}>
                          P.{d.part_number}
                        </span>
                      )}
                      <div className="text-[10px] font-bold truncate">{d.title}</div>
                    </div>
                  </Link>
                ))}
             </div>
           </div>

           {doc.series_id && (
             <div className="pt-6 border-t border-zinc-100 dark:border-zinc-900">
               <p className="text-[10px] font-medium text-zinc-400 leading-relaxed italic">
                 This document is part of the <span className="font-bold text-zinc-600 dark:text-zinc-300 not-italic">"{doc.series_title || 'Untitled Series'}"</span> collection.
               </p>
             </div>
           )}
        </nav>

        {/* --- Content Frame --- */}
        <div className="flex-1 relative flex flex-col">
          <div className="flex-1 relative">
            <iframe
              src={doc.path}
              className="w-full h-full border-none bg-white"
              title={doc.title}
              sandbox="allow-scripts allow-popups"
            />
          </div>

          {/* Inline Series Navigation */}
          {doc.series_id && (
            <div className="shrink-0 h-16 border-t border-zinc-100 dark:border-zinc-900 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm flex items-center justify-between px-8">
              {(() => {
                const series = data?.documents.filter(d => d.series_id === doc.series_id).sort((a, b) => (a.part_number || 0) - (b.part_number || 0)) || [];
                const currentIndex = series.findIndex(d => d.id === doc.id);
                const prev = series[currentIndex - 1];
                const next = series[currentIndex + 1];

                return (
                  <>
                    <div className="flex-1 flex justify-start">
                      {prev ? (
                        <Link to={`/${prev.slug}`} className="flex items-center gap-2 group text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                          <ArrowLeftSLineIcon size={18} className="transition-transform group-hover:-translate-x-1" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Previous Part</span>
                        </Link>
                      ) : <div />}
                    </div>

                    <div className="flex-1 flex justify-center">
                      <span className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.4em]">
                         Part {doc.part_number} of {doc.total_parts}
                      </span>
                    </div>

                    <div className="flex-1 flex justify-end">
                      {next ? (
                        <Link to={`/${next.slug}`} className="flex items-center gap-2 group text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                          <span className="text-[10px] font-black uppercase tracking-widest">Next Part</span>
                          <ArrowRightSLineIcon size={18} className="transition-transform group-hover:translate-x-1" />
                        </Link>
                      ) : <div />}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
      
      {/* Mobile Backdrop/Footer Controls */}
      <div className="shrink-0 md:hidden p-4 border-t border-zinc-100 dark:border-zinc-900 flex flex-col gap-3 bg-white dark:bg-zinc-950">
          <a
            href={`/read/${doc.slug}`}
            className="w-full py-3 bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-white text-[10px] font-black uppercase tracking-widest rounded-xl text-center active:scale-95 transition-transform border border-zinc-200 dark:border-zinc-800"
          >
            Native Browser Render
          </a>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-3 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-xl active:scale-95 transition-transform"
          >
            Close Preview
          </button>
      </div>
    </motion.div>
  );
};

export default Reader;
