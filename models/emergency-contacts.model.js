import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        match: [/^\+[1-9]\d{1,14}$/, 'Please enter a valid phone number with country code (e.g., +1234567890)']
    }
});

export const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);
