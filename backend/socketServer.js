import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Sos } from './models/sos.model.js'; // Reuse your Sos model
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

// Connect to MongoDB (reuse same DB as main app)
mongoose.connect(process.env.MONGO_URI).then(() => {
    console.log('Socket server connected to MongoDB');
}).catch((err) => {
    console.error('Socket server MongoDB connection error:', err);
});
// Create HTTP server
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: '*', // Adjust for production (e.g., your frontend URL)
        methods: ['GET', 'POST'],
        credentials: true,
    },
});

// Socket authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error: No token provided'));
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            return next(new Error('Invalid token'));
        }
        socket.user = user; // Attach user to socket
        next();
    });
});

// Socket connection handler
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    // Join a room for active SOS users
    socket.join('active-sos');

    // Listen for location updates from SOS sender
    socket.on('update-location', async (data) => {
        const { latitude, longitude, sosId } = data;

        // Validate: Check if this user has an active SOS
        try {
            const sos = await Sos.findOne({ _id: sosId, userId: socket.user._id });
            if (!sos || (Date.now() - new Date(sos.timestamp).getTime()) / 1000 / 60 > 30) {
                socket.emit('error', 'SOS expired or invalid');
                return;
            }

            // Update SOS in DB (optional, for persistence)
            sos.latitude = latitude;
            sos.longitude = longitude;
            await sos.save();

            // Broadcast to all other connected users
            socket.to('active-sos').emit('location-update', {
                userId: socket.user._id,
                latitude,
                longitude,
                sosId,
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Error processing location update:', error);
            socket.emit('error', 'Failed to process location update');
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user._id}`);
    });
});

// Start socket server on a different port
const SOCKET_PORT = process.env.SOCKET_PORT || 3001; // Use a different port than main app
httpServer.listen(SOCKET_PORT, () => {
    console.log(`Socket.IO server running on port ${SOCKET_PORT}`);
});