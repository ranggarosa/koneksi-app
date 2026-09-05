import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db, googleAuthProvider, isFirebaseConfigured } from '@/config/firebase'
import type { User, UserRole } from './auth.model'

export interface IAuthRepository {
  getCurrentUser(): Promise<User | null>
  signInWithGoogle(preferredRole?: UserRole): Promise<User>
  signOut(): Promise<void>
  subscribeToAuthState(callback: (user: User | null) => void): () => void
  getUserFromFirestore(uid: string): Promise<User | null>
  saveUserToFirestore(user: User): Promise<void>
}

class AuthRepository implements IAuthRepository {
  private fallbackUser: User | null = null

  async getUserFromFirestore(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, 'users', uid)
      const docSnap = await getDoc(userRef)

      if (docSnap.exists()) {
        const data = docSnap.data()
        return {
          uid,
          email: data.email || '',
          name: data.name || '',
          role: (data.role as UserRole) || 'drafter',
          signatureUrl: data.signatureUrl || undefined,
          avatarUrl: data.avatarUrl || undefined,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }
      }
      return null
    } catch (err) {
      console.warn('Gagal membaca data Firestore collection users:', err)
      return null
    }
  }

  async saveUserToFirestore(user: User): Promise<void> {
    const userRef = doc(db, 'users', user.uid)
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUrl || null,
      signatureUrl: user.signatureUrl || null,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true })
  }

  private mapFirebaseUserToAppUser(fbUser: FirebaseUser, role: UserRole = 'drafter'): User {
    return {
      uid: fbUser.uid,
      email: fbUser.email || '',
      name: fbUser.displayName || 'Pengguna Koneksi',
      role,
      avatarUrl: fbUser.photoURL || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (!isFirebaseConfigured) {
      return this.fallbackUser
    }

    const currentFbUser = auth.currentUser
    if (!currentFbUser) {
      return null
    }

    const firestoreUser = await this.getUserFromFirestore(currentFbUser.uid)
    return firestoreUser || this.mapFirebaseUserToAppUser(currentFbUser)
  }

  async signInWithGoogle(preferredRole?: UserRole): Promise<User> {
    if (!isFirebaseConfigured) {
      // Fallback demo mode if .env is not yet configured
      await new Promise((resolve) => setTimeout(resolve, 300))
      const role = preferredRole || 'drafter'
      const mockUser: User = {
        uid: `usr_${Date.now()}`,
        email: `${role}@koneksi.co.id`,
        name: `${role.charAt(0).toUpperCase() + role.slice(1)} User (Demo)`,
        role,
        avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${role}`,
        signatureUrl: role === 'approver' ? 'https://dummyimage.com/200x80/000/fff&text=Signature' : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      this.fallbackUser = mockUser
      return mockUser
    }

    // Live Firebase Google Sign-In
    const result = await signInWithPopup(auth, googleAuthProvider)
    const fbUser = result.user

    // Fetch existing user record in Firestore
    let appUser = await this.getUserFromFirestore(fbUser.uid)

    if (!appUser) {
      // First-time login: create new document in collection users with default role 'drafter'
      appUser = this.mapFirebaseUserToAppUser(fbUser, 'drafter')
      await this.saveUserToFirestore(appUser)
    }

    return appUser
  }

  async signOut(): Promise<void> {
    if (isFirebaseConfigured) {
      await firebaseSignOut(auth)
    }
    this.fallbackUser = null
  }

  subscribeToAuthState(callback: (user: User | null) => void): () => void {
    if (!isFirebaseConfigured) {
      callback(this.fallbackUser)
      return () => {}
    }

    return onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        callback(null)
        return
      }

      try {
        const appUser = await this.getUserFromFirestore(fbUser.uid)
        callback(appUser || this.mapFirebaseUserToAppUser(fbUser))
      } catch {
        callback(this.mapFirebaseUserToAppUser(fbUser))
      }
    })
  }
}

export const authRepository = new AuthRepository()
