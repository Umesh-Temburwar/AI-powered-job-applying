import type { ITaskService } from './types';
import type { AutomationTask, PlatformName, TaskLogEntry } from '../types';
import { INITIAL_MOCK_TASK } from './mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockTaskService implements ITaskService {
  private currentTask: AutomationTask = { ...INITIAL_MOCK_TASK };
  private taskHistory: AutomationTask[] = [
    {
      id: 'task_hist_1',
      userId: 'usr_demo_01',
      platform: 'Naukri',
      status: 'completed',
      progressPercent: 100,
      currentStepMessage: 'Simulated sequence completed. All listings evaluated.',
      applicationsAttempted: 15,
      applicationsSuccessful: 14,
      applicationsFailed: 1,
      startedAt: new Date(Date.now() - 86400000).toISOString(),
      completedAt: new Date(Date.now() - 86400000 + 3600000).toISOString(),
      logs: [
        {
          id: 'log_h1',
          timestamp: '10:00:15',
          level: 'info',
          message: 'Initialized browser profile in sandbox directory.',
        },
        {
          id: 'log_h2',
          timestamp: '10:05:30',
          level: 'info',
          message: 'Parsed search query results (15 matches identified).',
        },
        {
          id: 'log_h3',
          timestamp: '10:45:10',
          level: 'success',
          message: 'Simulation completed. 14 matches met criteria.',
        },
      ],
    },
  ];

  private simulationTimer: ReturnType<typeof setInterval> | null = null;

  async getCurrentTask(): Promise<AutomationTask | null> {
    await delay(150);
    return { ...this.currentTask };
  }

  async startTask(platform: PlatformName | 'All Platforms'): Promise<AutomationTask> {
    await delay(300);

    if (this.currentTask.status === 'running') {
      throw new Error('A simulation is already in progress.');
    }

    const newTask: AutomationTask = {
      id: `task_${Date.now()}`,
      userId: 'usr_demo_01',
      platform,
      status: 'running',
      progressPercent: 5,
      currentStepMessage: `Initializing isolated worker simulation for ${platform}...`,
      applicationsAttempted: 0,
      applicationsSuccessful: 0,
      applicationsFailed: 0,
      startedAt: new Date().toISOString(),
      logs: [
        {
          id: `log_${Date.now()}_1`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'info',
          message: `Simulated worker started for ${platform}. Isolated profile generated.`,
        },
      ],
    };

    this.currentTask = newTask;
    this.startSimulationTicker();
    return { ...this.currentTask };
  }

  private startSimulationTicker() {
    if (this.simulationTimer) clearInterval(this.simulationTimer);

    const simulationSteps: { progress: number; msg: string; level: TaskLogEntry['level'] }[] = [
      { progress: 20, msg: 'Navigated to job search portal. Parsing active listings...', level: 'info' },
      { progress: 40, msg: 'Matching target skills against position requirements...', level: 'info' },
      { progress: 60, msg: 'Simulated step complete: Form fields validated against profile.', level: 'success' },
      { progress: 80, msg: 'Notice: Manual questionnaire detected. Review verification checkpoint reached.', level: 'warn' },
      { progress: 100, msg: 'Simulated run finished. Automation cycle halted safely.', level: 'success' },
    ];

    let stepIndex = 0;

    this.simulationTimer = setInterval(() => {
      if (this.currentTask.status !== 'running') {
        if (this.simulationTimer) clearInterval(this.simulationTimer);
        return;
      }

      if (stepIndex < simulationSteps.length) {
        const step = simulationSteps[stepIndex];
        this.currentTask.progressPercent = step.progress;
        this.currentTask.currentStepMessage = step.msg;
        this.currentTask.applicationsAttempted += 1;

        if (step.level === 'warn') {
          // Pause at review required step
          this.currentTask.status = 'review_required';
          this.currentTask.logs.push({
            id: `log_${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            level: 'warn',
            message: 'Attention required: Form contains custom screening questions.',
          });
          if (this.simulationTimer) clearInterval(this.simulationTimer);
          return;
        }

        if (step.level === 'success') {
          this.currentTask.applicationsSuccessful += 1;
        }

        this.currentTask.logs.push({
          id: `log_${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: step.level,
          message: step.msg,
        });

        stepIndex++;
      } else {
        this.currentTask.status = 'completed';
        this.currentTask.completedAt = new Date().toISOString();
        this.taskHistory.unshift({ ...this.currentTask });
        if (this.simulationTimer) clearInterval(this.simulationTimer);
      }
    }, 2500);
  }

  async pauseTask(taskId: string): Promise<AutomationTask> {
    await delay(200);
    if (this.currentTask.id === taskId && this.currentTask.status === 'running') {
      this.currentTask.status = 'paused';
      this.currentTask.logs.push({
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'warn',
        message: 'Simulation paused by user request.',
      });
    }
    return { ...this.currentTask };
  }

  async resumeTask(taskId: string): Promise<AutomationTask> {
    await delay(200);
    if (
      this.currentTask.id === taskId &&
      (this.currentTask.status === 'paused' || this.currentTask.status === 'review_required')
    ) {
      this.currentTask.status = 'running';
      this.currentTask.logs.push({
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'info',
        message: 'Simulation resumed. Continuing automated sequence...',
      });
      this.startSimulationTicker();
    }
    return { ...this.currentTask };
  }

  async stopTask(taskId: string): Promise<AutomationTask> {
    await delay(200);
    if (this.simulationTimer) clearInterval(this.simulationTimer);
    if (this.currentTask.id === taskId) {
      this.currentTask.status = 'stopped';
      this.currentTask.currentStepMessage = 'Simulation stopped by candidate.';
      this.currentTask.logs.push({
        id: `log_${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        level: 'error',
        message: 'Task aborted gracefully. Isolated sandbox cleaned up.',
      });
      this.taskHistory.unshift({ ...this.currentTask });
    }
    return { ...this.currentTask };
  }

  async getTaskHistory(): Promise<AutomationTask[]> {
    await delay(200);
    return [...this.taskHistory];
  }
}
