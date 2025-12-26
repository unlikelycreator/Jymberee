import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        reportType: {
            type: String,
            required: true,
            enum: ["fire", "crime"]
        },
        details: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            required: true
        }
    },
    { timestamps: true }
)

export const Report = mongoose.model("Report", reportSchema)