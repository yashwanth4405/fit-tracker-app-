import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { 
  signInAnonymously,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { User, Mail, ArrowRight, Check, Loader2, Dumbbell, Puzzle } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  
  // Game State
  const [gameSolved, setGameSolved] = useState(false);
  const [mathProblem, setMathProblem] = useState({ a: 0, b: 0, result: 0 });
  const [userAnswer, setUserAnswer] = useState('');

  useEffect(() => {
    generateMathProblem();
  }, []);

  const generateMathProblem = () => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    setMathProblem({ a, b, result: a + b });
    setUserAnswer('');
    setGameSolved(false);
  };

  const handleVerifyGame = () => {
    if (parseInt(userAnswer) === mathProblem.result) {
      setGameSolved(true);
      setError('');
    } else {
      setError('Incorrect answer, try again.');
      generateMathProblem();
    }
  };

  const handleLogin = async () => {
    if (!email || !name) return setError('Please fill in all fields');
    if (!gameSolved) return setError('Please solve the verification puzzle first');
    
    setLoading(true);
    setError('');
    try {
      // Using Anonymous Auth for a frictionless experience as requested
      // We store the email and name in Firestore to "create the account"
      const cred = await signInAnonymously(auth);
      
      try {
        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          email: email,
          name: name,
          streak: 0,
          lastCheckIn: null,
          reminderTime: '08:00'
        }, { merge: true });
      } catch (fErr) {
        handleFirestoreError(fErr, OperationType.WRITE, `users/${cred.user.uid}`);
      }

      if (name) await updateProfile(cred.user, { displayName: name });
    } catch (err: any) {
      if (err.code === 'auth/admin-restricted-operation') {
        setError('Anonymous Authentication is not enabled in the Firebase Console. Please enable it in the Authentication > Sign-in method tab.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Fit Tracker</h1>
          <p className="text-zinc-500 mt-2 text-center">Simple habits. Real results.</p>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 backdrop-blur-sm shadow-xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Verification Game */}
            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Puzzle className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Human Verification</span>
              </div>
              
              <div className={cn(
                "bg-zinc-950 border rounded-2xl p-4 flex items-center justify-between transition-all",
                gameSolved ? "border-green-500/50 bg-green-500/5" : "border-zinc-800"
              )}>
                <div className="text-lg font-bold text-white">
                  {mathProblem.a} + {mathProblem.b} = ?
                </div>
                {gameSolved ? (
                  <div className="flex items-center gap-2 text-green-500 font-bold text-sm">
                    <Check className="w-4 h-4" /> Verified
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="?"
                      className="w-16 bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-center text-white focus:outline-none focus:border-blue-500"
                    />
                    <button 
                      onClick={handleVerifyGame}
                      className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>
            </div>

            <button 
              onClick={handleLogin}
              disabled={loading || !gameSolved}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 mt-6"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Get Started <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs mt-4 text-center font-medium"
            >
              {error}
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

