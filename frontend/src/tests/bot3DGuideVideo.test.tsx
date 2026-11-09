import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Bot3DGuideVideo } from '../components/common/Bot3DGuideVideo';
import { ThemeProvider } from '../context/ThemeContext';

describe('Bot3DGuideVideo Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock HTMLCanvasElement.getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      arc: vi.fn(),
      createRadialGradient: vi.fn().mockReturnValue({
        addColorStop: vi.fn(),
      }),
      fillText: vi.fn(),
    });

    // Mock SpeechSynthesis
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        getVoices: vi.fn().mockReturnValue([
          { lang: 'en-US', name: 'Google US English' },
          { lang: 'hi-IN', name: 'Google Hindi' },
        ]),
      },
    });
  });

  it('renders the 3D video guide with creator badges for Umesh Temburwar', () => {
    render(
      <ThemeProvider>
        <Bot3DGuideVideo />
      </ThemeProvider>
    );

    // Check Architect attribution in header and scene
    expect(screen.getByText(/ARCHITECT: UMESH TEMBURWAR/i)).toBeInTheDocument();
    expect(screen.getAllByText(/ENGINEERED BY/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/UMESH TEMBURWAR/i).length).toBeGreaterThan(0);

    // Initial Scene 0 Title
    expect(
      screen.getByText(/AI-Powered Job Auto-Apply Bot — Platform Overview/i)
    ).toBeInTheDocument();
  });

  it('allows stepping forward to Git Clone step with code command', () => {
    render(
      <ThemeProvider>
        <Bot3DGuideVideo />
      </ThemeProvider>
    );

    // Click Next step
    const nextBtn = screen.getByTitle('Next Step');
    fireEvent.click(nextBtn);

    // Step 1: Git Clone
    expect(screen.getByText(/STEP 01 \/\/ GIT CLONE/i)).toBeInTheDocument();
    expect(screen.getByText(/Clone Repository & Open Workspace/i)).toBeInTheDocument();
    expect(
      screen.getByText(/git clone https:\/\/github\.com\/Umesh-Temburwar\/AI-powered-job-applying\.git/i)
    ).toBeInTheDocument();
  });

  it('allows jumping directly to Outro scene showcasing creator credentials', () => {
    render(
      <ThemeProvider>
        <Bot3DGuideVideo />
      </ThemeProvider>
    );

    // Jump to 'Outro' chapter button
    const outroBtn = screen.getByRole('button', { name: /^Outro$/i });
    fireEvent.click(outroBtn);

    expect(screen.getByText(/Mission Accomplished — Platform Ready!/i)).toBeInTheDocument();
    expect(screen.getAllByText(/BATCH 2025/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/umeshtemburwar2002@gmail\.com/i)).toBeInTheDocument();
  });

  it('toggles voice language between English and Hinglish', () => {
    render(
      <ThemeProvider>
        <Bot3DGuideVideo />
      </ThemeProvider>
    );

    const langBtn = screen.getByTitle(/Toggle Voice Language/i);
    expect(langBtn).toHaveTextContent(/VOICE: \[ENGLISH\]/i);

    fireEvent.click(langBtn);
    expect(langBtn).toHaveTextContent(/VOICE: \[HINGLISH\]/i);
  });

  it('toggles Play and Pause state smoothly', () => {
    render(
      <ThemeProvider>
        <Bot3DGuideVideo />
      </ThemeProvider>
    );

    const playBtn = screen.getByRole('button', { name: /PLAY GUIDE/i });
    fireEvent.click(playBtn);

    expect(screen.getByRole('button', { name: /PAUSE/i })).toBeInTheDocument();
  });
});
