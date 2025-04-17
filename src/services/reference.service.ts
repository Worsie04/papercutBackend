import Reference from '../models/reference.model';

export class ReferenceService {
  static async create(data: { name: string; type: string }) {
    return Reference.create(data);
  }

  static async getAll() {
    try {
      const references = await Reference.findAll();
      // JSON massivini və raw data-nı qaytarırıq
      return references.map(ref => ref.get({ plain: true }));
    } catch (error) {
      console.error('Error fetching references:', error);
      return []; // Xəta olsa da boş array qaytarırıq
    }
  }

  static async update(id: string, data: Partial<{ name: string; type: string }>) {
    const ref = await Reference.findByPk(id);
    if (!ref) throw new Error('Reference not found');
    return ref.update(data);
  }

  static async delete(id: string) {
    const ref = await Reference.findByPk(id);
    if (!ref) throw new Error('Reference not found');
    return ref.destroy();
  }
}
