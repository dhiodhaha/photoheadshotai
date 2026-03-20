import { createFileRoute } from '@tanstack/react-router';
import { Download, Heart, Image as ImageIcon, Sparkles, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export const Route = createFileRoute('/studio/gallery')({
	component: GalleryPage,
});

// Mocked Gallery Data
const MOCK_GALLERY = [
    { id: 1, src: '/hero_headshot_preview_1773972472569.png', style: 'Corporate', isFavorite: true },
    { id: 2, src: '/auth_fashion_portrait_1.png', style: 'High Fashion', isFavorite: false },
    { id: 3, src: '/auth_fashion_portrait_2.png', style: 'Cinematic', isFavorite: true },
    { id: 4, src: '/hero_headshot_preview_1773972472569.png', style: 'Corporate', isFavorite: false },
    { id: 5, src: '/auth_fashion_portrait_2.png', style: 'Cinematic', isFavorite: false },
    { id: 6, src: '/auth_fashion_portrait_1.png', style: 'High Fashion', isFavorite: true },
    { id: 7, src: '/hero_headshot_preview_1773972472569.png', style: 'Corporate', isFavorite: false },
    { id: 8, src: '/auth_fashion_portrait_2.png', style: 'Cinematic', isFavorite: false },
];

const FILTERS = ['All', 'Favorites', 'Corporate', 'High Fashion', 'Cinematic'];

function GalleryPage() {
    const [activeFilter, setActiveFilter] = useState('All');

    const filteredGallery = MOCK_GALLERY.filter(item => {
        if (activeFilter === 'All') return true;
        if (activeFilter === 'Favorites') return item.isFavorite;
        return item.style === activeFilter;
    });

	return (
		<div className="relative min-h-[calc(100vh-5rem)] p-6 md:p-12 overflow-y-auto">
			{/* Ambient background glow */}
			<div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none opacity-50" />

			<div className="max-w-7xl mx-auto relative z-10 space-y-12">
                
                {/* Header Sequence */}
				<motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="flex flex-col md:flex-row md:items-end justify-between gap-6"
                >
                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass border border-white/10 text-[10px] font-bold tracking-widest uppercase mb-2 text-muted-foreground">
                            <ImageIcon className="w-3 h-3 text-primary" />
                            Personal Archive
                        </div>
                        <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-none">
                            Your <span className="italic font-light text-muted-foreground">Legacy.</span>
                        </h1>
                        <p className="text-muted-foreground max-w-xl text-lg font-light tracking-wide">
                            All your generated masterpieces, securely stored in high-resolution.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="rounded-full px-6 h-12 uppercase tracking-widest text-xs font-bold border-white/10 hover:bg-white/5">
                            <Filter className="w-4 h-4 mr-2" />
                            Sort
                        </Button>
                        <Button className="rounded-full px-6 h-12 uppercase tracking-widest text-xs font-bold transition-all shadow-lg shadow-primary/20">
                            <Download className="w-4 h-4 mr-2" />
                            Export All
                        </Button>
                    </div>
				</motion.div>

                {/* Filters */}
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.8 }}
                    className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-6"
                >
                    {FILTERS.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={cn(
                                "px-5 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300",
                                activeFilter === filter 
                                    ? "bg-white text-black shadow-md shadow-white/10" 
                                    : "text-muted-foreground hover:text-white hover:bg-white/5"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </motion.div>

                {/* Gallery Masonry/Grid */}
                {filteredGallery.length === 0 ? (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-32 flex flex-col items-center justify-center text-center space-y-4"
                    >
                        <div className="w-16 h-16 rounded-full glass border border-white/10 flex items-center justify-center mb-4">
                            <Sparkles className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-display font-bold">Nothing here yet</h3>
                        <p className="text-muted-foreground font-light max-w-xs">Generate some stunning headshots to start filling your archive.</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        layout
                        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
                    >
                        {filteredGallery.map((item, i) => (
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.4, delay: i * 0.05 }}
                                key={item.id}
                                className="group relative aspect-3/4 rounded-2xl overflow-hidden glass border border-white/10 shadow-xl"
                            >
                                <img 
                                    src={item.src} 
                                    alt={`Generated Portrait ${item.id}`} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                
                                <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                                {/* Interactive Overlay */}
                                <div className="absolute inset-0 p-4 flex flex-col justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-y-2 group-hover:translate-y-0">
                                    <div className="flex justify-between items-start">
                                        <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-[9px] font-bold uppercase tracking-widest text-white/80">
                                            {item.style}
                                        </div>
                                        <button className={cn(
                                            "w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors",
                                            item.isFavorite ? "bg-red-500/20 text-red-500 hover:bg-red-500/40" : "bg-black/50 text-white hover:bg-white/20 hover:text-white"
                                        )}>
                                            <Heart className="w-4 h-4 text-inherit" fill={item.isFavorite ? "currentColor" : "none"} />
                                        </button>
                                    </div>
                                    
                                    <Button className="w-full rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white font-bold tracking-widest text-xs uppercase shadow-none ring-0">
                                        <Download className="w-4 h-4 mr-2" />
                                        Download
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
			</div>
		</div>
	);
}
