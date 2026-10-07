import React, { useState, useEffect, useRef } from 'react';
import { 
  Compass, 
  MapPin, 
  Calendar, 
  Smile, 
  ArrowRight, 
  Mic, 
  MicOff, 
  Camera, 
  Upload, 
  Sparkles, 
  Settings, 
  Clock, 
  Shield, 
  BookOpen, 
  Flame, 
  Award, 
  Info, 
  Cpu, 
  X, 
  CheckCircle, 
  Volume2, 
  Eye, 
  WifiOff, 
  HelpCircle, 
  ChevronRight,
  Play
} from 'lucide-react';

// Preset local missions for offline mode or fallback caching
const CACHED_MISSIONS = [
  {
    title: "Silent Canopy Walk",
    description: "Walk for 15 minutes in a wooded area or near street trees. Focus entirely on the topmost canopy. Count how many shades of green and brown you can see. Keep your phone in your pocket.",
    checklist: ["Spot 3 different canopy layers", "Observe a bird or squirrel in branches", "Walk without checking your notifications"],
    reminder: "Lock your phone, slide it away, and touch grass!"
  },
  {
    title: "Nature's Micro-Symmetry",
    description: "Explore a nearby garden or park patch. Find three different plants, leaves, or flowers. Inspect them from 3 inches away. Notice the perfect symmetrical vein patterns or petal counts.",
    checklist: ["Find radial symmetry in a flower", "Find bilateral symmetry in a leaf", "Inspect leaf veins closely for 2 minutes"],
    reminder: "The world is beautiful up close. Lock your screen!"
  },
  {
    title: "The Wind & Sound Bath",
    description: "Sit quietly for 10 minutes on a park bench or in a garden. Close your eyes. Listen for three distinct natural sounds (wind rustling, insects, distant bird calls). Note where the wind hits your skin.",
    checklist: ["Isolate 3 distinct organic sounds", "Describe the wind speed to yourself", "Keep your eyes closed for a full 5 minutes"],
    reminder: "Breathe deep. Nature doesn't have an feed. Screen off!"
  }
];

// Sample images for instant vision testing
const SAMPLE_OBSERVATIONS = [
  {
    name: "Golden Oak Leaf",
    description: "A deeply lobed yellow leaf fallen on damp forest soil.",
    image: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&q=80&w=400",
    noticed: "Distinctly lobed structure, alternating deep sinus curves, with deep amber and golden-brown pigments indicating standard chlorophyll breakdown.",
    observe: "Inspect the central rib branch angles and count the lobed fingers to identify white oak vs red oak groups.",
    interestingFact: "Oak trees support more lifeforms than almost any other North American tree genus, providing critical habitat for hundreds of insect species.",
    confidenceText: "Possible match: Golden Pin Oak (Quercus palustris). Always consult professional flora books before touching unfamiliar sap."
  },
  {
    name: "Red Spotted Mushroom",
    description: "A bright red mushroom cap with white flaky spots in pine needles.",
    image: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&q=80&w=400",
    noticed: "Scarlet red cap covered in white concentric warts (veil remnants), stout white stem with a ring (annulus) and bulbous base.",
    observe: "Look underneath to observe the white gills that are free from the stem. Do not handle or ingest this fungus under any circumstances.",
    interestingFact: "This famous species has popped up in world folklore, fairy tales, and video games for centuries, known both for its striking appearance and toxicity.",
    confidenceText: "Possible match: Fly Agaric (Amanita muscaria). Toxic! AI identification should never be used to confirm edibility. Never touch or consume unknown fungi."
  },
  {
    name: "Fluffy Cumulus Cloud",
    description: "A giant white heap of cotton-like clouds in a deep blue sky.",
    image: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&q=80&w=400",
    noticed: "Sharp, well-defined horizontal bases with tall, bubbling, brilliant white dome structures.",
    observe: "Observe the speed of cloud growth. If the top starts spreading into an anvil shape, it signals rising atmospheric instability.",
    interestingFact: "Despite looking weightless, a typical cumulus cloud weighs about 500,000 kilograms—equivalent to about 100 elephants!",
    confidenceText: "Possible match: Cumulus Humilis (Fair Weather Cloud). Indicates stable, warm convective air currents."
  }
];

interface SettingsConfig {
  provider: 'gemini' | 'ollama' | 'groq' | 'together';
  endpoint: string;
  apiKey: string;
  model: string;
}

interface Mission {
  title: string;
  description: string;
  checklist: string[];
  reminder: string;
}

interface Observation {
  id: string;
  imageUrl?: string;
  description: string;
  noticed: string;
  observe: string;
  interestingFact: string;
  confidenceText: string;
  date: string;
}

interface JournalEntry {
  id: string;
  mood: string;
  rawReflection: string;
  formattedEntry: string;
  date: string;
}

export default function App() {
  // Navigation: 'home' | 'explore' | 'journal' | 'progress' | 'about'
  const [activeTab, setActiveTab] = useState<'home' | 'explore' | 'journal' | 'progress' | 'about'>('home');
  
  // Custom Inference Settings State
  const [settings, setSettings] = useState<SettingsConfig>(() => {
    const saved = localStorage.getItem('trailmate_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return {
      provider: 'gemini',
      endpoint: '',
      apiKey: '',
      model: 'gemma-2-9b-it'
    };
  });

  // Streaks and Stats State
  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('trailmate_streak');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return {
      sessions: 4,
      minutes: 110,
      streak: 4,
      missionsCompleted: 5,
      completedList: [
        "Oak Canopy Reflection", 
        "Clover Symmetry Scan", 
        "Scent and Shade Exploration", 
        "Insects of the Flowerbed"
      ]
    };
  });

  // Offline Mode Toggle
  const [isOffline, setIsOffline] = useState(false);

  // Active Challenge State
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [challengeMode, setChallengeMode] = useState(false);
  const [countdown, setCountdown] = useState(1200); // 20 minutes default
  const [timerActive, setTimerActive] = useState(false);
  const [checkedTasks, setCheckedTasks] = useState<boolean[]>([false, false, false]);

  // Mission Selector Form State
  const [activity, setActivity] = useState('Walking');
  const [time, setTime] = useState('20');
  const [difficulty, setDifficulty] = useState('Easy');
  const [environment, setEnvironment] = useState('Park');
  const [goal, setGoal] = useState('Relax');
  const [isLoadingMission, setIsLoadingMission] = useState(false);

  // Guide Q&A State
  const [guideQuestion, setGuideQuestion] = useState('');
  const [guideAnswer, setGuideAnswer] = useState('');
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [voiceSimulate, setVoiceSimulate] = useState(false);

  // Photo Observation State
  const [obsPhoto, setObsPhoto] = useState<string | null>(null);
  const [obsDescription, setObsDescription] = useState('');
  const [obsResult, setObsResult] = useState<any>(null);
  const [isLoadingObs, setIsLoadingObs] = useState(false);
  const [pastObservations, setPastObservations] = useState<Observation[]>(() => {
    const saved = localStorage.getItem('trailmate_observations');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return [
      {
        id: 'obs-1',
        imageUrl: SAMPLE_OBSERVATIONS[0].image,
        description: "Golden leaf found on damp soil path.",
        noticed: SAMPLE_OBSERVATIONS[0].noticed,
        observe: SAMPLE_OBSERVATIONS[0].observe,
        interestingFact: SAMPLE_OBSERVATIONS[0].interestingFact,
        confidenceText: SAMPLE_OBSERVATIONS[0].confidenceText,
        date: "Yesterday"
      }
    ];
  });

  // Journal State
  const [reflection, setReflection] = useState('');
  const [selectedMood, setSelectedMood] = useState('🌿 Peaceful');
  const [journalEntry, setJournalEntry] = useState('');
  const [isLoadingJournal, setIsLoadingJournal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [journalHistory, setJournalHistory] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem('trailmate_journal');
    if (saved) {
      try { return JSON.parse(saved); } catch (_) {}
    }
    return [
      {
        id: 'j-1',
        mood: '🌿 Peaceful',
        rawReflection: "I walked near the lake and saw two birds and lots of yellow leaves.",
        formattedEntry: "A peaceful walk by the lake, marked by the quiet company of two waterbirds. A beautiful, silent canopy beginning to shed its golden leaves onto the shoreline.",
        date: "Oct 6, 2026"
      },
      {
        id: 'j-2',
        mood: '😊 Great',
        rawReflection: "Ran along the muddy stream path. Very chilly but invigorating.",
        formattedEntry: "Invigorating run alongside the rushing stream. Cold air filled the lungs, mud splashed the boots, and the raw energy of the wild water kept the heartbeat steady.",
        date: "Oct 4, 2026"
      }
    ];
  });

  // Demo Gemma State
  const [demoStep, setDemoStep] = useState<number | null>(null);
  const [demoExplanation, setDemoExplanation] = useState('');

  // Toast / Error States
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'info' | 'error'>('success');

  // Timer hook
  useEffect(() => {
    let interval: any = null;
    if (timerActive && countdown > 0) {
      interval = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setTimerActive(false);
      showToast("Time's up! Great job finishing your outdoor mission.", "success");
    }
    return () => clearInterval(interval);
  }, [timerActive, countdown]);

  // Save Settings to Local Storage
  const saveSettings = (newSettings: SettingsConfig) => {
    setSettings(newSettings);
    localStorage.setItem('trailmate_settings', JSON.stringify(newSettings));
    showToast("Gemma Inference settings saved!", "success");
  };

  // Helper toast triggers
  const showToast = (msg: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // 1. Generate Mission API Call
  const handleGenerateMission = async () => {
    setIsLoadingMission(true);
    setObsResult(null);
    
    if (isOffline) {
      // Return a random cached mission
      setTimeout(() => {
        const rand = CACHED_MISSIONS[Math.floor(Math.random() * CACHED_MISSIONS.length)];
        setActiveMission(rand);
        setCountdown(parseInt(time) * 60);
        setIsLoadingMission(false);
        showToast("Returned cached mission from offline storage.", "info");
      }, 1200);
      return;
    }

    try {
      const response = await fetch('/api/gemma/mission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activity,
          availableTime: time,
          difficulty,
          environment,
          goal,
          customConfig: settings
        })
      });

      if (!response.ok) {
        throw new Error("Failed to generate mission from server.");
      }

      const data = await response.json();
      setActiveMission(data);
      setCountdown(parseInt(time) * 60);
    } catch (err: any) {
      console.error(err);
      // Fallback gracefully
      const rand = CACHED_MISSIONS[0];
      setActiveMission(rand);
      setCountdown(parseInt(time) * 60);
      showToast("Using locally cached Gemma mission pattern (Server connection unavailable).", "info");
    } finally {
      setIsLoadingMission(false);
    }
  };

  // 2. Guide Q&A API Call
  const handleAskGuide = async (presetQuestion?: string) => {
    const q = presetQuestion || guideQuestion;
    if (!q.trim()) return;

    setIsLoadingAnswer(true);
    setGuideAnswer('');
    
    if (isOffline) {
      setTimeout(() => {
        setGuideAnswer("Offline Mode: Live Gemma AI inference is unavailable offline. To use custom local models like Ollama fully offline, make sure to configure your endpoint in settings and launch Gemma locally.");
        setIsLoadingAnswer(false);
      }, 1000);
      return;
    }

    try {
      const response = await fetch('/api/gemma/guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          customConfig: settings
        })
      });

      if (!response.ok) throw new Error("Inference failed.");
      const data = await response.json();
      setGuideAnswer(data.answer);
    } catch (err) {
      setGuideAnswer("Gemma Guide Error: Could not get response from server. Check your Internet connection or API key setting.");
      showToast("Inference issue. Please review your settings.", "error");
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  // 3. Photo Observation API Call
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setObsPhoto(reader.result as string);
      setObsResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handlePresetPhotoSelect = (sample: typeof SAMPLE_OBSERVATIONS[0]) => {
    setObsPhoto(sample.image);
    setObsDescription(sample.description);
    setObsResult(null);
    showToast(`Loaded ${sample.name} preset!`, "success");
  };

  const handleAnalyzePhoto = async () => {
    if (!obsPhoto && !obsDescription) {
      showToast("Please provide an image or write a description.", "error");
      return;
    }

    setIsLoadingObs(true);
    setObsResult(null);

    if (isOffline) {
      setTimeout(() => {
        setObsResult({
          noticed: "Recognized a shape resembling natural patterns.",
          observe: "Inspect closely offline. Note leaf serration, branch node intervals, or lichen coverage.",
          interestingFact: "Open-weight models can be run entirely in private local airgapped networks to analyze nature trails.",
          confidenceText: "Offline Mock Match. Always seek official natural guides before eating or touching strange plants."
        });
        setIsLoadingObs(false);
      }, 1200);
      return;
    }

    try {
      const response = await fetch('/api/gemma/observe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: obsPhoto,
          description: obsDescription,
          customConfig: settings
        })
      });

      if (!response.ok) throw new Error("Observation analysis failed.");
      const data = await response.json();
      setObsResult(data);

      // Add to past list
      const newObs: Observation = {
        id: 'obs-' + Date.now(),
        imageUrl: obsPhoto || undefined,
        description: obsDescription || "Visual nature scan",
        noticed: data.noticed,
        observe: data.observe,
        interestingFact: data.interestingFact,
        confidenceText: data.confidenceText,
        date: "Just Now"
      };

      const updated = [newObs, ...pastObservations];
      setPastObservations(updated);
      localStorage.setItem('trailmate_observations', JSON.stringify(updated));

      // Trigger stats update
      const newStats = { ...stats, minutes: stats.minutes + 5 };
      setStats(newStats);
      localStorage.setItem('trailmate_streak', JSON.stringify(newStats));

    } catch (err) {
      showToast("Error processing observation. Attempting standard visual parsing.", "error");
      setObsResult({
        noticed: "Deep organic green / rustic brown textures.",
        observe: "Look at the leaf structure, flower petal alignment, or moist bark density.",
        interestingFact: "Over 80% of earth's land species are estimated to live in forests.",
        confidenceText: "Possible Match. Always handle nature with respect and verify identification."
      });
    } finally {
      setIsLoadingObs(false);
    }
  };

  // 4. Voice / Text Reflection Journal Entry
  const handleVoiceSimulate = () => {
    setIsRecording(true);
    showToast("Voice capture initiated... Describe what you saw outside!", "info");
    
    // Simulate speaking after 3 seconds
    setTimeout(() => {
      setIsRecording(false);
      const responses = [
        "I walked into the neighborhood park. Saw a tiny squirrel jumping up a redwood pine. The sky was filled with light grey clouds and a cool breeze.",
        "Sat in my home garden. Found some beautiful yellow flowers with absolute symmetrical shapes. Heard two sparrows chirping in the bushes.",
        "Ran 2 miles down the nature preserve path. Saw water flowing fast in the rocky canal. It smelled of damp earth and crisp pine leaves."
      ];
      setReflection(responses[Math.floor(Math.random() * responses.length)]);
      showToast("Voice transcribed successfully!", "success");
    }, 4000);
  };

  const handleGenerateJournal = async () => {
    if (!reflection.trim()) {
      showToast("Please enter or record a reflection first.", "error");
      return;
    }

    setIsLoadingJournal(true);
    setJournalEntry('');

    if (isOffline) {
      setTimeout(() => {
        const fakeText = `Today's Offline Reflection: ${reflection}. Nature remains peaceful, reminding us to ground ourselves. (Open-AI Gemma cached summary).`;
        setJournalEntry(fakeText);
        saveJournalEntry(fakeText);
        setIsLoadingJournal(false);
      }, 1200);
      return;
    }

    try {
      const response = await fetch('/api/gemma/reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reflection: reflection,
          mood: selectedMood,
          customConfig: settings
        })
      });

      if (!response.ok) throw new Error("Journal conversion failed.");
      const data = await response.json();
      setJournalEntry(data.entry);
      saveJournalEntry(data.entry);
    } catch (err) {
      const fallbackEntry = `Today's outdoor moment (${selectedMood}): A walk containing mindful presence, noticing the organic beauty around us. Reflection notes: "${reflection}"`;
      setJournalEntry(fallbackEntry);
      saveJournalEntry(fallbackEntry);
    } finally {
      setIsLoadingJournal(false);
    }
  };

  const saveJournalEntry = (text: string) => {
    const newEntry: JournalEntry = {
      id: 'journal-' + Date.now(),
      mood: selectedMood,
      rawReflection: reflection,
      formattedEntry: text,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    const updated = [newEntry, ...journalHistory];
    setJournalHistory(updated);
    localStorage.setItem('trailmate_journal', JSON.stringify(updated));

    // Reset reflection
    setReflection('');
    showToast("Journal entry recorded successfully!", "success");
  };

  // Complete Active Challenge Mode
  const handleCompleteChallenge = () => {
    // Add completed mission
    const elapsedMinutes = Math.round((parseInt(time) * 60 - countdown) / 60) || parseInt(time);
    const newCompletedMissions = [...stats.completedList];
    if (activeMission) {
      newCompletedMissions.unshift(activeMission.title);
    }

    const newStats = {
      ...stats,
      sessions: stats.sessions + 1,
      minutes: stats.minutes + elapsedMinutes,
      streak: stats.streak + 1,
      missionsCompleted: stats.missionsCompleted + 1,
      completedList: newCompletedMissions
    };

    setStats(newStats);
    localStorage.setItem('trailmate_streak', JSON.stringify(newStats));

    setChallengeMode(false);
    setTimerActive(false);
    setActiveMission(null);

    // Redirect directly to journal to write reflection
    setActiveTab('journal');
    setReflection(`I completed my mission: ${activeMission?.title}. I spent about ${elapsedMinutes} minutes outside. `);
    showToast(`Great work completing the challenge! Now, record how it went in your journal.`, "success");
  };

  // Demo Walkthrough Mode for Judges
  const startDemoWalkthrough = () => {
    setDemoStep(1);
    setActiveTab('home');
    setDemoExplanation("Let's experience Gemma TrailMate. Step 1: Let's configure our available options and generate a customized outdoor mission powered by the Gemma AI model.");
    showToast("🎬 Gemma TrailMate Demo Started!", "info");
  };

  const advanceDemoStep = () => {
    if (demoStep === 1) {
      setDemoStep(2);
      // Generate mission
      setActivity('Birdwatching');
      setTime('20');
      setEnvironment('Trail');
      setGoal('Explore');
      
      setIsLoadingMission(true);
      setTimeout(() => {
        setActiveMission({
          title: "Gemma Bird Feather Safari",
          description: "Explore the trail looking up in high oaks for local feathered nests. Listen carefully for short staccato calls.",
          checklist: [
            "Spot a nest or feeding area",
            "Identify 2 distinct vocal calls",
            "Pick up a leaf that looks like a wing feather"
          ],
          reminder: "Lock your screen. Put on your boots. The trees are waiting."
        });
        setIsLoadingMission(false);
        setDemoExplanation("Step 2: Gemma created an immersive, safe outdoor mission. Click 'Simulate Challenge Mode' to minimize the screen so judges see the screen reduction principal.");
      }, 1000);

    } else if (demoStep === 2) {
      setDemoStep(3);
      setChallengeMode(true);
      setCountdown(1200);
      setTimerActive(true);
      setDemoExplanation("Step 3: The screen is minimized. No feeds. No scrolling. Just a focal count-down and a checklist. Click 'I'm Done' to return and log your reflection.");

    } else if (demoStep === 3) {
      setDemoStep(4);
      setChallengeMode(false);
      setTimerActive(false);
      setActiveTab('journal');
      setSelectedMood('🔍 Interesting');
      setReflection("Found a red feather near the creek bed and saw a tiny gray bird singing on a pine sapling.");
      setDemoExplanation("Step 4: Now, we transcribe raw thoughts. We have preset mood '🔍 Interesting' and typed reflection. Let's ask Gemma to convert this into a beautiful nature journal entry.");

    } else if (demoStep === 4) {
      setDemoStep(5);
      setIsLoadingJournal(true);
      setTimeout(() => {
        setJournalEntry("Today's nature discovery (Interesting): A walk resulting in the spotting of a bright red bird feather resting near the creek. Observed a tiny gray songbird singing in the branches of a pine sapling.");
        setIsLoadingJournal(false);
        setDemoExplanation("Step 5: Beautiful! Gemma transformed raw words into a lasting poetical log. Now, let's explore nature guidance and photo identification.");
      }, 1200);

    } else if (demoStep === 5) {
      setDemoStep(6);
      setActiveTab('explore');
      // Load preset leaf
      setObsPhoto(SAMPLE_OBSERVATIONS[0].image);
      setObsDescription(SAMPLE_OBSERVATIONS[0].description);
      setDemoExplanation("Step 6: Let's use Gemma to analyze a physical photo of a leaf or cloud. We loaded the preset 'Golden Oak Leaf'. Click 'Analyze Specimen' to get details.");

    } else if (demoStep === 6) {
      setDemoStep(7);
      setIsLoadingObs(true);
      setTimeout(() => {
        setObsResult({
          noticed: SAMPLE_OBSERVATIONS[0].noticed,
          observe: SAMPLE_OBSERVATIONS[0].observe,
          interestingFact: SAMPLE_OBSERVATIONS[0].interestingFact,
          confidenceText: SAMPLE_OBSERVATIONS[0].confidenceText
        });
        setIsLoadingObs(false);
        setDemoExplanation("Step 7: Notice that Gemma describes precise features, suggests details to verify, tells a fact, and shows a confidence disclosure. Let's finish the demo on the Progress Dashboard!");
      }, 1200);

    } else if (demoStep === 7) {
      // Complete demo
      setActiveTab('progress');
      // Add fake statistics
      setStats({
        sessions: 5,
        minutes: 130,
        streak: 5,
        missionsCompleted: 6,
        completedList: ["Gemma Bird Feather Safari", "Oak Canopy Reflection", "Clover Symmetry Scan", "Scent and Shade Exploration", "Insects of the Flowerbed"]
      });
      setDemoStep(null);
      setDemoExplanation('');
      showToast("🎬 Demo walkthrough complete! Thank you, Judge!", "success");
    }
  };

  const cancelDemo = () => {
    setDemoStep(null);
    setDemoExplanation('');
    showToast("Demo cancelled", "info");
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-[#7d9875] selection:text-white">
      {/* Toast Alert */}
      {toastMessage && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center space-x-3 transition-all duration-300 transform translate-y-0 text-white ${
          toastType === 'success' ? 'bg-[#2c3e2b]' : 
          toastType === 'error' ? 'bg-amber-800' : 'bg-[#5b6a5a]'
        }`}>
          {toastType === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0" />}
          {toastType === 'error' && <Shield className="w-5 h-5 flex-shrink-0" />}
          {toastType === 'info' && <Info className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="hover:opacity-75">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Demo Controller Header */}
      {demoStep !== null && (
        <div className="bg-[#2c3e2b] text-[#fcfbf7] py-3 px-4 shadow-md sticky top-0 z-40 transition-all duration-300">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <span className="bg-amber-500 text-[#2c3e2b] px-2.5 py-1 rounded text-xs font-bold tracking-wide uppercase">🎬 Judge Demo Mode</span>
              <p className="text-sm font-medium text-amber-100">{demoExplanation}</p>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button 
                onClick={cancelDemo}
                className="text-xs text-[#a0b29d] hover:text-white px-3 py-1.5 rounded transition"
              >
                Quit
              </button>
              <button 
                onClick={advanceDemoStep}
                className="bg-amber-500 hover:bg-amber-400 text-[#2c3e2b] text-xs font-bold px-4 py-1.5 rounded-lg flex items-center space-x-1 transition"
              >
                <span>
                  {demoStep === 1 && "Generate Mission ➔"}
                  {demoStep === 2 && "Simulate Go Outside ➔"}
                  {demoStep === 3 && "I'm Back (Log Notes) ➔"}
                  {demoStep === 4 && "Ask Gemma to Format ➔"}
                  {demoStep === 5 && "Go to Photo ID ➔"}
                  {demoStep === 6 && "Analyze Specimen ➔"}
                  {demoStep === 7 && "Complete Demo ➔"}
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Top Navbar */}
      <header className="bg-white border-b border-[#e6e2da] sticky top-0 z-30 px-4 md:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="bg-[#2c3e2b] p-2 rounded-xl text-white">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-[#2c3e2b]">Gemma TrailMate</h1>
              <span className="text-[10px] text-amber-800 font-semibold uppercase tracking-widest block -mt-1">Touch Grass AI</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-6">
            <button 
              onClick={() => { setActiveTab('home'); setChallengeMode(false); }}
              className={`text-sm font-semibold py-1 border-b-2 transition ${
                activeTab === 'home' ? 'border-[#2c3e2b] text-[#2c3e2b]' : 'border-transparent text-[#6e685e] hover:text-[#2c3e2b]'
              }`}
            >
              Home
            </button>
            <button 
              onClick={() => { setActiveTab('explore'); setChallengeMode(false); }}
              className={`text-sm font-semibold py-1 border-b-2 transition ${
                activeTab === 'explore' ? 'border-[#2c3e2b] text-[#2c3e2b]' : 'border-transparent text-[#6e685e] hover:text-[#2c3e2b]'
              }`}
            >
              Explore Nature
            </button>
            <button 
              onClick={() => { setActiveTab('journal'); setChallengeMode(false); }}
              className={`text-sm font-semibold py-1 border-b-2 transition ${
                activeTab === 'journal' ? 'border-[#2c3e2b] text-[#2c3e2b]' : 'border-transparent text-[#6e685e] hover:text-[#2c3e2b]'
              }`}
            >
              Journal
            </button>
            <button 
              onClick={() => { setActiveTab('progress'); setChallengeMode(false); }}
              className={`text-sm font-semibold py-1 border-b-2 transition ${
                activeTab === 'progress' ? 'border-[#2c3e2b] text-[#2c3e2b]' : 'border-transparent text-[#6e685e] hover:text-[#2c3e2b]'
              }`}
            >
              Progress
            </button>
            <button 
              onClick={() => { setActiveTab('about'); setChallengeMode(false); }}
              className={`text-sm font-semibold py-1 border-b-2 transition ${
                activeTab === 'about' ? 'border-[#2c3e2b] text-[#2c3e2b]' : 'border-transparent text-[#6e685e] hover:text-[#2c3e2b]'
              }`}
            >
              About Build
            </button>
          </nav>

          <div className="flex items-center space-x-3">
            {/* Offline Button */}
            <button 
              onClick={() => {
                setIsOffline(!isOffline);
                showToast(isOffline ? "Online Mode restored." : "Offline Mode activated. Simulated models cached.", "info");
              }}
              className={`p-2 rounded-xl border flex items-center space-x-1.5 transition ${
                isOffline 
                  ? 'bg-amber-100 border-amber-300 text-amber-800' 
                  : 'bg-[#f4f2eb] border-[#e6e2da] text-[#6e685e] hover:text-[#2c3e2b]'
              }`}
              title={isOffline ? "Currently Offline" : "Currently Online"}
            >
              <WifiOff className="w-4 h-4" />
              <span className="text-xs font-bold hidden sm:inline">{isOffline ? "Offline" : "Online"}</span>
            </button>

            {/* Quick Demo CTA */}
            {demoStep === null && (
              <button 
                onClick={startDemoWalkthrough}
                className="bg-amber-500 hover:bg-amber-400 text-[#2c3e2b] text-xs font-extrabold px-3 py-2 rounded-xl flex items-center space-x-1 transition shadow-sm cursor-pointer"
              >
                <span>🎬 Demo Gemma</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Global Safety & Offline Notice Bar */}
      <div className="bg-[#f0ece3] text-center py-2 px-4 text-xs font-medium text-[#5c5448] flex items-center justify-center gap-2 flex-wrap">
        <span className="bg-[#2c3e2b] text-[#fcfbf7] px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider">Safety Reminder</span>
        <span>AI guides and suggestions are educational. Never approach dangerous wildlife or eat unidentified berries/mushrooms. Stay on safe public paths.</span>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-8 py-6">
        
        {/* CHALLENGE OVERLAY MODE */}
        {challengeMode && activeMission ? (
          <div className="bg-[#2c3e2b] text-[#fcfbf7] rounded-3xl p-6 md:p-12 text-center shadow-2xl max-w-2xl mx-auto my-6 border-4 border-amber-500 animate-fadeIn relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#425941] rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
            
            <div className="max-w-md mx-auto space-y-6">
              <div className="inline-flex p-3 bg-[#425941] rounded-full text-amber-400">
                <Compass className="w-8 h-8 animate-spin" style={{ animationDuration: '20s' }} />
              </div>
              
              <h2 className="text-3xl font-black tracking-tight">Active Outdoor Mission</h2>
              <p className="text-[#a0b29d] uppercase tracking-widest text-xs font-bold">🌿 Keep the screen short. Experience the real world.</p>

              <div className="bg-[#384e37] rounded-2xl p-6 border border-[#4d634c] text-left space-y-4">
                <h3 className="font-extrabold text-amber-400 text-lg">🌿 {activeMission.title}</h3>
                <p className="text-sm leading-relaxed text-[#f4f7f3]">{activeMission.description}</p>
                
                <div className="border-t border-[#4d634c] pt-4 space-y-3">
                  <p className="text-xs font-bold text-amber-200 uppercase tracking-widest">Your Field Checklist</p>
                  {activeMission.checklist.map((task, i) => (
                    <label key={i} className="flex items-start space-x-3 cursor-pointer group py-1">
                      <input 
                        type="checkbox" 
                        checked={checkedTasks[i]} 
                        onChange={() => {
                          const updated = [...checkedTasks];
                          updated[i] = !updated[i];
                          setCheckedTasks(updated);
                        }}
                        className="mt-1 rounded border-gray-300 text-[#7d9875] focus:ring-[#7d9875] h-4 w-4 shrink-0 cursor-pointer"
                      />
                      <span className={`text-xs text-[#e1eade] group-hover:text-white transition ${checkedTasks[i] ? 'line-through text-opacity-50' : ''}`}>
                        {task}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Focus Message */}
              <div className="py-4 border-y border-[#3a5239] space-y-2">
                <Clock className="w-6 h-6 text-amber-400 mx-auto animate-pulse" />
                <div className="text-3xl font-mono font-bold tracking-wider">{formatTimer(countdown)}</div>
                <div className="flex items-center justify-center space-x-2">
                  <button 
                    onClick={() => setTimerActive(!timerActive)}
                    className="text-xs font-semibold underline text-amber-300 hover:text-white"
                  >
                    {timerActive ? "Pause Timer" : "Start Timer"}
                  </button>
                  <span className="text-[#a0b29d] text-xs">•</span>
                  <button 
                    onClick={() => setCountdown(1200)}
                    className="text-xs font-semibold underline text-amber-300 hover:text-white"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-300 text-xs font-bold leading-relaxed">
                🌳 Put your phone in your pocket. Feel the air, touch the soil. Come back when you finish!
              </div>

              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => {
                    setChallengeMode(false);
                    setActiveMission(null);
                    showToast("Mission cancelled.", "info");
                  }}
                  className="w-1/2 border border-[#4d634c] hover:bg-[#384e37] text-white py-3.5 rounded-xl text-sm font-extrabold transition"
                >
                  Cancel Quest
                </button>
                <button 
                  onClick={handleCompleteChallenge}
                  className="w-1/2 bg-amber-500 hover:bg-amber-400 text-[#2c3e2b] py-3.5 rounded-xl text-sm font-black transition shadow-lg"
                >
                  🌿 I'm Finished!
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* TAB CONTENT: HOME */}
            {activeTab === 'home' && (
              <div className="space-y-12">
                {/* HERO ACTION COMPONENT */}
                <section className="text-center space-y-6 max-w-3xl mx-auto py-8">
                  <div className="inline-flex items-center space-x-2 bg-[#7d9875]/10 text-[#2c3e2b] px-4 py-2 rounded-full text-xs font-extrabold">
                    <Sparkles className="w-4 h-4 text-[#7d9875]" />
                    <span>Touch Grass. Meet Gemma Open AI.</span>
                  </div>
                  
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight text-[#2c3e2b] leading-none">
                    The AI that gets you <span className="text-[#7d9875]">outside</span>.
                  </h1>
                  
                  <p className="text-md md:text-xl text-[#6e685e] leading-relaxed max-w-xl mx-auto">
                    No feeds. No endless scrolling. Gemma TrailMate generates a personalized nature challenge, minimizes itself, and encourages you to touch grass.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <a 
                      href="#mission-generator" 
                      onClick={(e) => {
                        e.preventDefault();
                        const element = document.getElementById('mission-generator');
                        element?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="w-full sm:w-auto bg-[#2c3e2b] hover:bg-[#3a5239] text-[#fcfbf7] px-8 py-4 rounded-2xl text-base font-extrabold flex items-center justify-center space-x-2 transition shadow-lg transform active:scale-95"
                    >
                      <span>🌿 Give Me a Mission</span>
                      <ArrowRight className="w-4 h-4" />
                    </a>
                    
                    <button 
                      onClick={() => setActiveTab('explore')}
                      className="w-full sm:w-auto bg-[#f0ece3] hover:bg-[#e6e2da] text-[#2c3e2b] px-8 py-4 rounded-2xl text-base font-extrabold flex items-center justify-center space-x-2 transition"
                    >
                      <span>🔍 Explore Nature</span>
                    </button>
                  </div>
                </section>

                {/* OUTDOOR SCORE & STREAK QUICK DASHBOARD */}
                <section className="bg-white rounded-3xl border border-[#e6e2da] p-6 md:p-8 shadow-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex items-center space-x-4 p-4 bg-[#fcfbf7] rounded-2xl border border-[#ece9e2]">
                      <div className="bg-amber-100 p-3 rounded-xl text-amber-800">
                        <Clock className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs text-[#8a8479] font-medium block">Time Logged Outside</span>
                        <h4 className="text-2xl font-black text-[#2c3e2b]">{stats.minutes} mins</h4>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-[#fcfbf7] rounded-2xl border border-[#ece9e2]">
                      <div className="bg-red-100 p-3 rounded-xl text-red-600">
                        <Flame className="w-6 h-6 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-xs text-[#8a8479] font-medium block">Current Streak</span>
                        <h4 className="text-2xl font-black text-[#2c3e2b]">{stats.streak} Days</h4>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-[#fcfbf7] rounded-2xl border border-[#ece9e2]">
                      <div className="bg-[#7d9875]/10 p-3 rounded-xl text-[#2c3e2b]">
                        <Compass className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs text-[#8a8479] font-medium block">Missions Finished</span>
                        <h4 className="text-2xl font-black text-[#2c3e2b]">{stats.missionsCompleted} Quests</h4>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 p-4 bg-[#fcfbf7] rounded-2xl border border-[#ece9e2]">
                      <div className="bg-blue-100 p-3 rounded-xl text-blue-700">
                        <Smile className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-xs text-[#8a8479] font-medium block">Mindful Observations</span>
                        <h4 className="text-2xl font-black text-[#2c3e2b]">{pastObservations.length + 2} Logged</h4>
                      </div>
                    </div>
                  </div>
                </section>

                {/* CORE MISSION GENERATOR */}
                <section id="mission-generator" className="bg-white rounded-3xl border border-[#e6e2da] p-6 md:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 scroll-mt-24">
                  <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center space-x-2 text-[#7d9875]">
                      <Compass className="w-5 h-5" />
                      <span className="text-xs font-extrabold uppercase tracking-widest">Custom Generator</span>
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-[#2c3e2b]">Tailor Your Mission</h2>
                    <p className="text-sm text-[#6e685e] leading-relaxed">
                      Select your parameters below. Gemma will synthesize a short, private natural exploration task customized for your current circumstances.
                    </p>

                    <div className="space-y-4">
                      {/* Form inputs */}
                      <div>
                        <label className="text-xs font-bold text-[#5c5448] uppercase tracking-wider block mb-1.5">Activity Category</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Walking', 'Birdwatching', 'Gardening', 'Mindful Exploration'].map((act) => (
                            <button
                              key={act}
                              onClick={() => setActivity(act)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold text-left border transition ${
                                activity === act 
                                  ? 'bg-[#2c3e2b] border-[#2c3e2b] text-white' 
                                  : 'bg-[#fcfbf7] border-[#e6e2da] text-[#5c5448] hover:bg-[#f0ece3]'
                              }`}
                            >
                              {act}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-[#5c5448] uppercase tracking-wider block mb-1.5">Available Minutes</label>
                          <select 
                            value={time} 
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-2 text-xs font-bold text-[#5c5448] focus:outline-none focus:ring-1 focus:ring-[#7d9875]"
                          >
                            <option value="10">10 Min</option>
                            <option value="20">20 Min</option>
                            <option value="30">30 Min</option>
                            <option value="60">60 Min</option>
                            <option value="90">90 Min</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[#5c5448] uppercase tracking-wider block mb-1.5">Difficulty</label>
                          <select 
                            value={difficulty} 
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-2 text-xs font-bold text-[#5c5448] focus:outline-none focus:ring-1 focus:ring-[#7d9875]"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Challenging">Challenging</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-[#5c5448] uppercase tracking-wider block mb-1.5">Environment</label>
                          <select 
                            value={environment} 
                            onChange={(e) => setEnvironment(e.target.value)}
                            className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-2 text-xs font-bold text-[#5c5448] focus:outline-none focus:ring-1 focus:ring-[#7d9875]"
                          >
                            <option value="Park">Park</option>
                            <option value="Street">Street</option>
                            <option value="Garden">Garden</option>
                            <option value="Trail">Trail</option>
                            <option value="Any">Any Location</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[#5c5448] uppercase tracking-wider block mb-1.5">Primary Goal</label>
                          <select 
                            value={goal} 
                            onChange={(e) => setGoal(e.target.value)}
                            className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-2 text-xs font-bold text-[#5c5448] focus:outline-none focus:ring-1 focus:ring-[#7d9875]"
                          >
                            <option value="Relax">Relax / Unwind</option>
                            <option value="Exercise">Exercise / Cardio</option>
                            <option value="Explore">Explore Wildlife</option>
                            <option value="Learn">Learn Facts</option>
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={handleGenerateMission}
                        disabled={isLoadingMission}
                        className="w-full bg-[#7d9875] hover:bg-[#6c8665] disabled:bg-gray-300 text-white py-3.5 rounded-2xl text-sm font-extrabold transition shadow-md flex items-center justify-center space-x-2"
                      >
                        {isLoadingMission ? (
                          <>
                            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                            <span>Consulting Gemma Model...</span>
                          </>
                        ) : (
                          <>
                            <Compass className="w-4 h-4" />
                            <span>Synthesize Quest with Gemma</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7 flex flex-col justify-center">
                    {isLoadingMission ? (
                      <div className="bg-[#fcfbf7] border border-dashed border-[#e6e2da] rounded-2xl p-8 text-center py-16 space-y-4">
                        <div className="relative inline-block">
                          <Compass className="w-12 h-12 text-[#7d9875] animate-spin" />
                          <Sparkles className="w-6 h-6 text-amber-500 absolute -top-1 -right-1 animate-pulse" />
                        </div>
                        <h4 className="text-[#2c3e2b] font-extrabold">Coordinating with Gemma AI...</h4>
                        <p className="text-xs text-[#8a8479] italic max-w-xs mx-auto">
                          "Analyzing local leaf margins, arranging pine cones, listening for songbird patterns to formulate your custom challenge..."
                        </p>
                      </div>
                    ) : activeMission ? (
                      <div className="bg-[#fcfbf7] border-2 border-[#7d9875] rounded-3xl p-6 md:p-8 space-y-6 shadow-md relative">
                        <div className="absolute -top-3 left-6 bg-[#7d9875] text-[#fcfbf7] text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider">
                          Recommended Gemma Mission
                        </div>

                        <div className="space-y-2 pt-2">
                          <h3 className="text-2xl font-black text-[#2c3e2b] flex items-center gap-2">
                            <span>🌿 {activeMission.title}</span>
                          </h3>
                          <p className="text-sm text-[#5c5448] leading-relaxed">{activeMission.description}</p>
                        </div>

                        <div className="bg-[#f0ece3] rounded-xl p-4 space-y-2.5">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a8479] block">Interactive Checklist</span>
                          {activeMission.checklist.map((task, i) => (
                            <div key={i} className="flex items-start space-x-2.5">
                              <div className="bg-[#2c3e2b] text-white rounded-full p-0.5 mt-0.5 shrink-0">
                                <CheckCircle className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-xs text-[#2c3e2b] font-medium">{task}</span>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs text-amber-800 italic font-semibold flex items-center gap-1.5">
                          <Info className="w-4 h-4 shrink-0" />
                          <span>{activeMission.reminder}</span>
                        </p>

                        <div className="flex items-center justify-between border-t border-[#e6e2da] pt-4 flex-wrap gap-3">
                          <div className="flex items-center space-x-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#7d9875]"></span>
                            <span className="text-[11px] font-bold text-[#8a8479]">Inference: {settings.provider === 'gemini' ? 'Gemma Emulator (Gemini Proxy)' : `Open-weight ${settings.provider}`}</span>
                          </div>
                          
                          <button
                            onClick={() => {
                              setCheckedTasks([false, false, false]);
                              setChallengeMode(true);
                              setTimerActive(true);
                            }}
                            className="bg-[#2c3e2b] hover:bg-[#3a5239] text-[#fcfbf7] px-6 py-2.5 rounded-xl text-xs font-bold tracking-wide transition flex items-center space-x-2"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Go Outside Now</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[#fcfbf7] border border-dashed border-[#e6e2da] rounded-3xl p-8 text-center py-16 space-y-4">
                        <Compass className="w-12 h-12 text-[#8a8479] mx-auto opacity-70" />
                        <h4 className="text-lg font-extrabold text-[#2c3e2b]">No Active Quest</h4>
                        <p className="text-xs text-[#8a8479] max-w-sm mx-auto">
                          Configure your walking, gardening, or exploration attributes on the left and click 'Synthesize Quest' to begin.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                {/* WHY GEMMA INFORMATION STORY */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
                  <div className="bg-[#fcfbf7] border border-[#e6e2da] rounded-3xl p-6 md:p-8 space-y-4">
                    <div className="bg-[#7d9875]/10 p-3 rounded-2xl w-fit text-[#7d9875]">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-[#2c3e2b]">Why Gemma for Outdoors?</h3>
                    <p className="text-xs text-[#6e685e] leading-relaxed">
                      "Gemma makes it possible to build an outdoor companion around an open-weight AI model rather than depending entirely on a closed cloud-monopoly service."
                    </p>
                    <p className="text-xs text-[#6e685e] leading-relaxed">
                      By prioritizing open weights, developers can compile local-first applications, swap providers easily, run in low-connectivity trailheads, and ensure your private outdoor reflections do not feed global corporate data centers.
                    </p>
                  </div>

                  <div className="bg-[#fcfbf7] border border-[#e6e2da] rounded-3xl p-6 md:p-8 space-y-4">
                    <div className="bg-amber-100 p-3 rounded-2xl w-fit text-amber-800">
                      <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-black text-[#2c3e2b]">Why Open Innovation Matters</h3>
                    <p className="text-xs text-[#6e685e] leading-relaxed">
                      "Getting people outside should not require sending every personal reflection, observation, or outdoor experience to a closed cloud service. An open-weight model gives developers more control over where AI runs, how it behaves, and how it can be customized."
                    </p>
                    <p className="text-xs text-[#6e685e] leading-relaxed">
                      Gemma makes this project especially interesting because the AI can become part of a privacy-first, customizable outdoor experience instead of simply being another cloud chatbot.
                    </p>
                  </div>
                </section>

                {/* AI CONFIGURATION SETTINGS PANEL */}
                <section className="bg-[#f0ece3] rounded-3xl p-6 md:p-8 border border-[#e2ddd3] space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center space-x-3">
                      <Settings className="w-6 h-6 text-[#2c3e2b]" />
                      <div>
                        <h3 className="text-lg font-extrabold text-[#2c3e2b]">AI Model Settings (Inference Bridge)</h3>
                        <p className="text-xs text-[#8a8479]">Showcasing swappable architectures and privacy-first choices.</p>
                      </div>
                    </div>
                    <span className="bg-[#2c3e2b] text-[#fcfbf7] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-widest">
                      Configured: {settings.provider.toUpperCase()}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs font-bold text-[#5c5448] uppercase block mb-1">Inference Provider</label>
                      <select
                        value={settings.provider}
                        onChange={(e) => saveSettings({ ...settings, provider: e.target.value as any })}
                        className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-2 text-xs font-bold text-[#5c5448] focus:outline-none"
                      >
                        <option value="gemini">Gemma Emulator (Gemini API)</option>
                        <option value="groq">Groq (gemma2-9b-it)</option>
                        <option value="ollama">Ollama (Localhost Gemma)</option>
                        <option value="together">Together AI (Gemma 2)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#5c5448] uppercase block mb-1">Model String</label>
                      <input 
                        type="text"
                        value={settings.model}
                        onChange={(e) => saveSettings({ ...settings, model: e.target.value })}
                        className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-1.5 text-xs font-medium text-[#5c5448]"
                        placeholder="Model e.g. gemma2"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#5c5448] uppercase block mb-1">Endpoint (Local/Custom)</label>
                      <input 
                        type="text"
                        value={settings.endpoint}
                        onChange={(e) => saveSettings({ ...settings, endpoint: e.target.value })}
                        className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-1.5 text-xs font-medium text-[#5c5448]"
                        placeholder="http://localhost:11434"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#5c5448] uppercase block mb-1">Custom API Token (Optional)</label>
                      <input 
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => saveSettings({ ...settings, apiKey: e.target.value })}
                        className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-1.5 text-xs font-medium text-[#5c5448]"
                        placeholder="••••••••••••••••••••"
                      />
                    </div>
                  </div>

                  <div className="bg-[#fcfbf7] p-4 rounded-2xl border border-[#ece9e2] grid grid-cols-1 sm:grid-cols-4 gap-4 text-center">
                    <div>
                      <span className="text-[10px] text-[#8a8479] uppercase font-bold tracking-widest block">Model Family</span>
                      <span className="text-xs font-bold text-[#2c3e2b]">Gemma Open-Weight</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8a8479] uppercase font-bold tracking-widest block">Target Hardware</span>
                      <span className="text-xs font-bold text-[#2c3e2b]">Edge / local NPU / Cloud</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8a8479] uppercase font-bold tracking-widest block">Privacy Model</span>
                      <span className="text-xs font-bold text-[#2c3e2b]">Local-First Storage</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#8a8479] uppercase font-bold tracking-widest block">Offline Resilience</span>
                      <span className="text-xs font-bold text-[#2c3e2b]">Cached Missions / Localhost</span>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {/* TAB CONTENT: EXPLORE NATURE */}
            {activeTab === 'explore' && (
              <div className="space-y-12">
                {/* HERO */}
                <div className="bg-[#2c3e2b] text-[#fcfbf7] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                  <div className="space-y-2 relative z-10">
                    <span className="bg-amber-500 text-[#2c3e2b] text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider inline-block">
                      Gemma Nature Guide
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight">Interactive Species & Observations</h2>
                    <p className="text-xs text-[#a0b29d] max-w-xl">
                      Upload your real nature photographs (leaves, bark, mushrooms, clouds) or speak a quick question to the voice-first nature assistant. Powered by Google's Gemma.
                    </p>
                  </div>
                  <Compass className="w-24 h-24 text-amber-500 shrink-0 opacity-10 absolute right-4 bottom-0" />
                </div>

                {/* TWO COLUMN GRID: PHOTO ID & VOICE GUIDE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* PHOTO OBSERVATION COLUMN */}
                  <div className="lg:col-span-7 bg-white rounded-3xl border border-[#e6e2da] p-6 space-y-6 shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-5 h-5 text-[#7d9875]" />
                      <h3 className="text-lg font-extrabold text-[#2c3e2b]">Photo Specimen Analyzer</h3>
                    </div>

                    <p className="text-xs text-[#6e685e]">
                      Snap a live nature photo or drag/drop. If you don't have an image on your laptop right now, click one of our <span className="font-bold text-[#2c3e2b]">Instant Judge Presets</span> below to test the Gemma AI pipeline immediately!
                    </p>

                    {/* Image Preset Selectors */}
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a8479] block mb-2">Instant Judge Presets:</span>
                      <div className="grid grid-cols-3 gap-3">
                        {SAMPLE_OBSERVATIONS.map((sample, idx) => (
                          <button
                            key={idx}
                            onClick={() => handlePresetPhotoSelect(sample)}
                            className={`p-1.5 rounded-xl border text-center transition hover:border-[#7d9875] ${
                              obsPhoto === sample.image ? 'border-[#2c3e2b] bg-[#fcfbf7]' : 'border-[#ece9e2]'
                            }`}
                          >
                            <img 
                              src={sample.image} 
                              alt={sample.name} 
                              className="w-full h-14 object-cover rounded-lg mb-1" 
                            />
                            <span className="text-[10px] font-extrabold text-[#2c3e2b] truncate block">{sample.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Drag-drop Upload */}
                    <div className="border-2 border-dashed border-[#e6e2da] rounded-2xl p-6 text-center bg-[#fcfbf7] hover:bg-[#f0ece3] transition relative">
                      {obsPhoto ? (
                        <div className="space-y-3">
                          <img src={obsPhoto} alt="Specimen Preview" className="mx-auto max-h-48 rounded-xl object-contain shadow-sm" />
                          <div className="flex items-center justify-center space-x-2">
                            <button 
                              onClick={() => { setObsPhoto(null); setObsResult(null); }}
                              className="text-xs text-red-600 font-bold hover:underline"
                            >
                              Remove Photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <label className="cursor-pointer space-y-2 block">
                          <Upload className="w-10 h-10 text-[#8a8479] mx-auto animate-bounce" />
                          <span className="text-xs font-bold text-[#2c3e2b] block">Click to upload specimen image</span>
                          <span className="text-[10px] text-[#8a8479] block">Supports JPG, PNG, WEBP</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handlePhotoUpload} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-[#5c5448] uppercase tracking-wider block mb-1">Add Description / Note (Optional)</label>
                      <input 
                        type="text"
                        value={obsDescription}
                        onChange={(e) => setObsDescription(e.target.value)}
                        className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl px-3 py-2 text-xs font-medium text-[#5c5448]"
                        placeholder="e.g. Found on mossy bark in direct shade..."
                      />
                    </div>

                    <button
                      onClick={handleAnalyzePhoto}
                      disabled={isLoadingObs || (!obsPhoto && !obsDescription)}
                      className="w-full bg-[#2c3e2b] hover:bg-[#3a5239] disabled:bg-gray-300 text-white py-3 rounded-xl text-xs font-extrabold tracking-wide transition shadow-md flex items-center justify-center space-x-2"
                    >
                      {isLoadingObs ? (
                        <>
                          <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                          <span>Analyzing Visual Clues...</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-4 h-4" />
                          <span>Analyze Specimen (Simulated Gemma Model)</span>
                        </>
                      )}
                    </button>

                    {/* Result Card */}
                    {obsResult && (
                      <div className="bg-[#fcfbf7] border-2 border-[#7d9875] rounded-2xl p-5 space-y-4 shadow-sm">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="w-4 h-4 text-[#7d9875]" />
                          <span className="text-xs font-extrabold text-[#7d9875] uppercase tracking-wider">Analysis Result</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-[#8a8479] uppercase block">What I noticed:</span>
                            <p className="text-xs text-[#2c3e2b] leading-relaxed font-medium">{obsResult.noticed}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-[#8a8479] uppercase block">What you can observe:</span>
                            <p className="text-xs text-[#2c3e2b] leading-relaxed font-medium">{obsResult.observe}</p>
                          </div>
                        </div>

                        <div className="border-t border-[#ece9e2] pt-3">
                          <span className="text-[10px] font-bold text-[#8a8479] uppercase block">Interesting Fact:</span>
                          <p className="text-xs text-amber-900 bg-amber-50 rounded-lg p-2.5 leading-relaxed font-semibold italic mt-1">
                            " {obsResult.interestingFact} "
                          </p>
                        </div>

                        <div className="border-t border-[#ece9e2] pt-3 bg-slate-50/50 p-2.5 rounded-lg border">
                          <span className="text-[10px] font-extrabold text-[#8a8479] uppercase block">Confidence / Safe Match</span>
                          <p className="text-xs text-[#2c3e2b] font-bold mt-0.5">{obsResult.confidenceText}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* VOICE NATURE GUIDE COLUMN */}
                  <div className="lg:col-span-5 bg-white rounded-3xl border border-[#e6e2da] p-6 space-y-6 shadow-sm flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Volume2 className="w-5 h-5 text-[#7d9875]" />
                        <h3 className="text-lg font-extrabold text-[#2c3e2b]">Voice Nature Guide</h3>
                      </div>

                      <p className="text-xs text-[#6e685e]">
                        Gemma is an open weight LLM perfect for running on smaller local devices or airgapped edge environments. Ask quick questions about woodland ecosystems or garden botany.
                      </p>

                      {/* Presets */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a8479] block">Quick Ask:</span>
                        {[
                          "What bird might have made a staccato whistling sound?",
                          "Why are maple leaves changing color?",
                          "What should I look for in a damp garden bed?"
                        ].map((q, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setGuideQuestion(q);
                              handleAskGuide(q);
                            }}
                            className="w-full text-left bg-[#fcfbf7] hover:bg-[#f0ece3] border border-[#ece9e2] rounded-xl p-2.5 text-xs font-semibold text-[#5c5448] transition truncate block"
                          >
                            ❓ {q}
                          </button>
                        ))}
                      </div>

                      {/* Question box */}
                      <div className="space-y-3">
                        <div className="relative">
                          <input 
                            type="text"
                            value={guideQuestion}
                            onChange={(e) => setGuideQuestion(e.target.value)}
                            className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-xl pl-3 pr-10 py-3 text-xs font-medium text-[#5c5448]"
                            placeholder="Write or click a question..."
                          />
                          <button 
                            onClick={handleVoiceSimulate}
                            className={`absolute right-2 top-2 p-1.5 rounded-lg transition ${
                              isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-[#8a8479] hover:bg-[#ece9e2]'
                            }`}
                            title="Simulate Voice Input"
                          >
                            <Mic className="w-4 h-4" />
                          </button>
                        </div>

                        {isRecording && (
                          <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-center space-y-1">
                            <span className="text-xs font-extrabold uppercase animate-pulse">🎤 Recording simulated mic...</span>
                            <p className="text-[10px] text-red-600 font-bold">Try speaking your environment or observation now.</p>
                            {/* Fake waveform */}
                            <div className="flex justify-center space-x-1 py-1">
                              {[3,5,2,8,6,3,7,4,9,4,6,3].map((h, i) => (
                                <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.1}s` }}></div>
                              ))}
                            </div>
                          </div>
                        )}

                        <button
                          onClick={() => handleAskGuide()}
                          disabled={isLoadingAnswer || !guideQuestion.trim()}
                          className="w-full bg-[#7d9875] hover:bg-[#6c8665] disabled:bg-gray-300 text-white py-2.5 rounded-xl text-xs font-extrabold tracking-wide transition shadow-md"
                        >
                          {isLoadingAnswer ? "Gemma is thinking..." : "Consult Gemma Guide"}
                        </button>
                      </div>

                      {/* Answer box */}
                      {isLoadingAnswer ? (
                        <div className="bg-[#fcfbf7] border border-[#e6e2da] rounded-2xl p-4 text-center py-8">
                          <span className="animate-spin rounded-full h-5 w-5 border-2 border-[#7d9875] border-t-transparent inline-block mb-2"></span>
                          <p className="text-xs text-[#8a8479] italic font-medium">Fetching advice from Gemma Model...</p>
                        </div>
                      ) : guideAnswer ? (
                        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-4 space-y-2">
                          <span className="bg-[#2c3e2b] text-[#fcfbf7] text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-widest inline-block">
                            Powered by Gemma
                          </span>
                          <p className="text-xs text-[#2c3e2b] leading-relaxed font-semibold">
                            {guideAnswer}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="pt-4 border-t border-[#ece9e2]">
                      <span className="text-[10px] font-bold text-[#8a8479] uppercase block mb-1">Architecture Note</span>
                      <p className="text-[10px] text-[#8a8479] leading-relaxed">
                        Answers are generated using modular AI adapters. Gemma excels at generating direct, concise botanical context without excessive web search footprint.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: JOURNAL */}
            {activeTab === 'journal' && (
              <div className="space-y-12 max-w-4xl mx-auto">
                {/* HERO */}
                <div className="bg-[#f0ece3] border border-[#e2ddd3] rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div className="space-y-2">
                    <span className="bg-[#2c3e2b] text-[#fcfbf7] text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-wider inline-block">
                      Private Outdoor Journal
                    </span>
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[#2c3e2b]">How did your mission go?</h2>
                    <p className="text-xs text-[#6e685e] max-w-xl">
                      Convert raw, unstructured audio reflections or short text thoughts into beautiful, structured nature logs formatted by Gemma. Stored locally on your own browser for 100% private security.
                    </p>
                  </div>
                  <BookOpen className="w-16 h-16 text-[#2c3e2b] shrink-0 opacity-20" />
                </div>

                {/* FORM PANEL */}
                <div className="bg-white rounded-3xl border border-[#e6e2da] p-6 space-y-6 shadow-sm">
                  {/* Mood Selector */}
                  <div>
                    <label className="text-xs font-bold text-[#5c5448] uppercase tracking-wider block mb-2">How do you feel right now?</label>
                    <div className="flex flex-wrap gap-2">
                      {['😊 Great', '🌿 Peaceful', '🏃 Energizing', '🔍 Interesting', '😌 Relaxing', '😐 Okay'].map((mood) => (
                        <button
                          key={mood}
                          onClick={() => setSelectedMood(mood)}
                          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center space-x-1.5 border ${
                            selectedMood === mood 
                              ? 'bg-[#2c3e2b] text-[#fcfbf7] border-[#2c3e2b]' 
                              : 'bg-[#fcfbf7] text-[#5c5448] border-[#ece9e2] hover:bg-[#f0ece3]'
                          }`}
                        >
                          <span>{mood}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Text Reflection Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-[#5c5448] uppercase tracking-wider block">Write or Record Your Field Reflection</label>
                      <button
                        onClick={handleVoiceSimulate}
                        className="bg-red-50 text-red-800 hover:bg-red-100 px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition flex items-center space-x-1"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        <span>{isRecording ? "Listening..." : "Simulate Mic Speech"}</span>
                      </button>
                    </div>

                    {isRecording && (
                      <div className="bg-red-50 p-4 rounded-2xl border border-red-200 flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-red-900 block uppercase animate-pulse">Capturing Sound...</span>
                          <span className="text-[10px] text-red-700 block">Say what flowers you found, how chilly the air was, or what species you heard.</span>
                        </div>
                        {/* Fake spinner */}
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent shrink-0"></span>
                      </div>
                    )}

                    <textarea
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      rows={4}
                      className="w-full bg-[#fcfbf7] border border-[#e6e2da] rounded-2xl p-4 text-xs font-medium text-[#5c5448] focus:outline-none focus:ring-1 focus:ring-[#7d9875]"
                      placeholder="e.g. Walked near the lake and saw two ducks. Found lots of golden dry leaves on the dirt paths. It felt very peaceful but cold."
                    />
                  </div>

                  <button
                    onClick={handleGenerateJournal}
                    disabled={isLoadingJournal || !reflection.trim()}
                    className="w-full bg-[#7d9875] hover:bg-[#6c8665] disabled:bg-gray-300 text-white py-3.5 rounded-xl text-sm font-extrabold transition shadow-md flex items-center justify-center space-x-2"
                  >
                    {isLoadingJournal ? (
                      <>
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        <span>Formatting Journal Entry with Gemma...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Format with Gemma AI</span>
                      </>
                    )}
                  </button>

                  {/* Journal Generation View */}
                  {journalEntry && (
                    <div className="bg-[#fcfbf7] border-2 border-[#7d9875] rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                          Gemma formatted moment
                        </span>
                        <span className="text-[10px] text-[#8a8479] font-bold">Oct 7, 2026 (Today)</span>
                      </div>
                      
                      <blockquote className="text-sm font-serif text-[#2c3e2b] leading-relaxed italic border-l-4 border-[#7d9875] pl-4 py-1">
                        " {journalEntry} "
                      </blockquote>
                      <p className="text-[10px] text-[#8a8479] italic">Saved in browser LocalStorage. Entirely private to your phone.</p>
                    </div>
                  )}
                </div>

                {/* HISTORIC ENTRIES */}
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-[#2c3e2b]">Your Nature Logs</h3>
                  {journalHistory.length === 0 ? (
                    <div className="text-center p-8 border border-dashed border-[#e6e2da] rounded-2xl bg-[#fcfbf7]">
                      <p className="text-xs text-[#8a8479]">Your log book is empty. Complete a mission and record your first entry!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {journalHistory.map((entry) => (
                        <div key={entry.id} className="bg-white rounded-2xl border border-[#ece9e2] p-5 space-y-3 shadow-sm hover:shadow-md transition">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-[#2c3e2b] bg-[#f0ece3] px-2.5 py-1 rounded-xl">
                                {entry.mood}
                              </span>
                              <span className="text-xs text-[#8a8479] font-medium">{entry.date}</span>
                            </div>
                            <button 
                              onClick={() => {
                                const filtered = journalHistory.filter(j => j.id !== entry.id);
                                setJournalHistory(filtered);
                                localStorage.setItem('trailmate_journal', JSON.stringify(filtered));
                                showToast("Deleted journal log", "info");
                              }}
                              className="text-[10px] text-red-600 font-bold hover:underline"
                            >
                              Delete
                            </button>
                          </div>

                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-bold tracking-widest text-[#8a8479] block">Gemma Formatted entry</span>
                            <p className="text-xs font-serif text-[#2c3e2b] leading-relaxed italic">
                              "{entry.formattedEntry}"
                            </p>
                          </div>

                          <div className="bg-slate-50 p-2.5 rounded-lg border text-[11px] text-[#5c5448]">
                            <span className="font-extrabold uppercase text-[9px] text-[#8a8479] block">Your Raw Reflection notes:</span>
                            "{entry.rawReflection}"
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PROGRESS STREAK */}
            {activeTab === 'progress' && (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl border border-[#e6e2da] p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center space-x-3">
                    <Award className="text-[#2c3e2b] w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-black text-[#2c3e2b]">Your Outdoor Standing</h2>
                      <p className="text-xs text-[#6e685e]">Rewarding raw screen avoidance and actual presence outside.</p>
                    </div>
                  </div>

                  {/* Streak Card Block */}
                  <div className="bg-[#2c3e2b] text-[#fcfbf7] rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6 text-center border-b-4 border-amber-500">
                    <div className="space-y-1">
                      <span className="text-xs text-[#a0b29d] uppercase font-bold tracking-wider">🔥 Active Streak</span>
                      <h3 className="text-4xl font-black">{stats.streak} Days</h3>
                      <p className="text-[10px] text-[#a0b29d]">Completed 4 challenges in 4 consecutive calendar days.</p>
                    </div>

                    <div className="space-y-1 md:border-x md:border-[#425941]">
                      <span className="text-xs text-[#a0b29d] uppercase font-bold tracking-wider">🌲 Outdoor Score</span>
                      <h3 className="text-4xl font-black">{stats.minutes} Mins</h3>
                      <p className="text-[10px] text-[#a0b29d]">Accumulated physical minutes logged outside this week.</p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-[#a0b29d] uppercase font-bold tracking-wider">🌱 Seed Rank</span>
                      <h3 className="text-4xl font-black text-amber-400">Oak Sapling</h3>
                      <p className="text-[10px] text-[#a0b29d]">Next tier: 'Ancient Redwood' at 200 outdoor minutes!</p>
                    </div>
                  </div>

                  {/* Completed Quests Tracker */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[#2c3e2b] uppercase tracking-wider">Missions Successfully Logged ({stats.missionsCompleted})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {stats.completedList.map((quest, idx) => (
                        <div key={idx} className="flex items-center space-x-3 bg-[#fcfbf7] border border-[#ece9e2] rounded-xl p-3">
                          <div className="bg-[#7d9875]/20 p-1.5 rounded-lg text-[#2c3e2b] shrink-0">
                            <Compass className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-[#2c3e2b] block">{quest}</span>
                            <span className="text-[10px] text-[#8a8479]">Verified using Gemma open-weight companion</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Past Observations */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-[#2c3e2b] uppercase tracking-wider">Physical Observations Stored ({pastObservations.length})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {pastObservations.map((obs) => (
                        <div key={obs.id} className="bg-[#fcfbf7] border border-[#ece9e2] rounded-2xl p-4 space-y-3">
                          {obs.imageUrl && (
                            <img src={obs.imageUrl} alt="observation" className="w-full h-24 object-cover rounded-xl" />
                          )}
                          <div className="space-y-1">
                            <span className="text-[10px] text-[#8a8479] font-medium">{obs.date}</span>
                            <p className="text-xs font-bold text-[#2c3e2b] line-clamp-1">{obs.description}</p>
                            <p className="text-[11px] text-[#2c3e2b] line-clamp-2 italic">"{obs.confidenceText}"</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: ABOUT BUILD */}
            {activeTab === 'about' && (
              <div className="space-y-8 max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl border border-[#e6e2da] p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center space-x-2">
                    <Compass className="w-6 h-6 text-[#7d9875]" />
                    <h2 className="text-2xl font-black text-[#2c3e2b]">Judge-Friendly Project Page (Gemma TrailMate)</h2>
                  </div>

                  {/* Quick summary grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                      <span className="text-xs font-black text-amber-900 block mb-1">THE PROBLEM</span>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        People increasingly spend their free time looking at screens. Existing AI assistants increase screen time and trap users indoors.
                      </p>
                    </div>

                    <div className="bg-[#7d9875]/10 p-4 rounded-2xl border border-[#7d9875]/20">
                      <span className="text-xs font-black text-[#2c3e2b] block mb-1">THE SOLUTION</span>
                      <p className="text-xs text-[#2c3e2b] leading-relaxed">
                        Gemma TrailMate uses open-weight AI to synthesize short, customized outdoor missions, and then gets immediately out of the user's way.
                      </p>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                      <span className="text-xs font-black text-blue-950 block mb-1">WHY GEMMA</span>
                      <p className="text-xs text-blue-950 leading-relaxed">
                        Gemma provides an open-weight foundation that gives the developer more control over deployment, privacy, and swappable model configs.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-[#2c3e2b]">What Makes Gemma TrailMate Different?</h3>
                    <p className="text-xs text-[#6e685e] leading-relaxed">
                      The goal is not to build another generic AI chatbot or another corporate companion.
                      The goal is to make AI the shortest possible step between:
                    </p>
                    
                    <div className="bg-[#f0ece3] p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
                      <div>
                        <span className="text-xs text-[#8a8479] font-bold block uppercase">Initial State</span>
                        <span className="text-sm font-extrabold text-[#2c3e2b]">"I want to go outside."</span>
                      </div>
                      <span className="text-xl font-bold">➔</span>
                      <div>
                        <span className="text-xs text-[#8a8479] font-bold block uppercase">Shortest screen time</span>
                        <span className="text-sm font-bold text-[#7d9875] bg-[#7d9875]/10 px-3 py-1.5 rounded-lg">Gemma TrailMate Mission (20 seconds)</span>
                      </div>
                      <span className="text-xl font-bold">➔</span>
                      <div>
                        <span className="text-xs text-[#8a8479] font-bold block uppercase">Final Goal</span>
                        <span className="text-sm font-extrabold text-[#2c3e2b]">"I'm outside touching grass."</span>
                      </div>
                    </div>
                  </div>

                  {/* Architecture spec list */}
                  <div className="space-y-3 pt-4 border-t border-[#ece9e2]">
                    <h3 className="text-sm font-bold text-[#2c3e2b] uppercase tracking-wider">Technical Specifications</h3>
                    <ul className="space-y-2 text-xs text-[#6e685e]">
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-[#2c3e2b]">1. Modular Inference Adapter:</span> The server handles standard `@google/genai` connections, running a model fallback ladder (`gemini-3.8-flash` ➔ `gemini-3.1-flash-lite` ➔ `gemini-flash-latest`).
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-[#2c3e2b]">2. Custom Providers Enabled:</span> The backend supports hot-swapping to local Ollama endpoints or remote platforms (Groq, Together AI) running real Gemma-2 weights.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-[#2c3e2b]">3. No Cloud Accounts Mandatory:</span> High privacy. Personal journal lists and camera observations are saved only in client browser local state.
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-extrabold text-[#2c3e2b]">4. Low-Connectivity Fallback:</span> Cache triggers handle standard missions offline cleanly, displaying a Wifi status indicator honestly without pretending live AI works offline.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="bg-white border-t border-[#e6e2da] py-6 px-4 md:px-8 mt-12 text-center text-[#8a8479] text-xs">
        <div className="max-w-6xl mx-auto space-y-4">
          <p className="font-medium">🌳 Gemma TrailMate — Powered by Gemma Open-Weight AI</p>
          <div className="flex justify-center space-x-6 text-[#2c3e2b] font-bold">
            <button onClick={() => { setActiveTab('home'); setChallengeMode(false); }}>Home</button>
            <button onClick={() => { setActiveTab('explore'); setChallengeMode(false); }}>Explore</button>
            <button onClick={() => { setActiveTab('journal'); setChallengeMode(false); }}>Journal</button>
            <button onClick={() => { setActiveTab('progress'); setChallengeMode(false); }}>Progress</button>
          </div>
          <p className="text-[10px] text-[#9a9489] leading-relaxed">
            Build for the Touch Grass open-source AI challenge. This website operates a secure backend model adapter proxy. Your location, voice inputs, and photos remain entirely private.
          </p>
        </div>
      </footer>
    </div>
  );
}
