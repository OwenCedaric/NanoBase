import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  RiUploadCloud2Line as UploadCloud2LineIcon, 
  RiFilePaper2Line as FilePaper2LineIcon, 
  RiCloseLine as CloseLineIcon, 
  RiLoader4Line as Loader4LineIcon, 
  RiArrowRightSLine as ArrowRightSLineIcon,
  RiDraggable as DraggableIcon
} from '@remixicon/react';
import { useDropzone } from 'react-dropzone';
import { Reorder } from 'framer-motion';

const UploadPage: React.FC = () => {
  const [token, setToken] = useState(() => localStorage.getItem('nanobase_token') || '');
  const [files, setFiles] = useState<File[]>([]);
  const [originalUrl, setOriginalUrl] = useState('');
  const [seriesTitle, setSeriesTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'idle', message: string }>({ type: 'idle', message: '' });

  useEffect(() => {
    localStorage.setItem('nanobase_token', token);
  }, [token]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const htmlFiles = acceptedFiles.filter(file => file.name.endsWith('.html'));
    setFiles(prev => [...prev, ...htmlFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'text/html': ['.html'] }
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setStatus({ type: 'error', message: '请选择要上传的 HTML 文件' });
      return;
    }

    setUploading(true);
    setStatus({ type: 'idle', message: '' });

    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
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
        setStatus({ type: 'success', message: `成功上传 ${files.length} 个文件！项目正在自动重新部署...` });
        setFiles([]);
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

  return (
    <div className="max-w-4xl mx-auto space-y-24 py-16 px-6">
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h1 className="text-6xl font-bold font-serif tracking-tight text-zinc-900 dark:text-white">Upload</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
          Add New Documents
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
              <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">Drop HTML Files Here</p>
            </div>
          </div>
        </div>

        {files.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Queue ({files.length})</h3>
              <button onClick={() => setFiles([])} className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em]">Clear All</button>
            </div>
            <div className="grid gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <Reorder.Group axis="y" values={files} onReorder={setFiles} className="space-y-2">
                {files.map((file, i) => (
                  <Reorder.Item 
                    value={file}
                    key={file.name + i} 
                    className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 group cursor-grab active:cursor-grabbing hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <DraggableIcon size={12} className="text-zinc-300 group-hover:text-zinc-500 transition-colors" />
                      <FilePaper2LineIcon size={12} className="text-zinc-300 shrink-0" />
                      <span className="text-[10px] truncate font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-wider">
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      {seriesTitle && (
                        <span className="text-[8px] font-black text-zinc-400 uppercase tracking-widest hidden sm:block">Part {i + 1}</span>
                      )}
                      <button 
                        onClick={() => removeFile(i)}
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

        <motion.button
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          disabled={uploading || files.length === 0}
          onClick={handleUpload}
          className="w-full h-14 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-black text-[10px] uppercase tracking-[0.4em] hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-30 transition-all flex items-center justify-center gap-3 group shadow-lg shadow-zinc-900/10"
        >
          {uploading ? (
            <>
              <Loader4LineIcon size={14} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Confirm & Publish
              <ArrowRightSLineIcon size={14} className="transition-transform group-hover:translate-x-1" />
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default UploadPage;
