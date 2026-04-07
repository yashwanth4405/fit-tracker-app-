import { useState, useEffect, useMemo } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, setDoc, getDoc, collection, query, where, getDocs, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { format, startOfWeek, addDays, isSameDay, parseISO, differenceInDays, subDays, startOfMonth, endOfMonth, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Flame, TrendingUp, Trophy, Calendar as CalendarIcon, Loader2, Sparkles, Plus, X, ChevronLeft, ChevronRight as ChevronRightIcon, Trash2, Clock, Droplets, Dumbbell, User, Edit2, CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';

const MOTIVATIONS = [
  "The only bad workout is the one that didn't happen.",
  "Your body can stand almost anything. It's your mind that you have to convince.",
  "Fitness is not about being better than someone else. It's about being better than you were yesterday.",
  "Action is the foundational key to all success.",
  "Don't stop when you're tired. Stop when you're done.",
  "Motivation is what gets you started. Habit is what keeps you going."
];

type TimeView = 'day' | 'week' | 'month' | 'year';

interface Habit {
  id: string;
  name: string;
  completedDates: string[]; // YYYY-MM-DD
  streak: number;
  reminderTime?: string;
  frequency?: 'daily' | 'alternative';
}

const calculateStreak = (completedDates: string[]) => {
  if (completedDates.length === 0) return 0;
  
  const sortedDates = [...completedDates].sort((a, b) => b.localeCompare(a));
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  
  let currentStreak = 0;
  let checkDate = today;
  
  // If today isn't completed, start checking from yesterday
  if (!sortedDates.includes(today)) {
    if (!sortedDates.includes(yesterday)) return 0;
    checkDate = yesterday;
  }
  
  const dateSet = new Set(sortedDates);
  let d = parseISO(checkDate);
  
  while (dateSet.has(format(d, 'yyyy-MM-dd'))) {
    currentStreak++;
    d = subDays(d, 1);
  }
  
  return currentStreak;
};

export default function Dashboard({ userData, setCurrentView }: { userData: any, setCurrentView: (view: any) => void }) {
  const [timeView, setTimeView] = useState<TimeView>('day');
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [motivation] = useState(() => MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)]);

  // UI State
  const [isAddingHabit, setIsAddingHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitTime, setNewHabitTime] = useState('08:00');
  const [newHabitFreq, setNewHabitFreq] = useState<'daily' | 'alternative'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());

  const [isEditingReminders, setIsEditingReminders] = useState(false);
  const [reminders, setReminders] = useState({
    water: userData.waterReminder || 'Drink 2L',
    waterTime: userData.waterTime || '10:00',
    gym: userData.gymReminder || '18:00'
  });

  const handleUpdateReminders = async () => {
    if (!auth.currentUser) return;
    const path = `users/${auth.currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        waterReminder: reminders.water,
        waterTime: reminders.waterTime,
        gymReminder: reminders.gym
      });
      setIsEditingReminders(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const selectedDateStr = useMemo(() => format(selectedDate, 'yyyy-MM-dd'), [selectedDate]);
  const weekStart = useMemo(() => startOfWeek(selectedDate, { weekStartsOn: 1 }), [selectedDate]);

  const userId = auth.currentUser?.uid;

  useEffect(() => {
    if (!userId) return;
    
    const savedHabits = localStorage.getItem(`habits_v2_${userId}`);
    if (savedHabits) {
      setHabits(JSON.parse(savedHabits));
    } else {
      // Default habit for new users
      const defaultHabits: Habit[] = [
        {
          id: 'daily-workout',
          name: 'Daily Workout',
          completedDates: [],
          streak: 0,
          reminderTime: '08:00',
          frequency: 'daily'
        }
      ];
      setHabits(defaultHabits);
      localStorage.setItem(`habits_v2_${userId}`, JSON.stringify(defaultHabits));
    }
    setLoading(false);
  }, [userId]);

  const saveHabits = (updatedHabits: Habit[]) => {
    if (!userId) return;
    setHabits(updatedHabits);
    localStorage.setItem(`habits_v2_${userId}`, JSON.stringify(updatedHabits));
  };

  const handleToggleHabit = (habitId: string) => {
    const updatedHabits = habits.map(habit => {
      if (habit.id === habitId) {
        const isCompleted = habit.completedDates.includes(selectedDateStr);
        let newCompletedDates = [...habit.completedDates];
        
        if (isCompleted) {
          newCompletedDates = newCompletedDates.filter(d => d !== selectedDateStr);
        } else {
          newCompletedDates.push(selectedDateStr);
        }
        
        return {
          ...habit,
          completedDates: newCompletedDates,
          streak: calculateStreak(newCompletedDates)
        };
      }
      return habit;
    });
    saveHabits(updatedHabits);
  };

  const handleAddHabit = () => {
    if (!newHabitName.trim() || !userId) return;
    
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: newHabitName.trim(),
      completedDates: [],
      streak: 0,
      reminderTime: newHabitTime,
      frequency: newHabitFreq
    };
    
    saveHabits([...habits, newHabit]);
    setNewHabitName('');
    setIsAddingHabit(false);
  };

  const handleDeleteHabit = (e: React.MouseEvent, habitId: string) => {
    e.stopPropagation();
    saveHabits(habits.filter(h => h.id !== habitId));
  };

  const getWeeklyStats = (habit: Habit) => {
    const stats = new Array(7).fill(false);
    for (let i = 0; i < 7; i++) {
      const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
      if (habit.completedDates.includes(date)) stats[i] = true;
    }
    return stats;
  };

  return (
    <div className="space-y-8">
      {/* Header & Motivation */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentView('settings')}
              className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg overflow-hidden border border-zinc-700 hover:border-blue-500 transition-colors group"
            >
              {userData.photoUrl ? (
                <img src={userData.photoUrl} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
              ) : (
                userData.name?.[0]?.toUpperCase() || <User className="w-8 h-8 text-zinc-600" />
              )}
            </button>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white">Hello, {userData.name || 'User'}!</h2>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button 
                      onClick={() => {
                        setCalendarViewDate(selectedDate);
                        setIsCalendarOpen(true);
                      }}
                      className="flex items-center gap-2 bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-blue-500 transition-all group cursor-pointer"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase tracking-wider">{format(selectedDate, 'MMM do, yyyy')}</span>
                    </button>
                  </div>
                </div>
                {userData.createdAt && (
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">
                    Member since {format(new Date(userData.createdAt), 'yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 px-3 py-1 rounded-full border border-orange-500/20">
              <Flame className="w-4 h-4 fill-current" />
              <span className="text-sm font-bold">{userData.streak || 0}</span>
            </div>
            <button 
              onClick={() => {
                const now = new Date();
                setSelectedDate(now);
                setCalendarViewDate(now);
              }}
              className="text-[10px] font-bold text-blue-500 uppercase tracking-widest px-2 py-1 hover:bg-blue-500/10 rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 relative overflow-hidden group">
          <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-blue-500/5 group-hover:text-blue-500/10 transition-colors" />
          <p className="text-zinc-100 text-lg font-medium leading-relaxed relative z-10">
            "{motivation}"
          </p>
        </div>
      </header>

      {/* Calendar Modal */}
      <AnimatePresence>
        {isCalendarOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCalendarOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[40px] p-6 shadow-2xl relative z-10"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Date</span>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xl font-bold text-white">{format(calendarViewDate, 'MMMM')}</h4>
                    <select 
                      value={calendarViewDate.getFullYear()}
                      onChange={(e) => {
                        const newDate = new Date(calendarViewDate);
                        newDate.setFullYear(parseInt(e.target.value));
                        setCalendarViewDate(newDate);
                      }}
                      className="bg-zinc-800 text-white text-sm font-bold px-2 py-1 rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500"
                    >
                      {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCalendarViewDate(subMonths(calendarViewDate, 1))}
                    className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setCalendarViewDate(addMonths(calendarViewDate, 1))}
                    className="p-2 bg-zinc-800 border border-zinc-700 rounded-xl text-zinc-400 hover:text-white transition-colors"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                  <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-zinc-600 py-2">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {(() => {
                  const start = startOfWeek(startOfMonth(calendarViewDate), { weekStartsOn: 1 });
                  const end = endOfWeek(endOfMonth(calendarViewDate), { weekStartsOn: 1 });
                  const days = eachDayOfInterval({ start, end });
                  
                  return days.map(day => {
                    const isSelected = isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, calendarViewDate);
                    const isToday = isSameDay(day, new Date());
                    const isFuture = day > new Date();

                    return (
                      <button
                        key={day.toString()}
                        disabled={isFuture}
                        onClick={() => {
                          setSelectedDate(day);
                          setIsCalendarOpen(false);
                        }}
                        className={cn(
                          "aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all relative",
                          !isCurrentMonth && "opacity-20",
                          isSelected 
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/40 scale-110 z-10" 
                            : "hover:bg-zinc-800 text-zinc-400",
                          isToday && !isSelected && "text-blue-500 border border-blue-500/30",
                          isFuture && "opacity-10 cursor-not-allowed"
                        )}
                      >
                        {format(day, 'd')}
                        {isToday && !isSelected && (
                          <div className="absolute bottom-1 w-1 h-1 bg-blue-500 rounded-full" />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>

              <div className="mt-6 pt-6 border-t border-zinc-800 flex gap-3">
                <button 
                  onClick={() => {
                    const now = new Date();
                    setSelectedDate(now);
                    setIsCalendarOpen(false);
                  }}
                  className="flex-1 bg-zinc-800 text-white py-3 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-zinc-700 transition-colors"
                >
                  Today
                </button>
                <button 
                  onClick={() => setIsCalendarOpen(false)}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Reminders Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Reminders</h3>
          <button 
            onClick={() => setIsEditingReminders(!isEditingReminders)}
            className="text-xs font-bold text-blue-500 flex items-center gap-1"
          >
            {isEditingReminders ? 'Cancel' : <><Edit2 className="w-3 h-3" /> Edit</>}
          </button>
        </div>
        
        {isEditingReminders ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Water Goal</label>
                <input 
                  type="text"
                  value={reminders.water}
                  onChange={(e) => setReminders({ ...reminders, water: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Water Time</label>
                <input 
                  type="time"
                  value={reminders.waterTime}
                  onChange={(e) => setReminders({ ...reminders, waterTime: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Gym Time</label>
                <input 
                  type="time"
                  value={reminders.gym}
                  onChange={(e) => setReminders({ ...reminders, gym: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <button 
              onClick={handleUpdateReminders}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-all"
            >
              Save Reminders
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                <Droplets className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Water</span>
                <span className="text-sm font-bold text-white">{userData.waterReminder || 'Drink 2L'}</span>
                {userData.waterTime && (
                  <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {userData.waterTime}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
                <Dumbbell className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Gym</span>
                <span className="text-sm font-bold text-white">{userData.gymReminder || '06:00 PM'}</span>
                {userData.gymReminder && (
                  <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {userData.gymReminder}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Time View Selector */}
      <div className="flex p-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
        {(['day', 'week', 'month', 'year'] as TimeView[]).map((view) => (
          <button
            key={view}
            onClick={() => setTimeView(view)}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all",
              timeView === view 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {view}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={timeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {timeView === 'day' && (
            <>
              {/* Habits List */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Your Habits</h3>
                  {!isAddingHabit && (
                    <button 
                      onClick={() => setIsAddingHabit(true)}
                      className="text-xs font-bold text-blue-500 flex items-center gap-1 hover:text-blue-400 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Habit
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {isAddingHabit && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 mb-4 space-y-4">
                        <div className="flex gap-2">
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Enter habit name..."
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddHabit()}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Reminder Time</label>
                            <input 
                              type="time"
                              value={newHabitTime}
                              onChange={(e) => setNewHabitTime(e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Frequency</label>
                            <select 
                              value={newHabitFreq}
                              onChange={(e) => setNewHabitFreq(e.target.value as any)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
                            >
                              <option value="daily">Daily</option>
                              <option value="alternative">Alternative Days</option>
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={handleAddHabit}
                            className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-500 transition-colors"
                          >
                            Add Habit
                          </button>
                          <button 
                            onClick={() => setIsAddingHabit(false)}
                            className="bg-zinc-800 text-zinc-400 px-4 py-2.5 rounded-xl hover:bg-zinc-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {habits.length === 0 ? (
                  <div className="bg-zinc-900/30 border border-zinc-800 border-dashed rounded-[40px] p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-800">
                      <Sparkles className="w-8 h-8 text-zinc-700" />
                    </div>
                    <p className="text-zinc-500 text-sm">No habits yet. Add one to start tracking!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {habits.map((habit) => {
                      const isDone = habit.completedDates.includes(selectedDateStr);
                      const weeklyStats = getWeeklyStats(habit);
                      
                      return (
                        <div 
                          key={habit.id}
                          onClick={() => handleToggleHabit(habit.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => e.key === 'Enter' && handleToggleHabit(habit.id)}
                          className={cn(
                            "w-full aspect-square max-h-[320px] rounded-[40px] flex flex-col items-center justify-center gap-6 transition-all duration-500 shadow-2xl relative group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                            isDone 
                              ? "bg-green-600/10 border-2 border-green-600/50 text-green-500" 
                              : "bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800"
                          )}
                        >
                          <button 
                            onClick={(e) => handleDeleteHabit(e, habit.id)}
                            className="absolute top-8 right-8 p-2 bg-zinc-950/50 text-zinc-600 hover:text-red-500 rounded-xl border border-zinc-800 opacity-0 group-hover:opacity-100 transition-all z-20"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="flex flex-col items-center gap-4">
                            <div className={cn(
                              "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500",
                              isDone ? "bg-green-600 shadow-lg shadow-green-600/40" : "bg-zinc-800 border border-zinc-700"
                            )}>
                              {isDone ? <CheckCircle2 className="w-12 h-12 text-white" /> : <Circle className="w-12 h-12 text-zinc-600" />}
                            </div>
                            <div className="text-center space-y-1">
                              <span className="text-2xl font-bold tracking-tight block">{habit.name}</span>
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex items-center gap-1 bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full border border-orange-500/20">
                                  <Flame className="w-3 h-3 fill-current" />
                                  <span className="text-[10px] font-bold">{habit.streak}</span>
                                </div>
                                {habit.reminderTime && (
                                  <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-600 uppercase tracking-widest bg-zinc-950 px-2 py-0.5 rounded-full border border-zinc-800">
                                    <Clock className="w-2.5 h-2.5" />
                                    {habit.reminderTime}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Weekly Consistency Label inside card */}
                          <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3">
                            <div className="flex gap-1.5">
                              {new Array(7).fill(0).map((_, i) => (
                                <div 
                                  key={i} 
                                  className={cn(
                                    "w-1.5 h-1.5 rounded-full transition-colors duration-500",
                                    weeklyStats[i] ? (isDone ? "bg-green-500" : "bg-blue-500") : "bg-zinc-800"
                                  )} 
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">
                              {weeklyStats.filter(s => s).length}/7 Days this week
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Weekly Progress */}
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Weekly Overview</h3>
                </div>
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 flex justify-between items-center">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                    const isAnyDone = habits.some(h => {
                      const date = format(addDays(weekStart, i), 'yyyy-MM-dd');
                      return h.completedDates.includes(date);
                    });
                    return (
                      <div key={`${day}-${i}`} className="flex flex-col items-center gap-3">
                        <span className="text-[10px] font-bold text-zinc-600">{day}</span>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500",
                          isAnyDone 
                            ? "bg-green-600 text-white shadow-lg shadow-green-600/20" 
                            : "bg-zinc-950 border border-zinc-800 text-zinc-800"
                        )}>
                          {isAnyDone ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {timeView === 'week' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Weekly Progress</h3>
                <span className="text-xs font-medium text-zinc-400">Week of {format(weekStart, 'MMM d')}</span>
              </div>
              
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-8">
                {habits.length === 0 ? (
                  <p className="text-center text-zinc-500 text-sm py-4">No habits to show.</p>
                ) : (
                  habits.map((habit, habitIdx) => {
                    const stats = getWeeklyStats(habit);
                    const count = stats.filter(s => s).length;
                    const percentage = (count / 7) * 100;
                    return (
                      <div key={habit.id} className={cn("space-y-4", habitIdx > 0 && "pt-6 border-t border-zinc-800/50")}>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-white">{habit.name}</span>
                          <span className="text-xs font-bold text-blue-500">{Math.round(percentage)}%</span>
                        </div>
                        <div className="h-4 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            className="h-full bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                          />
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
                            <div key={`${habit.id}-${day}-${i}`} className="flex flex-col items-center gap-1">
                              <div className={cn(
                                "w-full aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold",
                                stats[i] ? "bg-green-600/20 text-green-500 border border-green-600/30" : "bg-zinc-950 text-zinc-700 border border-zinc-800"
                              )}>
                                {stats[i] ? <CheckCircle2 className="w-3 h-3" /> : day}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {timeView === 'month' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Monthly Progress</h3>
                <span className="text-xs font-medium text-zinc-400">{format(selectedDate, 'MMMM yyyy')}</span>
              </div>
              
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-6">
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={`${d}-${i}`} className="text-center text-[10px] font-bold text-zinc-600 py-2">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const start = startOfWeek(startOfMonth(selectedDate), { weekStartsOn: 1 });
                    const end = endOfWeek(endOfMonth(selectedDate), { weekStartsOn: 1 });
                    const days = eachDayOfInterval({ start, end });
                    
                    return days.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const isCurrentMonth = isSameMonth(day, selectedDate);
                      const isFuture = day > new Date();
                      
                      // Check if any habit was completed this day
                      // For simplicity, we'll just check the main habit for now
                      // But we could check all habits
                      const isMainDone = false; // We'd need to fetch monthly data
                      
                      return (
                        <div
                          key={day.toString()}
                          className={cn(
                            "aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all relative",
                            !isCurrentMonth && "opacity-10",
                            isFuture ? "text-zinc-800" : "bg-zinc-950 border border-zinc-800 text-zinc-500"
                          )}
                        >
                          {format(day, 'd')}
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="mt-8 p-4 bg-blue-600/5 border border-blue-600/10 rounded-2xl">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest text-center">
                    Monthly data is aggregated from your daily check-ins.
                  </p>
                </div>
              </div>
            </section>
          )}

          {timeView === 'year' && (
            <section className="space-y-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Yearly Activity</h3>
                <span className="text-xs font-medium text-zinc-400">{format(selectedDate, 'yyyy')}</span>
              </div>
              
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-8 space-y-8">
                <div className="flex flex-wrap gap-2 justify-center">
                  {Array.from({ length: 12 }).map((_, i) => {
                    const monthDate = new Date(selectedDate.getFullYear(), i, 1);
                    return (
                      <div key={i} className="flex flex-col items-center gap-2 w-[22%]">
                        <div className="w-full aspect-square bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center">
                          <span className="text-[10px] font-bold text-zinc-600">{format(monthDate, 'MMM')}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                    <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20">
                      <Flame className="w-6 h-6 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Best Streak</p>
                      <p className="text-xs text-zinc-500">{userData.streak || 0} Days this year</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-zinc-950/50 border border-zinc-800 rounded-2xl">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center border border-blue-500/20">
                      <Trophy className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Total Workouts</p>
                      <p className="text-xs text-zinc-500">Keep going to reach your goal!</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-4">
        <StatCard 
          icon={<TrendingUp className="w-4 h-4 text-blue-500" />}
          label="Weight"
          value={`${userData.weight} ${userData.weightUnit || 'kg'}`}
          subValue="Current"
        />
        <StatCard 
          icon={<Trophy className="w-4 h-4 text-yellow-500" />}
          label="Goal"
          value={userData.goal || "None"}
          subValue="Target"
        />
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, subValue }: { icon: React.ReactNode, label: string, value: string, subValue: string }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-zinc-950 rounded-lg border border-zinc-800">
          {icon}
        </div>
        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
      </div>
      <div>
        <div className="text-xl font-bold text-white truncate">{value}</div>
        <div className="text-[10px] font-medium text-zinc-600 uppercase tracking-widest mt-1">{subValue}</div>
      </div>
    </div>
  );
}
