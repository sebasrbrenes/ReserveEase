import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

// Sync user data to Firestore
export const syncUserData = async (user) => {
  if (!user) return;

  try {
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    
    const currentData = userDoc.exists() ? userDoc.data() : {};
    
    // Preserve existing data while updating necessary fields
    await setDoc(userRef, {
      ...currentData, // Keep all existing data
      email: user.email,
      updatedAt: new Date().toISOString(),
      ...(!userDoc.exists() && { createdAt: new Date().toISOString() })
    }, { merge: true });
    
    return userDoc.exists() ? { ...currentData, email: user.email } : null;
  } catch (error) {
    console.error('Error syncing user data:', error);
    throw error; // Propagate error for handling
  }
};

// Get user data from Firestore
export const getUserData = async (userId) => {
  if (!userId) return null;
  
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};
