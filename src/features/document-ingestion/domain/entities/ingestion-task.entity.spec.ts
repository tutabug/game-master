import { ChunkingTask, ChunkingTaskStatus } from './ingestion-task.entity';

describe('ChunkingTask', () => {
  const now = new Date();
  const chunkingConfig = { strategy: 'recursive-1000-200', size: 1000, overlap: 200 };

  describe('status checks', () => {
    it('should identify pending task', () => {
      const task = new ChunkingTask(
        '1',
        'doc-1',
        '/path/to/doc.pdf',
        ChunkingTaskStatus.PENDING,
        0,
        chunkingConfig,
        now,
        now,
      );
      expect(task.isPending()).toBe(true);
      expect(task.isProcessing()).toBe(false);
      expect(task.isCompleted()).toBe(false);
    });

    it('should identify processing task', () => {
      const task = new ChunkingTask(
        '1',
        'doc-1',
        '/path/to/doc.pdf',
        ChunkingTaskStatus.PROCESSING,
        0,
        chunkingConfig,
        now,
        now,
      );
      expect(task.isProcessing()).toBe(true);
      expect(task.isPending()).toBe(false);
    });

    it('should identify completed task', () => {
      const task = new ChunkingTask(
        '1',
        'doc-1',
        '/path/to/doc.pdf',
        ChunkingTaskStatus.COMPLETED,
        150,
        chunkingConfig,
        now,
        now,
        now,
      );
      expect(task.isCompleted()).toBe(true);
    });

    it('should identify failed task', () => {
      const task = new ChunkingTask(
        '1',
        'doc-1',
        '/path/to/doc.pdf',
        ChunkingTaskStatus.FAILED,
        0,
        chunkingConfig,
        now,
        now,
        undefined,
        'Failed to load document',
      );
      expect(task.isFailed()).toBe(true);
      expect(task.errorMessage).toBe('Failed to load document');
    });
  });

  describe('canStartProcessing', () => {
    it('should return true for pending task', () => {
      const task = new ChunkingTask(
        '1',
        'doc-1',
        '/path/to/doc.pdf',
        ChunkingTaskStatus.PENDING,
        0,
        chunkingConfig,
        now,
        now,
      );
      expect(task.canStartProcessing()).toBe(true);
    });

    it('should return false for non-pending task', () => {
      const task = new ChunkingTask(
        '1',
        'doc-1',
        '/path/to/doc.pdf',
        ChunkingTaskStatus.PROCESSING,
        0,
        chunkingConfig,
        now,
        now,
      );
      expect(task.canStartProcessing()).toBe(false);
    });
  });
});
