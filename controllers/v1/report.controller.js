import {Report} from '../../models/report.model.js';


const createCrimeReport = async (req, res) => {
    try {
        // const {details} = req.body;
        // console.log(req.body);
        if (!details) {
            return res.status(400).json({message: "details are required"});
        }
        const report = new Report({
            details,
            timestamp: new Date(),
            reportType: "crime",
            userId: req.user._id
        });
        // console.log(report);
        await report.save();
        return res.status(201).json({message: "Report created successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}


const createFireReport = async (req, res) => {
    try {
        const {details} = req.body;
        if (!details) {
            return res.status(400).json({message: "details are required"});
        }

        const report = new Report({
            details,
            timestamp: new Date(),
            reportType: "fire",
            userId: req.user._id
        });
        // console.log(report);

        await report.save();
        return res.status(201).json({message: "Report created successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Internal server error"});
    }
}

export {createCrimeReport, createFireReport}