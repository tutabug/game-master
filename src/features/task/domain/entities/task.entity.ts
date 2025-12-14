export class Task {
  constructor(
    public readonly id: string,
    public readonly title: string,
    public readonly dueDate: Date,
    public readonly createdAt: Date = new Date(),
  ) {}

  static create(title: string, dueDate: Date): Task {
    return new Task(null, title, dueDate);
  }

  isOverdue(): boolean {
    return new Date() > this.dueDate;
  }
}
