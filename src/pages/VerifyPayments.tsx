// Export registrations to Excel
// (This block is removed because the actual implementation exists below)
import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore'; // Import deleteDoc
import { useEventStore } from '../stores/eventStore'; // Import the store
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle, Clock, XCircle } from 'lucide-react';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Badge from '../components/ui/Badge';
import { Club } from '../types';

const VerifyPayments: React.FC = () => {
    const { eventId } = useParams<{ eventId: string }>();
    const navigate = useNavigate();
    const { cancelRegistration } = useEventStore(); // Get the cancelRegistration function
    const [registrations, setRegistrations] = useState<any[]>([]);
    type EventType = {
        id: string;
        title?: string;
        organizerType?: string;
        organizerId?: string;
        // add other event properties as needed
    };
    
    const [event, setEvent] = useState<EventType | null>(null);
    const [club, setClub] = useState<Club | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [actionId, setActionId] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!eventId) return;
            setIsLoading(true);
            try {
                const eventDoc = await getDoc(doc(db, 'events', eventId));
                if (eventDoc.exists()) {
                    const { id: _ignored, ...eventDataRaw } = eventDoc.data() as EventType;
                    const eventData = { id: eventDoc.id, ...eventDataRaw };
                    setEvent(eventData);

                    if (eventData.organizerType === 'club' && eventData.organizerId) {
                        const clubDoc = await getDoc(doc(db, 'clubs', eventData.organizerId));
                        if (clubDoc.exists()) {
                            setClub({ id: clubDoc.id, ...clubDoc.data() } as Club);
                        }
                    }
                } else {
                    toast.error("Event not found.");
                    navigate('/events');
                    return;
                }

                const q = query(collection(db, 'eventRegistrations'), where('eventId', '==', eventId));
                const snap = await getDocs(q);
                const regsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setRegistrations(regsData);
            } catch (error) {
                toast.error("Failed to fetch registration data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [eventId, navigate]);

    const handleVerifyPayment = async (registration: any) => {
        setActionId(registration.id);
        try {
            await updateDoc(doc(db, 'eventRegistrations', registration.id), {
                paymentVerified: true
            });
            
            setRegistrations(regs =>
                regs.map(r => r.id === registration.id ? { ...r, paymentVerified: true } : r)
            );
            toast.success('Payment verified!');

            const userDoc = await getDoc(doc(db, 'users', registration.userId));
            if (userDoc.exists()) {
                const student = userDoc.data();
                await fetch('http://localhost:5000/api/send-payment-verification', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: student.email,
                        name: student.name,
                        eventName: event?.title,
                        eventId: event?.id
                    }),
                });
                toast.success('Verification email sent!');
            }
        } catch (error) {
            toast.error('An error occurred during verification.');
        } finally {
            setActionId(null);
        }
    };

    const handleRejectPayment = async (registration: any) => {
        const rejectionReason = prompt("Please provide a reason for rejection (this will be sent to the student):");
        if (rejectionReason === null) return;
        
        setActionId(registration.id);
        try {
            // First, send the rejection email
            const userDoc = await getDoc(doc(db, 'users', registration.userId));
            if (userDoc.exists()) {
                const student = userDoc.data();
                await fetch('http://localhost:5000/api/send-payment-rejection', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: student.email,
                        name: student.name,
                        eventName: event?.title,
                        rejectionReason,
                        clubDetails: club
                    }),
                });
                toast.success('Rejection email sent to student.');
            }

            // Now, cancel the registration to remove them and update the count
            const success = await cancelRegistration(eventId!, registration.userId);
            if (success) {
                setRegistrations(regs => regs.filter(r => r.id !== registration.id));
                toast.error('Payment rejected and registration removed.');
            } else {
                 throw new Error("Failed to cancel registration in store.");
            }

        } catch (error) {
            console.error(error);
            toast.error('An error occurred during rejection.');
        } finally {
            setActionId(null);
        }
    };
    
    const getStatusComponent = (reg: any) => {
        if (reg.paymentVerified === true) {
            return <Badge variant="success"><CheckCircle size={14} className="mr-1" /> Verified</Badge>;
        }
        // This case will no longer appear after rejection, but kept for safety
        if (reg.paymentVerified === 'rejected') {
            return <Badge variant="error"><XCircle size={14} className="mr-1" /> Rejected</Badge>;
        }
        return <Badge variant="warning"><Clock size={14} className="mr-1" /> Pending</Badge>;
    };

    if (isLoading) {
        return <div className="flex justify-center items-center min-h-[60vh]"><LoadingSpinner size="lg" text="Loading Registrations..." /></div>;
    }

    // Export registrations to Excel
    const handleExportToExcel = () => {
        if (!registrations || registrations.length === 0) {
            toast.error('No registrations to export.');
            return;
        }
        // Customize exported fields as needed
        const exportData = registrations.map(reg => ({
            Name: reg.name || reg.studentName || '',
            Email: reg.email || '',
            Event: event?.title || '',
            Status: reg.status || '',
            RegisteredAt: reg.registeredAt || '',
            PaymentStatus: reg.paymentStatus || '',
            TransactionID: reg.transactionId || '',
            Verified: reg.paymentVerified ? 'Yes' : 'No',
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Registrations');
        XLSX.writeFile(workbook, `${event?.title || 'event'}-registrations.xlsx`);
        toast.success('Exported to Excel!');
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <Button variant="ghost" size="sm" onClick={() => navigate(`/events/${eventId}`)} className="mb-4">
                <ArrowLeft size={16} className="mr-1" /> Back to Event
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Verify Payments</h1>
            <p className="text-gray-600 mb-6">Event: {event?.title}</p>
            <Button onClick={handleExportToExcel} variant="secondary" className="mb-4">Export to Excel</Button>
            <div className="bg-white rounded-lg border shadow-sm">
                <div className="divide-y divide-gray-200">
                    {registrations.filter(r => r.transactionId).length > 0 ? registrations.filter(r => r.transactionId).map(reg => (
                        <div key={reg.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-gray-800">{reg.name}</p>
                                <p className="text-sm text-gray-500">Reg No: {reg.regNo}</p>
                                <p className="text-sm text-gray-500">Transaction ID: {reg.transactionId}</p>
                                <a href={reg.transactionImage} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                                    View Transaction Proof
                                </a>
                            </div>
                            <div className="flex-shrink-0 flex items-center gap-2">
                                {getStatusComponent(reg)}
                                {reg.paymentVerified !== true && (
                                    <>
                                        <Button size="sm" onClick={() => handleVerifyPayment(reg)} isLoading={actionId === reg.id} disabled={!!actionId}>
                                            Verify
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleRejectPayment(reg)} isLoading={actionId === reg.id} disabled={!!actionId}>
                                            Reject
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 p-8">No pending payments found for this event.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyPayments;