'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import Card from '@/components/ui/Card';
import api from '@/lib/api';
import { 
  Home, 
  Users, 
  Plus, 
  ArrowLeft, 
  Loader2, 
  UserPlus,
  Phone,
  BookOpen,
  Calendar,
  MapPin,
  Heart,
  Save,
  X,
  CreditCard
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RoomDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [saving, setSaving] = useState(false);

  const [studentForm, setStudentForm] = useState({
    name: '',
    phone: '',
    whatsapp_number: '',
    aadhaar_number: '',
    email: '',
    dob: '',
    gender: 'Male',
    joining_date: new Date().toISOString().split('T')[0],
    emergency_contact: '',
    payment_model: '2 + 1 System',
    total_session_fees: '',
    monthly_fee: '',
    total_months_stay: '10',
    security_deposit: '',
    college_name: '',
    course_name: '',
    year: '1st',
    address: '',
    city: '',
    state: '',
    parent_name: '',
    parent_phone: '',
    parent_secondary_phone: '',
    parent_relation: 'Father',
    parent_occupation: '',
    parent_aadhaar: '',
    parent_address: '',
    college_address: '',
    student_photo: '',
    assigned_slot: ''
  });

  useEffect(() => {
    if (id) fetchRoomDetails();
  }, [id]);

  const fetchRoomDetails = async () => {
    try {
      const res = await api.get(`/hostels/rooms/${id}`);
      setRoom(res.data);
    } catch (err) {
      console.error('Error fetching room details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const wardenId = user.id || user.warden_id || user.userId;
      
      await api.post(`/hostels/${room.hostel_id}/students`, {
        name: studentForm.name,
        phone: studentForm.phone,
        room_id: room.room_id,
        warden_id: wardenId,
        payment_model: studentForm.payment_model,
        total_months_stay: studentForm.total_months_stay,
        total_session_fees: studentForm.total_session_fees,
        details: studentForm
      });
      setShowAddStudent(false);
      fetchRoomDetails();
      // Reset form
      setStudentForm({
        name: '',
        phone: '',
        whatsapp_number: '',
        aadhaar_number: '',
        email: '',
        dob: '',
        gender: 'Male',
        joining_date: new Date().toISOString().split('T')[0],
        emergency_contact: '',
        payment_model: '2 + 1 System',
        total_session_fees: '',
        monthly_fee: '',
        total_months_stay: '10',
        security_deposit: '',
        college_name: '',
        course_name: '',
        year: '1st',
        address: '',
        city: '',
        state: '',
        parent_name: '',
        parent_phone: '',
        parent_secondary_phone: '',
        parent_relation: 'Father',
        parent_occupation: '',
        parent_aadhaar: '',
        parent_address: '',
        college_address: '',
        student_photo: '',
        assigned_slot: ''
      });
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Error adding student';
      const detail = err.response?.data?.details ? `\nDetails: ${err.response.data.details}` : '';
      alert(`${errorMsg}${detail}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    );
  }

  if (!room) return null;

  const occupiedSlots = room.students?.length || 0;
  const availableSlots = Math.max(0, room.capacity - occupiedSlots);

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar role="warden" />
      <main className="flex-1 p-8 overflow-y-auto">
        <button onClick={() => router.back()} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors font-bold uppercase tracking-widest text-xs">
          <ArrowLeft size={16} /> Back to Rooms
        </button>

        <header className="mb-10 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
                <Home size={20} />
              </div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">Room {room.room_number}</h1>
            </div>
            <p className="text-slate-500 font-medium">
              Type: <span className="text-indigo-600 font-bold">{room.room_type}</span> • 
              Capacity: <span className="font-bold">{room.capacity} Seater</span> • 
              Floor: <span className="text-emerald-600 font-bold">{room.floor || 'Ground Floor'}</span>
            </p>
          </div>
          
          {occupiedSlots < room.capacity && (
            <button 
              onClick={() => setShowAddStudent(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <UserPlus size={20} />
              <span>Add Student</span>
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room Occupancy Grid */}
          <div className="lg:col-span-2 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Occupied Slots */}
              {room.students?.map((student: any, idx: number) => {
                const slotLetter = String.fromCharCode(65 + (student.details?.assigned_slot_index ?? idx));
                return (
                  <Card key={student.student_id} className="border-none shadow-sm relative group overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Users size={80} />
                    </div>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl uppercase">
                        {student.name?.charAt(0) || 'S'}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-lg">{student.name}</h3>
                        <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                          Occupant - Slot {room.room_number}{slotLetter}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-slate-600">
                        <Phone size={14} className="text-slate-400" />
                        <span className="text-sm font-bold">{student.phone}</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <BookOpen size={14} className="text-slate-400" />
                        <span className="text-sm font-bold">{student.details?.course_name || 'Not Specified'}</span>
                      </div>
                      <div className="pt-4 border-t border-slate-100">
                        <Link 
                          href={`/warden/students/${student.student_id}`}
                          className="text-xs font-bold text-indigo-600 hover:underline inline-block"
                        >
                          View Full Profile
                        </Link>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Empty Slots */}
              {Array.from({ length: room.capacity }).map((_, idx) => {
                // Check if this slot index is already occupied
                const isOccupied = room.students?.some((s: any) => (s.details?.assigned_slot_index ?? -1) === idx);
                if (isOccupied) return null;

                const slotLetter = String.fromCharCode(65 + idx);
                return (
                  <div 
                    key={`empty-${idx}`}
                    className="p-8 rounded-[32px] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center bg-slate-50/50 group hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer min-h-[200px]"
                    onClick={() => {
                      setStudentForm(prev => ({ ...prev, assigned_slot: `${room.room_number}${slotLetter}`, assigned_slot_index: idx }));
                      setShowAddStudent(true);
                    }}
                  >
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 mb-4 group-hover:text-indigo-400 group-hover:shadow-md transition-all">
                      <UserPlus size={24} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest group-hover:text-indigo-500">
                      Empty Slot {room.room_number}{slotLetter}
                    </p>
                    <p className="text-xs font-medium text-slate-300 mt-1">Click to assign student</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room Stats */}
          <div className="space-y-6">
            <Card title="Room Status">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Current Status</span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                    occupiedSlots < room.capacity ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {occupiedSlots < room.capacity ? 'Available' : 'Full'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Occupancy</span>
                  <span className="text-lg font-black text-slate-900">{occupiedSlots} / {room.capacity}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full transition-all duration-500" 
                    style={{ width: `${(occupiedSlots / room.capacity) * 100}%` }}
                  />
                </div>
              </div>
            </Card>

            <div className="p-8 bg-slate-900 rounded-[32px] text-white relative overflow-hidden">
              <div className="absolute -right-4 -bottom-4 opacity-10">
                <Home size={120} />
              </div>
              <h4 className="text-lg font-bold mb-4 relative z-10">Inventory Summary</h4>
              <p className="text-slate-400 text-sm mb-6 relative z-10">This {room.room_type} room has a capacity of {room.capacity} students. Current availability is {availableSlots} slots.</p>
              <div className="pt-6 border-t border-slate-800 relative z-10">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-400">Inventory Status</span>
                  <span className="text-emerald-400 font-black">Live</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Add Student Slide-over / Modal */}
        {showAddStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl h-full bg-white rounded-[40px] shadow-2xl overflow-y-auto relative border-none animate-in slide-in-from-right duration-500">
              <button 
                onClick={() => setShowAddStudent(false)}
                className="absolute top-8 right-8 p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
              >
                <X size={24} />
              </button>
              
              <div className="p-10">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mb-8">
                  <UserPlus size={32} />
                </div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Assign Student</h2>
                <p className="text-slate-500 font-medium mb-10">Fill in the comprehensive details to assign student to <span className="text-indigo-600 font-bold">Room {room.room_number}</span>.</p>

                <form onSubmit={handleAddStudent} className="space-y-10">
                  {/* Basic Information */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Student Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Photo</label>
                        <div className="flex items-center gap-4">
                          <input 
                            required 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            id="student-photo-upload" 
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setStudentForm({...studentForm, student_photo: reader.result as string});
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                          <label 
                            htmlFor="student-photo-upload" 
                            className="flex-1 flex items-center justify-center gap-2 p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 hover:border-indigo-300 transition-all text-slate-500 font-bold text-sm"
                          >
                            <Plus size={20} />
                            {studentForm.student_photo ? 'Change Photo' : 'Upload Student Photo'}
                          </label>
                          {studentForm.student_photo && (
                            <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
                              <img src={studentForm.student_photo} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.name} onChange={e => setStudentForm({...studentForm, name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">Email ID <span className="text-slate-300 font-medium">(Optional)</span></label>
                        <input type="email" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.email} onChange={e => setStudentForm({...studentForm, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.phone} onChange={e => setStudentForm({...studentForm, phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp Number</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.whatsapp_number} onChange={e => setStudentForm({...studentForm, whatsapp_number: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aadhaar Number (Student)</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.aadhaar_number} onChange={e => setStudentForm({...studentForm, aadhaar_number: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Emergency Contact</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.emergency_contact} onChange={e => setStudentForm({...studentForm, emergency_contact: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">Date of Birth <span className="text-slate-300 font-medium">(Optional)</span></label>
                        <input type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.dob} onChange={e => setStudentForm({...studentForm, dob: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gender</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.gender} onChange={e => setStudentForm({...studentForm, gender: e.target.value})}>
                          <option>Male</option><option>Female</option><option>Other</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Joining Date</label>
                        <input required type="date" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.joining_date} onChange={e => setStudentForm({...studentForm, joining_date: e.target.value})} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Permanent Address</label>
                        <textarea required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold h-24" value={studentForm.address} onChange={e => setStudentForm({...studentForm, address: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">City</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.city} onChange={e => setStudentForm({...studentForm, city: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">State</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={studentForm.state} onChange={e => setStudentForm({...studentForm, state: e.target.value})} />
                      </div>
                    </div>
                  </section>

                  {/* Academic & Fee */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-6 bg-blue-600 rounded-full" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Academic & Fees</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">College Name</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={studentForm.college_name} onChange={e => setStudentForm({...studentForm, college_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">Course Name <span className="text-slate-300 font-medium">(Optional)</span></label>
                        <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={studentForm.course_name} onChange={e => setStudentForm({...studentForm, course_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">Year of Study <span className="text-slate-300 font-medium">(Optional)</span></label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={studentForm.year} onChange={e => setStudentForm({...studentForm, year: e.target.value})}>
                          <option value="">Not Specified</option>
                          <option>1st</option><option>2nd</option><option>3rd</option><option>4th</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Payment Model</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={studentForm.payment_model} onChange={e => setStudentForm({...studentForm, payment_model: e.target.value})}>
                          <option>2 + 1 System</option>
                          <option>Three Installment System</option>
                          <option>One Time Payment</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Session Fees (₹)</label>
                        <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={studentForm.total_session_fees} onChange={e => setStudentForm({...studentForm, total_session_fees: e.target.value})} />
                      </div>
                      {studentForm.payment_model === '2 + 1 System' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Months of Stay</label>
                          <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={studentForm.total_months_stay} onChange={e => setStudentForm({...studentForm, total_months_stay: e.target.value})} />
                        </div>
                      )}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Deposit (₹)</label>
                        <input required type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" value={studentForm.security_deposit} onChange={e => setStudentForm({...studentForm, security_deposit: e.target.value})} />
                      </div>
                    </div>
                  </section>

                  {/* Parent Information */}
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-6 bg-emerald-600 rounded-full" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Guardian Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardian Name</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={studentForm.parent_name} onChange={e => setStudentForm({...studentForm, parent_name: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardian Phone</label>
                        <input required type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={studentForm.parent_phone} onChange={e => setStudentForm({...studentForm, parent_phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">Other Contact Number <span className="text-slate-300 font-medium">(Optional)</span></label>
                        <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={studentForm.parent_secondary_phone} onChange={e => setStudentForm({...studentForm, parent_secondary_phone: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">Guardian Occupation <span className="text-slate-300 font-medium">(Optional)</span></label>
                        <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={studentForm.parent_occupation} onChange={e => setStudentForm({...studentForm, parent_occupation: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">Guardian Aadhaar Number <span className="text-slate-300 font-medium">(Optional)</span></label>
                        <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={studentForm.parent_aadhaar} onChange={e => setStudentForm({...studentForm, parent_aadhaar: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relation</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold" value={studentForm.parent_relation} onChange={e => setStudentForm({...studentForm, parent_relation: e.target.value})}>
                          <option>Father</option><option>Mother</option><option>Guardian</option><option>Brother</option><option>Sister</option>
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Guardian Address</label>
                        <textarea required className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 font-bold h-20" value={studentForm.parent_address} onChange={e => setStudentForm({...studentForm, parent_address: e.target.value})} />
                      </div>
                    </div>
                  </section>

                  <div className="flex gap-4 pt-4 pb-10">
                    <button 
                      type="submit" 
                      disabled={saving}
                      className="flex-1 bg-slate-900 text-white font-black py-5 rounded-[24px] shadow-xl shadow-slate-900/20 hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {saving ? <Loader2 className="animate-spin" /> : <><Save size={24} /> Confirm Student Assignment</>}
                    </button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default RoomDetails;
