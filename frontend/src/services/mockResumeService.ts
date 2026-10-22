import type { IResumeService } from './types';
import type { Resume } from '../types';
import { INITIAL_MOCK_RESUMES } from './mockData';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockResumeService implements IResumeService {
  private resumes: Resume[] = [...INITIAL_MOCK_RESUMES];

  async getResumes(): Promise<Resume[]> {
    await delay(250);
    return [...this.resumes];
  }

  async uploadResume(file: File): Promise<Resume> {
    await delay(500);

    // Validation: PDF check
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error('Only PDF resume files are accepted.');
    }

    // Validation: 5 MB limit
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error('File size exceeds the 5 MB limit.');
    }

    const newResume: Resume = {
      id: `res_${Date.now()}`,
      userId: 'usr_demo_01',
      fileName: file.name,
      fileSizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      isDefault: this.resumes.length === 0,
      fileType: 'application/pdf',
    };

    this.resumes.unshift(newResume);
    return newResume;
  }

  async setDefaultResume(id: string): Promise<void> {
    await delay(200);
    this.resumes = this.resumes.map((r) => ({
      ...r,
      isDefault: r.id === id,
    }));
  }

  async deleteResume(id: string): Promise<void> {
    await delay(250);
    this.resumes = this.resumes.filter((r) => r.id !== id);
    if (this.resumes.length > 0 && !this.resumes.some((r) => r.isDefault)) {
      this.resumes[0].isDefault = true;
    }
  }
}
