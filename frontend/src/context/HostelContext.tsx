'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface Hostel {
  hostel_id: number;
  hostel_name: string;
  address?: string;
  total_rooms?: number;
  calculated_capacity?: number;
}

interface HostelContextType {
  selectedHostel: string;
  setSelectedHostel: (id: string) => void;
  hostels: Hostel[];
  loading: boolean;
}

const HostelContext = createContext<HostelContextType | undefined>(undefined);

export const HostelProvider = ({ children }: { children: React.ReactNode }) => {
  const [selectedHostel, setSelectedHostel] = useState<string>('all');
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHostels = async () => {
      try {
        const res = await api.get('/owner/hostels');
        setHostels(res.data);
      } catch (err) {
        console.error('Error fetching hostels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHostels();
  }, []);

  return (
    <HostelContext.Provider value={{ selectedHostel, setSelectedHostel, hostels, loading }}>
      {children}
    </HostelContext.Provider>
  );
};

export const useHostel = () => {
  const context = useContext(HostelContext);
  if (context === undefined) {
    throw new Error('useHostel must be used within a HostelProvider');
  }
  return context;
};