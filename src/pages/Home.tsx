import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RiSearchLine as SearchLineIcon, 
  RiArrowRightSLine as ArrowRightSLineIcon, 
  RiTimeLine as TimeLineIcon, 
  RiFilePaper2Line as FilePaper2LineIcon,
  RiStackLine as StackLineIcon,
  RiEdit2Line as Edit2LineIcon
} from '@remixicon/react';
import dayjs from 'dayjs';
import { IndexData, Document } from '../types';
import Reader from './Reader.tsx';

dayjs.locale('zh-cn');

const formatRelativeDate = (date: string) => {
  const d = dayjs(date);
  const now = dayjs().startOf('day');
  const target = d.startOf('day');
  const diffDays = now.diff(target, 'day');

  if (diffDays === 0) return '今日';
  if (diffDays === 1) return '1 天前';
  if (diffDays < 7) return `${diffDays} 天前`;
  return d.format('YYYY-MM-DD');
};

const ITEMS_PER_PAGE = 12;

const Home: React.FC = () => {
  const [data, setData] = useState<IndexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchParams] = useSearchParams();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const page = parseInt(searchParams.get('page') || '1', 10);

  // Scroll lock when modal is open
  useEffect(() => {
    if (slug) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [slug]);

  useEffect(() => {
    document.title = 'NanoBase | Personal Knowledge Archive';
    // ... (seo)
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', 'A minimalist, high-performance personal knowledge base built with Cloudflare and GitHub.');
  }, []);

  useEffect(() => {
    fetch('/api/data/index.json')
      .then(res => res.json())
      .then((json: any) => {
        setData(json as IndexData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load index:', err);
        setLoading(false);
      });
  }, []);

  // Grouping logic: Collect individual docs and series into a single list
  const getGroupedDocuments = () => {
    if (!data) return [];
    
    const groups: Record<string, Document[]> = {};
    const individual: Document[] = [];

    data.documents.forEach(doc => {
      if (doc.series_id) {
        if (!groups[doc.series_id]) groups[doc.series_id] = [];
        groups[doc.series_id].push(doc);
      } else {
        individual.push(doc);
      }
    });

    const seriesGroups = Object.entries(groups).map(([id, docs]) => {
      // Sort docs in series by part_number for internal ordering
      const sorted = [...docs].sort((a, b) => (a.part_number || 0) - (b.part_number || 0));
      const firstPart = sorted[0];
      
      // Use the latest upload date among all parts for top-level sorting
      const latestDate = docs.reduce((max, d) => 
        dayjs(d.upload_date).isAfter(dayjs(max)) ? d.upload_date : max, 
        docs[0].upload_date
      );

      return {
        ...firstPart,
        upload_date: latestDate, // Override with latest date for sorting
        title: firstPart.series_title || firstPart.title,
        isSeries: true,
        partsCount: docs.length
      };
    });

    // Merge and sort by date (newest first)
    return [...individual, ...seriesGroups].sort((a, b) => 
      dayjs(b.upload_date).unix() - dayjs(a.upload_date).unix()
    );
  };

  const groupedDocuments = getGroupedDocuments();

  const filteredDocuments = groupedDocuments.filter(doc => 
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const paginatedDocuments = filteredDocuments.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring' as const, stiffness: 100, damping: 15 }
    }
  };

  return (
    <div className="space-y-24 py-12 px-4">
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center space-y-6"
      >
        <h1 className="text-5xl md:text-8xl font-bold font-serif tracking-tight text-zinc-900 dark:text-white">
          Documents
        </h1>
        <div className="flex flex-col items-center gap-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 48 }}
            transition={{ delay: 0.5, duration: 1 }}
            className="h-px bg-zinc-200 dark:bg-zinc-800"
          />
          <p className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.4em]">
            Personal Archive
          </p>
        </div>
      </motion.section>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="relative max-w-lg mx-auto group"
      >
        <SearchLineIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300 group-focus-within:text-zinc-900 Transition-colors" />
        <input
          type="text"
          placeholder="Filter documents..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-sm font-medium"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {loading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-32 w-full bg-white dark:bg-zinc-900 rounded-2xl animate-pulse border border-zinc-100 dark:border-zinc-800" />
          ))
        ) : paginatedDocuments.length > 0 ? (
          paginatedDocuments.map((doc) => (
            <motion.div key={doc.id} variants={itemVariants}>
              <Link
                to={`/${doc.slug}`}
                className="group relative flex flex-col p-5 rounded-2xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800 transition-all hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-xl hover:shadow-zinc-200/30 dark:hover:shadow-none h-full"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-8 h-8 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-all border border-zinc-100 dark:border-white/5">
                    {(doc as any).isSeries ? <StackLineIcon size={16} /> : <FilePaper2LineIcon size={16} />}
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-zinc-400 opacity-60">
                    {dayjs(doc.upload_date).format('YYYY-MM-DD')}
                  </div>
                </div>

                <div className="flex-1 space-y-2">
                  <h2 className="text-sm font-bold font-serif leading-snug text-zinc-800 dark:text-zinc-200 line-clamp-2 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    {doc.title}
                  </h2>
                  <div className="flex items-center gap-3">
                    <div className="text-[8px] font-black uppercase tracking-[0.15em] text-zinc-400 flex items-center gap-1">
                      <TimeLineIcon size={10} />
                      {formatRelativeDate(doc.upload_date)}
                    </div>
                    {(doc as any).isSeries && (
                       <div className="text-[7px] font-black bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                         Series · {(doc as any).partsCount} Parts
                       </div>
                    )}
                  </div>
                </div>
                <ArrowRightSLineIcon className="absolute bottom-4 right-4 w-4 h-4 text-zinc-200 group-hover:text-zinc-900 dark:group-hover:text-white transition-all transform group-hover:translate-x-1" />

                {(doc as any).isSeries && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/upload?edit=${doc.series_id}`);
                    }}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 text-zinc-400 hover:text-white dark:hover:text-zinc-900 transition-all border border-white/10 dark:border-black/5"
                    title="Edit Collection"
                  >
                    <Edit2LineIcon size={14} />
                  </button>
                )}
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <p className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.5em]">No matching records found</p>
          </div>
        )}
      </motion.div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-3 pt-12">
          {Array.from({ length: totalPages }).map((_, i) => (
            <Link
              key={i}
              to={`/?page=${i + 1}`}
              className={`min-w-[3rem] h-12 flex items-center justify-center rounded-2xl font-bold transition-all ${
                page === i + 1
                  ? 'bg-zinc-900 text-white shadow-xl shadow-zinc-900/20 dark:bg-white dark:text-zinc-900 dark:shadow-none'
                  : 'bg-white text-zinc-400 border border-zinc-100 hover:border-zinc-900 hover:text-zinc-900 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-white dark:hover:text-white'
              }`}
            >
              {i + 1}
            </Link>
          ))}
        </div>
      )}

      {/* Immersive Reader Modal */}
      <AnimatePresence>
        {slug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            {/* Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => navigate('/')}
              className="absolute inset-0 bg-white/20 dark:bg-black/40 backdrop-blur-2xl cursor-zoom-out"
            />
            
            {/* Reader Content Card */}
            <Reader />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Home;
