import { useState, useRef } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { 
  User, 
  Bell, 
  LogOut, 
  ChevronRight, 
  Scale, 
  Ruler, 
  Target, 
  Clock, 
  Check, 
  Loader2, 
  ShieldCheck,
  Camera,
  X,
  Edit2,
  Plus,
  Upload
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Settings({ userData }: { userData: any }) {
  const [loading, setLoading] = useState(false);
  const [reminderTime, setReminderTime] = useState(userData.reminderTime || '08:00');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editData, setEditData] = useState({
    name: userData.name || '',
    weight: userData.weight || '',
    height: userData.height || '',
    goal: userData.goal || ''
  });

  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setShowCamera(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    setShowCamera(false);
    setCapturedImage(null);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      setCapturedImage(canvas.toDataURL('image/jpeg'));
    }
  };

  const handleUpdateProfilePhoto = async (photoUrl: string) => {
    if (!auth.currentUser) return;
    setLoading(true);
    const path = `users/${auth.currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { photoUrl });
      stopCamera();
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    setLoading(true);
    const path = `users/${auth.currentUser.uid}`;
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64String = reader.result as string;
          await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
            photoUrl: base64String
          });
          setLoading(false);
        } catch (err) {
          handleFirestoreError(err, OperationType.UPDATE, path);
          setLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    const path = `users/${auth.currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name: editData.name,
        weight: parseFloat(editData.weight.toString()),
        height: parseFloat(editData.height.toString()),
        goal: editData.goal
      });
      setIsEditingProfile(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReminder = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    const path = `users/${auth.currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        reminderTime
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  const formatHeight = (val: number, unit: string) => {
    if (!val) return 'None';
    if (unit === 'ft') {
      const ft = Math.floor(val / 12);
      const inch = Math.round(val % 12);
      return `${ft}'${inch}"`;
    }
    return `${val}cm`;
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <p className="text-zinc-500 text-sm mt-1">Manage your account and preferences.</p>
      </header>

      {/* Profile Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Profile</h3>
          <button 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="text-xs font-bold text-blue-500 flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" /> {isEditingProfile ? 'Cancel' : 'Edit'}
          </button>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg overflow-hidden border border-zinc-700">
                {userData.photoUrl ? (
                  <img src={userData.photoUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  userData.name?.[0]?.toUpperCase() || <User className="w-10 h-10 text-zinc-600" />
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex gap-1">
                <button 
                  onClick={startCamera}
                  className="p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-500 transition-all"
                  title="Take Photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <label 
                  className="p-2 bg-zinc-800 text-white rounded-xl shadow-lg hover:bg-zinc-700 transition-all cursor-pointer border border-zinc-700"
                  title="Upload Photo"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={loading} />
                </label>
              </div>
            </div>
            <div className="flex-1">
              {isEditingProfile ? (
                <input 
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              ) : (
                <h4 className="text-xl font-bold text-white">{userData.name || 'User'}</h4>
              )}
              <p className="text-zinc-500 text-[10px] mt-1 uppercase tracking-widest font-bold flex flex-col">
                <span>Member since {userData.createdAt ? format(new Date(userData.createdAt), 'MMMM yyyy') : '2024'}</span>
                {userData.createdAt && (
                  <span className="text-zinc-600 mt-0.5">Joined {format(new Date(userData.createdAt), 'h:mm a')}</span>
                )}
              </p>
            </div>
          </div>
          
          {isEditingProfile ? (
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Weight ({userData.weightUnit || 'kg'})</label>
                  <input 
                    type="number"
                    value={editData.weight}
                    onChange={(e) => setEditData({ ...editData, weight: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Height ({userData.heightUnit || 'cm'})</label>
                  <input 
                    type="number"
                    value={editData.height}
                    onChange={(e) => setEditData({ ...editData, height: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Goal</label>
                <input 
                  type="text"
                  value={editData.goal}
                  onChange={(e) => setEditData({ ...editData, goal: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <button 
                onClick={handleUpdateProfile}
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
              <ProfileStat icon={<Scale className="w-4 h-4" />} label="Weight" value={`${userData.weight}${userData.weightUnit || 'kg'}`} />
              <ProfileStat icon={<Ruler className="w-4 h-4" />} label="Height" value={formatHeight(userData.height, userData.heightUnit || 'cm')} />
              <ProfileStat icon={<Target className="w-4 h-4" />} label="Goal" value={userData.goal || 'None'} />
            </div>
          )}
        </div>
      </section>

      <AnimatePresence>
        {showCamera && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-sm aspect-[3/4] bg-zinc-900 rounded-[40px] overflow-hidden relative border border-zinc-800 shadow-2xl">
              {!capturedImage ? (
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              )}
              <button onClick={stopCamera} className="absolute top-6 right-6 p-3 bg-black/50 text-white rounded-2xl backdrop-blur-md border border-white/10"><X className="w-6 h-6" /></button>
            </div>
            <div className="mt-12 flex items-center gap-8">
              {!capturedImage ? (
                <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-zinc-800 flex items-center justify-center shadow-2xl active:scale-90 transition-transform">
                  <div className="w-16 h-16 bg-white rounded-full border-2 border-zinc-950" />
                </button>
              ) : (
                <>
                  <button onClick={() => setCapturedImage(null)} className="w-16 h-16 bg-zinc-900 text-white rounded-full flex items-center justify-center border border-zinc-800 shadow-xl"><X className="w-6 h-6" /></button>
                  <button onClick={() => handleUpdateProfilePhoto(capturedImage)} disabled={loading} className="w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40 active:scale-90 transition-transform">
                    {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Check className="w-8 h-8" />}
                  </button>
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications Section */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Notifications</h3>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                <Bell className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Daily Reminders</p>
                <p className="text-xs text-zinc-500">Get notified to log your workout</p>
              </div>
            </div>
            <button 
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                notificationsEnabled ? "bg-blue-600" : "bg-zinc-800"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                notificationsEnabled ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                  <Clock className="w-5 h-5 text-zinc-500" />
                </div>
                <p className="text-sm font-bold text-white">Reminder Time</p>
              </div>
              <input 
                type="time" 
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
            {reminderTime !== userData.reminderTime && (
              <button 
                onClick={handleUpdateReminder}
                disabled={loading}
                className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-xs font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Save Changes</>}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Account Actions */}
      <section className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Account</h3>
        <div className="space-y-3">
          <button 
            onClick={handleLogout}
            className="w-full bg-zinc-900/50 border border-zinc-800 hover:bg-zinc-900 transition-all p-5 rounded-3xl flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-800">
                <LogOut className="w-5 h-5 text-red-500" />
              </div>
              <span className="text-sm font-bold text-white">Logout</span>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
          </button>

          <div className="bg-zinc-900/20 border border-zinc-800/50 p-6 rounded-3xl flex items-start gap-4">
            <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-zinc-400">Data Security</p>
              <p className="text-[10px] text-zinc-600 leading-relaxed uppercase tracking-wider">
                Your data is stored securely in Firebase Firestore. We never share your personal information.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileStat({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-zinc-600">{icon}</div>
      <div className="text-center">
        <div className="text-xs font-bold text-white truncate max-w-[80px]">{value}</div>
        <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5">{label}</div>
      </div>
    </div>
  );
}
