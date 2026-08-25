import { useContext } from 'react';
import { AlertContext } from '../context/AlertContext';

export const useAlerts = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlerts must be used within an AlertProvider');
    }
    return context;
};

export default useAlerts;