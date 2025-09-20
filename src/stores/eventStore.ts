import { create } from 'zustand';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Event, User } from '../types';
import toast from 'react-hot-toast';
import { useAuthStore } from './authStore';

interface EventState {
  events: Event[];
  isLoading: boolean;
  fetchEvents: () => Promise<void>;
  getEventById: (id: string) => Event | undefined;
  createEvent: (eventData: Partial<Event>) => Promise<Event | null>;
  updateEvent: (id: string, eventData: Partial<Event>) => Promise<Event | null>;
  deleteEvent: (id: string) => Promise<boolean>;
  approveEvent: (id: string) => Promise<Event | null>;
  rejectEvent: (id: string) => Promise<Event | null>;
  registerForEvent: (eventId: string, userId: string, registrationData?: Partial<Event>) => Promise<boolean>;
  cancelRegistration: (eventId: string, userId: string) => Promise<boolean>;
  fetchRegisteredEvents: (userId: string) => Promise<Event[]>;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  isLoading: false,

  fetchEvents: async () => {
    set({ isLoading: true });
    try {
      const unsub = onSnapshot(collection(db, 'events'), (snapshot) => {
        const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
        set({ events, isLoading: false });
      });
    } catch (error) {
      toast.error('Failed to load events');
      set({ isLoading: false });
    }
  },

  getEventById: (id) => get().events.find(event => event.id === id),

  createEvent: async (eventData) => {
    set({ isLoading: true });
    const { user } = useAuthStore.getState();
    if (!user) {
        toast.error("You must be logged in to create an event.");
        set({ isLoading: false });
        return null;
    }

    try {
        const cleanEventData = Object.fromEntries(Object.entries(eventData).filter(([, value]) => value !== undefined));
        
        const docRef = await addDoc(collection(db, 'events'), {
            ...cleanEventData,
            registeredCount: 0,
            status: eventData?.organizerType === 'admin' ? 'approved' : 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        if (eventData?.organizerType === 'admin') {
            toast.success('Event created and approved!');
            const { fetchUsers } = useAuthStore.getState();
            const allUsers = await fetchUsers();
            const students = allUsers.filter((u: User) => u.role === 'student');

            if (students.length > 0) {
                try {
                    await fetch('https://eventsync.vercel.app/api/event-notification', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event: { id: docRef.id, ...eventData }, students }),
                    });
                    toast.success('Event notification sent to students!');
                } catch (emailError) {
                    toast.error('Event created, but mail is not sent.');
                    console.error('Email sending error:', emailError);
                }
            }
        } else {
            toast.success('Event created! Awaiting admin approval.');
        }

        set({ isLoading: false });
        return { id: docRef.id, ...eventData } as Event;
    } catch (error) {
        console.error('Create event error:', error);
        toast.error('Failed to create event');
        set({ isLoading: false });
        return null;
    }
  },

  approveEvent: async (id) => {
    set({ isLoading: true });
    try {
      const eventRef = doc(db, 'events', id);
      const eventSnap = await getDoc(eventRef);

      if (!eventSnap.exists()) {
        toast.error('Event not found.');
        set({ isLoading: false });
        return null;
      }

      const eventToApprove = { id: eventSnap.id, ...eventSnap.data() } as Event;

      await updateDoc(eventRef, {
        status: 'approved',
        updatedAt: new Date().toISOString(),
      });
      
      let emailSuccess = true;
      if (eventToApprove.organizerType === 'club') {
        const { fetchUsers } = useAuthStore.getState();
        const allUsers = await fetchUsers();
        const students = allUsers.filter((user: User) => user.role === 'student');

        if (students.length > 0) {
          try {
            await fetch('https://eventsync.vercel.app/api/event-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event: eventToApprove, students }),
            });
          } catch (emailError) {
            emailSuccess = false;
            console.error('Email sending error:', emailError);
          }
        }
      }
      
      if(emailSuccess) {
          toast.success('Event approved and notifications sent!');
      } else {
          toast.error('Event approved, but failed to send notifications.');
      }

      const updatedEvent = get().getEventById(id);
      set({ isLoading: false });
      return updatedEvent ? { ...updatedEvent, status: 'approved' } : null;

    } catch (error) {
      toast.error('Failed to approve event');
      set({ isLoading: false });
      return null;
    }
  },

  updateEvent: async (id, eventData) => {
    set({ isLoading: true });
    try {
      
      const dataToUpdate = {
          ...eventData,
          updatedAt: new Date().toISOString(),
      };
      
      delete (dataToUpdate as Partial<Event>).organizerId;
      delete (dataToUpdate as Partial<Event>).organizerName;
      delete (dataToUpdate as Partial<Event>).organizerType;
      delete (dataToUpdate as Partial<Event>).createdBy;

      
      const cleanDataToUpdate = Object.fromEntries(Object.entries(dataToUpdate).filter(([, value]) => value !== undefined));
      
      await updateDoc(doc(db, 'events', id), cleanDataToUpdate);
      toast.success('Event updated!');
      set({ isLoading: false });
      
      return get().getEventById(id);
    } catch (error) {
      toast.error('Failed to update event');
      set({ isLoading: false });
      return null;
    }
  },

  deleteEvent: async (id) => {
    set({ isLoading: true });
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success('Event deleted!');
      set({ isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to delete event');
      set({ isLoading: false });
      return false;
    }
  },

  rejectEvent: async (id) => {
    set({ isLoading: true });
    try {
      await updateDoc(doc(db, 'events', id), {
        status: 'rejected',
        updatedAt: new Date().toISOString(),
      });
      toast.success('Event rejected');
      set({ isLoading: false });
      const updatedEvent = get().getEventById(id);
      return updatedEvent ? { ...updatedEvent, status: 'rejected' } : null;
    } catch (error) {
      toast.error('Failed to reject event');
      set({ isLoading: false });
      return null;
    }
  },

  registerForEvent: async (eventId, userId, registrationData) => {
    set({ isLoading: true });
    try {
        await runTransaction(db, async (transaction) => {
            const userRef = doc(db, 'users', userId);
            const eventRef = doc(db, 'events', eventId);
            const userDoc = await transaction.get(userRef);
            const eventDoc = await transaction.get(eventRef);

            if (!userDoc.exists() || !eventDoc.exists()) {
                throw new Error("User or Event not found!");
            }

            const regRef = doc(collection(db, 'eventRegistrations'));
            transaction.set(regRef, {
                eventId,
                userId,
                status: 'registered',
                registeredAt: new Date().toISOString(),
                ...(registrationData || {})
            });

            const currentRegCount = eventDoc.data().registeredCount || 0;
            transaction.update(eventRef, { registeredCount: currentRegCount + 1 });
        });

        toast.success('Registered for event!');
        set({ isLoading: false });
        return true;
    } catch (error) {
        toast.error('Failed to register');
        set({ isLoading: false });
        return false;
    }
},


  cancelRegistration: async (eventId, userId) => {
    set({ isLoading: true });
    try {
      const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      snapshot.forEach(async (registration) => {
        await deleteDoc(doc(db, 'eventRegistrations', registration.id));
      });
      const event = get().getEventById(eventId);
      if (event && event.registeredCount > 0) {
        await updateDoc(doc(db, 'events', eventId), {
          registeredCount: event.registeredCount - 1,
        });
      }
      toast.success('Registration cancelled');
      set({ isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to cancel registration');
      set({ isLoading: false });
      return false;
    }
  },

  fetchRegisteredEvents: async (userId: string) => {
    set({ isLoading: true });
    try {
        const registrationsQuery = query(collection(db, 'eventRegistrations'), where('userId', '==', userId));
        const registrationSnapshots = await getDocs(registrationsQuery);
        const eventIds = registrationSnapshots.docs.map(doc => doc.data().eventId);

        if (eventIds.length === 0) {
            set({ isLoading: false });
            return [];
        }

        const events = get().events;
        const registeredEvents = events.filter(event => eventIds.includes(event.id));
        
        set({ isLoading: false });
        return registeredEvents;
    } catch (error) {
        toast.error('Failed to load registered events');
        set({ isLoading: false });
        return [];
    }
  },
}));