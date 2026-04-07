import { useState, useEffect, useRef, useMemo } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, query, orderBy, onSnapshot, limit, Timestamp, getDocs, where } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Plus, Trash2, Loader2, ChevronRight, History, X, Check, Upload, Activity } from 'lucide-react';
import { format, startOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { cn } from '../lib/utils';

export default function Progress() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [habitStats, setHabitStats] = useState<{ name: string, count: number, total: number }[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'users', auth.currentUser.uid, 'progressPhotos'),
      orderBy('date', 'desc')
    );

    const path = `users/${auth.currentUser.uid}/progressPhotos`;
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPhotos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPhotos(newPhotos);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    // Fetch habit stats for the last 7 days from localStorage
    const fetchHabitStats = () => {
      if (!auth.currentUser) return;
      const userId = auth.currentUser.uid;
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      
      try {
        const savedHabits = localStorage.getItem(`habits_v2_${userId}`);
        const habits = savedHabits ? JSON.parse(savedHabits) : [];
        
        const stats = habits.map((h: any) => {
          let hCount = 0;
          for (let i = 0; i < 7; i++) {
            const d = format(addDays(weekStart, i), 'yyyy-MM-dd');
            if (h.completedDates.includes(d)) hCount++;
          }
          return { name: h.name, count: hCount, total: 7 };
        });
        
        setHabitStats(stats);
      } catch (err) {
        console.error("Error fetching habit stats:", err);
      }
    };

    fetchHabitStats();

    return () => unsubscribe();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' }, 
        audio: false 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      }
    }
  };

  const saveCapturedPhoto = async () => {
    if (!capturedImage || !auth.currentUser) return;
    setUploading(true);
    const path = `users/${auth.currentUser.uid}/progressPhotos`;
    try {
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'progressPhotos'), {
        userId: auth.currentUser.uid,
        date: new Date().toISOString(),
        photoUrl: capturedImage
      });
      stopCamera();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setUploading(true);
    const path = `users/${auth.currentUser.uid}/progressPhotos`;
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          await addDoc(collection(db, 'users', auth.currentUser!.uid, 'progressPhotos'), {
            userId: auth.currentUser!.uid,
            date: new Date().toISOString(),
            photoUrl: base64String
          });
          setUploading(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  const before = photos[photos.length - 1];
  const after = photos[0];

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Progress</h2>
        <div className="flex gap-2">
          <button 
            onClick={startCamera}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-2xl transition-all border border-zinc-800 text-xs font-bold uppercase tracking-wider"
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-2xl cursor-pointer transition-all shadow-lg shadow-blue-600/20 text-xs font-bold uppercase tracking-wider">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
          </label>
        </div>
      </header>

      {/* Habit Rings Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Habit Progression</h3>
          <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">This Week</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            {habitStats.map((stat, i) => {
              const percentage = (stat.count / stat.total) * 100;
              const radius = 30;
              const circumference = 2 * Math.PI * radius;
              const offset = circumference - (percentage / 100) * circumference;
              
              return (
                <div key={i} className="flex flex-col items-center gap-3">
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="6"
                        fill="transparent"
                        className="text-zinc-800"
                      />
                      <motion.circle
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeDasharray={circumference}
                        fill="transparent"
                        strokeLinecap="round"
                        className="text-blue-500"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-sm font-bold text-white">{stat.count}</span>
                      <span className="text-[8px] font-bold text-zinc-500 uppercase">/ {stat.total}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center truncate w-full px-2">
                    {stat.name}
                  </span>
                </div>
              );
            })}
            {habitStats.length === 0 && (
              <div className="col-span-full py-4 text-center">
                <p className="text-zinc-500 text-xs italic">No habits tracked yet this week.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md aspect-[3/4] bg-zinc-900 rounded-[40px] overflow-hidden relative border border-zinc-800 shadow-2xl">
              {!capturedImage ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={capturedImage} 
                  alt="Captured" 
                  className="w-full h-full object-cover"
                />
              )}
              
              <button 
                onClick={stopCamera}
                className="absolute top-6 right-6 p-3 bg-black/50 text-white rounded-2xl backdrop-blur-md border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mt-12 flex items-center gap-8">
              {!capturedImage ? (
                <button 
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full border-4 border-zinc-800 flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                >
                  <div className="w-16 h-16 bg-white rounded-full border-2 border-zinc-950" />
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => setCapturedImage(null)}
                    className="w-16 h-16 bg-zinc-900 text-white rounded-full flex items-center justify-center border border-zinc-800 shadow-xl"
                  >
                    <X className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={saveCapturedPhoto}
                    disabled={uploading}
                    className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 active:scale-90 transition-transform disabled:opacity-50"
                  >
                    {uploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Check className="w-8 h-8" />}
                  </button>
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Before & After Comparison */}
      {photos.length >= 2 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Comparison</h3>
            <span className="text-xs font-medium text-zinc-400">Before & After</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="aspect-[3/4] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-xl">
                <img src={before.photoUrl} alt="Before" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Before</span>
                <p className="text-xs text-zinc-400 mt-0.5">{format(new Date(before.date), 'MMM d, yyyy')}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="aspect-[3/4] bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-xl">
                <img src={after.photoUrl} alt="After" className="w-full h-full object-cover" />
              </div>
              <div className="text-center">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">After</span>
                <p className="text-xs text-zinc-400 mt-0.5">{format(new Date(after.date), 'MMM d, yyyy')}</p>
              </div>
            </div>
          </div>
        </section>
      ) : photos.length === 1 ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto">
            <History className="w-8 h-8 text-blue-500" />
          </div>
          <p className="text-zinc-400 text-sm">Upload one more photo to see your before & after comparison!</p>
        </div>
      ) : (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-12 text-center space-y-4">
          <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
            <Camera className="w-10 h-10 text-zinc-700" />
          </div>
          <div className="space-y-1">
            <h3 className="text-white font-bold text-lg">No photos yet</h3>
            <p className="text-zinc-500 text-sm">Start tracking your physical transformation today.</p>
          </div>
        </div>
      )}

      {/* History List */}
      {photos.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">History</h3>
          <div className="space-y-3">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-3 flex items-center gap-4 hover:bg-zinc-900/50 transition-all group">
                <div className="w-16 h-16 bg-zinc-900 rounded-xl overflow-hidden border border-zinc-800">
                  <img src={photo.photoUrl} alt="Progress" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-white">{format(new Date(photo.date), 'EEEE, MMMM do')}</p>
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mt-1">{format(new Date(photo.date), 'h:mm a')}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
