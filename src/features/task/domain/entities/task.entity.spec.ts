import { Task } from './task.entity';

describe('Task', () => {
  describe('create', () => {
    it('should create a new task', () => {
      const title = 'Test Task';
      const dueDate = new Date('2025-12-31');

      const task = Task.create(title, dueDate);

      expect(task).toBeInstanceOf(Task);
      expect(task.title).toBe(title);
      expect(task.dueDate).toBe(dueDate);
      expect(task.id).toBeNull();
    });
  });

  describe('isOverdue', () => {
    it('should return true if task is overdue', () => {
      const pastDate = new Date('2020-01-01');
      const task = new Task('1', 'Old Task', pastDate);

      const result = task.isOverdue();

      expect(result).toBe(true);
    });

    it('should return false if task is not overdue', () => {
      const futureDate = new Date('2030-01-01');
      const task = new Task('1', 'Future Task', futureDate);

      const result = task.isOverdue();

      expect(result).toBe(false);
    });
  });
});
