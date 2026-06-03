import { useState, useEffect } from 'react';
import { Image, Home, ChevronLeft, ChevronRight, Play, Pause, Calendar, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../context/AppContext';

interface PhotoDetailPageProps {
  onClose: () => void;
}

export function PhotoDetailPage({ onClose }: PhotoDetailPageProps) {
  const { photos } = useAppContext();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const hasPhotos = photos.length > 0;

  // Auto-play slideshow
  useEffect(() => {
    if (!isPlaying || !hasPhotos) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % photos.length);
    }, 5000); // 5 seconds per photo

    return () => clearInterval(interval);
  }, [hasPhotos, isPlaying, photos.length]);

  if (!hasPhotos) {
    return (
      <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
        <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
          <div className="flex items-center gap-3">
            <Image className="w-8 h-8 text-purple-500" />
            <h2 className="text-2xl">Photo Frame</h2>
          </div>
        </div>

        <div className="flex-1 p-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg h-full flex items-center justify-center text-muted-foreground">
            No photos available yet.
          </div>
        </div>

        <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 shadow-lg"
          >
            <Home className="w-6 h-6" />
            <span>Back to Home</span>
          </motion.button>
        </div>
      </div>
    );
  }

  const currentPhoto = photos[currentIndex] ?? photos[0];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const goToPhoto = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col">
      {/* Header */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image className="w-8 h-8 text-purple-500" />
            <h2 className="text-2xl">Photo Frame</h2>
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {photos.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePlayPause}
              className="p-3 hover:bg-muted rounded-lg transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-purple-500" />
              ) : (
                <Play className="w-6 h-6 text-purple-500" />
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Photo Display */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg h-full flex flex-col overflow-hidden">
          {/* Large Photo */}
          <div className="flex-1 relative bg-black/5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                src={currentPhoto.url}
                alt={currentPhoto.caption}
                className="w-full h-full object-contain"
                initial={{ opacity: 0, scale: 1.1 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </AnimatePresence>

            {/* Navigation Arrows */}
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1, x: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </motion.button>

            {/* Photo Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-6">
              <motion.div
                key={currentIndex}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-white"
              >
                <h3 className="text-2xl mb-2">{currentPhoto.caption}</h3>
                <div className="flex items-center gap-4 text-sm opacity-90">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(currentPhoto.date).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {currentPhoto.uploadedBy}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Thumbnail Filmstrip */}
          <div className="p-4 bg-muted/50 border-t border-border">
            <div className="flex gap-3 overflow-x-auto pb-2">
              {photos.map((photo, index) => (
                <motion.button
                  key={photo.id}
                  onClick={() => goToPhoto(index)}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  className={`
                    relative flex-shrink-0 w-24 h-20 rounded-lg overflow-hidden border-2 transition-all
                    ${index === currentIndex ? 'border-purple-500 ring-2 ring-purple-200' : 'border-transparent hover:border-purple-300'}
                  `}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption}
                    className={`
                      w-full h-full object-cover transition-opacity
                      ${index === currentIndex ? 'opacity-100' : 'opacity-60 hover:opacity-100'}
                    `}
                  />
                  {index === currentIndex && (
                    <motion.div
                      layoutId="active-photo"
                      className="absolute inset-0 border-2 border-purple-500 rounded-lg"
                    />
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="p-6 bg-white/90 backdrop-blur-sm shadow-lg">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onClose}
          className="w-full py-4 bg-primary text-primary-foreground rounded-xl flex items-center justify-center gap-2 shadow-lg"
        >
          <Home className="w-6 h-6" />
          <span>Back to Home</span>
        </motion.button>
      </div>
    </div>
  );
}
