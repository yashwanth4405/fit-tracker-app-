/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import Auth from './components/Auth';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import Progress from './components/Progress';
import Settings from './components/Settings';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type View = 'dashboard' | 'progress' | 'settings' | 'onboarding';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) {
        setLoading(false);
        setUserData(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}`;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        if (!data.weight || !data.height) {
          setCurrentView('onboarding');
        }
      } else {
        setUserData(null);
        setCurrentView('onboarding');
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, path);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (currentView === 'onboarding' || !userData?.weight) {
    return <Onboarding onComplete={() => setCurrentView('dashboard')} />;
  }

  return (
    <div className="h-screen bg-zinc-950 text-zinc-100 font-sans relative overflow-hidden flex flex-col">
      {/* Mesh Background */}
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-400/10 rounded-full blur-[100px]" />
      </div>

      {/* Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 scroll-smooth">
        <div className="max-w-md mx-auto flex flex-col min-h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="px-6 pt-12 pb-32"
            >
              {currentView === 'dashboard' && <Dashboard userData={userData} setCurrentView={setCurrentView} />}
              {currentView === 'progress' && <Progress />}
              {currentView === 'settings' && <Settings userData={userData} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800 px-6 py-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="max-w-md mx-auto flex justify-around items-center">
          <NavButton 
            active={currentView === 'dashboard'} 
            onClick={() => setCurrentView('dashboard')}
            icon={<DashboardIcon />}
            label="Home"
          />
          <NavButton 
            active={currentView === 'progress'} 
            onClick={() => setCurrentView('progress')}
            icon={<ProgressIcon />}
            label="Progress"
          />
          <NavButton 
            active={currentView === 'settings'} 
            onClick={() => setCurrentView('settings')}
            icon={<SettingsIcon />}
            label="Settings"
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-colors",
        active ? "text-blue-500" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
    </button>
  );
}

import { LayoutDashboard, Camera, Settings as SettingsIconLucide, User } from 'lucide-react';
import { cn } from './lib/utils';

const DashboardIcon = () => <LayoutDashboard className="w-6 h-6" />;
const ProgressIcon = () => <Camera className="w-6 h-6" />;
const SettingsIcon = () => <SettingsIconLucide className="w-6 h-6" />;

