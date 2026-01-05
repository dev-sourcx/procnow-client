import { io, Socket } from 'socket.io-client';
import { getAuthToken } from './storage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

let socket: Socket | null = null;

export const getSocket = (): Socket | null => {
    if(typeof window === 'undefined') return null;

    if(!socket || !socket.connected) {
        const token = getAuthToken();
        if(!token) return null;

        socket = io(API_URL, {
            auth: {
                token
            },
            transports: ['websocket', 'polling']
        });

        socket.on('connect', () => {
            console.log('Socket connected');
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
        });

        socket.on('error', (error: any) => {
            console.log('Socket error: ', error)
        });
    }

    return socket;
}

export const disconnectSocket = (): void => {
    if(socket) {
        socket.disconnect();
        socket = null;
    }
}