import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (user) {
            const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000');
            setSocket(newSocket);

            newSocket.on('connect', () => {
                setConnected(true);
                newSocket.emit('authenticate', user.id);
            });

            newSocket.on('disconnect', () => {
                setConnected(false);
            });

            return () => {
                newSocket.close();
            };
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
};