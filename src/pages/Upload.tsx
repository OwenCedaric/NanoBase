import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  RiUploadCloud2Line as UploadCloud2LineIcon, 
  RiFilePaper2Line as FilePaper2LineIcon, 
  RiCloseLine as CloseLineIcon, 
  RiLoader4Line as Loader4LineIcon, 
  RiArrowRightSLine as ArrowRightSLineIcon,
  RiDraggable as DraggableIcon,
  RiInformationLine as InformationLineIcon,
  RiDeleteBin7Line as DeleteBinLineIcon
} from '@remixicon/react';
import { useDropzone } from 'react-dropzone';
import { Reorder } from 'framer-motion';
import { IndexData, Document } from '../types';

type QueueItem = { type: 'file'; file: File; id: string } | { type: 'existing'; doc: Document; id: string };

const UploadPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editSeriesId = searchParams.get('edit');

  const [token, setToken] = useState(() => localStorage.getItem('nanobase_token') || '');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [originalUrl, setOriginalUrl] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });

  useEffect(() => {
    localStorage.setItem('nanobase_token', token);
  }, [token]);

  useEffect(() => {
    if (editSeriesId) {
      fetch('/api/data/index.json')
        .then(res => res.json())
        .then((data: any) => {
          const json = data as IndexData;
          const seriesDocs = json.documents.filter(d => d.series_id === editSeriesId).sort((a, b) => (a.part_number || 0) - (b.part_number || 0));
          if (seriesDocs.length > 0) {
            setSeriesTitle(seriesDocs[0].series_title || '');
            setOriginalUrl(seriesDocs[0].original_url || '');
            setItems(seriesDocs.map(doc => ({ type: 'existing', doc, id: doc.id })));
          }
        });
    }
  }, [editSeriesId]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const htmlFiles = acceptedFiles.filter(file => file.name.endsWith('.html'));
    setItems(prev => [...prev, ...htmlFiles.map(file => ({ type: 'file' as const, file, id: crypto.randomUUID() }))]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'text/html': ['.html'] }
  });

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleUpload = async () => {
    if (items.length === 0 && !editSeriesId) {
      setStatus({ type: 'error', message: '请在队列中添加或保留文档' });
      return;
    }

    if (!token) {
      setStatus({ type: 'error', message: '请输入 Security Token 以进行操作' });
      return;
    }

    setUploading(true);
    setStatus({ type: 'idle', message: '' });

    const formData = new FormData();
    
    const partsManifest: any[] = [];
    items.forEach((item, index) => {
      if (item.type === 'file') {
        formData.append('files', item.file);
        partsManifest.push({ type: 'file', fileName: item.file.name, order: index + 1 });
      } else {
        partsManifest.push({ type: 'existing', docId: item.doc.id, order: index + 1 });
      }
    });

    formData.append('parts_manifest', JSON.stringify(partsManifest));
    
    if (editSeriesId) {
      formData.append('series_id', editSeriesId);
    }
    if (originalUrl) {
      formData.append('original_url', originalUrl);
    }
    if (seriesTitle) {
      formData.append('series_title', seriesTitle);
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.ok) {
        setStatus({ type: 'success', message: editSeriesId ? '文集更新成功！' : `成功处理 ${items.length} 个文档！项目正在自动重新部署...` });
        if (!editSeriesId) {
           setItems([]);
           setSeriesTitle('');
           setOriginalUrl('');
        }
      } else {
        const errorData = await response.json().catch(() => ({})) as any;
        setStatus({ type: 'error', message: errorData.message || `上传失败: ${response.statusText}` });
      }
    } catch (err) {
      setStatus({ type: 'error', message: '网络请求失败，请检查连接。' });
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSeries = async () => {
    if (!window.confirm('确定要删除整个系列吗？这将移除所有关联的章节元数据，但物理文件仍保留（作为独立文档）。')) return;
    if (!token) {
      setStatus({ type: 'error', message: '请输入 Security Token 以进行删除' });
      return;
    }

    setUploading(true);
    setStatus({ type: 'idle', message: '' });

    const formData = new FormData();
    formData.append('series_id', editSeriesId!);
    formData.append('parts_manifest', JSON.stringify([])); // Empty manifest = delete all parts from series
    
    const headers: Record<string, string> = { 'Authorization': `Bearer ${token}` };

    try {
      const response = await fetch('/api/upload', { method: 'POST', headers, body: formData });
      if (response.ok) {
        setStatus({ type: 'success', message: '文集解散成功！正在返回首页...' });
        setTimeout(() => navigate('/'), 2000);
      } else {
        const errorData = await response.json().catch(() => ({})) as any;
        setStatus({ type: 'error', message: errorData.message || '删除失败' });
      }
    } catch (err) {
      setStatus({ type: 'error', message: '请求失败' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-24 py-16 px-6">
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h1 className="text-6xl font-bold font-serif tracking-tight text-zinc-900 dark:text-white">
          {editSeriesId ? 'Edit Series' : 'Upload'}
        </h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
          {editSeriesId ? 'Modify Collection Content' : 'Add New Documents'}
        </p>
      </motion.section>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-12"
      >
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
              Security Token
            </label>
            <input
              type="password"
              placeholder="Enter token..."
              className="w-full px-5 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xs font-medium"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
              Source URL (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              className="w-full px-5 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xs font-medium"
              value={originalUrl}
              onChange={(e) => setOriginalUrl(e.target.value)}
            />
          </div>

          <div className="space-y-4 md:col-span-2">
            <label className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
              Collection / Series Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. My Awesome Collection"
              className="w-full px-5 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all text-xs font-medium"
              value={seriesTitle}
              onChange={(e) => setSeriesTitle(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">
            Select Documents
          </label>
          <div 
            {...getRootProps()} 
            className={`cursor-pointer border border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragActive 
                ? 'border-zinc-900 dark:border-white bg-zinc-50 dark:bg-zinc-900' 
                : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 hover:border-zinc-400 dark:hover:border-zinc-600'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
                <UploadCloud2LineIcon size={18} />
              </div>
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Drop HTML files here</p>
            </div>
          </div>
        </div>

        {items.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Queue ({items.length})</h3>
              <button onClick={() => setItems([])} className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em]">Clear All</button>
            </div>
            <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <Reorder.Group axis="y" values={items} onReorder={setItems} className="space-y-2">
                {items.map((item, i) => (
                  <Reorder.Item 
                    value={item}
                    key={item.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border group cursor-grab active:cursor-grabbing transition-all shadow-sm ${
                      item.type === 'existing' 
                        ? 'bg-zinc-50/50 dark:bg-zinc-900/30 border-zinc-100 dark:border-zinc-800/50' 
                        : 'bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800'
                    } hover:border-zinc-300 dark:hover:border-zinc-700`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <DraggableIcon size={12} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                      {item.type === 'existing' ? (
                        <InformationLineIcon size={12} className="text-zinc-400 shrink-0" />
                      ) : (
                        <FilePaper2LineIcon size={12} className="text-zinc-300 shrink-0" />
                      )}
                      <span className={`text-[10px] truncate font-bold uppercase tracking-wider ${
                        item.type === 'existing' ? 'text-zinc-500' : 'text-zinc-800 dark:text-zinc-200'
                      }`}>
                        {item.type === 'file' ? item.file.name : item.doc.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest hidden sm:block">Part {i + 1}</span>
                      <button 
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-rose-400 hover:text-rose-600 transition-colors"
                      >
                        <CloseLineIcon size={14} />
                      </button>
                    </div>
                  </Reorder.Item>
                ))}
              </Reorder.Group>
            </div>
          </motion.div>
        )}

        {status.type !== 'idle' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-4 p-4 rounded-xl border ${
            status.type === 'success' 
              ? 'bg-emerald-50 text-emerald-900 border-emerald-100' 
              : 'bg-rose-50 text-rose-900 border-rose-100'
          }`}>
            <p className="text-[9px] font-black uppercase tracking-widest">{status.message}</p>
          </motion.div>
        )}

         <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            disabled={uploading || (items.length === 0 && !editSeriesId)}
            onClick={handleUpload}
            className={`flex-1 h-14 rounded-xl font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-3 group shadow-lg ${
              editSeriesId 
                ? 'bg-zinc-800 text-white hover:bg-zinc-900' 
                : 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-zinc-900/10'
            } disabled:opacity-30`}
          >
            {uploading ? (
              <>
                <Loader4LineIcon size={14} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                {editSeriesId ? 'Update Collection' : 'Confirm & Publish'}
                <ArrowRightSLineIcon size={14} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </motion.button>

          {editSeriesId && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={uploading}
              onClick={handleDeleteSeries}
              className="w-14 h-14 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 transition-all flex items-center justify-center border border-rose-100"
              title="Dissolve Series"
            >
              <DeleteBinLineIcon size={20} />
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default UploadPage;
