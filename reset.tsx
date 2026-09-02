import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, signInWithCustomToken, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// --- Functional UI Elements ---
const IconCheck = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>;

let auth = null;
let db = null;
try {
  const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
  if (firebaseConfig) {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (e) {
  console.warn("Firebase config not found. Running in local UI mode.");
}

export default function App() {
  const [globalScreen, setGlobalScreen] = useState('SPLASH'); 
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Auth form states
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authAvatar, setAuthAvatar] = useState('🍓');
  const [authError, setAuthError] = useState('');

  const fruitAvatars = ['🍓', '🐼', '🍋', '🐻', '🍅', '🍐', '🍒', '🍊', '🍍'];

  // Settings states
  const [settingsName, setSettingsName] = useState('');
  const [settingsStatus, setSettingsStatus] = useState('');

  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [showFinanceView, setShowFinanceView] = useState(false); 
  
  const GOAL_CATEGORIES = [
    'Physical Health', 'Mental Health (Leisure / Travel)', 'Financial',
    'Career / Study', 'Relationships', 'Faith', 'Space / Home Management', 'Others'
  ];

  const categoryIcons = {
    'Physical Health': '🏃‍♀️', 'Mental Health (Leisure / Travel)': '🧘‍♀️',
    'Financial': '💰', 'Career / Study': '💼', 'Relationships': '🤝',
    'Faith': '🤲', 'Space / Home Management': '🏡', 'Others': '🌟'
  };

  const getTodayStr2026 = () => {
     const today = new Date().toISOString().split('T')[0];
     if (today.startsWith('2026')) return today;
     return '2026-08-31'; 
  };
  const getMonthStr2026 = () => getTodayStr2026().slice(0, 7);
  const getQuarterFromDate = (dateStr) => {
     const effectiveDate = dateStr || getTodayStr2026();
     const m = parseInt(effectiveDate.split('-')[1], 10);
     if (m <= 3) return 'Q1'; if (m <= 6) return 'Q2'; if (m <= 9) return 'Q3'; return 'Q4';
  };

  const [selectedDate, setSelectedDate] = useState(getTodayStr2026());
  const [selectedMonth, setSelectedMonth] = useState(getMonthStr2026()); 
  const [showCalendarGrid, setShowCalendarGrid] = useState(false);
  const [annualViewMode, setAnnualViewMode] = useState('monthly');
  const [selectedQuarter, setSelectedQuarter] = useState(getQuarterFromDate(getTodayStr2026()));

  const [introData, setIntroData] = useState({
    narrative: [{ id: 1, text: '' }], discomfort: [{ id: 1, text: '' }],
    energy: { peak: [{ id: 1, text: '' }], slump: [{ id: 1, text: '' }] },
    cargo: [{ id: 1, text: '' }],
    ikigai: {
      love: [{ id: 1, text: '' }], strengths: [{ id: 1, text: '' }], needs: [{ id: 1, text: '' }], paid: [{ id: 1, text: '' }],
      passion: [{ id: 1, text: '' }], mission: [{ id: 1, text: '' }], profession: [{ id: 1, text: '' }], vocation: [{ id: 1, text: '' }],
    }
  });

  const [goalsData, setGoalsData] = useState({ shortTerm: [], longTerm: [] });
  const [dailyData, setDailyData] = useState({});

  const defaultFinance = {
    grossSalary: '', tax: '', allowance: '',
    incomes: [{ id: 1, desc: '', amount: '' }],
    commitments: [{ id: 1, desc: '', amount: '' }],
    loans: [{ id: 1, desc: '', amount: '' }],
    creditCards: [{ id: 1, desc: '', amount: '' }],
    savings: [{ id: 1, desc: '', amount: '' }]
  };
  
  const defaultMonthly = {
    habitNames: ['Deep Work (90m)', 'Read 10 Pages', 'No Sugar'],
    cargoClearance: [{ id: 1, dimension: 'Physical', item: '', action: 'Keep' }],
    reflection: { wins: [{ id: 1, text: '', task: '', action: 'Migrate' }], misses: [{ id: 1, text: '', task: '', action: 'Migrate' }], migration: [{ id: 1, task: '', action: 'Migrate' }] }
  };

  const defaultQuarterly = {
    zoomOut: [],
    reflection: { wins: [{ id: 1, text: '', whys: ['', '', '', '', ''], conclusion: '' }], misses: [{ id: 1, text: '', whys: ['', '', '', '', ''], conclusion: '' }], migration: [{ id: 1, task: '', action: 'Migrate' }] }
  };

  const [financeStore, setFinanceStore] = useState({ [getMonthStr2026()]: defaultFinance });
  const [monthlyStore, setMonthlyStore] = useState({ [getMonthStr2026()]: defaultMonthly });
  const [quarterlyStore, setQuarterlyStore] = useState({ 'Q1': defaultQuarterly, 'Q2': defaultQuarterly, 'Q3': defaultQuarterly, 'Q4': defaultQuarterly });
  
  const [annualData, setAnnualData] = useState({
    zoomOut: [],
    reflection: { wins: [{ id: 1, text: '', whys: ['', '', '', '', ''], conclusion: '' }], misses: [{ id: 1, text: '', whys: ['', '', '', '', ''], conclusion: '' }], migration: [{ id: 1, task: '', action: 'Migrate' }] }
  });

  const [isAiLoading, setIsAiLoading] = useState({});

  useEffect(() => {
    setQuarterlyStore(prevStore => {
       const newStore = { ...prevStore };
       ['Q1', 'Q2', 'Q3', 'Q4'].forEach(qKey => {
          const currentQ = newStore[qKey] || defaultQuarterly;
          const validGoalsForThisQuarter = goalsData.shortTerm.filter(g => getQuarterFromDate(g.targetDate) === qKey);
          const validGoalIds = validGoalsForThisQuarter.map(g => g.id);
          let newZoomOut = (currentQ.zoomOut || []).filter(z => validGoalIds.includes(z.goalId));
          const existingZoomOutIds = newZoomOut.map(z => z.goalId);
          const zoomOutsToAdd = validGoalsForThisQuarter
            .filter(g => !existingZoomOutIds.includes(g.id))
            .map(g => ({ id: Date.now() + Math.random(), goalId: g.id, status: 'On Track', derailment: { issue: '', whys: ['', '', '', '', ''], fix: '' } }));
          newZoomOut = newZoomOut.map(z => {
            const matchedGoal = validGoalsForThisQuarter.find(g => g.id === z.goalId);
            return { ...z, goal: matchedGoal.text };
          });
          newStore[qKey] = { ...currentQ, zoomOut: [...newZoomOut, ...zoomOutsToAdd] };
       });
       return newStore;
    });

    setAnnualData(prev => {
       const sourceIds = goalsData.longTerm.map(g => g.id);
       let newZoomOut = (prev.zoomOut || []).filter(z => sourceIds.includes(z.goalId));
       const existingZoomOutIds = newZoomOut.map(z => z.goalId);
       const zoomOutsToAdd = goalsData.longTerm
         .filter(g => !existingZoomOutIds.includes(g.id))
         .map(g => ({ id: Date.now() + Math.random(), goalId: g.id, status: 'On Track', derailment: { issue: '', whys: ['', '', '', '', ''], fix: '' } }));
       newZoomOut = newZoomOut.map(z => {
         const matchedGoal = goalsData.longTerm.find(g => g.id === z.goalId);
         return { ...z, goal: matchedGoal.text };
       });
       return { ...prev, zoomOut: [...newZoomOut, ...zoomOutsToAdd] };
    });
  }, [goalsData.shortTerm, goalsData.longTerm]);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        }
      } catch (e) { console.error(e); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthUser(user);
      if (user && db) {
        setSettingsName(user.displayName || '');
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        // SECURE ISOLATION: Binds strictly to user.uid
        const docRef = doc(db, 'artifacts', appId, 'users', user.uid, 'data', 'store');
        try {
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const d = snap.data();
            if (d.introData) setIntroData(d.introData);
            if (d.goalsData) setGoalsData(d.goalsData);
            if (d.dailyData) setDailyData(d.dailyData);
            if (d.financeStore) setFinanceStore(d.financeStore);
            if (d.monthlyStore) setMonthlyStore(d.monthlyStore);
            if (d.quarterlyStore) setQuarterlyStore(d.quarterlyStore);
            if (d.annualData) setAnnualData(d.annualData);
          }
        } catch(e) { console.error("Error loading data", e); }
        setDataLoaded(true);
      } else {
        setDataLoaded(true);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Firestore Auto-Save Engine
  useEffect(() => {
    if (!authUser || !db || !dataLoaded) return;
    const timeoutId = setTimeout(() => {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const docRef = doc(db, 'artifacts', appId, 'users', authUser.uid, 'data', 'store');
      const stateToSave = { introData, goalsData, dailyData, financeStore, monthlyStore, quarterlyStore, annualData };
      setDoc(docRef, stateToSave, { merge: true }).catch(console.error);
    }, 1500);
    return () => clearTimeout(timeoutId);
  }, [introData, goalsData, dailyData, financeStore, monthlyStore, quarterlyStore, annualData, authUser, dataLoaded]);

  useEffect(() => {
    if (globalScreen === 'SPLASH') {
      const timer = setTimeout(() => {
        if (authLoading) return;
        if (authUser) setGlobalScreen('HOME');
        else setGlobalScreen('WELCOME');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [globalScreen, authUser, authLoading]);

  const callGemini = async (prompt, schema = null) => {
      const payload = { contents: [{ parts: [{ text: prompt }] }] };
      if (schema) {
          payload.generationConfig = { responseMimeType: "application/json", responseSchema: schema };
      }
      const apiKey = ""; 
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;
      
      try {
          const response = await fetch(apiUrl, { method: 'POST', body: JSON.stringify(payload) });
          const result = await response.json();
          const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
          return schema ? JSON.parse(text) : text;
      } catch (e) {
          console.error("Gemini API Error:", e);
          return null;
      }
  };

  const handleAiRefineGoal = async (type, id, currentText) => {
      if (!currentText) return;
      setIsAiLoading(p => ({ ...p, [id]: true }));
      const prompt = `Act as an elite productivity strategist. Rewrite this goal to be highly specific, measurable, and action-oriented based on 'The Box System Protocol'. Keep it under 12 words. Original goal: "${currentText}"`;
      const refinedText = await callGemini(prompt);
      if (refinedText) {
          setGoalsData(prev => {
              const newData = { ...prev };
              const idx = newData[type].findIndex(g => g.id === id);
              if (idx !== -1) newData[type][idx].text = refinedText.replace(/["*]/g, '').trim();
              return newData;
          });
      }
      setIsAiLoading(p => ({ ...p, [id]: false }));
  };

  const handleAiDebugDaily = async (dateStr, issue) => {
      if (!issue) return;
      setIsAiLoading(p => ({ ...p, ['daily-debug']: true }));
      const prompt = `Act as an elite productivity strategist using 'The Box System Protocol'. A user derailed today with this issue: "${issue}". Conduct a 5-Whys root cause analysis to find the underlying mechanical failure. Then, provide a 'System Fix' (a single, actionable mechanical change for tomorrow, not just 'try harder').`;
      
      const schema = {
          type: "OBJECT",
          properties: {
              whys: { type: "ARRAY", items: { type: "STRING" } },
              fix: { type: "STRING" }
          }
      };

      const result = await callGemini(prompt, schema);
      if (result && result.whys && result.fix) {
          updateDaily(dateStr, d => ({ 
              ...d, 
              derailment: { ...d.derailment, whys: result.whys, fix: result.fix } 
          }));
      }
      setIsAiLoading(p => ({ ...p, ['daily-debug']: false }));
  };
  
  const handleAiDebugZoom = async (id, issue) => {
      if (!issue) return;
      setIsAiLoading(p => ({ ...p, [`zoom-${id}`]: true }));
      const prompt = `Act as an elite productivity strategist using 'The Box System Protocol'. A quarterly goal is at risk due to this issue: "${issue}". Conduct a 5-Whys root cause analysis to find the underlying mechanical failure. Then, provide a 'System Fix' (a single, actionable mechanical change for the rest of the quarter).`;
      
      const schema = {
          type: "OBJECT",
          properties: {
              whys: { type: "ARRAY", items: { type: "STRING" } },
              fix: { type: "STRING" }
          }
      };

      const result = await callGemini(prompt, schema);
      if (result && result.whys && result.fix) {
          setQuarterlyData(prev => {
              const newZ = [...(prev.zoomOut || [])]; 
              const idx = newZ.findIndex(z => z.id === id);
              if (idx !== -1) {
                  newZ[idx].derailment.whys = result.whys;
                  newZ[idx].derailment.fix = result.fix;
              }
              return { ...prev, zoomOut: newZ };
          });
      }
      setIsAiLoading(p => ({ ...p, [`zoom-${id}`]: false }));
  };

  const generateAvatarSvgUri = (emoji) => {
     const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23ffffff" rx="50"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="65">${emoji}</text></svg>`;
     return `data:image/svg+xml;charset=utf-8,${svg}`;
  };

  const handleEmailAuth = async () => {
    setAuthError('');
    if (!authEmail || !authPassword || (isSignUp && !authName)) {
       setAuthError('please fill in all required fields.');
       return;
    }
    try {
       if (isSignUp) {
          const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
          const photoUrl = generateAvatarSvgUri(authAvatar);
          await updateProfile(res.user, { displayName: authName, photoURL: photoUrl });
       } else {
          await signInWithEmailAndPassword(auth, authEmail, authPassword);
       }
       setGlobalScreen('ONBOARDING');
    } catch (err) {
       setAuthError(err.message.replace('Firebase: ', '').toLowerCase());
    }
  };

  const handleGoogleLogin = async () => {
    if (!auth) { setGlobalScreen('ONBOARDING'); return; }
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setGlobalScreen('ONBOARDING');
    } catch (err) {
      try {
         await signInAnonymously(auth);
         setGlobalScreen('ONBOARDING');
      } catch (anonErr) { setGlobalScreen('ONBOARDING'); }
    }
  };

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    setAuthUser(null);
    setGlobalScreen('WELCOME');
  };

  const handleUpdateProfile = async () => {
     setSettingsStatus('');
     if (authUser && settingsName) {
        try {
           await updateProfile(authUser, { displayName: settingsName });
           setSettingsStatus('profile updated successfully.');
           setTimeout(() => setSettingsStatus(''), 3000);
        } catch (e) {
           setSettingsStatus('failed to update profile.');
        }
     }
  };

  const userName = authUser?.displayName?.split(' ')[0] || 'Conductor';

  const financeData = financeStore[selectedMonth] || defaultFinance;
  const monthlyData = monthlyStore[selectedMonth] || defaultMonthly;
  const quarterlyData = quarterlyStore[selectedQuarter] || defaultQuarterly;

  const setFinanceData = (updater) => setFinanceStore(prev => ({ ...prev, [selectedMonth]: typeof updater === 'function' ? updater(prev[selectedMonth] || defaultFinance) : updater }));
  const setMonthlyData = (updater) => setMonthlyStore(prev => ({ ...prev, [selectedMonth]: typeof updater === 'function' ? updater(prev[selectedMonth] || defaultMonthly) : updater }));
  const setQuarterlyData = (updater) => setQuarterlyStore(prev => ({ ...prev, [selectedQuarter]: typeof updater === 'function' ? updater(prev[selectedQuarter] || defaultQuarterly) : updater }));

  const calcTotal = (arr) => arr.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
  const f_gross = parseFloat(financeData.grossSalary) || 0;
  const f_tax = parseFloat(financeData.tax) || 0;
  const f_allowance = parseFloat(financeData.allowance) || 0;
  const f_nett = f_gross - f_tax + f_allowance;
  const f_carLimit = f_nett * 12;
  const f_houseLimit = f_nett * 30;
  const f_emergencyFund = f_nett * 6;
  const f_retirementFund = f_nett * 300;
  const f_totalIncome = calcTotal(financeData.incomes);
  const f_totalCommitment = calcTotal(financeData.commitments);
  const f_totalLoan = calcTotal(financeData.loans);
  const f_totalCC = calcTotal(financeData.creditCards);
  const f_totalSavings = calcTotal(financeData.savings);
  const f_actualNecessity = f_totalCommitment + f_totalLoan + f_totalCC;
  const f_ruleNecessity = f_nett * 0.5;
  const f_ruleSavings = f_nett * 0.2;
  const f_balance = f_totalIncome - f_actualNecessity - f_totalSavings;

  const getNetBalanceForMonth = (mStr) => {
    const d = financeStore[mStr] || defaultFinance;
    const fIn = calcTotal(d.incomes);
    const fOut = calcTotal(d.commitments) + calcTotal(d.loans) + calcTotal(d.creditCards);
    const fSav = calcTotal(d.savings);
    return fIn - fOut - fSav;
  };

  const updateFinanceTop = (field, val) => setFinanceData(p => ({ ...p, [field]: val }));
  const updateFinanceList = (category, id, field, val) => {
    setFinanceData(prev => {
      const newArr = [...prev[category]];
      const idx = newArr.findIndex(i => i.id === id);
      if (idx !== -1) newArr[idx][field] = val;
      return { ...prev, [category]: newArr };
    });
  };
  const addFinanceList = (category) => setFinanceData(p => ({ ...p, [category]: [...p[category], { id: Date.now(), desc: '', amount: '' }] }));
  const removeFinanceList = (category, id) => setFinanceData(p => ({ ...p, [category]: p[category].filter(i => i.id !== id) }));

  const getDailyForDate = (dateStr) => {
    return dailyData[dateStr] || {
      priorities: [{ id: 1, text: '', completed: false }, { id: 2, text: '', completed: false }, { id: 3, text: '', completed: false }],
      kaizen: { deen: 'ON TRACK', dunya: 'ON TRACK', fuel: 'ON TRACK' },
      derailment: { issue: '', whys: ['', '', '', '', ''], fix: '' },
      highlight: '', habits: [false, false, false]
    };
  };
  const updateDaily = (dateStr, updater) => setDailyData(prev => ({ ...prev, [dateStr]: typeof updater === 'function' ? updater(getDailyForDate(dateStr)) : updater }));

  const calculateHabitStreaks = () => {
    let currentStreak = 0; let longestStreak = 0; let tempStreak = 0;
    const today = new Date(getTodayStr2026());
    for (let i = 89; i >= 0; i--) {
      const checkDate = new Date(today); checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const dayData = dailyData[dateStr];
      const hasAnyHabit = dayData && dayData.habits.some(h => h === true);
      if (hasAnyHabit) {
        tempStreak++;
        if (tempStreak > longestStreak) longestStreak = tempStreak;
      } else {
        if (i === 0 || i === 1) currentStreak = tempStreak; 
        tempStreak = 0;
      }
      if (i === 0 && tempStreak > 0) currentStreak = tempStreak;
    }
    return { currentStreak, longestStreak };
  };
  const streaks = calculateHabitStreaks();

  const addDynamicBox = (section, category, subCategory = null) => {
    if (section === 'intro') {
      setIntroData(prev => {
        const newData = { ...prev };
        if (subCategory) newData[category][subCategory] = [...(newData[category][subCategory] || []), { id: Date.now(), text: '' }];
        else newData[category] = [...(newData[category] || []), { id: Date.now(), text: '' }];
        return newData;
      });
    } else if (section === 'reflection') {
      const setter = category === 'monthly' ? setMonthlyData : category === 'quarterly' ? setQuarterlyData : setAnnualData;
      setter(prev => ({
        ...prev,
        reflection: { ...prev.reflection, [subCategory]: [...(prev.reflection[subCategory] || []), { id: Date.now(), text: '', task: '', action: 'Migrate' }] }
      }));
    }
  };

  const updateDynamicBox = (section, category, id, val, subCategory = null, field = 'text') => {
    if (section === 'intro') {
      setIntroData(prev => {
        const newData = { ...prev };
        const targetArray = subCategory ? newData[category][subCategory] : newData[category];
        const idx = targetArray.findIndex(item => item.id === id);
        if (idx !== -1) targetArray[idx].text = val;
        return newData;
      });
    } else if (section === 'reflection') {
       const setter = category === 'monthly' ? setMonthlyData : category === 'quarterly' ? setQuarterlyData : setAnnualData;
       setter(prev => {
         const newData = { ...prev };
         const targetArray = newData.reflection[subCategory] || [];
         const idx = targetArray.findIndex(item => item.id === id);
         if (idx !== -1) targetArray[idx][field] = val;
         return newData;
       });
    }
  };

  const renderDynamicList = (title, subtitle, section, category, subCategory = null) => {
    let list = [];
    if (section === 'intro') {
      list = subCategory ? (introData[category]?.[subCategory] || []) : (introData[category] || []);
    } else if (section === 'reflection') {
      const dataState = category === 'monthly' ? monthlyData : category === 'quarterly' ? quarterlyData : annualData;
      list = dataState.reflection[subCategory] || [];
    }

    return (
      <div className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] shadow-sm flex flex-col h-full border border-white/50">
        <h3 className="font-roboto text-xl uppercase tracking-wide text-gray-900 mb-2">{title}</h3>
        {subtitle && <p className="font-opensans text-sm capitalize font-semibold text-gray-500 mb-6">{subtitle}</p>}
        <div className="space-y-4 flex-1">
          {list.map((item, idx) => (
            <div key={item.id} className="flex gap-4 items-start group">
              <span className="font-opensans font-semibold text-gray-400 mt-3 text-sm">{idx + 1}.</span>
              <textarea 
                value={item.text || ''}
                onChange={(e) => updateDynamicBox(section, category, item.id, e.target.value, subCategory)}
                className="font-montserrat w-full bg-white/50 rounded-2xl p-4 text-sm lowercase text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 transition-all resize-none min-h-[70px] placeholder:italic placeholder:text-gray-400 placeholder:lowercase border border-white"
                placeholder="enter details here..."
              />
            </div>
          ))}
        </div>
        <button 
          onClick={() => addDynamicBox(section, category, subCategory)} 
          className="font-roboto mt-6 px-6 py-3 bg-white text-xs uppercase tracking-wider text-gray-500 hover:text-gray-900 rounded-full transition-all shadow-sm self-start border border-gray-100"
        >
          Add Row
        </button>
      </div>
    );
  };

  const renderRCAList = (title, subtitle, period, subCategory) => {
    const dataState = period === 'quarterly' ? quarterlyData : annualData;
    const setData = period === 'quarterly' ? setQuarterlyData : setAnnualData;
    const list = dataState.reflection[subCategory] || [];

    const updateRCA = (id, field, val, whyIdx = null) => {
      setData(prev => {
        const newData = { ...prev };
        const targetArray = [...(newData.reflection[subCategory] || [])];
        const idx = targetArray.findIndex(item => item.id === id);
        if (idx !== -1) {
          const item = { ...targetArray[idx] };
          if (field === 'whys') {
            const newWhys = [...(item.whys || ['', '', '', '', ''])];
            newWhys[whyIdx] = val; item.whys = newWhys;
          } else { item[field] = val; }
          targetArray[idx] = item; newData.reflection[subCategory] = targetArray;
        }
        return newData;
      });
    };

    return (
      <div className="bg-white/60 backdrop-blur-md p-6 md:p-8 rounded-[2.5rem] shadow-sm border border-white/50">
        <h3 className="font-roboto text-xl uppercase tracking-wide text-gray-900 mb-2 flex items-center gap-3">
          {title} <span className="font-roboto text-xs bg-white text-gray-600 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border border-gray-100">RCA</span>
        </h3>
        <p className="font-opensans text-sm capitalize font-semibold text-gray-500 mb-8">{subtitle}</p>
        
        <div className="space-y-8">
          {list.map((item) => {
             const whys = item.whys || ['', '', '', '', ''];
             return (
               <div key={item.id} className="bg-white/50 p-6 md:p-8 rounded-3xl border border-white shadow-sm">
                 <div className="mb-6">
                   <textarea value={item.text || ''} onChange={(e) => updateRCA(item.id, 'text', e.target.value)} className="font-montserrat w-full bg-white rounded-2xl p-5 text-sm lowercase text-gray-800 outline-none focus:ring-1 focus:ring-gray-300 resize-none min-h-[80px] border border-gray-50 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" placeholder={`describe the ${subCategory}...`} />
                 </div>
                 <div className="pl-6 space-y-5 border-l-2 border-gray-300">
                   <div>
                     <h4 className="font-opensans text-sm capitalize font-semibold text-gray-600 mb-4">5-Why Root Cause</h4>
                     <div className="space-y-3">
                       {whys.map((why, wIdx) => (
                         <div key={wIdx} className="flex items-center gap-4">
                           <span className="font-opensans text-sm capitalize font-semibold text-gray-400 w-8 text-right">Why</span>
                           <input type="text" value={why} onChange={(e) => updateRCA(item.id, 'whys', e.target.value, wIdx)} className="font-montserrat flex-1 bg-transparent border-b border-gray-200 py-2 text-sm lowercase outline-none focus:border-gray-400 text-gray-800 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" placeholder="drill down..." />
                         </div>
                       ))}
                     </div>
                   </div>
                   <div className="pt-4">
                     <label className="font-opensans text-sm capitalize font-semibold text-gray-600 block mb-3">{subCategory === 'wins' ? 'Replication Strategy' : 'System Fix'}</label>
                     <input type="text" value={item.conclusion || ''} onChange={(e) => updateRCA(item.id, 'conclusion', e.target.value)} className="font-montserrat w-full bg-white border border-gray-100 rounded-2xl p-4 text-sm lowercase text-gray-800 outline-none focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" placeholder="actionable change..." />
                   </div>
                 </div>
               </div>
             );
          })}
        </div>
        <button onClick={() => setData(prev => ({ ...prev, reflection: { ...prev.reflection, [subCategory]: [...(prev.reflection[subCategory] || []), { id: Date.now(), text: '', whys: ['', '', '', '', ''], conclusion: '' }] } }))} className="font-roboto mt-8 px-6 py-3 bg-white text-xs uppercase tracking-wider text-gray-600 hover:text-gray-900 shadow-sm rounded-full transition-all border border-gray-100">Add {subCategory}</button>
      </div>
    );
  };

  // Minimalist, text-focused entry screens based on the reference aesthetic
  const renderSplashScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center text-[#111827] animate-fade-in relative overflow-hidden bg-[#F5F2EF]">
      <div className="relative z-10 flex flex-col items-center">
         <h1 className="font-roboto text-4xl uppercase tracking-widest text-[#111827] drop-shadow-sm mb-4">RESET</h1>
         <div className="w-12 h-1 rounded-full bg-[#111827]"></div>
      </div>
    </div>
  );

  const renderWelcomeScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 animate-fade-in text-center relative overflow-hidden bg-[#F5F2EF]">
       <div className="max-w-md w-full relative z-10 p-10 rounded-[3rem]">
         <h2 className="font-roboto text-3xl uppercase tracking-wider text-[#111827] mb-6">Welcome</h2>
         <p className="font-montserrat text-sm lowercase text-[#4B5563] mb-12 leading-relaxed tracking-wide">
           from chaos to order.<br/>from dream to destination.
         </p>
         <button onClick={() => setGlobalScreen('LOGIN')} className="font-roboto w-full bg-[#111827] text-white py-4 rounded-full shadow-lg hover:shadow-xl transition-all text-sm uppercase tracking-wider">
           Get Started
         </button>
       </div>
    </div>
  );

  const renderLoginScreen = () => (
    <div className="min-h-screen flex flex-col justify-center px-6 animate-fade-in relative overflow-hidden bg-[#F5F2EF]">
       <div className="max-w-sm w-full mx-auto relative z-10 bg-white/40 p-10 rounded-[3rem] shadow-sm border border-white/60">
         <h2 className="font-roboto text-2xl uppercase tracking-wider text-[#111827] mb-2">{isSignUp ? 'Register Now' : 'Welcome Back'}</h2>
         <p className="font-opensans text-sm capitalize font-semibold text-[#4B5563] mb-8">
           {isSignUp ? 'Join the execution protocol.' : 'Access your command center.'}
         </p>
         
         {authError && <div className="font-montserrat text-xs lowercase text-rose-500 bg-rose-50 p-3 rounded-xl mb-6 border border-rose-100">{authError}</div>}

         <div className="space-y-4 mb-8">
            {isSignUp && (
              <div className="animate-fade-in">
                 <label className="font-opensans text-xs capitalize font-semibold text-gray-500 block mb-3 pl-2">Select Avatar</label>
                 <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar px-2 mb-4">
                    {fruitAvatars.map(emoji => (
                       <button key={emoji} onClick={() => setAuthAvatar(emoji)} className={`w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-3xl transition-all ${authAvatar === emoji ? 'bg-white shadow-md transform scale-110 border-2 border-[#111827]' : 'bg-white/50 border-2 border-transparent hover:bg-white/80'}`}>
                          {emoji}
                       </button>
                    ))}
                 </div>
                 <input type="text" placeholder="full name" value={authName} onChange={e => setAuthName(e.target.value)} className="font-montserrat w-full bg-white/80 border border-white rounded-2xl p-4 text-sm lowercase text-[#111827] outline-none focus:ring-1 focus:ring-gray-300 shadow-sm transition-all placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
              </div>
            )}
            <input type="email" placeholder="email address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} className="font-montserrat w-full bg-white/80 border border-white rounded-2xl p-4 text-sm lowercase text-[#111827] outline-none focus:ring-1 focus:ring-gray-300 shadow-sm transition-all placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
            <input type="password" placeholder="password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} className="font-montserrat w-full bg-white/80 border border-white rounded-2xl p-4 text-sm lowercase text-[#111827] outline-none focus:ring-1 focus:ring-gray-300 shadow-sm transition-all placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
         </div>

         <button onClick={handleEmailAuth} className="font-roboto w-full bg-[#111827] text-white py-4 rounded-full shadow-md hover:bg-gray-800 transition-all text-sm uppercase tracking-wider mb-6">
           {isSignUp ? 'Sign Up' : 'Login'}
         </button>

         <button onClick={() => { setIsSignUp(!isSignUp); setAuthError(''); }} className="font-montserrat text-xs lowercase text-[#4B5563] w-full text-center hover:text-gray-800 transition-colors mb-6">
            {isSignUp ? 'already have an account? login' : "don't have an account? sign up"}
         </button>

         <div className="relative flex items-center py-4 mb-6">
            <div className="flex-grow border-t border-gray-300/50"></div>
            <span className="font-opensans font-semibold flex-shrink-0 mx-4 text-gray-500 text-xs capitalize">Or</span>
            <div className="flex-grow border-t border-gray-300/50"></div>
         </div>

         <button onClick={handleGoogleLogin} className="font-roboto w-full bg-white border border-gray-200 text-[#111827] py-4 rounded-full shadow-sm hover:bg-gray-50 transition-all text-sm uppercase tracking-wider">
            Google Auth
         </button>
       </div>
    </div>
  );

  const renderOnboardingScreen = () => (
    <div className="min-h-screen flex flex-col px-6 py-12 animate-fade-in relative overflow-hidden bg-[#F5F2EF]">
       <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto w-full relative z-10 p-8 rounded-[3rem]">
         <div className="w-16 h-16 mb-8 mx-auto bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 text-[#111827]">
           <IconCheck />
         </div>
         <h2 className="font-roboto text-2xl uppercase tracking-wider text-[#111827] mb-4">The Protocol</h2>
         <p className="font-montserrat text-sm lowercase text-[#4B5563] mb-12 leading-relaxed">
           respect the container. close the full loop. operate in the shinkansen zone. execute your strategy optimally.
         </p>
         
         <div className="w-full flex flex-col gap-6 mt-auto">
            <button onClick={() => setGlobalScreen('HOME')} className="font-roboto w-full bg-[#111827] text-white py-4 rounded-full shadow-lg hover:bg-gray-800 transition-all text-sm uppercase tracking-wider">
              Enter Dashboard
            </button>
         </div>
       </div>
    </div>
  );

  const renderSubscriptionScreen = () => (
    <div className="min-h-screen flex flex-col justify-center px-6 animate-fade-in relative overflow-hidden bg-[#F5F2EF]">
       <div className="max-w-sm w-full mx-auto relative z-10 bg-white/40 p-8 rounded-[3rem] shadow-sm border border-white/60 text-center">
          <h2 className="font-roboto text-2xl uppercase tracking-wider text-[#111827] mb-2">Upgrade</h2>
          <p className="font-opensans text-sm capitalize font-semibold text-[#4B5563] mb-8">Unlock all premium execution tools.</p>
          
          <div className="bg-white/60 rounded-3xl p-6 border border-white/50 shadow-sm mb-8 text-left">
             <h3 className="font-roboto text-xl uppercase tracking-wide text-[#111827] mb-1">Lifetime Access</h3>
             <div className="font-montserrat text-3xl font-bold text-[#111827] mb-6"><span className="uppercase">MYR</span> 0.00</div>
             <ul className="space-y-3 font-montserrat text-sm lowercase text-[#4B5563]">
                <li className="flex items-center gap-3"><span className="text-gray-900"><IconCheck /></span> 12-week periodization</li>
                <li className="flex items-center gap-3"><span className="text-gray-900"><IconCheck /></span> financial audit matrix</li>
                <li className="flex items-center gap-3"><span className="text-gray-900"><IconCheck /></span> daily kaizen rca</li>
             </ul>
          </div>

          <button onClick={() => setGlobalScreen('HOME')} className="font-roboto w-full bg-[#111827] text-white py-4 rounded-full shadow-md hover:bg-gray-800 transition-all text-sm uppercase tracking-wider mb-4">
            Claim Promotion
          </button>
          <button onClick={() => setGlobalScreen('HOME')} className="font-roboto text-xs text-gray-500 uppercase tracking-wider hover:text-gray-800 transition-colors">Back to Dashboard</button>
       </div>
    </div>
  );

  const renderProfileScreen = () => (
    <div className="min-h-screen flex flex-col px-6 py-12 animate-fade-in relative overflow-hidden bg-[#F5F2EF]">
       <div className="max-w-sm w-full mx-auto relative z-10">
         <button onClick={() => setGlobalScreen('HOME')} className="font-roboto mb-8 text-sm text-[#4B5563] hover:text-[#111827] uppercase tracking-wider bg-white/60 px-6 py-3 rounded-full border border-white/50 shadow-sm">Back</button>
         
         <div className="bg-white/40 p-8 rounded-[3rem] shadow-sm border border-white/60 mb-6">
            <div className="flex flex-col items-center text-center">
               <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center text-2xl font-bold text-gray-400 uppercase overflow-hidden mb-4">
                  {authUser?.photoURL ? <img src={authUser.photoURL} className="w-full h-full object-cover" /> : userName.charAt(0)}
               </div>
               <h2 className="font-roboto text-2xl uppercase tracking-wider text-[#111827]">{userName}</h2>
               <p className="font-montserrat text-sm lowercase text-[#4B5563] mt-1">{authUser?.email || 'anonymous conductor'}</p>
            </div>
         </div>

         <div className="bg-white/40 rounded-[2.5rem] shadow-sm border border-white/60 overflow-hidden">
            {[
               { label: 'Account Settings', action: () => setGlobalScreen('SETTINGS') },
               { label: 'Privacy & Security' },
               { label: 'Appearance' },
               { label: 'Help & Support' }
            ].map((item, i) => (
               <button key={i} onClick={item.action} className="font-opensans w-full flex items-center justify-between p-6 border-b border-gray-100/50 text-sm capitalize font-semibold text-[#111827] hover:bg-white/50 transition-colors">
                  {item.label}
               </button>
            ))}
            <button onClick={handleLogout} className="font-opensans w-full flex items-center justify-between p-6 text-sm capitalize font-semibold text-rose-500 hover:bg-white/50 transition-colors">
               Log Out
            </button>
         </div>
       </div>
    </div>
  );

  const renderSettingsScreen = () => (
    <div className="min-h-screen flex flex-col px-6 py-12 animate-fade-in relative overflow-hidden bg-[#F5F2EF]">
       <div className="max-w-sm w-full mx-auto relative z-10">
         <button onClick={() => setGlobalScreen('PROFILE')} className="font-roboto mb-8 text-sm text-[#4B5563] hover:text-[#111827] uppercase tracking-wider bg-white/60 px-6 py-3 rounded-full border border-white/50 shadow-sm">Back</button>
         
         <div className="bg-white/40 p-8 rounded-[3rem] shadow-sm border border-white/60 mb-6 text-center">
            <h2 className="font-roboto text-2xl uppercase tracking-wider text-[#111827] mb-2">Settings</h2>
            <p className="font-opensans text-sm capitalize font-semibold text-[#4B5563] mb-8">update your account details.</p>
            
            {settingsStatus && <div className="font-montserrat text-xs lowercase text-[#4B5563] bg-white/80 p-3 rounded-xl mb-6 shadow-sm border border-gray-100">{settingsStatus}</div>}

            <div className="space-y-4 mb-8 text-left">
               <div>
                  <label className="font-opensans text-sm capitalize font-semibold text-[#4B5563] block mb-2 px-2">Display Name</label>
                  <input type="text" placeholder="your name" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} className="font-montserrat w-full bg-white/80 border border-white rounded-2xl p-4 text-sm lowercase text-[#111827] outline-none focus:ring-1 focus:ring-gray-300 shadow-sm transition-all placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
               </div>
               <div>
                  <label className="font-opensans text-sm capitalize font-semibold text-[#4B5563] block mb-2 px-2">Email Address</label>
                  <input type="email" disabled value={authUser?.email || 'Anonymous'} className="font-montserrat w-full bg-gray-50/50 border border-transparent rounded-2xl p-4 text-sm lowercase text-gray-500 outline-none cursor-not-allowed" />
               </div>
            </div>

            <button onClick={handleUpdateProfile} className="font-roboto w-full bg-[#111827] text-white py-4 rounded-full shadow-md hover:bg-gray-800 transition-all text-sm uppercase tracking-wider mb-6">
              Save Changes
            </button>
         </div>
       </div>
    </div>
  );

  const renderDashboard = () => {
    const todayData = getDailyForDate(getTodayStr2026());
    const completedPriorities = todayData.priorities.filter(p => p.text.trim() !== '' && p.completed).length;
    const totalPriorities = todayData.priorities.filter(p => p.text.trim() !== '').length;
    
    const dash_f_balance = getNetBalanceForMonth(getTodayStr2026().slice(0, 7));
    
    const savageQuotes = [
      "small changes make a huge difference.", "track daily, grow daily.", "clear the clutter, find your focus.",
      "habits shape your future.", "consistent action over intense bursts.", "protect your peace, execute your plan.",
      "you are building your best self today."
    ];
    const todayQuote = savageQuotes[new Date(getTodayStr2026()).getDay() % savageQuotes.length];

    const allGoals = [...goalsData.shortTerm, ...goalsData.longTerm];
    const categoryStats = GOAL_CATEGORIES.map(cat => {
      const catGoals = allGoals.filter(g => g.category === cat);
      const total = catGoals.length;
      const completed = catGoals.filter(g => g.completed).length;
      return { category: cat, total, completed, isMastered: total > 0 && total === completed };
    });

    return (
      <div className="space-y-8 animate-fade-in relative z-10">
        
        <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 shadow-sm border border-white/50 relative overflow-hidden">
           <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <h2 className="font-roboto text-2xl md:text-3xl uppercase tracking-wider text-gray-900 mb-4">
                  Welcome, {userName}.
                </h2>
                <div className="font-opensans inline-block bg-white text-gray-800 text-sm font-semibold capitalize px-5 py-2 rounded-full shadow-sm border border-gray-100">Ready To Grow</div>
              </div>
              <div className="bg-white/80 p-6 rounded-3xl max-w-sm w-full shadow-sm border border-white">
                <p className="font-montserrat text-sm lowercase text-gray-700 leading-relaxed text-center italic text-gray-600">"{todayQuote}"</p>
              </div>
           </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Priorities', val: `${completedPriorities}/${totalPriorities || 0}`, bg: 'bg-white/40 backdrop-blur-md border border-white/50 text-gray-900' },
            { label: 'Habit Streak', val: `${streaks.currentStreak} days`, bg: 'bg-white/40 backdrop-blur-md border border-white/50 text-gray-900' },
            { label: 'Total Goals', val: `${allGoals.filter(g=>g.completed).length}/${allGoals.length}`, bg: 'bg-white/40 backdrop-blur-md border border-white/50 text-gray-900' },
            { label: 'Net Balance', val: <><span className="uppercase">MYR</span> {dash_f_balance.toFixed(0)}</>, bg: 'bg-white/40 backdrop-blur-md border border-white/50 text-gray-900' }
          ].map((stat, i) => (
             <div key={i} className={`${stat.bg} p-8 rounded-[2.5rem] shadow-sm flex flex-col justify-between`}>
               <div className="font-opensans text-sm capitalize font-semibold opacity-80 mb-2">{stat.label}</div>
               <div className="font-montserrat text-2xl lowercase font-bold">{stat.val}</div>
             </div>
          ))}
        </div>

        <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-10 shadow-sm">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 border-b border-gray-100/50 pb-6 gap-4">
              <div>
                <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900">Life Dimensions</h2>
                <p className="font-opensans text-sm capitalize font-semibold text-gray-600 mt-2">Goal tracking across 8 key areas.</p>
              </div>
              <button onClick={() => setActiveTab('goals')} className="font-roboto text-xs uppercase tracking-wider text-gray-800 bg-white border border-gray-100 px-6 py-3 rounded-full shadow-sm hover:bg-gray-50 transition-colors">Manage Goals</button>
           </div>
           
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8">
              {categoryStats.map((stat, idx) => {
                const radius = 40; const circumference = 2 * Math.PI * radius;
                const percent = stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;
                const strokeDashoffset = circumference - (percent / 100) * circumference;
                return (
                  <div key={idx} className="flex flex-col items-center gap-6">
                    <div className="relative flex items-center justify-center group">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white" />
                        <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`transition-all duration-1000 ease-out text-gray-800`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center w-full h-full">
                         <span className="text-2xl mb-1">{categoryIcons[stat.category]}</span>
                         <div className="font-montserrat flex items-center gap-1 text-xs lowercase text-gray-600">
                           <span className="text-gray-900 font-bold text-sm">{stat.completed}</span> / {stat.total}
                         </div>
                      </div>
                      {stat.isMastered && <div className="font-opensans absolute -top-2 -right-2 bg-white text-gray-900 text-xs capitalize font-semibold px-3 py-1 rounded-full shadow-sm border border-gray-100 z-10">Mastered</div>}
                    </div>
                    <div className="text-center"><h3 className="font-opensans text-sm capitalize font-semibold text-gray-700">{stat.category}</h3></div>
                  </div>
                );
              })}
           </div>
        </section>
      </div>
    );
  };

  const renderIntro = () => (
    <div className="space-y-8 animate-fade-in relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {renderDynamicList('Vision 2026', 'Describe your ultimate destination.', 'intro', 'narrative')}
        {renderDynamicList('Discomfort Audit', 'What holds you back?', 'intro', 'discomfort')}
        {renderDynamicList('Peak Hours', 'When are you most alert?', 'intro', 'energy', 'peak')}
        {renderDynamicList('Slump Hours', 'When do you crash?', 'intro', 'energy', 'slump')}
      </div>

      <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
         {renderDynamicList('Unsorted Thoughts', 'Dump loose thoughts here.', 'intro', 'cargo')}
      </section>

      <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
        <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-10">Ikigai Matrix</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {renderDynamicList('Love', 'Activities bringing joy.', 'intro', 'ikigai', 'love')}
          {renderDynamicList('Strengths', 'Natural/learned skills.', 'intro', 'ikigai', 'strengths')}
          {renderDynamicList('Needs', 'Problems you solve.', 'intro', 'ikigai', 'needs')}
          {renderDynamicList('Paid For', 'Marketable skills.', 'intro', 'ikigai', 'paid')}
        </div>
        <div className="bg-white/50 p-8 md:p-10 rounded-[2.5rem] border border-white shadow-sm">
           <h3 className="font-opensans text-sm capitalize font-semibold text-gray-600 mb-8">Intersections</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {renderDynamicList('Passion', 'Love + Strengths', 'intro', 'ikigai', 'passion')}
             {renderDynamicList('Mission', 'Love + Needs', 'intro', 'ikigai', 'mission')}
             {renderDynamicList('Profession', 'Strengths + Paid', 'intro', 'ikigai', 'profession')}
             {renderDynamicList('Vocation', 'Needs + Paid', 'intro', 'ikigai', 'vocation')}
           </div>
        </div>
      </section>
      
      <div className="bg-white/80 rounded-[3rem] border border-white p-12 text-center shadow-sm">
        <h3 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-4">Set Your Goals</h3>
        <button onClick={() => setActiveTab('goals')} className="font-roboto mt-6 bg-gray-900 text-white px-10 py-4 rounded-full uppercase tracking-wider text-sm shadow-md transition-all hover:bg-gray-800">Go to Goals</button>
      </div>
    </div>
  );

  const renderGoals = () => {
    const updateGoal = (type, id, field, val) => {
      setGoalsData(prev => {
        const newData = { ...prev };
        const idx = newData[type].findIndex(g => g.id === id);
        if (idx !== -1) newData[type][idx] = { ...newData[type][idx], [field]: val };
        return newData;
      });
    };
    const addGoal = (type, category) => setGoalsData(prev => ({ ...prev, [type]: [...prev[type], { id: Date.now() + Math.random(), category, text: '', targetDate: '', estimatedCost: '', completed: false }] }));
    const removeGoal = (type, id) => setGoalsData(prev => ({ ...prev, [type]: prev[type].filter(g => g.id !== id) }));

    const GoalList = ({ title, type }) => (
      <div className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
        <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-10">{title}</h2>
        <div className="space-y-8">
          {GOAL_CATEGORIES.map(category => {
            const categoryGoals = goalsData[type].filter(g => g.category === category) || [];
            return (
              <div key={category} className="bg-white/50 rounded-[2rem] border border-white p-8 shadow-sm">
                 <h3 className="font-opensans text-sm capitalize font-semibold text-gray-800 mb-6">
                   {category}
                 </h3>
                 <div className="space-y-4">
                   {categoryGoals.map(goal => (
                     <div key={goal.id} className={`flex flex-col xl:flex-row xl:items-center gap-4 p-5 rounded-2xl transition-all border ${goal.completed ? 'bg-white/40 border-transparent opacity-70' : 'bg-white border-white shadow-sm'}`}>
                       <div className="flex items-center gap-4 flex-1">
                         <button onClick={() => updateGoal(type, goal.id, 'completed', !goal.completed)} className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center transition-colors border ${goal.completed ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white/50 border-gray-200 text-transparent hover:border-gray-400'}`}>
                           <IconCheck />
                         </button>
                         <div className="flex-1 flex flex-col gap-2">
                           <input type="text" placeholder="e.g. complete quran recitation..." value={goal.text} onChange={(e) => updateGoal(type, goal.id, 'text', e.target.value)} className={`font-montserrat w-full bg-transparent border-none outline-none text-sm lowercase placeholder:italic placeholder:text-gray-400 placeholder:lowercase transition-all ${goal.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`} />
                           {!goal.completed && (
                             <button onClick={() => handleAiRefineGoal(type, goal.id, goal.text)} disabled={isAiLoading[goal.id]} className="font-roboto self-start text-xs text-gray-800 uppercase tracking-wider bg-white border border-gray-100 hover:bg-gray-50 px-4 py-1.5 rounded-full transition-all shadow-sm disabled:opacity-50">
                               {isAiLoading[goal.id] ? 'Refining...' : 'AI Refine'}
                             </button>
                           )}
                         </div>
                       </div>
                       <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full xl:w-auto">
                         <input type="date" min="2026-01-01" max="2026-12-31" value={goal.targetDate || ''} onChange={(e) => updateGoal(type, goal.id, 'targetDate', e.target.value)} className="font-montserrat w-full sm:w-40 px-5 py-3 bg-white/60 border border-white/50 rounded-2xl text-sm lowercase text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 shadow-sm" />
                         <div className="relative w-full sm:w-auto">
                           <span className="font-montserrat absolute left-4 top-1/2 -translate-y-1/2 text-sm uppercase text-gray-500">MYR</span>
                           <input type="number" placeholder="0" value={goal.estimatedCost || ''} onChange={(e) => updateGoal(type, goal.id, 'estimatedCost', e.target.value)} className="font-montserrat w-full sm:w-32 px-5 py-3 pl-14 bg-white/60 border border-white/50 rounded-2xl text-sm lowercase text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase shadow-sm" />
                         </div>
                         <button onClick={() => removeGoal(type, goal.id)} className="font-roboto w-12 h-12 flex-shrink-0 flex items-center justify-center text-xs uppercase tracking-wider text-gray-500 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl transition-colors shadow-sm">Del</button>
                       </div>
                     </div>
                   ))}
                 </div>
                 <button onClick={() => addGoal(type, category)} className="font-roboto mt-6 text-sm text-gray-600 hover:text-gray-900 bg-white shadow-sm border border-gray-100 px-6 py-3 rounded-full uppercase tracking-wider transition-colors">Add Goal</button>
              </div>
            );
          })}
        </div>
      </div>
    );

    return (
      <div className="space-y-8 animate-fade-in relative z-10">
        <GoalList title="Quarterly Goals" type="shortTerm" />
        <GoalList title="Annual Goals" type="longTerm" />
      </div>
    );
  };

  const renderDaily = () => {
    const todayData = getDailyForDate(selectedDate);
    const currDateObj = new Date(selectedDate);
    const year = 2026; const month = currDateObj.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = (new Date(year, month, 1).getDay() || 7) - 1; 
    const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
    const blanks = Array.from({length: firstDay}, (_, i) => i);

    return (
      <div className="space-y-8 animate-fade-in relative z-10">
        <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
           <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900">Pick Your Date</h2>
           <div className="flex gap-3 bg-white p-2 rounded-full shadow-sm border border-gray-100">
              <input type="date" min="2026-01-01" max="2026-12-31" value={selectedDate} onChange={(e) => {
                 const d = e.target.value;
                 if(d.startsWith('2026')) setSelectedDate(d);
              }} className="font-montserrat px-6 py-3 bg-transparent rounded-full text-sm lowercase text-gray-800 outline-none cursor-pointer" />
              <button onClick={() => setShowCalendarGrid(!showCalendarGrid)} className={`font-roboto px-8 py-3 rounded-full text-xs uppercase tracking-wider transition-colors ${showCalendarGrid ? 'bg-gray-900 text-white shadow-sm' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>Grid</button>
           </div>
        </section>

        {showCalendarGrid && (
          <section className="bg-white/80 backdrop-blur-xl rounded-[3rem] border border-white p-8 md:p-12 shadow-sm animate-fade-in">
            <h3 className="font-roboto text-xl uppercase tracking-wide text-gray-900 mb-8 text-center">{currDateObj.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
            <div className="grid grid-cols-7 gap-2 text-center mb-4">
              {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => <div key={d} className="font-opensans text-sm capitalize font-semibold text-gray-500">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-3">
              {blanks.map(b => <div key={`blank-${b}`} className="p-4"></div>)}
              {days.map(d => {
                const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isSelected = dateStr === selectedDate;
                const hasData = dailyData[dateStr]?.priorities.some(p => p.completed);
                return (
                  <button key={d} onClick={() => { setSelectedDate(dateStr); setShowCalendarGrid(false); }} className={`font-montserrat aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${isSelected ? 'bg-gray-900 text-white shadow-md transform scale-105 z-10' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-100 shadow-sm'}`}>
                    <span className="text-sm lowercase font-bold">{d}</span>
                    {hasData && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-400'}`}></div>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
             <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-8">Top Priorities</h2>
             <div className="space-y-4">
               {todayData.priorities.map((p, idx) => (
                 <div key={p.id} className={`flex items-center gap-4 p-5 rounded-2xl transition-all border ${p.completed ? 'bg-white/40 border-transparent opacity-70' : 'bg-white border-white shadow-sm'}`}>
                   <button onClick={() => { const newP = [...todayData.priorities]; newP[idx].completed = !newP[idx].completed; updateDaily(selectedDate, d => ({ ...d, priorities: newP })); }} className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${p.completed ? 'bg-gray-800 border-gray-800 text-white' : 'bg-white/50 border-gray-200 text-transparent hover:border-gray-400'}`}>
                     <IconCheck />
                   </button>
                   <input type="text" placeholder={`priority ${idx + 1}...`} value={p.text} onChange={(e) => { const newP = [...todayData.priorities]; newP[idx].text = e.target.value; updateDaily(selectedDate, d => ({ ...d, priorities: newP })); }} className={`font-montserrat flex-1 bg-transparent border-none outline-none text-sm lowercase placeholder:italic placeholder:text-gray-400 placeholder:lowercase ${p.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`} />
                 </div>
               ))}
             </div>
          </section>

          <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
             <div className="flex justify-between items-center mb-8">
                <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900">Daily Review</h2>
                <span className="font-roboto text-xs bg-white text-gray-700 px-4 py-2 rounded-full uppercase tracking-wider shadow-sm border border-gray-100">Debug</span>
             </div>
             <div className="space-y-4 mb-8">
                {['deen', 'dunya', 'fuel'].map(engine => (
                  <div key={engine} className={`flex justify-between items-center p-5 rounded-2xl transition-all border ${todayData.kaizen[engine] === 'ON TRACK' ? 'bg-white border-white shadow-sm' : 'bg-white border-white shadow-sm'}`}>
                     <span className="font-opensans text-sm capitalize font-semibold text-gray-800">{engine === 'fuel' ? 'Physical Engine' : `${engine} Engine`}</span>
                     <select value={todayData.kaizen[engine]} onChange={(e) => updateDaily(selectedDate, d => ({ ...d, kaizen: { ...d.kaizen, [engine]: e.target.value } }))} className={`font-opensans bg-transparent p-2 text-sm capitalize font-semibold outline-none cursor-pointer ${todayData.kaizen[engine] === 'ON TRACK' ? 'text-gray-500' : 'text-rose-500'}`}>
                       <option>ON TRACK</option><option>DERAILED</option>
                     </select>
                  </div>
                ))}
             </div>
             
             {Object.values(todayData.kaizen).includes('DERAILED') && (
               <div className="bg-white/80 p-8 rounded-[2rem] border border-white shadow-sm animate-fade-in">
                 <div className="flex justify-between items-center mb-6">
                   <h3 className="font-opensans text-sm capitalize font-semibold text-gray-800">RCA 5-Whys</h3>
                   <button onClick={() => handleAiDebugDaily(selectedDate, todayData.derailment.issue)} disabled={isAiLoading['daily-debug']} className="font-roboto text-xs text-gray-800 hover:bg-gray-50 bg-white border border-gray-100 px-4 py-2 rounded-full uppercase tracking-wider transition-all shadow-sm disabled:opacity-50">
                     {isAiLoading['daily-debug'] ? 'Analyzing...' : 'AI Auto-Debug'}
                   </button>
                 </div>
                 <input type="text" placeholder="identify derailment..." value={todayData.derailment.issue} onChange={(e) => updateDaily(selectedDate, d => ({ ...d, derailment: { ...d.derailment, issue: e.target.value } }))} className="font-montserrat w-full bg-white rounded-2xl p-5 text-sm lowercase text-gray-800 outline-none focus:ring-1 focus:ring-gray-300 mb-6 shadow-sm border border-gray-50 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                 <div className="space-y-4 mb-8 pl-4 border-l-2 border-gray-300">
                   {todayData.derailment.whys.map((why, idx) => (
                     <div key={idx} className="flex items-center gap-4">
                       <span className="font-opensans text-sm capitalize font-semibold text-gray-500 w-12 text-right">Why</span>
                       <input type="text" value={why} onChange={(e) => { const newWhys = [...todayData.derailment.whys]; newWhys[idx] = e.target.value; updateDaily(selectedDate, d => ({ ...d, derailment: { ...d.derailment, whys: newWhys } })); }} className="font-montserrat flex-1 bg-transparent border-b border-gray-200 p-2 text-sm lowercase outline-none focus:border-gray-400 text-gray-800 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" placeholder="drill down..." />
                     </div>
                   ))}
                 </div>
                 <input type="text" placeholder="system fix..." value={todayData.derailment.fix} onChange={(e) => updateDaily(selectedDate, d => ({ ...d, derailment: { ...d.derailment, fix: e.target.value } }))} className="font-montserrat w-full bg-white rounded-2xl p-5 text-sm lowercase text-gray-800 outline-none focus:ring-1 focus:ring-gray-300 shadow-sm border border-gray-100 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
               </div>
             )}
          </section>
        </div>
      </div>
    );
  };

  const renderMonthly = () => {
    if (showFinanceView) {
      return (
        <div className="space-y-8 animate-fade-in relative z-10">
          <button onClick={() => setShowFinanceView(false)} className="font-roboto text-sm text-gray-600 bg-white/60 px-6 py-3 rounded-full shadow-sm hover:text-gray-900 transition-colors uppercase tracking-wider border border-white/50 backdrop-blur-md">Back</button>
          
          <section className="bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 border-b border-gray-100/50 pb-8 gap-4">
                <div>
                   <h2 className="font-roboto text-3xl uppercase tracking-wider text-gray-900 mb-2">Phase A: Financial Audit</h2>
                   <p className="font-opensans text-base capitalize font-semibold text-gray-600">{new Date(selectedMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </div>
                <div className={`font-montserrat text-3xl font-bold px-8 py-6 rounded-[2rem] bg-white/60 flex flex-col items-end shadow-sm border border-white/50 ${f_balance >= 0 ? 'text-gray-800' : 'text-rose-500'}`}>
                  <span className="uppercase">MYR</span> {f_balance.toFixed(2)}
                  <span className="font-opensans text-sm capitalize font-semibold mt-2 text-gray-500">Net Balance</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {[
                  { label: 'Gross Salary', field: 'grossSalary', val: financeData.grossSalary, type: 'input' },
                  { label: 'Tax', field: 'tax', val: financeData.tax, type: 'input' },
                  { label: 'Allowance', field: 'allowance', val: financeData.allowance, type: 'input' },
                  { label: 'Nett Salary', field: null, val: f_nett.toFixed(2), type: 'calc' }
                ].map((input, idx) => (
                  <div key={idx} className="space-y-3">
                     <label className="font-opensans text-base capitalize font-semibold text-gray-600">{input.label}</label>
                     <div className="relative">
                       <span className="font-montserrat absolute left-5 top-1/2 -translate-y-1/2 text-sm uppercase text-gray-500">MYR</span>
                       {input.type === 'calc' ? (
                         <input type="text" readOnly value={input.val} className="font-montserrat w-full bg-white/80 border border-white/50 rounded-2xl p-4 pl-14 text-sm font-bold text-gray-800 outline-none shadow-sm" />
                       ) : (
                         <input type="number" value={input.val} onChange={(e) => updateFinanceTop(input.field, e.target.value)} className="font-montserrat w-full bg-white/60 border border-white/50 rounded-2xl p-4 pl-14 text-sm lowercase text-gray-800 outline-none focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase shadow-sm" placeholder="0" />
                       )}
                     </div>
                  </div>
                ))}
             </div>

             <div className="bg-white/50 p-8 rounded-[2.5rem] border border-white mb-12 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-sm">
                {[
                  { label: 'Car limit (Nett x 12)', val: f_carLimit }, { label: 'House limit (Nett x 30)', val: f_houseLimit },
                  { label: 'Emergency Fund (Nett x 6)', val: f_emergencyFund }, { label: 'Retirement (Nett x 300)', val: f_retirementFund }
                ].map((rule, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-white/60 p-5 rounded-2xl shadow-sm border border-white/50">
                     <span className="font-opensans text-sm capitalize font-semibold text-gray-600">{rule.label}</span>
                     <span className="font-montserrat text-sm font-bold text-gray-900"><span className="uppercase">MYR</span> {rule.val.toFixed(2)}</span>
                  </div>
                ))}
             </div>

             <div className="space-y-12">
                <div className="bg-white rounded-[2.5rem] border border-white shadow-sm p-8">
                   <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-4">
                      <h3 className="font-opensans text-base capitalize font-semibold text-gray-900">Incomes</h3>
                      <button onClick={() => addFinanceList('incomes')} className="font-roboto text-xs bg-white border border-gray-100 px-5 py-2.5 rounded-full uppercase tracking-wider text-gray-600 hover:text-gray-900 shadow-sm transition-colors">Add Row</button>
                   </div>
                   <div className="space-y-4">
                      {financeData.incomes.map(item => (
                         <div key={item.id} className="flex flex-col sm:flex-row gap-4">
                            <input type="text" placeholder="desc" value={item.desc} onChange={(e) => updateFinanceList('incomes', item.id, 'desc', e.target.value)} className="font-montserrat w-full sm:w-1/2 p-4 bg-white/50 border border-white rounded-2xl outline-none text-sm lowercase text-gray-800 focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                            <div className="w-full sm:w-1/2 flex items-center gap-3">
                               <input type="number" placeholder="0" value={item.amount} onChange={(e) => updateFinanceList('incomes', item.id, 'amount', e.target.value)} className="font-montserrat w-full p-4 bg-white/50 border border-white rounded-2xl outline-none text-sm lowercase text-gray-800 focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                               <button onClick={() => removeFinanceList('incomes', item.id)} className="font-roboto w-12 h-12 flex items-center justify-center text-xs uppercase tracking-wider text-gray-500 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-colors">Del</button>
                            </div>
                         </div>
                      ))}
                      <div className="flex justify-between items-center pt-6 border-t border-gray-100/50">
                         <span className="font-opensans text-base capitalize font-semibold text-gray-600">Total Income</span>
                         <span className="font-montserrat text-lg font-bold text-gray-900 bg-white/60 border border-gray-100 shadow-sm px-6 py-3 rounded-2xl"><span className="uppercase">MYR</span> {f_totalIncome.toFixed(2)}</span>
                      </div>
                   </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-white shadow-sm p-8">
                   <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 border-b border-gray-100/50 pb-6 gap-6">
                      <h3 className="font-opensans text-lg capitalize font-semibold text-gray-900">Necessity Spending</h3>
                      <div className="flex gap-4">
                         <div className="bg-white/60 border border-gray-100 shadow-sm px-5 py-3 rounded-2xl"><span className="font-opensans text-sm text-gray-500 block capitalize font-semibold mb-1">Rule (Nett x 0.5)</span><span className="font-montserrat text-base font-bold text-gray-900"><span className="uppercase">MYR</span> {f_ruleNecessity.toFixed(2)}</span></div>
                         <div className="bg-white/60 px-5 py-3 rounded-2xl border border-gray-100 shadow-sm"><span className="font-opensans text-sm text-gray-500 block capitalize font-semibold mb-1">Actual</span><span className={`font-montserrat text-base font-bold ${f_actualNecessity > f_ruleNecessity ? 'text-rose-500' : 'text-gray-900'}`}><span className="uppercase">MYR</span> {f_actualNecessity.toFixed(2)}</span></div>
                      </div>
                   </div>
                   
                   <div className="space-y-10">
                      {[{ title: 'Commitment', cat: 'commitments', sub: f_totalCommitment }, { title: 'Loan', cat: 'loans', sub: f_totalLoan }, { title: 'Credit Card', cat: 'creditCards', sub: f_totalCC }].map((sec, idx) => (
                        <div key={idx}>
                           <div className="flex justify-between items-center mb-5"><h4 className="font-opensans text-sm capitalize font-semibold text-gray-600">{sec.title}</h4><button onClick={() => addFinanceList(sec.cat)} className="font-roboto text-xs bg-white border border-gray-100 px-4 py-2 rounded-full uppercase tracking-wider text-gray-600 hover:text-gray-900 shadow-sm transition-colors">Add Row</button></div>
                           <div className="space-y-4">
                             {financeData[sec.cat].map(item => (
                                <div key={item.id} className="flex gap-4">
                                   <input type="text" placeholder="desc" value={item.desc} onChange={(e) => updateFinanceList(sec.cat, item.id, 'desc', e.target.value)} className="font-montserrat w-1/2 p-4 bg-white/50 border border-white rounded-2xl outline-none text-sm lowercase text-gray-800 focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                                   <div className="w-1/2 flex items-center gap-3">
                                      <input type="number" placeholder="0" value={item.amount} onChange={(e) => updateFinanceList(sec.cat, item.id, 'amount', e.target.value)} className="font-montserrat w-full p-4 bg-white/50 border border-white rounded-2xl outline-none text-sm lowercase text-gray-800 focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                                      <button onClick={() => removeFinanceList(sec.cat, item.id)} className="font-roboto w-12 h-12 flex items-center justify-center text-xs uppercase tracking-wider text-gray-500 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-colors">Del</button>
                                   </div>
                                </div>
                             ))}
                             <div className="text-right pt-4 border-t border-gray-100/50"><span className="font-opensans text-sm capitalize font-semibold text-gray-600 mr-4">Subtotal</span><span className="font-montserrat text-sm font-bold text-gray-900 bg-white/60 border border-gray-100 shadow-sm px-4 py-2 rounded-xl inline-block"><span className="uppercase">MYR</span> {sec.sub.toFixed(2)}</span></div>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-white shadow-sm p-8">
                   <div className="flex flex-col md:flex-row justify-between md:items-center mb-8 border-b border-gray-100/50 pb-6 gap-6">
                      <h3 className="font-opensans text-lg capitalize font-semibold text-gray-900">Saving / Investment</h3>
                      <div className="flex gap-4">
                         <div className="bg-white/60 border border-gray-100 shadow-sm px-5 py-3 rounded-2xl"><span className="font-opensans text-sm text-gray-500 block capitalize font-semibold mb-1">Rule (Nett x 0.2)</span><span className="font-montserrat text-base font-bold text-gray-900"><span className="uppercase">MYR</span> {f_ruleSavings.toFixed(2)}</span></div>
                         <div className="bg-white/60 px-5 py-3 rounded-2xl border border-gray-100 shadow-sm"><span className="font-opensans text-sm text-gray-500 block capitalize font-semibold mb-1">Actual</span><span className={`font-montserrat text-base font-bold ${f_totalSavings >= f_ruleSavings ? 'text-gray-900' : 'text-gray-900'}`}><span className="uppercase">MYR</span> {f_totalSavings.toFixed(2)}</span></div>
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-end mb-4"><button onClick={() => addFinanceList('savings')} className="font-roboto text-xs bg-white border border-gray-100 px-4 py-2 rounded-full uppercase tracking-wider text-gray-600 hover:text-gray-900 shadow-sm transition-colors">Add Row</button></div>
                      {financeData.savings.map(item => (
                         <div key={item.id} className="flex gap-4">
                            <input type="text" placeholder="desc" value={item.desc} onChange={(e) => updateFinanceList('savings', item.id, 'desc', e.target.value)} className="font-montserrat w-1/2 p-4 bg-white/50 border border-white rounded-2xl outline-none text-sm lowercase text-gray-800 focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                            <div className="w-1/2 flex items-center gap-3">
                               <input type="number" placeholder="0" value={item.amount} onChange={(e) => updateFinanceList('savings', item.id, 'amount', e.target.value)} className="font-montserrat w-full p-4 bg-white/50 border border-white rounded-2xl outline-none text-sm lowercase text-gray-800 focus:bg-white focus:ring-1 focus:ring-gray-300 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                               <button onClick={() => removeFinanceList('savings', item.id)} className="font-roboto w-12 h-12 flex items-center justify-center text-xs uppercase tracking-wider text-gray-500 hover:text-rose-500 bg-white border border-gray-100 rounded-2xl shadow-sm transition-colors">Del</button>
                            </div>
                         </div>
                      ))}
                      <div className="flex justify-between items-center pt-8 border-t border-gray-100/50">
                         <span className="font-opensans text-base capitalize font-semibold text-gray-600">Total Savings</span>
                         <span className="font-montserrat text-lg font-bold text-gray-900 bg-white/60 border border-gray-100 shadow-sm px-6 py-3 rounded-2xl"><span className="uppercase">MYR</span> {f_totalSavings.toFixed(2)}</span>
                      </div>
                   </div>
                </div>
             </div>
          </section>
        </div>
      );
    }

    const year = 2026; const month = parseInt(selectedMonth.split('-')[1]) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthDays = Array.from({length: daysInMonth}, (_, i) => {
      const d = i + 1; const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      return { d, dateStr, data: getDailyForDate(dateStr) };
    });

    return (
      <div className="space-y-8 animate-fade-in relative z-10">
        
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-full shadow-sm flex items-center justify-between border border-white/50 max-w-sm mx-auto">
           <span className="font-opensans text-sm capitalize font-semibold text-gray-600 pl-4">Month</span>
           <input type="month" min="2026-01" max="2026-12" value={selectedMonth} onChange={(e) => {
              const val = e.target.value; if(val.startsWith('2026')) setSelectedMonth(val);
           }} className="font-montserrat bg-white px-6 py-3 rounded-full text-sm lowercase outline-none cursor-pointer border border-gray-100 shadow-sm text-gray-900 focus:ring-1 focus:ring-gray-300 transition-shadow" />
        </div>

          <section className="bg-white/40 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
          <h2 className="font-roboto text-3xl uppercase tracking-wider text-gray-900 mb-8">Phase A: Financial Audit</h2>
          <div className="bg-white/60 p-8 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-start md:items-center gap-8 shadow-sm border border-white/50">
             <div>
                <div className="font-opensans text-base capitalize font-semibold text-gray-500 mb-2">Net Balance</div>
                <div className={`font-montserrat text-4xl font-bold ${getNetBalanceForMonth(selectedMonth) >= 0 ? 'text-gray-900' : 'text-rose-500'}`}><span className="uppercase">MYR</span> {getNetBalanceForMonth(selectedMonth).toFixed(0)}</div>
             </div>
             <button onClick={() => setShowFinanceView(true)} className="font-roboto py-4 px-10 bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-md transition-all text-sm uppercase tracking-wider">Open Matrix</button>
          </div>
        </section>

        <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm w-full overflow-hidden">
          <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-8">Phase B: Physical Audit</h2>
          <div className="overflow-x-auto rounded-[2.5rem] bg-white/50 border border-white p-2 shadow-sm">
            <table className="w-full text-left min-w-[600px]">
              <thead>
                <tr className="bg-transparent"><th className="font-opensans p-5 text-sm capitalize font-semibold text-gray-600 w-1/4 rounded-tl-[2rem]">Dimension</th><th className="font-opensans p-5 text-sm capitalize font-semibold text-gray-600 w-2/4">Item</th><th className="font-opensans p-5 text-sm capitalize font-semibold text-gray-600 w-1/4 rounded-tr-[2rem]">Action</th></tr>
              </thead>
              <tbody>
                {monthlyData.cargoClearance.map((cargo, idx) => (
                  <tr key={cargo.id} className="border-t border-gray-100/50">
                    <td className="p-3"><select value={cargo.dimension} onChange={(e) => { const n = [...monthlyData.cargoClearance]; n[idx].dimension = e.target.value; setMonthlyData(p => ({...p, cargoClearance: n})); }} className="font-montserrat w-full p-4 bg-white rounded-2xl outline-none text-sm lowercase text-gray-800 cursor-pointer border border-transparent focus:border-gray-300 transition-colors shadow-sm"><option>Physical</option><option>Digital</option><option>Financial</option><option>Passenger (Social)</option></select></td>
                    <td className="p-3"><input type="text" placeholder="e.g. unused apps" value={cargo.item} onChange={(e) => { const n = [...monthlyData.cargoClearance]; n[idx].item = e.target.value; setMonthlyData(p => ({...p, cargoClearance: n})); }} className="font-montserrat w-full p-4 bg-white rounded-2xl outline-none text-sm lowercase text-gray-800 border border-transparent focus:border-gray-300 transition-colors shadow-sm placeholder:italic placeholder:text-gray-400 placeholder:lowercase" /></td>
                    <td className="p-3 flex items-center"><select value={cargo.action} onChange={(e) => { const n = [...monthlyData.cargoClearance]; n[idx].action = e.target.value; setMonthlyData(p => ({...p, cargoClearance: n})); }} className="font-montserrat w-full p-4 bg-white rounded-2xl outline-none text-sm lowercase text-gray-800 cursor-pointer border border-transparent focus:border-gray-300 transition-colors shadow-sm"><option>Keep</option><option>Toss</option><option>Archive</option></select>{monthlyData.cargoClearance.length > 1 && <button onClick={() => setMonthlyData(p => ({...p, cargoClearance: p.cargoClearance.filter(c => c.id !== cargo.id)}))} className="font-roboto w-12 h-12 flex-shrink-0 flex items-center justify-center text-xs uppercase tracking-wider text-gray-500 hover:text-white hover:bg-rose-500 bg-white rounded-2xl ml-3 shadow-sm border border-gray-100 transition-colors">Del</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={() => setMonthlyData(p => ({...p, cargoClearance: [...p.cargoClearance, { id: Date.now(), dimension: 'Physical', item: '', action: 'Keep' }] }))} className="font-roboto mt-8 text-sm text-gray-600 bg-white hover:text-gray-900 px-6 py-3 rounded-full uppercase tracking-wider shadow-sm transition-colors border border-gray-100">Add Cargo</button>
        </section>

        <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm w-full overflow-hidden">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900">Phase C: Lifestyle Audit</h2>
            <div className="font-opensans bg-white border border-gray-100 shadow-sm px-6 py-3 rounded-full text-sm capitalize font-semibold text-gray-800">Streak: {streaks.currentStreak} Days</div>
          </div>
          
          <div className="overflow-x-auto rounded-[2.5rem] bg-white/50 border border-white p-2 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left min-w-[800px]">
              <thead className="sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b border-gray-100">
                <tr><th className="font-opensans p-5 text-sm capitalize font-semibold text-gray-600 w-20 text-center">Date</th><th className="font-opensans p-5 text-sm capitalize font-semibold text-gray-600">Highlight</th>{monthlyData.habitNames.map((h, i) => <th key={i} className="p-3"><input type="text" value={h} onChange={(e) => { const n = [...monthlyData.habitNames]; n[i] = e.target.value; setMonthlyData(p => ({...p, habitNames: n})) }} className="font-montserrat bg-white border border-gray-100 rounded-2xl p-4 text-sm lowercase font-bold text-gray-800 text-center w-full outline-none focus:border-gray-300 transition-colors shadow-sm placeholder:italic placeholder:text-gray-400 placeholder:lowercase" placeholder={`Habit ${i+1}`} /></th>)}</tr>
              </thead>
              <tbody>
                {monthDays.map(({d, dateStr, data}) => (
                  <tr key={d} className="border-t border-gray-100/50">
                    <td className="font-montserrat p-4 text-center text-base lowercase font-bold text-gray-600">{d}</td>
                    <td className="p-3"><input type="text" placeholder="memorable thing..." value={data.highlight || ''} onChange={(e) => updateDaily(dateStr, p => ({...p, highlight: e.target.value}))} className="font-montserrat w-full p-4 bg-white border border-transparent focus:border-gray-300 rounded-2xl outline-none text-sm lowercase text-gray-800 transition-colors shadow-sm placeholder:italic placeholder:text-gray-400 placeholder:lowercase" /></td>
                    {[0, 1, 2].map(idx => (
                      <td key={idx} className="p-3 text-center relative group">
                        <button onClick={() => updateDaily(dateStr, p => { const h = [...p.habits]; h[idx] = !h[idx]; return {...p, habits: h}; })} className={`w-full h-14 rounded-2xl flex items-center justify-center transition-colors border ${data.habits[idx] ? 'bg-gray-800 border-gray-800 text-white shadow-sm' : 'bg-white border-white text-transparent hover:border-gray-300 shadow-sm'}`}>{data.habits[idx] ? <IconCheck /> : <span className="font-roboto text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 text-gray-400">Mark</span>}</button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white/80 rounded-[3rem] border border-white p-8 md:p-12 shadow-sm relative overflow-hidden">
           <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-10 relative z-10">Monthly Game Plan</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 relative z-10">
             {renderDynamicList('Wins', 'What went well?', 'reflection', 'monthly', 'wins')}
             {renderDynamicList('Misses', 'Where did execution fail?', 'reflection', 'monthly', 'misses')}
           </div>
           <div className="border-t border-gray-200 pt-10 relative z-10">
             <label className="font-opensans text-sm capitalize font-semibold text-gray-600 block mb-6">Task Migration</label>
             <div className="space-y-4">
               {monthlyData.reflection.migration.map((mig) => (
                 <div key={mig.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/60 p-5 rounded-2xl border border-white shadow-sm">
                   <select value={mig.action} onChange={(e) => updateDynamicBox('reflection', 'monthly', mig.id, e.target.value, 'migration', 'action')} className="font-opensans bg-white border border-gray-100 rounded-xl p-3 text-sm capitalize font-semibold text-gray-800 outline-none cursor-pointer sm:w-auto w-full transition-colors shadow-sm"><option>Migrate</option><option>Delete</option></select>
                   <input type="text" value={mig.task} onChange={(e) => updateDynamicBox('reflection', 'monthly', mig.id, e.target.value, 'migration', 'task')} placeholder="unfinished task..." className="font-montserrat bg-transparent border-none p-2 text-sm lowercase outline-none flex-1 text-gray-800 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                 </div>
               ))}
             </div>
             <button onClick={() => addDynamicBox('reflection', 'monthly', 'migration')} className="font-roboto mt-6 text-sm text-gray-600 hover:text-gray-900 bg-white px-6 py-3 rounded-full transition-colors uppercase tracking-wider border border-gray-100 shadow-sm">Add Task</button>
           </div>
        </section>
      </div>
    );
  };

  const renderQuarterly = () => {
    const data = quarterlyData;
    const setData = setQuarterlyData;

    const updateZoom = (id, field, val, subField = null, index = null) => {
       setData(prev => {
          const newZ = [...(prev.zoomOut || [])]; const idx = newZ.findIndex(z => z.id === id);
          if (idx === -1) return prev;
          if (subField === 'whys') newZ[idx].derailment.whys[index] = val;
          else if (subField) newZ[idx].derailment[subField] = val;
          else newZ[idx][field] = val;
          return { ...prev, zoomOut: newZ };
       });
    };

    const quartersList = ['Q1', 'Q2', 'Q3', 'Q4'];
    const activeQuarterGoals = goalsData.shortTerm.filter(g => getQuarterFromDate(g.targetDate) === selectedQuarter);

    return (
      <div className="space-y-8 animate-fade-in relative z-10">
        
        <div className="bg-white/60 backdrop-blur-md p-4 rounded-full shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 border border-white/50 max-w-lg mx-auto">
           <span className="font-opensans text-sm capitalize font-semibold text-gray-600 pl-4">Quarter</span>
           <div className="flex flex-wrap justify-center gap-2">
              {quartersList.map(q => (
                 <button key={q} onClick={() => setSelectedQuarter(q)} className={`font-roboto px-6 py-3 text-sm uppercase tracking-wider rounded-full transition-all shadow-sm ${selectedQuarter === q ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-100 hover:bg-gray-50'}`}>
                   {q}
                 </button>
              ))}
           </div>
        </div>

        <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
           <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-8 flex flex-wrap items-center gap-4">
              Quarterly Assessment <span className="font-roboto text-xs bg-white border border-gray-100 shadow-sm text-gray-700 px-4 py-1.5 rounded-full uppercase tracking-wider">RCA</span>
           </h2>
           <div className="space-y-6">
              {(data.zoomOut || []).map(zoom => (
                 <div key={zoom.id} className="bg-white/50 rounded-[2.5rem] p-8 shadow-sm border border-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                       <div className="font-montserrat text-gray-900 text-base lowercase font-bold flex-1 border-l-4 border-gray-400 pl-6">{zoom.goal || 'unnamed goal'}</div>
                       <div className="flex gap-3 bg-white p-2 rounded-full border border-gray-100 shadow-sm w-full md:w-auto">
                          <button onClick={() => updateZoom(zoom.id, 'status', 'On Track')} className={`font-roboto flex-1 md:flex-none px-6 py-3 text-xs uppercase tracking-wider rounded-full transition-all ${zoom.status === 'On Track' ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}>On Track</button>
                          <button onClick={() => updateZoom(zoom.id, 'status', 'At Risk')} className={`font-roboto flex-1 md:flex-none px-6 py-3 text-xs uppercase tracking-wider rounded-full transition-all ${zoom.status === 'At Risk' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-500 hover:bg-rose-50 hover:text-rose-500'}`}>At Risk</button>
                       </div>
                    </div>
                    
                    {zoom.status === 'At Risk' && (
                       <div className="mt-8 pt-8 border-t border-gray-200 animate-fade-in">
                           <div className="flex justify-between items-center mb-6">
                               <h4 className="font-opensans text-sm capitalize font-semibold text-rose-500">5-Whys Debug</h4>
                               <button onClick={() => handleAiDebugZoom(zoom.id, zoom.derailment.issue)} disabled={isAiLoading[`zoom-${zoom.id}`]} className="font-roboto text-xs text-gray-800 hover:bg-gray-50 bg-white border border-gray-100 px-4 py-2 rounded-full uppercase tracking-wider transition-all shadow-sm disabled:opacity-50">
                                 {isAiLoading[`zoom-${zoom.id}`] ? 'Analyzing...' : 'AI Auto-Debug'}
                               </button>
                           </div>
                           <input type="text" placeholder="state the exact failure..." value={zoom.derailment.issue} onChange={(e) => updateZoom(zoom.id, 'derailment', e.target.value, 'issue')} className="font-montserrat w-full bg-white rounded-2xl p-5 text-sm lowercase text-gray-800 outline-none focus:ring-1 focus:ring-gray-300 mb-8 border border-gray-100 shadow-sm placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                           <div className="space-y-4 mb-8 pl-4 border-l-2 border-gray-300">
                             {zoom.derailment.whys.map((w, wIdx) => (
                               <div key={wIdx} className="flex items-center gap-4">
                                  <span className="font-opensans text-sm capitalize font-semibold text-gray-500 w-12 text-right">Why</span>
                                  <input type="text" value={w} onChange={(e) => updateZoom(zoom.id, 'derailment', e.target.value, 'whys', wIdx)} className="font-montserrat flex-1 bg-transparent border-b border-gray-200 py-2 text-sm lowercase outline-none focus:border-gray-400 text-gray-900 placeholder:italic placeholder:text-gray-400 placeholder:lowercase transition-colors" placeholder="drill down..." />
                               </div>
                             ))}
                           </div>
                           <label className="font-opensans text-sm capitalize font-semibold text-gray-600 block mb-4">System Fix (Conclusion)</label>
                           <input type="text" placeholder="mechanical fix..." value={zoom.derailment.fix} onChange={(e) => updateZoom(zoom.id, 'derailment', e.target.value, 'fix')} className="font-montserrat w-full bg-white text-gray-900 border border-gray-100 rounded-2xl p-5 text-sm lowercase outline-none focus:ring-1 focus:ring-gray-400 shadow-sm placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                       </div>
                    )}
                 </div>
              ))}
              {(data.zoomOut || []).length === 0 && <div className="font-montserrat text-sm lowercase text-gray-600 bg-white/50 p-12 rounded-[3rem] text-center shadow-sm border border-white">no goals assigned to this quarter.</div>}
           </div>
        </section>

        <section className="bg-white/80 rounded-[3rem] border border-white p-8 md:p-12 shadow-sm relative overflow-hidden">
           <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-10 relative z-10">Quarterly Game Plan</h2>
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12 relative z-10">
             {renderRCAList('Wins', 'Replicate it.', 'quarterly', 'wins')}
             {renderRCAList('Losses', 'Debug it.', 'quarterly', 'misses')}
           </div>
           <div className="border-t border-gray-200 pt-10 relative z-10">
             <label className="font-opensans text-sm capitalize font-semibold text-gray-600 block mb-6">Task Migration</label>
             <div className="space-y-4">
               {(data.reflection.migration || []).map((mig) => (
                 <div key={mig.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/60 p-5 rounded-2xl border border-white shadow-sm">
                   <select value={mig.action} onChange={(e) => updateDynamicBox('reflection', 'quarterly', mig.id, e.target.value, 'migration', 'action')} className="font-opensans bg-white border border-gray-100 rounded-xl p-3 text-sm capitalize font-semibold text-gray-800 outline-none cursor-pointer sm:w-auto w-full transition-colors shadow-sm"><option>Migrate</option><option>Delete</option></select>
                   <input type="text" value={mig.task} onChange={(e) => updateDynamicBox('reflection', 'quarterly', mig.id, e.target.value, 'migration', 'task')} placeholder="unfinished task..." className="font-montserrat bg-transparent border-none p-2 text-sm lowercase outline-none flex-1 text-gray-800 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                 </div>
               ))}
             </div>
             <button onClick={() => addDynamicBox('reflection', 'quarterly', 'migration')} className="font-roboto mt-6 text-sm text-gray-600 hover:text-gray-900 bg-white px-6 py-3 rounded-full transition-colors uppercase tracking-wider border border-gray-100 shadow-sm">Add Task</button>
           </div>
        </section>
      </div>
    );
  };

  const renderAnnual = () => {
    const allGoals = [...goalsData.shortTerm, ...goalsData.longTerm];
    const catSummaries = GOAL_CATEGORIES.map(cat => {
      const catGoals = allGoals.filter(g => g.category === cat);
      return { category: cat, total: catGoals.length, completed: catGoals.filter(g => g.completed).length, isMastered: catGoals.length > 0 && catGoals.length === catGoals.filter(g => g.completed).length };
    });

    const months2026 = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const quarters = [
      { id: 'Q1', label: 'Q1', months: ['01', '02', '03'] }, { id: 'Q2', label: 'Q2', months: ['04', '05', '06'] },
      { id: 'Q3', label: 'Q3', months: ['07', '08', '09'] }, { id: 'Q4', label: 'Q4', months: ['10', '11', '12'] }
    ];

    return (
      <div className="space-y-8 animate-fade-in relative z-10">
        <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
          <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-10">2026 Summary</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8">
              {catSummaries.map((stat, idx) => {
                const radius = 40; const circumference = 2 * Math.PI * radius;
                const percent = stat.total > 0 ? (stat.completed / stat.total) * 100 : 0;
                const strokeDashoffset = circumference - (percent / 100) * circumference;
                return (
                  <div key={idx} className="flex flex-col items-center gap-6">
                    <div className="relative flex items-center justify-center group">
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-white" />
                        <circle cx="64" cy="64" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`transition-all duration-1000 ease-out text-gray-800`} strokeLinecap="round" />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center text-center w-full h-full">
                         <span className="text-2xl mb-1">{categoryIcons[stat.category]}</span>
                         <div className="font-montserrat flex items-center gap-1 text-xs lowercase text-gray-600">
                           <span className="text-gray-900 font-bold text-sm">{stat.completed}</span> / {stat.total}
                         </div>
                      </div>
                      {stat.isMastered && <div className="font-opensans absolute -top-2 -right-2 bg-white text-gray-900 text-xs capitalize font-semibold px-3 py-1 rounded-full shadow-sm border border-gray-100 z-10">Mastered</div>}
                    </div>
                    <div className="text-center"><h3 className="font-opensans text-sm capitalize font-semibold text-gray-700">{stat.category}</h3></div>
                  </div>
                );
              })}
           </div>
        </section>

        <section className="bg-white/60 backdrop-blur-xl rounded-[3rem] border border-white/50 p-8 md:p-12 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-6">
             <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900">Financial Trajectory</h2>
             <div className="flex gap-2 bg-white p-2 rounded-full shadow-sm border border-gray-100">
               <button onClick={() => setAnnualViewMode('monthly')} className={`font-roboto px-6 py-3 text-xs uppercase tracking-wider rounded-full transition-all shadow-sm ${annualViewMode === 'monthly' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>Monthly</button>
               <button onClick={() => setAnnualViewMode('quarterly')} className={`font-roboto px-6 py-3 text-xs uppercase tracking-wider rounded-full transition-all shadow-sm ${annualViewMode === 'quarterly' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>Quarterly</button>
             </div>
          </div>

          {annualViewMode === 'monthly' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {months2026.map(m => {
                const dateObj = new Date(`2026-${m}-01`);
                const net = getNetBalanceForMonth(`2026-${m}`);
                return (
                  <div key={m} className="bg-white/60 p-6 rounded-[2rem] shadow-sm border border-white/50 flex flex-col justify-center items-center text-center transition-transform hover:scale-105">
                    <div className="font-opensans text-base capitalize font-semibold text-gray-600 mb-3">{dateObj.toLocaleString('default', { month: 'short' })}</div>
                    <div className={`font-montserrat text-lg font-bold ${net >= 0 ? 'text-gray-900' : 'text-rose-500'}`}><span className="uppercase">MYR</span> {net.toFixed(0)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {quarters.map(q => {
                const qNet = q.months.reduce((sum, m) => sum + getNetBalanceForMonth(`2026-${m}`), 0);
                return (
                  <div key={q.id} className="bg-white/60 p-10 rounded-[3rem] shadow-sm border border-white/50 flex flex-col justify-center items-center text-center transition-transform hover:scale-105">
                    <div className="font-opensans text-lg capitalize font-semibold text-gray-600 mb-4">{q.label}</div>
                    <div className={`font-montserrat text-3xl font-bold ${qNet >= 0 ? 'text-gray-900' : 'text-rose-500'}`}><span className="uppercase">MYR</span> {qNet.toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-white/80 rounded-[3rem] border border-white p-8 md:p-12 shadow-sm relative overflow-hidden">
           <h2 className="font-roboto text-2xl uppercase tracking-wider text-gray-900 mb-10 relative z-10">Annual Game Plan</h2>
           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12 relative z-10">
             {renderRCAList('Wins', 'Replicate it.', 'annual', 'wins')}
             {renderRCAList('Losses', 'Debug it.', 'annual', 'misses')}
           </div>
           <div className="border-t border-gray-200 pt-10 relative z-10">
             <label className="font-opensans text-sm capitalize font-semibold text-gray-600 block mb-6">Task Migration (To 2027)</label>
             <div className="space-y-4">
               {(annualData.reflection.migration || []).map((mig) => (
                 <div key={mig.id} className="flex flex-col sm:flex-row sm:items-center gap-4 bg-white/60 p-5 rounded-2xl border border-white shadow-sm">
                   <select value={mig.action} onChange={(e) => updateDynamicBox('reflection', 'annual', mig.id, e.target.value, 'migration', 'action')} className="font-opensans bg-white border border-gray-100 rounded-xl p-3 text-sm capitalize font-semibold text-gray-800 outline-none transition-colors shadow-sm sm:w-auto w-full"><option>Migrate</option><option>Delete</option></select>
                   <input type="text" value={mig.task} onChange={(e) => updateDynamicBox('reflection', 'annual', mig.id, e.target.value, 'migration', 'task')} placeholder="unfinished task..." className="font-montserrat bg-transparent border-none p-2 text-sm lowercase outline-none flex-1 text-gray-800 placeholder:italic placeholder:text-gray-400 placeholder:lowercase" />
                 </div>
               ))}
             </div>
             <button onClick={() => addDynamicBox('reflection', 'annual', 'migration')} className="font-roboto mt-6 text-sm text-gray-600 hover:text-gray-900 bg-white px-6 py-3 rounded-full transition-colors uppercase tracking-wider border border-gray-100 shadow-sm">Add Task</button>
           </div>
        </section>
      </div>
    );
  };

  switch(globalScreen) {
    case 'SPLASH': return renderSplashScreen();
    case 'WELCOME': return renderWelcomeScreen();
    case 'LOGIN': return renderLoginScreen();
    case 'ONBOARDING': return renderOnboardingScreen();
    case 'SUBSCRIPTION': return renderSubscriptionScreen();
    case 'PROFILE': return renderProfileScreen();
    case 'SETTINGS': return renderSettingsScreen();
    case 'HOME': 
      return (
        <div className="min-h-screen text-gray-900 selection:bg-rose-200 relative overflow-hidden bg-gradient-to-br from-orange-50 to-rose-50 font-montserrat">
          
          <div className="fixed top-[-10%] left-[-10%] w-[80vw] h-[80vw] bg-[#F9B95C] rounded-full filter blur-[140px] opacity-30 pointer-events-none"></div>
          <div className="fixed bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] bg-[#96C7B3] rounded-full filter blur-[140px] opacity-30 pointer-events-none"></div>
          <div className="fixed top-[40%] left-[20%] w-[50vw] h-[50vw] bg-[#D7897F] rounded-full filter blur-[140px] opacity-20 pointer-events-none"></div>
          <div className="fixed bottom-[40%] right-[20%] w-[40vw] h-[40vw] bg-[#6398A9] rounded-full filter blur-[140px] opacity-20 pointer-events-none"></div>

          <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-12 animate-fade-in relative z-10">
            {/* --- FIXED HEADER ARCHITECTURE --- */}
            <header className="mb-8 md:mb-12 flex flex-row justify-between items-center gap-4 border-b border-white/40 pb-6 md:pb-8">
              <div className="flex-shrink-0">
                <h1 className="font-roboto text-2xl md:text-4xl uppercase tracking-widest text-gray-900 drop-shadow-sm">RESET</h1>
              </div>
              
              <div className="flex items-center gap-3 md:gap-6 ml-auto">
                 <button onClick={() => setGlobalScreen('SUBSCRIPTION')} className="font-roboto bg-white text-gray-900 px-4 md:px-6 py-2.5 md:py-3 rounded-full text-xs md:text-sm uppercase tracking-wider shadow-sm hover:shadow-md transition-all border border-gray-100 flex-shrink-0">Upgrade</button>
                 <button onClick={() => setGlobalScreen('PROFILE')} className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 rounded-full bg-white border border-gray-100 shadow-sm flex items-center justify-center text-xl md:text-2xl overflow-hidden hover:scale-105 transition-transform cursor-pointer">
                    {authUser?.photoURL && authUser.photoURL.startsWith('data:image/svg') ? (
                       <div dangerouslySetInnerHTML={{__html: decodeURIComponent(authUser.photoURL.split(',')[1])}} className="w-full h-full" />
                    ) : (
                       <span className="font-montserrat text-sm lowercase font-bold text-gray-400">{userName.charAt(0)}</span>
                    )}
                 </button>
              </div>
            </header>

            {/* --- FIXED NAVIGATION ARCHITECTURE --- */}
            <div className="mb-8 flex flex-nowrap justify-start md:justify-center text-center gap-2 bg-white/40 backdrop-blur-xl p-2 rounded-[2rem] md:rounded-full shadow-sm border border-white/50 w-full overflow-x-auto custom-scrollbar">
              {['Dashboard', 'Intro', 'Goals', 'Daily', 'Monthly', 'Quarterly', 'Annual'].map(tab => {
                const tabId = tab.toLowerCase().replace(/ /g, '-');
                const internalTab = tabId;
                
                return (
                  <button key={internalTab} onClick={() => { setActiveTab(internalTab); setShowFinanceView(false); }} className={`font-roboto px-5 md:px-6 py-2.5 md:py-3 rounded-full text-xs uppercase tracking-wider transition-all flex-shrink-0 ${activeTab === internalTab ? 'bg-gray-900 text-white shadow-md transform scale-105 z-10' : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'}`}>
                    {tab}
                  </button>
                );
              })}
            </div>

            <main>
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'intro' && renderIntro()}
              {activeTab === 'goals' && renderGoals()}
              {activeTab === 'daily' && renderDaily()}
              {activeTab === 'monthly' && renderMonthly()}
              {activeTab === 'quarterly' && renderQuarterly()}
              {activeTab === 'annual' && renderAnnual()}
            </main>
          </div>

          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Open+Sans:wght@400;600&family=Roboto:wght@400;700;900&display=swap');
              .font-roboto { font-family: 'Roboto', sans-serif; font-weight: 900; }
              .font-opensans { font-family: 'Open Sans', sans-serif; }
              .font-montserrat { font-family: 'Montserrat', sans-serif; }
              .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
              @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
              .custom-scrollbar::-webkit-scrollbar { height: 0px; width: 0px; display: none; }
              .custom-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}
          </style>
        </div>
      );
    default: return null;
  }
}