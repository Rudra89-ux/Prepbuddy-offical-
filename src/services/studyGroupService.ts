import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  arrayUnion, 
  serverTimestamp,
  getDoc,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudyGroup, GroupMessage, GroupNote, UserProfile, Exam } from '../types';

export const StudyGroupService = {
  createGroup: async (name: string, description: string, creator: UserProfile, maxMembers: number, isPrivate: boolean, exam: Exam) => {
    const inviteCode = isPrivate ? Math.random().toString(36).substring(2, 8).toUpperCase() : undefined;
    const groupRef = await addDoc(collection(db, 'studyGroups'), {
      name,
      description,
      creatorId: creator.uid,
      memberIds: [creator.uid],
      maxMembers,
      isPrivate,
      inviteCode,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      exam
    });
    return groupRef.id;
  },

  joinGroupByCode: async (inviteCode: string, userId: string) => {
    const q = query(collection(db, 'studyGroups'), where('inviteCode', '==', inviteCode), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error('Invalid invite code');
    
    const groupDoc = snapshot.docs[0];
    const groupData = groupDoc.data() as StudyGroup;
    
    if (groupData.memberIds.includes(userId)) return groupDoc.id;
    if (groupData.memberIds.length >= groupData.maxMembers) throw new Error('Group is full');
    
    await updateDoc(doc(db, 'studyGroups', groupDoc.id), {
      memberIds: arrayUnion(userId),
      lastActive: serverTimestamp()
    });
    
    return groupDoc.id;
  },

  joinPublicGroup: async (groupId: string, userId: string) => {
    const groupRef = doc(db, 'studyGroups', groupId);
    const groupDoc = await getDoc(groupRef);
    if (!groupDoc.exists()) throw new Error('Group not found');
    
    const groupData = groupDoc.data() as StudyGroup;
    if (groupData.isPrivate) throw new Error('This group is private');
    if (groupData.memberIds.length >= groupData.maxMembers) throw new Error('Group is full');
    
    await updateDoc(groupRef, {
      memberIds: arrayUnion(userId),
      lastActive: serverTimestamp()
    });
  },

  sendMessage: async (groupId: string, senderId: string, senderName: string, text: string, type: 'text' | 'doubt' = 'text') => {
    await addDoc(collection(db, 'studyGroups', groupId, 'messages'), {
      groupId,
      senderId,
      senderName,
      text,
      type,
      createdAt: serverTimestamp(),
      resolved: false
    });
    
    await updateDoc(doc(db, 'studyGroups', groupId), {
      lastActive: serverTimestamp()
    });
  },

  shareNote: async (groupId: string, authorId: string, authorName: string, title: string, content: string) => {
    await addDoc(collection(db, 'studyGroups', groupId, 'notes'), {
      groupId,
      authorId,
      authorName,
      title,
      content,
      createdAt: serverTimestamp()
    });
  },

  getLeaderboard: async (groupId: string) => {
    const groupDoc = await getDoc(doc(db, 'studyGroups', groupId));
    if (!groupDoc.exists()) return [];
    
    const memberIds = groupDoc.data().memberIds as string[];
    // Fetch attempts for all members and calculate scores
    // This is simplified; in a real app you'd want a more optimized solution
    const leaderboard = [];
    for (const uid of memberIds) {
      const q = query(collection(db, 'quizAttempts'), where('userId', '==', uid));
      const attempts = await getDocs(q);
      const totalScore = attempts.docs.reduce((sum, doc) => sum + doc.data().score, 0);
      
      const userDoc = await getDoc(doc(db, 'users', uid));
      leaderboard.push({
        name: userDoc.data()?.displayName || 'Unknown',
        score: totalScore
      });
    }
    
    return leaderboard.sort((a, b) => b.score - a.score);
  }
};
