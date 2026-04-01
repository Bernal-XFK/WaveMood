import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipForward, SkipBack, Heart, Music, ArrowLeft, Loader2, Home, BarChart2, Clock, ListMusic, Shuffle, Volume2, VolumeX } from 'lucide-react';
import { CURRENT_MOODS, DESIRED_MOODS, Song, MoodEntry } from './types';

export default function App() {
  const [step, setStep] = useState<'welcome' | 'current' | 'desired' | 'playlist' | 'history' | 'stats'>('welcome');
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [desiredMood, setDesiredMood] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<MoodEntry[]>([]);

  const fetchRecommendations = async (current: string, desired: string) => {
    setLoading(true);
    try {
      const currentLabel = CURRENT_MOODS.find(m => m.id === current)?.label || current;
      const desiredLabel = DESIRED_MOODS.find(m => m.id === desired)?.label || desired;
      
      const res = await fetch(`/api/recommendations?current=${encodeURIComponent(currentLabel)}&desired=${encodeURIComponent(desiredLabel)}`);
      if (res.ok) {
        const data = await res.json();
        setSongs(data.songs || []);
        
        // Save to history
        const newEntry: MoodEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          currentMood: currentLabel,
          targetMood: desiredLabel
        };
        setHistory(prev => [newEntry, ...prev]);
      }
    } catch (error) {
      console.error("Failed to fetch recommendations", error);
    } finally {
      setLoading(false);
      setStep('playlist');
    }
  };

  const handleStart = () => setStep('current');
  
  const handleSelectCurrent = (id: string) => {
    setCurrentMood(id);
    setStep('desired');
  };

  const handleSelectDesired = (id: string) => {
    setDesiredMood(id);
    if (currentMood) {
      fetchRecommendations(currentMood, id);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const nextSong = () => {
    if (isShuffle) {
      setCurrentSongIndex(Math.floor(Math.random() * songs.length));
    } else {
      setCurrentSongIndex((prev) => (prev + 1) % songs.length);
    }
    setIsPlaying(true);
  };

  const prevSong = () => {
    if (isShuffle) {
      setCurrentSongIndex(Math.floor(Math.random() * songs.length));
    } else {
      setCurrentSongIndex((prev) => (prev - 1 + songs.length) % songs.length);
    }
    setIsPlaying(true);
  };

  const reset = () => {
    setStep('welcome');
    setCurrentMood(null);
    setDesiredMood(null);
    setSongs([]);
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-indigo-500/30 flex flex-col items-center justify-center overflow-hidden relative">
      {/* Dark mode calming gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-900/10 blur-[100px] pointer-events-none" />
      <div className="absolute top-[30%] left-[50%] w-[40%] h-[40%] rounded-full bg-purple-900/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md h-[100dvh] sm:h-[850px] sm:max-h-[90vh] sm:rounded-[40px] sm:shadow-2xl sm:shadow-black/50 bg-slate-900/60 backdrop-blur-2xl border border-white/5 overflow-hidden relative flex flex-col z-10">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <WelcomeScreen key="welcome" onStart={handleStart} onNavigate={setStep} />
          )}
          {step === 'current' && (
            <CurrentMoodScreen key="current" onSelect={handleSelectCurrent} onBack={reset} />
          )}
          {step === 'desired' && (
            <DesiredMoodScreen key="desired" onSelect={handleSelectDesired} onBack={() => setStep('current')} loading={loading} />
          )}
          {step === 'playlist' && (
            <PlaylistScreen 
              key="playlist" 
              songs={songs} 
              onBack={() => setStep('welcome')}
              currentSongIndex={currentSongIndex}
              setCurrentSongIndex={setCurrentSongIndex}
              isPlaying={isPlaying}
              setIsPlaying={setIsPlaying}
              nextSong={nextSong}
              prevSong={prevSong}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              isShuffle={isShuffle}
              setIsShuffle={setIsShuffle}
            />
          )}
          {step === 'history' && (
            <HistoryScreen key="history" history={history} onBack={() => setStep('welcome')} />
          )}
          {step === 'stats' && (
            <StatsScreen key="stats" history={history} onBack={() => setStep('welcome')} />
          )}
        </AnimatePresence>

        {/* Bottom Navigation (visible on main screens) */}
        {(step === 'welcome' || step === 'history' || step === 'stats') && (
          <div className="absolute bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 p-4 pb-safe sm:pb-6 flex justify-around items-center z-50">
            <NavButton icon={<Home className="w-6 h-6" />} label="Inicio" active={step === 'welcome'} onClick={() => setStep('welcome')} />
            <NavButton icon={<Clock className="w-6 h-6" />} label="Historial" active={step === 'history'} onClick={() => setStep('history')} />
            <NavButton icon={<BarChart2 className="w-6 h-6" />} label="Estadísticas" active={step === 'stats'} onClick={() => setStep('stats')} />
          </div>
        )}
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function WelcomeScreen({ onStart, onNavigate }: { onStart: () => void, onNavigate: (step: any) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="flex-1 flex flex-col items-center justify-center p-8 text-center relative pb-24"
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
          className="w-28 h-28 bg-gradient-to-br from-indigo-500 to-emerald-400 rounded-full mb-8 flex items-center justify-center shadow-[0_0_40px_rgba(99,102,241,0.3)]"
        >
          <Music className="w-12 h-12 text-white" />
        </motion.div>
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-4">WaveMood</h1>
        <p className="text-slate-400 text-lg mb-12 max-w-[260px] leading-relaxed">
          Tu música para equilibrar tu mente.
        </p>
        
        <button 
          onClick={onStart}
          className="bg-white text-slate-950 px-8 py-4 rounded-full font-semibold text-lg w-full max-w-[280px] hover:bg-slate-100 hover:scale-[1.02] transition-all active:scale-95 shadow-lg shadow-white/10"
        >
          Comenzar Sesión
        </button>

        {/* Daily Auto Playlist Hint */}
        <div className="mt-12 p-4 rounded-2xl bg-white/5 border border-white/10 w-full max-w-[280px] flex items-center gap-4 cursor-pointer hover:bg-white/10 transition-colors" onClick={onStart}>
          <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
            <ListMusic className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Playlist Diaria</p>
            <p className="text-xs text-slate-400">Basada en tu historial</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CurrentMoodScreen({ onSelect, onBack }: { onSelect: (id: string) => void, onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex flex-col p-6 overflow-y-auto"
    >
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 mb-6 transition-colors">
        <ArrowLeft className="w-5 h-5 text-slate-300" />
      </button>
      <h2 className="text-3xl font-semibold text-white mb-2 px-2">¿Cómo te sientes?</h2>
      <p className="text-slate-400 mb-8 px-2">Selecciona tu estado actual</p>
      
      <div className="grid grid-cols-2 gap-4 pb-8">
        {CURRENT_MOODS.map((mood, idx) => (
          <motion.button
            key={mood.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelect(mood.id)}
            className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all active:scale-95"
          >
            <span className="text-4xl mb-4">{mood.icon}</span>
            <span className="text-sm font-medium text-slate-200 text-center">{mood.label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

function DesiredMoodScreen({ onSelect, onBack, loading }: { onSelect: (id: string) => void, onBack: () => void, loading: boolean }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
      className="flex-1 flex flex-col p-6 overflow-y-auto"
    >
      <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 mb-6 transition-colors" disabled={loading}>
        <ArrowLeft className="w-5 h-5 text-slate-300" />
      </button>
      <h2 className="text-3xl font-semibold text-white mb-2 px-2">¿Cómo quieres sentirte?</h2>
      <p className="text-slate-400 mb-8 px-2">Elige tu destino emocional</p>
      
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-6" />
          <p className="text-slate-300 font-medium text-lg">Sintonizando frecuencias...</p>
          <p className="text-slate-500 text-sm mt-2">Creando tu transición musical</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 pb-8">
          {DESIRED_MOODS.map((mood, idx) => (
            <motion.button
              key={mood.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelect(mood.id)}
              className="flex flex-col items-center justify-center p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 hover:border-indigo-500/30 transition-all active:scale-95"
            >
              <span className="text-4xl mb-4">{mood.icon}</span>
              <span className="text-sm font-medium text-slate-200 text-center">{mood.label}</span>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function PlaylistScreen({ 
  songs, 
  onBack, 
  currentSongIndex, 
  setCurrentSongIndex, 
  isPlaying, 
  setIsPlaying,
  nextSong,
  prevSong,
  favorites,
  toggleFavorite,
  isShuffle,
  setIsShuffle
}: { 
  songs: Song[], 
  onBack: () => void,
  currentSongIndex: number,
  setCurrentSongIndex: (i: number) => void,
  isPlaying: boolean,
  setIsPlaying: (p: boolean) => void,
  nextSong: () => void,
  prevSong: () => void,
  favorites: Set<string>,
  toggleFavorite: (id: string) => void,
  isShuffle: boolean,
  setIsShuffle: (s: boolean) => void
}) {
  const currentSong = songs[currentSongIndex];
  const [played, setPlayed] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const playerRef = useRef<any>(null);
  const [seeking, setSeeking] = useState(false);

  useEffect(() => {
    setPlayed(0);
    setPlayedSeconds(0);
  }, [currentSongIndex]);

  useEffect(() => {
    if (playerRef.current) {
      if (isPlaying) {
        playerRef.current.play().catch((e: any) => console.error("Playback failed:", e));
      } else {
        playerRef.current.pause();
      }
    }
  }, [isPlaying, currentSongIndex, currentSong.audioUrl]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = volume;
      playerRef.current.muted = muted;
    }
  }, [volume, muted]);

  const handleSeekMouseDown = () => {
    setSeeking(true);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = parseFloat(e.target.value);
    setPlayed(newVal);
    
    if (playerRef.current) {
      const audioDuration = playerRef.current.duration || duration;
      if (audioDuration > 0 && !isNaN(audioDuration)) {
        setPlayedSeconds(newVal * audioDuration);
        playerRef.current.currentTime = newVal * audioDuration;
      }
    }
  };

  const handleSeekMouseUp = () => {
    setSeeking(false);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!songs.length) {
    return (
      <div className="flex-1 flex flex-col p-6">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 mb-4 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <p className="text-slate-400 mb-4">No encontramos canciones para esta combinación.</p>
          <button onClick={onBack} className="text-indigo-400 font-medium hover:text-indigo-300">Intentar de nuevo</button>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950"
    >
      <div className="p-6 pb-2 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Tu Transición</span>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      {/* Playlist List */}
      <div className="flex-1 overflow-y-auto px-4 pb-40">
        <div className="mb-8 px-2 mt-4">
          <h2 className="text-2xl font-semibold text-white mb-1">Viaje Emocional</h2>
          <p className="text-slate-400 text-sm">De {songs[0]?.currentMood} a {songs[0]?.targetMood}</p>
        </div>
        <div className="space-y-3">
          {songs.map((song, idx) => (
            <div 
              key={song.id} 
              onClick={() => {
                setCurrentSongIndex(idx);
                setIsPlaying(true);
              }}
              className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all group ${idx === currentSongIndex ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5 border border-transparent'}`}
            >
              <div className="relative w-14 h-14 shrink-0">
                <img src={song.cover} alt={song.title} className="w-full h-full rounded-xl object-cover shadow-md" referrerPolicy="no-referrer" />
                {idx === currentSongIndex && isPlaying && (
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                    <div className="flex gap-0.5 items-end h-4">
                      <motion.div className="w-1 bg-white rounded-full" animate={{ height: ["4px", "12px", "4px"] }} transition={{ duration: 0.8, repeat: Infinity }} />
                      <motion.div className="w-1 bg-white rounded-full" animate={{ height: ["8px", "16px", "8px"] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }} />
                      <motion.div className="w-1 bg-white rounded-full" animate={{ height: ["6px", "10px", "6px"] }} transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="ml-4 flex-1 min-w-0">
                <p className={`font-medium truncate ${idx === currentSongIndex ? 'text-white' : 'text-slate-200'}`}>{song.title}</p>
                <p className="text-sm text-slate-400 truncate">{song.artist}</p>
              </div>
              <div className="ml-3 flex items-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleFavorite(song.id); }}
                  className="p-2 -mr-2 text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Heart className={`w-5 h-5 ${favorites.has(song.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Player Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-2xl border-t border-white/5 p-4 pb-safe sm:pb-6 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.5)]">
        
        {/* Hidden Audio Player */}
        <audio
          ref={playerRef}
          src={currentSong.audioUrl}
          autoPlay={isPlaying}
          onTimeUpdate={(e) => {
            if (!seeking) {
              const target = e.target as HTMLAudioElement;
              setPlayed(target.currentTime / (target.duration || 1));
              setPlayedSeconds(target.currentTime);
            }
          }}
          onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration)}
          onDurationChange={(e) => setDuration((e.target as HTMLAudioElement).duration)}
          onEnded={nextSong}
          className="hidden"
        />

        <div className="flex items-center gap-4 mb-4">
          <img src={currentSong.cover} alt={currentSong.title} className="w-16 h-16 rounded-xl object-cover shadow-lg" referrerPolicy="no-referrer" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white truncate text-lg">{currentSong.title}</p>
            <p className="text-sm text-slate-400 truncate">{currentSong.artist}</p>
          </div>
          <button 
            onClick={() => toggleFavorite(currentSong.id)}
            className="p-3 text-slate-400 hover:text-rose-500 transition-colors"
          >
            <Heart className={`w-6 h-6 ${favorites.has(currentSong.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>
        
        {/* Real Progress Bar */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-mono text-slate-400 w-8 text-right">{formatTime(playedSeconds)}</span>
          <div className="flex-1 relative flex items-center h-4 group">
            {/* Background track */}
            <div className="absolute w-full h-1.5 bg-white/10 rounded-full overflow-hidden pointer-events-none">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-white rounded-full"
                style={{ width: `${played * 100}%` }}
                transition={{ ease: "linear", duration: 0.1 }}
              />
            </div>
            {/* Thumb indicator (visible on hover) */}
            <motion.div 
              className="absolute h-3 w-3 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `calc(${played * 100}% - 6px)` }}
            />
            {/* Interactive Range Input */}
            <input
              type="range"
              min={0}
              max={0.999999}
              step="any"
              value={played || 0}
              onMouseDown={handleSeekMouseDown}
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
              onTouchStart={handleSeekMouseDown}
              onTouchEnd={handleSeekMouseUp}
              className="absolute w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-xs font-mono text-slate-400 w-8">{duration > 0 ? formatTime(duration) : currentSong.duration}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between w-full px-2 sm:px-6">
          <motion.button 
            whileTap={{ scale: 0.9 }} 
            onClick={() => setIsShuffle(!isShuffle)} 
            className={`p-3 transition-colors ${isShuffle ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Shuffle className="w-5 h-5 sm:w-6 sm:h-6" />
          </motion.button>
          
          <div className="flex items-center gap-4 sm:gap-6">
            <motion.button whileTap={{ scale: 0.9 }} onClick={prevSong} className="p-3 text-slate-300 hover:text-white transition-colors">
              <SkipBack className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            </motion.button>
            
            <motion.button 
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => setIsPlaying(!isPlaying)} 
              className="w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center bg-white text-slate-950 rounded-full shadow-xl shadow-white/10"
            >
              {isPlaying ? <Pause className="w-7 h-7 sm:w-8 sm:h-8 fill-current" /> : <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current ml-1" />}
            </motion.button>
            
            <motion.button whileTap={{ scale: 0.9 }} onClick={nextSong} className="p-3 text-slate-300 hover:text-white transition-colors">
              <SkipForward className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
            </motion.button>
          </div>
          
          <div className="flex items-center group">
            <motion.button 
              whileTap={{ scale: 0.9 }} 
              onClick={() => setMuted(!muted)} 
              className="p-3 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {muted || volume === 0 ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
            </motion.button>
            <div className="hidden sm:flex w-16 items-center mr-2">
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  if (muted) setMuted(false);
                }}
                className="w-full h-1 accent-white bg-white/20 rounded-full appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function HistoryScreen({ history, onBack }: { history: MoodEntry[], onBack: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col p-6 overflow-y-auto pb-24"
    >
      <h2 className="text-3xl font-semibold text-white mb-8 px-2 mt-4">Tu Historial</h2>
      
      {history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <Clock className="w-12 h-12 text-slate-600 mb-4" />
          <p className="text-slate-400">Aún no hay registros.</p>
          <p className="text-slate-500 text-sm mt-2">Comienza una sesión para ver tu historial aquí.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry) => (
            <div key={entry.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium mb-1">{entry.currentMood} → {entry.targetMood}</p>
                <p className="text-xs text-slate-500">{new Date(entry.date).toLocaleDateString()} • {new Date(entry.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                <Music className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function StatsScreen({ history, onBack }: { history: MoodEntry[], onBack: () => void }) {
  const totalSessions = history.length;
  const mostCommonTarget = history.length > 0 
    ? Object.entries(history.reduce((acc, curr) => {
        acc[curr.targetMood] = (acc[curr.targetMood] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1])[0][0]
    : '-';

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex-1 flex flex-col p-6 overflow-y-auto pb-24"
    >
      <h2 className="text-3xl font-semibold text-white mb-8 px-2 mt-4">Estadísticas</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-bold text-white mb-2">{totalSessions}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wider">Sesiones</span>
        </div>
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-semibold text-indigo-400 mb-2">{mostCommonTarget}</span>
          <span className="text-xs text-slate-400 uppercase tracking-wider">Meta Frecuente</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20 rounded-3xl p-6">
        <h3 className="text-lg font-medium text-white mb-2">Tu Bienestar</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          {totalSessions > 0 
            ? `Has estado trabajando en sentirte más ${mostCommonTarget.toLowerCase()}. ¡Sigue así, la música es una gran herramienta para regular tus emociones!`
            : 'Comienza a usar WaveMood para ver insights sobre tu bienestar emocional.'}
        </p>
      </div>
    </motion.div>
  );
}

