import { useState, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Scale, Ruler, Target, Camera, Loader2, User, X, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [data, setData] = useState({
    name: '',
    weight: '',
    height: '',
    heightFt: '',
    heightIn: '',
    goal: '',
    photoUrl: ''
  });

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

  const confirmPhoto = () => {
    if (capturedImage) {
      setData({ ...data, photoUrl: capturedImage });
      stopCamera();
    }
  };

  const handleComplete = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const path = `users/${auth.currentUser.uid}`;
      
      let finalHeight = parseFloat(data.height);
      if (heightUnit === 'ft') {
        const ft = parseFloat(data.heightFt) || 0;
        const inch = parseFloat(data.heightIn) || 0;
        finalHeight = (ft * 12) + inch; 
      }

      try {
        await setDoc(doc(db, 'users', auth.currentUser.uid), {
          uid: auth.currentUser.uid,
          name: data.name,
          email: auth.currentUser.email || '',
          phoneNumber: auth.currentUser.phoneNumber || '',
          weight: parseFloat(data.weight),
          weightUnit,
          height: finalHeight,
          heightUnit,
          goal: data.goal,
          photoUrl: data.photoUrl,
          streak: 0,
          lastCheckIn: null,
          reminderTime: '08:00',
          createdAt: new Date().toISOString()
        }, { merge: true });
        onComplete();
      } catch (fErr) {
        handleFirestoreError(fErr, OperationType.WRITE, path);
      }
    } catch (err) {
      // This catch is for non-firestore errors or if path definition fails
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isNextDisabled = () => {
    if (loading) return true;
    if (step === 1 && !data.name) return true;
    if (step === 2 && !data.weight) return true;
    if (step === 3) {
      if (heightUnit === 'cm' && !data.height) return true;
      if (heightUnit === 'ft' && !data.heightFt) return true;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-12">
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-blue-600' : 'bg-zinc-800'}`} 
              />
            ))}
          </div>
          <h2 className="text-2xl font-bold text-white">Let's get started</h2>
          <p className="text-zinc-500 text-sm mt-1">Tell us a bit about yourself.</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-sm shadow-xl min-h-[380px] flex flex-col">
          {step === 1 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mb-4">
                  <User className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">What's your name?</h3>
                <p className="text-zinc-500 text-xs mt-1">We'll use this to personalize your experience.</p>
              </div>
              
              <div className="mt-auto">
                <input 
                  type="text" 
                  placeholder="John Doe"
                  value={data.name}
                  onChange={(e) => setData({ ...data, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mb-4">
                  <Scale className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">What's your weight?</h3>
                <p className="text-zinc-500 text-xs mt-1">We'll use this to track your progress.</p>
              </div>
              
              <div className="flex gap-2 mb-4 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setWeightUnit('kg')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    weightUnit === 'kg' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  KG
                </button>
                <button 
                  onClick={() => setWeightUnit('lbs')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    weightUnit === 'lbs' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  LBS
                </button>
              </div>

              <div className="relative mt-auto space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-bold text-white">{data.weight || 0}</span>
                  <span className="text-xl font-medium text-zinc-500 uppercase">{weightUnit}</span>
                </div>
                <input 
                  type="range" 
                  min={weightUnit === 'kg' ? "30" : "60"} 
                  max={weightUnit === 'kg' ? "200" : "440"} 
                  step="0.5"
                  value={data.weight || (weightUnit === 'kg' ? "75" : "165")}
                  onChange={(e) => setData({ ...data, weight: e.target.value })}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <input 
                  type="number" 
                  placeholder={weightUnit === 'kg' ? "75" : "165"}
                  value={data.weight}
                  onChange={(e) => setData({ ...data, weight: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all mt-4"
                />
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mb-4">
                  <Ruler className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">How tall are you?</h3>
                <p className="text-zinc-500 text-xs mt-1">Your height helps in BMI calculation.</p>
              </div>

              <div className="flex gap-2 mb-4 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button 
                  onClick={() => setHeightUnit('cm')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    heightUnit === 'cm' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  CM
                </button>
                <button 
                  onClick={() => setHeightUnit('ft')}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-xs font-bold transition-all",
                    heightUnit === 'ft' ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  FT/IN
                </button>
              </div>

              <div className="relative mt-auto space-y-6">
                {heightUnit === 'cm' ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-4xl font-bold text-white">{data.height || 0}</span>
                      <span className="text-xl font-medium text-zinc-500 uppercase">cm</span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="250" 
                      step="1"
                      value={data.height || "170"}
                      onChange={(e) => setData({ ...data, height: e.target.value })}
                      className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                    <input 
                      type="number" 
                      placeholder="180"
                      value={data.height}
                      onChange={(e) => setData({ ...data, height: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all mt-4"
                    />
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        placeholder="5"
                        value={data.heightFt}
                        onChange={(e) => setData({ ...data, heightFt: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium uppercase">ft</span>
                    </div>
                    <div className="relative flex-1">
                      <input 
                        type="number" 
                        placeholder="10"
                        value={data.heightIn}
                        onChange={(e) => setData({ ...data, heightIn: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium uppercase">in</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">What's your goal?</h3>
                <p className="text-zinc-500 text-xs mt-1">Optional, but helps you stay focused.</p>
              </div>
              <div className="mt-auto">
                <input 
                  type="text" 
                  placeholder="Lose 5kg, Build muscle..."
                  value={data.goal}
                  onChange={(e) => setData({ ...data, goal: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="flex-1 flex flex-col"
            >
              <div className="mb-6">
                <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mb-4">
                  <Camera className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-lg font-semibold text-white">Progress Photo</h3>
                <p className="text-zinc-500 text-xs mt-1">Optional. Start your journey with a photo.</p>
              </div>
              <div className="mt-auto">
                {data.photoUrl ? (
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800">
                    <img src={data.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setData({ ...data, photoUrl: '' })}
                      className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-xl backdrop-blur-md"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={startCamera}
                    className="w-full aspect-video bg-zinc-950 border-2 border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all cursor-pointer"
                  >
                    <Camera className="w-8 h-8" />
                    <span className="text-xs font-medium">Capture Photo</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {showCamera && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6"
              >
                <div className="w-full max-w-sm aspect-[3/4] bg-zinc-900 rounded-[40px] overflow-hidden relative border border-zinc-800 shadow-2xl">
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
                        onClick={confirmPhoto}
                        className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 active:scale-90 transition-transform"
                      >
                        <Check className="w-8 h-8" />
                      </button>
                    </>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex gap-3">
            {step > 1 && (
              <button 
                onClick={() => setStep(step - 1)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-4 rounded-2xl transition-all"
              >
                Back
              </button>
            )}
            <button 
              onClick={() => step < 5 ? setStep(step + 1) : handleComplete()}
              disabled={isNextDisabled()}
              className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 relative overflow-hidden"
            >
              <span className={cn("transition-opacity", loading ? "opacity-0" : "opacity-100")}>
                {step === 5 ? 'Complete' : 'Next'}
              </span>
              {!loading && <ArrowRight className="w-4 h-4" />}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
