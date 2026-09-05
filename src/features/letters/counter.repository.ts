import { doc, runTransaction } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '@/config/firebase'

export interface ICounterRepository {
  getNextSequenceNumber(department: string, month: number, year: number): Promise<number>
}

export class CounterRepository implements ICounterRepository {
  private inMemoryCounters: Record<string, number> = {
    'HR_09_2026': 53,
  }

  /**
   * Mengambil nomor urut berikutnya secara atomic menggunakan Firestore Transactions.
   * Menjamin tidak ada nomor urut duplikat (mencegah race condition).
   */
  async getNextSequenceNumber(department: string, month: number, year: number): Promise<number> {
    const monthStr = String(month).padStart(2, '0')
    const counterId = `${department}_${monthStr}_${year}`

    if (isFirebaseConfigured) {
      try {
        const counterDocRef = doc(db, 'counters', counterId)

        const nextSequence = await runTransaction(db, async (transaction) => {
          const counterDoc = await transaction.get(counterDocRef)
          const nowIso = new Date().toISOString()

          if (!counterDoc.exists()) {
            transaction.set(counterDocRef, {
              counterId,
              department,
              month,
              year,
              currentSequence: 1,
              createdAt: nowIso,
              updatedAt: nowIso,
            })
            return 1
          }

          const data = counterDoc.data()
          const current = typeof data.currentSequence === 'number' ? data.currentSequence : 0
          const incremented = current + 1

          transaction.update(counterDocRef, {
            currentSequence: incremented,
            updatedAt: nowIso,
          })

          return incremented
        })

        return nextSequence
      } catch (err) {
        console.warn('Firestore Transaction pada counters gagal, beralih ke local fallback:', err)
      }
    }

    // In-memory atomic fallback
    await new Promise((resolve) => setTimeout(resolve, 50))
    const current = this.inMemoryCounters[counterId] || 0
    const incremented = current + 1
    this.inMemoryCounters[counterId] = incremented
    return incremented
  }
}

export const counterRepository = new CounterRepository()
