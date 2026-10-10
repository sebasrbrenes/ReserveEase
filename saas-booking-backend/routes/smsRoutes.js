import express from "express";
import smsService from "../services/smsService.js"; // Importamos el servicio de SMS

const router = express.Router();

// POST endpoint para enviar SMS
router.post("/send", async (req, res) => {
    try {
        const { phone, clientName, businessName, date, time } = req.body;

        if (!phone || !clientName || !businessName || !date || !time) {
            return res.status(400).json({ error: "All fields are required" });
        }

        const response = await smsService.sendSMS(phone, clientName, businessName, date, time);
        res.status(200).json({ success: true, message: "SMS sent successfully", data: response });
    } catch (error) {
        res.status(500).json({ error: "Failed to send SMS", details: error.message });
    }
});

export default router;
