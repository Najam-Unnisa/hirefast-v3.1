/**
 * Repository interface contracts — implemented by future feature modules.
 */
export interface IBaseRepository<T, CreateInput = unknown, UpdateInput = unknown> {
  findById(id: string): Promise<T | null>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
}
