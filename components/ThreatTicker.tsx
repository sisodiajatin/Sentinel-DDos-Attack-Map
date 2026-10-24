import React, { useEffect, useState } from 'react';
import { fetchRealTimeThreatNews, NewsItem } from '../services/geminiService';
import { ExternalLink, AlertOctagon } from 'lucide-react';

const ThreatTicker: React.FC = () => {
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const loadNews = async () => {
      try {
        const data = await fetchRealTimeThreatNews();
        if (mounted) {
          setNews(data);
          setLoading(false);
        }
      } catch {
        if (mounted) setLoading(false);
      }
    };

    loadNews();
    
    // Refresh every 5 minutes
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div 
      className="w-full bg-red-50 dark:bg-red-950/20 border-y border-red-200 dark:border-red-900/30 backdrop-blur-sm h-10 flex items-center px-4 overflow-hidden relative transition-colors duration-300"
      role="status"
      aria-live="polite"
      aria-label="Live threat intelligence feed"
    >
      <div className="flex items-center gap-2 shrink-0 mr-4 z-10 bg-white/50 dark:bg-slate-950/50 pr-4">
        <span className="relative flex h-2 w-2" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
        <span className="text-red-600 dark:text-red-500 font-bold font-mono text-xs tracking-wider uppercase">Live Intel</span>
      </div>

      <div className="flex-1 flex items-center overflow-hidden">
        {loading ? (
            <span className="text-slate-500 text-xs font-mono animate-pulse">Establishing secure connection to global threat feed...</span>
        ) : (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right duration-700">
                <AlertOctagon className="w-3 h-3 text-orange-500" />
                <span className="text-slate-800 dark:text-slate-200 text-xs font-medium truncate max-w-[600px]">{news?.summary}</span>
                
                {news?.sources && news.sources.length > 0 && (
                    <div className="flex items-center gap-2 ml-4 border-l border-slate-300 dark:border-slate-700 pl-4">
                        <span className="text-[10px] text-slate-500 uppercase">Sources:</span>
                        {news.sources.slice(0, 2).map((source, idx) => (
                            <a 
                                key={idx}
                                href={source.uri} 
                                target="_blank" 
                                rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] text-cyan-700 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 hover:underline bg-cyan-100 dark:bg-cyan-950/30 px-1.5 py-0.5 rounded transition-colors"
                            >
                                {source.title.slice(0, 15)}...
                                <ExternalLink className="w-2 h-2" />
                            </a>
                        ))}
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};

export default ThreatTicker;