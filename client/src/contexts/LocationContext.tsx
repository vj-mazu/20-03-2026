import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';

interface Warehouse {
  id: number;
  name: string;
  code: string;
  location?: string;
  capacity?: number;
  isActive: boolean;
}

interface Kunchinittu {
  id: number;
  name: string;
  code: string;
  warehouseId: number;
  warehouse?: Warehouse;
  varietyId?: number;
  variety?: Variety;
  capacity?: number;
  isActive: boolean;
  isClosed?: boolean;
  closedAt?: string;
}

interface Variety {
  id: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

interface RiceVariety {
  id: number;
  name: string;
  code: string;
  isActive: boolean;
}

interface LocationContextType {
  warehouses: Warehouse[];
  kunchinittus: Kunchinittu[];
  varieties: Variety[];
  riceVarieties: RiceVariety[];
  fetchWarehouses: () => Promise<void>;
  fetchKunchinittus: () => Promise<void>;
  fetchVarieties: () => Promise<void>;
  fetchRiceVarieties: () => Promise<void>;
  createWarehouse: (data: Partial<Warehouse>) => Promise<Warehouse>;
  createKunchinittu: (data: Partial<Kunchinittu>) => Promise<Kunchinittu>;
  createVariety: (data: Partial<Variety>) => Promise<Variety>;
  createRiceVariety: (data: Partial<RiceVariety>) => Promise<RiceVariety>;
  isLoading: boolean;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [kunchinittus, setKunchinittus] = useState<Kunchinittu[]>([]);
  const [varieties, setVarieties] = useState<Variety[]>([]);
  const [riceVarieties, setRiceVarieties] = useState<RiceVariety[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchWarehouses = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/locations/warehouses', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data as { warehouses: Warehouse[] };
      setWarehouses(data.warehouses || []);
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchKunchinittus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/locations/kunchinittus', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = response.data as { kunchinittus: Kunchinittu[] };
      console.log('📊 Fetched kunchinittus:', data.kunchinittus);
      setKunchinittus(data.kunchinittus || []);
    } catch (error) {
      console.error('Error fetching kunchinittus:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVarieties = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/locations/varieties', {
        headers: { Authorization: `Bearer ${token}` },
        params: { t: Date.now() }
      });
      const data = response.data as { varieties: Variety[] };
      setVarieties(data.varieties || []);
    } catch (error) {
      console.error('Error fetching varieties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRiceVarieties = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/locations/rice-varieties', {
        headers: { Authorization: `Bearer ${token}` },
        params: { t: Date.now() }
      });
      const data = response.data as { varieties: RiceVariety[] };
      setRiceVarieties(data.varieties || []);
    } catch (error) {
      console.error('Error fetching rice varieties:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createWarehouse = async (data: Partial<Warehouse>): Promise<Warehouse> => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/locations/warehouses', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const responseData = response.data as { warehouse: Warehouse };
      const newWarehouse = responseData.warehouse;
      setWarehouses(prev => [...prev, newWarehouse]);
      return newWarehouse;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create warehouse';
      throw new Error(errorMessage);
    }
  };

  const createKunchinittu = async (data: Partial<Kunchinittu>): Promise<Kunchinittu> => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/locations/kunchinittus', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const responseData = response.data as { kunchinittu: Kunchinittu };
      const newKunchinittu = responseData.kunchinittu;
      setKunchinittus(prev => [...prev, newKunchinittu]);
      return newKunchinittu;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create kunchinittu';
      throw new Error(errorMessage);
    }
  };

  const createVariety = async (data: Partial<Variety>): Promise<Variety> => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/locations/varieties', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const responseData = response.data as { variety: Variety };
      const newVariety = responseData.variety;
      setVarieties(prev => [...prev, newVariety]);
      return newVariety;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create variety';
      throw new Error(errorMessage);
    }
  };

  const createRiceVariety = async (data: Partial<RiceVariety>): Promise<RiceVariety> => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/locations/rice-varieties', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const responseData = response.data as { variety: RiceVariety };
      const newVariety = responseData.variety;
      setRiceVarieties(prev => [...prev, newVariety]);
      return newVariety;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create rice variety';
      throw new Error(errorMessage);
    }
  };

  // Fetch initial data
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchWarehouses();
      fetchKunchinittus();
      fetchVarieties();
      fetchRiceVarieties();
    }
  }, []);

  const value: LocationContextType = {
    warehouses,
    kunchinittus,
    varieties,
    riceVarieties,
    fetchWarehouses,
    fetchKunchinittus,
    fetchVarieties,
    fetchRiceVarieties,
    createWarehouse,
    createKunchinittu,
    createVariety,
    createRiceVariety,
    isLoading
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};
