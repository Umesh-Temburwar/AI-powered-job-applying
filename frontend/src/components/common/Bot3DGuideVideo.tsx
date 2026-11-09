import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Copy,
  Check,
  Terminal as TerminalIcon,
  Sparkles,
  ExternalLink,
  Cpu,
  Compass,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { playRetroSound } from '../../utils/soundEffects';

export interface Bot3DGuideVideoProps {
  initialAutoPlay?: boolean;
  className?: string;
}

interface GuideScene {
  id: number;
  timestamp: string;
  tag: string;
  title: string;
  shortLabel: string;
  creatorIntro?: boolean;
  creatorOutro?: boolean;
  codeSnippet?: {
    terminalTitle: string;
    command: string;
    notes: string;
  };
  highlights: string[];
  captionsEn: string;
  voiceScriptEn: string;
  captionsHi: string;
  voiceScriptHi: string;
  stageBadge: string;
}

const GUIDE_SCENES: GuideScene[] = [
  {
    id: 0,
    timestamp: '00:00',
    tag: 'SCENE 01 // ARCHITECT INTRO',
    title: 'AI-Powered Job Auto-Apply Bot — Platform Overview',
    shortLabel: 'Intro',
    creatorIntro: true,
    stageBadge: 'CREATOR_SPOTLIGHT // ARCHITECTURE_V3',
    highlights: [
      'Multi-portal autonomous applications: Naukri, Indeed, LinkedIn & Internshala',
      'AI Resume Intelligence with automated field matching and question answering',
      'Designed, engineered, and architected by Umesh Temburwar',
    ],
    captionsEn:
      'Welcome! This is the official 3D interactive video guide for the AI-Powered Job Auto-Apply Bot, designed and engineered by Umesh Temburwar. In this video, you will learn everything from cloning the repository to launching autonomous job applications.',
    voiceScriptEn:
      'Welcome! This is the official 3D interactive video guide for the AI-Powered Job Auto-Apply Bot, designed and engineered by Umesh Temburwar. In this video, you will learn everything from cloning the repository to launching autonomous job applications. Let us begin!',
    captionsHi:
      'Namaste aur swagat hai! Yeh hai AI-Powered Job Auto-Apply Bot ki official 3D video guide, jise create aur engineer kiya hai Umesh Temburwar ne. Iss video me hum git clone se lekar auto-apply bot run karne tak sab seekhenge.',
    voiceScriptHi:
      'Namaste aur swagat hai! Yeh hai AI-Powered Job Auto-Apply Bot ki official 3D video guide, jise create aur engineer kiya hai Umesh Temburwar ne. Iss video me hum git clone se lekar bot run karne tak sabhi steps seekhenge.',
  },
  {
    id: 1,
    timestamp: '00:30',
    tag: 'STEP 01 // GIT CLONE',
    title: 'Clone Repository & Open Workspace',
    shortLabel: 'Git Clone',
    stageBadge: 'GIT_VCS // REPOSITORY_SYNC',
    codeSnippet: {
      terminalTitle: 'TERMINAL: GIT CLONE REPOSITORY',
      command: 'git clone https://github.com/Umesh-Temburwar/AI-powered-job-applying.git\ncd AI-powered-job-applying',
      notes: 'Clones the latest master codebase with complete bot engines and UI.',
    },
    highlights: [
      'Official GitHub repository maintained by Umesh Temburwar',
      'Contains FastAPI backend, React 19 frontend, and multi-portal bot scripts',
      'Open the folder inside VS Code or your preferred terminal',
    ],
    captionsEn:
      'Step 1: Open your terminal and clone the official GitHub repository using git clone. Once cloned, navigate into the project directory.',
    voiceScriptEn:
      'Step 1: Open your terminal and clone the official GitHub repository using git clone. Once downloaded, navigate into the project directory.',
    captionsHi:
      'Step 1: Terminal kholein aur git clone command chalakar repository download karein. Uske baad project folder ke andar navigate karein.',
    voiceScriptHi:
      'Step 1: Terminal kholein aur git clone command chalakar repository download karein. Fir project folder ke andar enter karein.',
  },
  {
    id: 2,
    timestamp: '01:05',
    tag: 'STEP 02 // VIRTUAL ENVIRONMENT',
    title: 'Python Virtual Environment & Dependencies',
    shortLabel: 'Python Env',
    stageBadge: 'PYTHON_RUNTIME // PIP_INSTALL',
    codeSnippet: {
      terminalTitle: 'TERMINAL: SETUP VENV & REQUIREMENTS',
      command: 'python -m venv venv\n.\\venv\\Scripts\\activate\npip install -r requirements.txt',
      notes: 'Installs Selenium, FastAPI, Uvicorn, BeautifulSoup4, and AI libraries.',
    },
    highlights: [
      'Creates an isolated Python 3.10+ sandbox environment',
      'Automates browser drivers (Chrome/Edge/Brave) via WebDriver Manager',
      'Mac/Linux users can activate using source venv/bin/activate',
    ],
    captionsEn:
      'Step 2: Create a virtual environment with python -m venv venv and activate it. Then install all required packages using pip install -r requirements.txt.',
    voiceScriptEn:
      'Step 2: Create an isolated Python virtual environment and activate it. Then install all required packages using pip install dash r requirements dot txt.',
    captionsHi:
      'Step 2: Python virtual environment banakar activate karein, aur pip install -r requirements.txt command se saari dependencies install karein.',
    voiceScriptHi:
      'Step 2: Python virtual environment banakar activate karein, aur pip install dash r requirements dot txt command se dependencies install karein.',
  },
  {
    id: 3,
    timestamp: '01:45',
    tag: 'STEP 03 // BACKEND REST API',
    title: 'Start FastAPI REST Server (Port 8001)',
    shortLabel: 'REST API',
    stageBadge: 'FASTAPI_DAEMON // PORT_8001',
    codeSnippet: {
      terminalTitle: 'TERMINAL: START FASTAPI BACKEND',
      command: 'python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001 --reload',
      notes: 'Initializes background queue, candidate databases, and automation workers.',
    },
    highlights: [
      'REST API powers real-time bot communication and telemetry',
      'Health check endpoint active at http://127.0.0.1:8001/health',
      'Keeps running in the background while you monitor from the web UI',
    ],
    captionsEn:
      'Step 3: Start the FastAPI REST API backend on port 8001. This server handles job tasks, telemetry, and background Selenium automation.',
    voiceScriptEn:
      'Step 3: Start the Fast A P I backend server on port 8001. This server orchestrates background bot processes, candidate profiles, and job application tasks.',
    captionsHi:
      'Step 3: Backend REST API server ko port 8001 par start karein. Yeh server bot automation aur live telemetry ko control karta hai.',
    voiceScriptHi:
      'Step 3: Backend REST API server ko port 8001 par chalu karein. Yeh server bot automation aur database ko control karta hai.',
  },
  {
    id: 4,
    timestamp: '02:20',
    tag: 'STEP 04 // FRONTEND WEB UI',
    title: 'Launch Modern React Frontend (Port 5173)',
    shortLabel: 'Frontend UI',
    stageBadge: 'VITE_SERVER // LOCALHOST_5173',
    codeSnippet: {
      terminalTitle: 'TERMINAL: INSTALL & RUN FRONTEND',
      command: 'cd frontend\nnpm install\nnpm run dev\n# Or single-command launch: python start_app.py',
      notes: 'Starts Vite development server with interactive cyberpunk dashboard.',
    },
    highlights: [
      'Accessible in your browser at http://localhost:5173',
      'Single-command launcher: python start_app.py boots both backend and frontend',
      'Includes 3D visualizers, live application counters, and logs',
    ],
    captionsEn:
      'Step 4: In a second terminal, enter the frontend directory, install dependencies with npm install, and run npm run dev. Or simply execute python start_app.py for a unified one-click boot!',
    voiceScriptEn:
      'Step 4: In a second terminal, enter the frontend directory, run npm install, and start the development server with npm run dev. Alternatively, run python start underscore app dot py to launch both backend and frontend together!',
    captionsHi:
      'Step 4: Doosre terminal me frontend folder me jaakar npm install aur npm run dev chalayein, ya direct python start_app.py run karein.',
    voiceScriptHi:
      'Step 4: Dusre terminal me frontend folder me jaakar npm run dev chalayein, ya fir python start underscore app dot py se dono ek saath run karein.',
  },
  {
    id: 5,
    timestamp: '02:55',
    tag: 'STEP 05 // RESUME INTELLIGENCE',
    title: 'Upload Resume & AI Profile Auto-Fill',
    shortLabel: 'Resume AI',
    stageBadge: 'AI_RESUME_PARSER // INTELLIGENCE',
    highlights: [
      'Upload your PDF/DOCX resume in the Resume Manager page',
      'AI automatically extracts full name, college, degree, CGPA, and key skills',
      'All application form fields will be personalized to your actual resume data',
    ],
    captionsEn:
      'Step 5: Go to the Resume Manager page and upload your resume PDF. The AI engine automatically extracts your skills, education, and credentials so every job application is tailored to your real background.',
    voiceScriptEn:
      'Step 5: Navigate to the Resume Manager page and upload your resume PDF. The built-in AI will automatically parse your experience, skills, and target job parameters.',
    captionsHi:
      'Step 5: Resume Manager page par jaakar apna resume PDF upload karein. AI automatically aapki skills, college, aur degree extract karke forms fill karega.',
    voiceScriptHi:
      'Step 5: Resume Manager page par apna resume upload karein. AI automatically aapki skills aur education ko parse karke profile set karega.',
  },
  {
    id: 6,
    timestamp: '03:30',
    tag: 'STEP 06 // LOCATION & ROLE FILTERS',
    title: 'Configure Target Locations & Preferences',
    shortLabel: 'Locations',
    stageBadge: 'LOCATION_MATCHER // REJECTION_ENGINE',
    highlights: [
      'Specify target cities (e.g. Mumbai, Pune, Bangalore, Hyderabad, Remote)',
      'Whitelisted location matcher automatically skips and ignores mismatched jobs',
      'Set target job titles, minimum salary, and experience parameters',
    ],
    captionsEn:
      'Step 6: Set your preferred job locations in the Preferences screen. The bot will strictly apply only to jobs matching your selected cities, while completely skipping mismatched locations.',
    voiceScriptEn:
      'Step 6: Set your preferred job locations in the Preferences screen. The intelligent location matcher will only apply to matching cities, while automatically skipping non-target listings.',
    captionsHi:
      'Step 6: Preferences me apni pasandida job locations set karein. Bot sirf aapki select ki hui locations par apply karega aur baki sab ignore kar dega.',
    voiceScriptHi:
      'Step 6: Preferences me apni locations set karein. Bot sirf aapki chuninda locations par apply karega aur baki sab skip karega.',
  },
  {
    id: 7,
    timestamp: '04:00',
    tag: 'STEP 07 // LAUNCH AUTO-APPLY',
    title: 'Execute Bot: Dry Run vs Live Auto-Apply',
    shortLabel: 'Launch Bot',
    stageBadge: 'BOT_ORCHESTRATOR // SELENIUM_RUNNER',
    highlights: [
      'Choose portal: Naukri, Indeed, LinkedIn, or Internshala',
      'Toggle Dry-Run mode to simulate job discovery safely without submitting',
      'Switch to Live Mode for full automated applications with anti-ban bezier delays',
    ],
    captionsEn:
      'Step 7: Head to the Automation Launcher. Select your desired platform like Naukri or Indeed, test with Dry-Run mode, and then switch to Live Mode to submit real applications effortlessly.',
    voiceScriptEn:
      'Step 7: Choose your target job portal such as Naukri or Indeed. Select Dry-Run mode to simulate job discovery safely, or switch to Live Mode to submit real automated applications with human-like delays.',
    captionsHi:
      'Step 7: Automation launcher me jakar platform select karein. Pehle Dry Run se test karein aur fir Live Mode me autonomous applications shuru karein.',
    voiceScriptHi:
      'Step 7: Automation launcher me apna platform select karein. Dry Run se test karein aur Live Mode me auto apply start karein.',
  },
  {
    id: 8,
    timestamp: '04:35',
    tag: 'SCENE 08 // ARCHITECT OUTRO',
    title: 'Mission Accomplished — Platform Ready!',
    shortLabel: 'Outro',
    creatorOutro: true,
    stageBadge: 'SYSTEM_ONLINE // UMESH_TEMBURWAR',
    highlights: [
      'Congratulations! Your AI job auto-apply bot is fully configured and ready',
      'Created & engineered by Umesh Temburwar (Batch 2025 B.Tech CSE)',
      'Support & Connect: GitHub, LinkedIn, or Email',
    ],
    captionsEn:
      'Congratulations! You are now fully set up and ready to apply to hundreds of jobs autonomously. This entire platform was created and engineered by Umesh Temburwar. Thank you for watching, and best of luck with your job hunt!',
    voiceScriptEn:
      'Congratulations! Your bot is now fully operational and ready to apply to hundreds of jobs automatically. This entire AI-powered automation platform was created, architected, and engineered by Umesh Temburwar. Thank you for watching, and all the best with your job applications!',
    captionsHi:
      'Badhaai ho! Aapka bot ab poori tarah ready hai jo aapke liye hazaron jobs me auto apply karega. Yeh poora platform create aur engineer kiya hai Umesh Temburwar ne. Thank you aur all the best!',
    voiceScriptHi:
      'Badhaai ho! Aapka bot ab poori tarah ready hai jo aapke liye jobs me apply karega. Yeh platform create aur engineer kiya hai Umesh Temburwar ne. Video dekhne ke liye dhanyawaad aur all the best!',
  },
];

export const Bot3DGuideVideo: React.FC<Bot3DGuideVideoProps> = ({
  initialAutoPlay = false,
  className = '',
}) => {
  const { theme } = useTheme();

  const [currentSceneIdx, setCurrentSceneIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(initialAutoPlay);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [voiceLang, setVoiceLang] = useState<'en' | 'hi'>('en');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'iso' | 'front' | 'radar'>('orbit');
  const [copied, setCopied] = useState<boolean>(false);
  const [playbackProgress, setPlaybackProgress] = useState<number>(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sceneProgressRef = useRef<number>(0);

  // Mouse drag 3D rotation state
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const customRotationRef = useRef<{ rotX: number; rotY: number }>({ rotX: 0.25, rotY: 0.35 });

  const currentScene = GUIDE_SCENES[currentSceneIdx];

  // Voice narration runner
  const speakCurrentScene = useCallback((sceneIndex: number) => {
    if (
      typeof window === 'undefined' ||
      !('speechSynthesis' in window) ||
      typeof SpeechSynthesisUtterance === 'undefined'
    ) {
      return;
    }
    window.speechSynthesis.cancel();

    if (isVoiceMuted) return;

    const scene = GUIDE_SCENES[sceneIndex];
    if (!scene) return;

    const textToSpeak = voiceLang === 'hi' ? scene.voiceScriptHi : scene.voiceScriptEn;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    utterance.lang = voiceLang === 'hi' ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      if (voiceLang === 'hi') {
        const hiVoice = voices.find((v) => v.lang.includes('hi') || v.lang.includes('en-IN'));
        if (hiVoice) utterance.voice = hiVoice;
      } else {
        const enVoice = voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.toLowerCase().includes('natural') ||
              v.name.toLowerCase().includes('google') ||
              v.name.toLowerCase().includes('david') ||
              v.name.toLowerCase().includes('george'))
        ) || voices.find((v) => v.lang.startsWith('en'));
        if (enVoice) utterance.voice = enVoice;
      }
    }

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      // Audio speech playback ignored if blocked by browser policy
    }
  }, [isVoiceMuted, voiceLang]);

  // Handle scene change
  const goToScene = useCallback((index: number) => {
    playRetroSound('nav');
    const clamped = Math.max(0, Math.min(GUIDE_SCENES.length - 1, index));
    setCurrentSceneIdx(clamped);
    sceneProgressRef.current = 0;
    setPlaybackProgress((clamped / (GUIDE_SCENES.length - 1)) * 100);

    if (isPlaying) {
      speakCurrentScene(clamped);
    }
  }, [isPlaying, speakCurrentScene]);

  const handleNext = () => {
    if (currentSceneIdx < GUIDE_SCENES.length - 1) {
      goToScene(currentSceneIdx + 1);
    } else {
      setIsPlaying(false);
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handlePrev = () => {
    if (currentSceneIdx > 0) {
      goToScene(currentSceneIdx - 1);
    }
  };

  const handleTogglePlay = () => {
    playRetroSound('button');
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);

    if (nextPlay) {
      speakCurrentScene(currentSceneIdx);
    } else {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handleRestart = () => {
    playRetroSound('button');
    goToScene(0);
    setIsPlaying(true);
    speakCurrentScene(0);
  };

  const handleToggleMute = () => {
    playRetroSound('toggle');
    const nextMute = !isVoiceMuted;
    setIsVoiceMuted(nextMute);
    if (nextMute) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      speakCurrentScene(currentSceneIdx);
    }
  };

  const handleToggleLang = () => {
    playRetroSound('toggle');
    const nextLang = voiceLang === 'en' ? 'hi' : 'en';
    setVoiceLang(nextLang);
    if (isPlaying && !isVoiceMuted) {
      setTimeout(() => speakCurrentScene(currentSceneIdx), 100);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      playRetroSound('success');
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  };

  const handleToggleFullscreen = () => {
    playRetroSound('modal');
    setIsFullscreen((prev) => !prev);
  };

  // Playback timer ticker (advances scene every ~18 seconds in auto mode)
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalTime = 300;
    const sceneDurationMs = 17000;
    const stepIncrement = (intervalTime / sceneDurationMs) * 100;

    timerRef.current = setInterval(() => {
      sceneProgressRef.current += stepIncrement;
      const totalProg =
        ((currentSceneIdx + sceneProgressRef.current / 100) / GUIDE_SCENES.length) * 100;
      setPlaybackProgress(Math.min(100, totalProg));

      if (sceneProgressRef.current >= 100) {
        sceneProgressRef.current = 0;
        setCurrentSceneIdx((prev) => {
          if (prev < GUIDE_SCENES.length - 1) {
            const nextIdx = prev + 1;
            speakCurrentScene(nextIdx);
            return nextIdx;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, currentSceneIdx, speakCurrentScene]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // 3D Canvas Rendering Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 450);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // 3D Cube Vertices
    const cubeVertices = [
      [-1, -1, -1],
      [1, -1, -1],
      [1, 1, -1],
      [-1, 1, -1],
      [-1, -1, 1],
      [1, -1, 1],
      [1, 1, 1],
      [-1, 1, 1],
    ];

    const cubeEdges = [
      [0, 1], [1, 2], [2, 3], [3, 0], // back face
      [4, 5], [5, 6], [6, 7], [7, 4], // front face
      [0, 4], [1, 5], [2, 6], [3, 7], // connectors
    ];

    // Satellites orbiting in 3D
    const satellites = [
      { name: 'Git VCS', radius: 2.4, speed: 0.015, color: '#10B981', angle: 0 },
      { name: 'FastAPI :8001', radius: 3.1, speed: -0.012, color: '#3B82F6', angle: 1.2 },
      { name: 'React UI :5173', radius: 3.8, speed: 0.009, color: '#A855F7', angle: 2.5 },
      { name: 'Resume AI', radius: 2.8, speed: -0.018, color: '#F59E0B', angle: 3.8 },
      { name: 'Job Portals', radius: 3.5, speed: 0.014, color: '#EC4899', angle: 5.0 },
    ];

    // Background 3D Particles
    const particles = Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * 16,
      y: (Math.random() - 0.5) * 12,
      z: (Math.random() - 0.5) * 16,
      speedZ: 0.02 + Math.random() * 0.03,
      size: 1 + Math.random() * 2,
    }));

    let baseAngleX = 0.25;
    let baseAngleY = 0.35;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Camera mode angle adjustments
      let targetRotX = customRotationRef.current.rotX;
      let targetRotY = customRotationRef.current.rotY;

      if (cameraMode === 'iso') {
        targetRotX = 0.6;
        targetRotY = 0.78;
      } else if (cameraMode === 'front') {
        targetRotX = 0.05;
        targetRotY = 0.05;
      } else if (cameraMode === 'radar') {
        targetRotX = 1.25;
        targetRotY = 0.02;
      } else {
        // Orbit mode auto-rotation
        baseAngleY += 0.008;
        baseAngleX = Math.sin(baseAngleY * 0.4) * 0.2 + 0.25;
        targetRotX = baseAngleX + customRotationRef.current.rotX;
        targetRotY = baseAngleY + customRotationRef.current.rotY;
      }

      const fov = 340;
      const cx = width / 2;
      const cy = height / 2;

      // 3D Matrix Projection Function
      const project3D = (x: number, y: number, z: number) => {
        // Rotation around Y
        let cosY = Math.cos(targetRotY);
        let sinY = Math.sin(targetRotY);
        let x1 = x * cosY - z * sinY;
        let z1 = z * cosY + x * sinY;

        // Rotation around X
        let cosX = Math.cos(targetRotX);
        let sinX = Math.sin(targetRotX);
        let y2 = y * cosX - z1 * sinX;
        let z2 = z1 * cosX + y * sinX;

        // Perspective scale factor
        const distance = 6.2;
        const depth = z2 + distance;
        if (depth <= 0.1) return null;

        const scale = fov / depth;
        return {
          px: cx + x1 * scale,
          py: cy + y2 * scale,
          depth,
          scale,
        };
      };

      // 1. Draw 3D Particle Starfield
      ctx.fillStyle = theme === 'dark' ? '#10B981' : '#059669';
      for (const p of particles) {
        p.z -= p.speedZ;
        if (p.z < -8) p.z = 8;
        const pt = project3D(p.x, p.y, p.z);
        if (pt) {
          const alpha = Math.max(0.1, Math.min(0.8, 1 - pt.depth / 14));
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(pt.px, pt.py, p.size * (pt.scale / 60), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      // 2. Draw 3D Receding Cyber Ground Grid
      const gridSpan = 5;
      const gridStep = 1.0;
      const groundY = 2.2;
      ctx.strokeStyle = theme === 'dark' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(16, 185, 129, 0.22)';
      ctx.lineWidth = 1;

      for (let gx = -gridSpan; gx <= gridSpan; gx += gridStep) {
        const pA = project3D(gx, groundY, -gridSpan);
        const pB = project3D(gx, groundY, gridSpan);
        if (pA && pB) {
          ctx.beginPath();
          ctx.moveTo(pA.px, pA.py);
          ctx.lineTo(pB.px, pB.py);
          ctx.stroke();
        }
      }
      for (let gz = -gridSpan; gz <= gridSpan; gz += gridStep) {
        const pA = project3D(-gridSpan, groundY, gz);
        const pB = project3D(gridSpan, groundY, gz);
        if (pA && pB) {
          ctx.beginPath();
          ctx.moveTo(pA.px, pA.py);
          ctx.lineTo(pB.px, pB.py);
          ctx.stroke();
        }
      }

      // 3. Draw Rotating 3D Core Cube (Bot Chassis)
      const cubeSize = 1.15;
      const projVertices = cubeVertices.map(([vx, vy, vz]) =>
        project3D(vx * cubeSize, vy * cubeSize, vz * cubeSize)
      );

      // Draw Glowing Cube Edges
      ctx.lineWidth = 2.0;
      ctx.strokeStyle = theme === 'dark' ? '#10B981' : '#047857';
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 12;

      for (const [v1, v2] of cubeEdges) {
        const pt1 = projVertices[v1];
        const pt2 = projVertices[v2];
        if (pt1 && pt2) {
          ctx.beginPath();
          ctx.moveTo(pt1.px, pt1.py);
          ctx.lineTo(pt2.px, pt2.py);
          ctx.stroke();
        }
      }
      ctx.shadowBlur = 0;

      // Draw Core Pulsing Energy Center
      const corePt = project3D(0, 0, 0);
      if (corePt) {
        const pulse = Math.sin(Date.now() * 0.005) * 6 + 18;
        const grad = ctx.createRadialGradient(
          corePt.px,
          corePt.py,
          2,
          corePt.px,
          corePt.py,
          pulse * (corePt.scale / 45)
        );
        grad.addColorStop(0, '#34D399');
        grad.addColorStop(0.5, 'rgba(16, 185, 129, 0.4)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(corePt.px, corePt.py, pulse * (corePt.scale / 45), 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Draw 3D Orbiting Satellites with Labels
      for (const sat of satellites) {
        sat.angle += sat.speed;
        const sx = Math.cos(sat.angle) * sat.radius;
        const sz = Math.sin(sat.angle) * sat.radius;
        const sy = Math.sin(sat.angle * 2) * 0.45;

        const satPt = project3D(sx, sy, sz);
        if (satPt) {
          // Connecting Laser to Center
          if (corePt) {
            ctx.strokeStyle = sat.color;
            ctx.globalAlpha = 0.28;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(corePt.px, corePt.py);
            ctx.lineTo(satPt.px, satPt.py);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          }

          // Node Sphere
          ctx.fillStyle = sat.color;
          ctx.shadowColor = sat.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(satPt.px, satPt.py, 5 * (satPt.scale / 55), 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Holographic Tag
          ctx.font = '10px monospace';
          ctx.fillStyle = theme === 'dark' ? '#E4E4E7' : '#18181B';
          ctx.fillText(sat.name, satPt.px + 9, satPt.py + 3);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraMode, theme]);

  // Mouse drag handlers to interactively spin 3D scene
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - lastMousePosRef.current.x;
    const deltaY = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    customRotationRef.current.rotY += deltaX * 0.007;
    customRotationRef.current.rotX += deltaY * 0.007;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  return (
    <div
      ref={containerRef}
      className={`relative border-2 ${
        theme === 'dark'
          ? 'border-[#10B981] bg-[#0A0D14] text-[#F4F4F5]'
          : 'border-[#18181B] bg-white text-[#18181B]'
      } font-mono select-none overflow-hidden transition-all duration-300 retro-shadow-lg ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] rounded-none m-0 max-h-screen w-screen flex flex-col'
          : `w-full ${className}`
      }`}
    >
      {/* 3D Video Header Bar */}
      <div
        className={`h-11 shrink-0 border-b-2 ${
          theme === 'dark'
            ? 'border-[#10B981] bg-[#111520] text-emerald-400'
            : 'border-[#18181B] bg-[#18181B] text-[#F5F3EC]'
        } px-4 flex items-center justify-between text-[11px] font-bold`}
      >
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 bg-red-500 inline-block border border-black/40 animate-pulse" />
          <span className="w-2.5 h-2.5 bg-amber-400 inline-block border border-black/40" />
          <span className="w-2.5 h-2.5 bg-emerald-500 inline-block border border-black/40" />
          <span className="font-bold tracking-wider uppercase ml-1 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            3D_STUDIO // BOT_STARTUP_GUIDE.MP4
          </span>
        </div>

        {/* Header Badges & Actions */}
        <div className="flex items-center gap-2">
          {/* Creator Tag Pill */}
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/60 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
            <Award className="w-3 h-3 text-amber-400" />
            <span>ARCHITECT: UMESH TEMBURWAR</span>
          </div>

          {/* Voice Language Switcher */}
          <button
            type="button"
            onClick={handleToggleLang}
            className={`px-2 py-0.5 border text-[10px] font-bold uppercase cursor-pointer transition-colors ${
              voiceLang === 'en'
                ? 'border-emerald-500 bg-emerald-600 text-white'
                : 'border-amber-500 bg-amber-600 text-black'
            }`}
            title="Toggle Voice Language (English / Hinglish)"
          >
            VOICE: [{voiceLang === 'en' ? 'ENGLISH' : 'HINGLISH'}]
          </button>

          {/* Voice Mute Toggle */}
          <button
            type="button"
            onClick={handleToggleMute}
            className="p-1 hover:opacity-80 border border-current text-[11px] cursor-pointer"
            title={isVoiceMuted ? 'Voice is Muted' : 'Voice is Active'}
          >
            {isVoiceMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1 hover:opacity-80 border border-current text-[11px] cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main 3D Stage & Interactive Screen */}
      <div
        className="relative w-full aspect-video min-h-[360px] sm:min-h-[460px] bg-gradient-to-b from-[#06080E] via-[#0B0F19] to-[#04060A] overflow-hidden cursor-grab active:cursor-grabbing flex-1"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Background 3D Canvas */}
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* 3D Telemetry HUD Overlay (Top-Left) */}
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 pointer-events-none">
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 border border-emerald-500/50 bg-black/70 text-emerald-400 text-[10px] font-bold uppercase backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{currentScene.stageBadge}</span>
          </div>
          <div className="text-[9px] text-zinc-400 bg-black/60 px-2 py-0.5 border border-white/10 w-fit backdrop-blur-sm">
            TIME: {currentScene.timestamp} // SCENE {currentSceneIdx + 1} OF {GUIDE_SCENES.length}
          </div>
        </div>

        {/* 3D Camera Angle Switcher (Top-Right) */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-black/70 p-1 border border-white/10 backdrop-blur-sm text-[9px] font-bold">
          <Compass className="w-3 h-3 text-emerald-400 ml-1" />
          <span className="text-zinc-400 px-1">CAM:</span>
          {(['orbit', 'iso', 'front', 'radar'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playRetroSound('toggle');
                setCameraMode(mode);
              }}
              className={`px-1.5 py-0.5 uppercase cursor-pointer border ${
                cameraMode === mode
                  ? 'border-emerald-400 bg-emerald-500 text-black font-black'
                  : 'border-transparent text-zinc-400 hover:text-white'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Central Dynamic Holographic Glass Card (Transforms with each Scene) */}
        <div className="absolute inset-x-3 sm:inset-x-8 top-14 bottom-24 z-10 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto max-w-xl w-full border-2 border-emerald-500/60 bg-[#0B0F19]/90 backdrop-blur-md p-4 sm:p-5 retro-shadow space-y-3.5 animate-fade-in text-[12px] max-h-full overflow-y-auto">
            
            {/* Scene Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                {currentScene.tag}
              </span>
              <span className="text-[10px] text-zinc-400 font-bold">
                {currentSceneIdx + 1}/{GUIDE_SCENES.length}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-[16px] sm:text-[18px] font-black uppercase text-white tracking-tight leading-snug">
              {currentScene.title}
            </h3>

            {/* Special Creator Spotlight Screen (Scene 0 & Scene 8) */}
            {(currentScene.creatorIntro || currentScene.creatorOutro) && (
              <div className="p-3 border-2 border-amber-500/80 bg-amber-500/10 space-y-2 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-400 uppercase flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-400" />
                    FOUNDER & ARCHITECT SHOWCASE
                  </span>
                  <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold uppercase">
                    BATCH 2025 B.TECH CSE
                  </span>
                </div>
                <div className="text-[13px] font-black text-white">
                  UMESH TEMBURWAR
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {currentScene.creatorIntro
                    ? 'Creator & Software Engineer who built this AI-Powered autonomous application system from scratch to streamline modern engineering hiring.'
                    : 'System built and engineered with precision by Umesh Temburwar. Thank you for using this automated tool!'}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href="https://github.com/Umesh-Temburwar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2 py-0.5 border border-zinc-500 text-[10px] text-zinc-300 hover:text-white hover:border-emerald-400"
                  >
                    <ExternalLink className="w-3 h-3" />
                    github.com/Umesh-Temburwar
                  </a>
                  <a
                    href="mailto:umeshtemburwar2002@gmail.com"
                    className="inline-flex items-center gap-1 px-2 py-0.5 border border-zinc-500 text-[10px] text-zinc-300 hover:text-white hover:border-emerald-400"
                  >
                    umeshtemburwar2002@gmail.com
                  </a>
                </div>
              </div>
            )}

            {/* Code Snippet Box (If present for this step) */}
            {currentScene.codeSnippet && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-emerald-400 font-bold uppercase">
                  <span className="flex items-center gap-1">
                    <TerminalIcon className="w-3 h-3" />
                    {currentScene.codeSnippet.terminalTitle}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(currentScene.codeSnippet!.command)}
                    className="px-2 py-0.5 border border-emerald-500 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-bold cursor-pointer flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>COPY COMMAND</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 border border-white/20 bg-black/90 text-emerald-300 font-mono text-[11px] leading-relaxed select-all overflow-x-auto whitespace-pre-wrap">
                  <code>{currentScene.codeSnippet.command}</code>
                </div>
                <div className="text-[10px] text-zinc-400 italic">
                  💡 {currentScene.codeSnippet.notes}
                </div>
              </div>
            )}

            {/* Feature Highlights Checklist */}
            <div className="space-y-1 pt-1">
              {currentScene.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{h}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Bottom Subtitles & Voice Narration Banner */}
        <div className="absolute inset-x-3 sm:inset-x-8 bottom-3 z-20 pointer-events-none">
          <div className="p-2 sm:p-2.5 border border-emerald-500/50 bg-black/85 backdrop-blur-md retro-shadow flex items-center gap-3">
            {/* Audio Waveform Equalizer Animation */}
            <div className="hidden sm:flex items-center gap-0.5 shrink-0 px-1 text-emerald-400">
              <span className={`w-1 bg-emerald-400 ${isPlaying ? 'h-4 animate-pulse' : 'h-1.5'}`} />
              <span className={`w-1 bg-emerald-400 ${isPlaying ? 'h-6 animate-pulse' : 'h-2'}`} />
              <span className={`w-1 bg-emerald-400 ${isPlaying ? 'h-3 animate-pulse' : 'h-1'}`} />
              <span className={`w-1 bg-emerald-400 ${isPlaying ? 'h-5 animate-pulse' : 'h-2'}`} />
            </div>

            {/* Synchronized Subtitles Text */}
            <div className="flex-1 text-[11px] leading-tight text-white font-medium">
              <span className="font-bold text-emerald-400 uppercase text-[10px] mr-1.5">
                [SPEECH SUBTITLES]:
              </span>
              <span>{voiceLang === 'hi' ? currentScene.captionsHi : currentScene.captionsEn}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Video Scrubber & Timeline Progress Bar */}
      <div className="relative h-2 bg-zinc-800 cursor-pointer group">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 transition-all duration-200"
          style={{ width: `${playbackProgress}%` }}
        />
        {/* Scrubber Knob */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `${playbackProgress}%` }}
        />
      </div>

      {/* Playback Controls & Chapter Strip */}
      <div
        className={`p-3 border-t-2 ${
          theme === 'dark' ? 'border-[#2E384D] bg-[#111520]' : 'border-[#18181B] bg-[#F5F3EC]'
        } flex flex-col md:flex-row items-center justify-between gap-3 text-[11px] font-mono`}
      >
        {/* Left: Play/Pause/Replay & Steps */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlay}
            className={`px-3 py-1.5 font-black uppercase text-[11px] border-2 cursor-pointer flex items-center gap-1.5 transition-all ${
              isPlaying
                ? 'border-amber-500 bg-amber-500 text-black'
                : 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>PLAY GUIDE</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrev}
            disabled={currentSceneIdx === 0}
            className="p-1.5 border border-current hover:bg-current/10 disabled:opacity-40 cursor-pointer"
            title="Previous Step"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={currentSceneIdx === GUIDE_SCENES.length - 1}
            className="p-1.5 border border-current hover:bg-current/10 disabled:opacity-40 cursor-pointer"
            title="Next Step"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleRestart}
            className="p-1.5 border border-current hover:bg-current/10 cursor-pointer"
            title="Restart from Beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] text-zinc-400 ml-1">
            {currentScene.timestamp} / 04:50
          </span>
        </div>

        {/* Center: Chapter Quick-Jump Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full py-1">
          {GUIDE_SCENES.map((scene, idx) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => goToScene(idx)}
              className={`px-2 py-0.5 border text-[10px] font-bold uppercase transition-all whitespace-nowrap cursor-pointer ${
                currentSceneIdx === idx
                  ? 'border-emerald-500 bg-emerald-500 text-black font-black'
                  : 'border-current/30 hover:border-current opacity-70 hover:opacity-100'
              }`}
            >
              {scene.shortLabel}
            </button>
          ))}
        </div>

        {/* Right: Creator Credit */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-zinc-400">
            ENGINEERED BY <strong className="text-emerald-500">UMESH TEMBURWAR</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
