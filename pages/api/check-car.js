import { isValidUKPlate } from "../../utils/validatePlate";
import { getCache, setCache } from "../../utils/cache";
import { db } from "../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req, res) {
  try {
    // 🔐 AUTH
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({
        error: "Unauthorized - no token provided",
      });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;

    // ❌ METHOD CHECK
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { registration } = req.body;

    // ✅ VALIDATION
    if (!isValidUKPlate(registration)) {
      return res.status(400).json({
        error: "Invalid UK registration number",
      });
    }

    const key = registration.replace(/\s/g, "").toUpperCase();

    // ✅ CACHE
    const cached = getCache(key);
    if (cached) {
      return res.status(200).json(cached);
    }

    // 🚗 VEHICLE DATA GLOBAL API (REPLACED DVLA)
    const url = new URL("https://uk.api.vehicledataglobal.com/r2/lookup");

    url.searchParams.append("ApiKey", process.env.VEHICLE_API_KEY);
    url.searchParams.append("PackageName", "MotHistoryDetails");
    url.searchParams.append("Vrm", key);

    const response = await fetch(url);
    const data = await response.json();

    // ❌ HANDLE ERRORS
    if (!response.ok || data?.ResponseInformation?.IsSuccessStatusCode === false) {
      return res.status(400).json({
        error:
          data?.ResponseInformation?.StatusMessage ||
          "Vehicle API request failed",
      });
    }

    const vehicle = data?.Results?.MotHistoryDetails;

    if (!vehicle) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    // ✅ FORMAT RESPONSE (your SaaS output)
    const result = {
      registration: vehicle.Vrm,
      make: vehicle.Make || "Unknown",
      model: vehicle.Model || "Unknown",
      fuel: vehicle.FuelType || "Unknown",
      colour: vehicle.Colour || "Unknown",

      motDue: vehicle.MotDueDate || "Not available",
      lastTest: vehicle.LatestTestDate || "Not available",

      mileage:
        vehicle.MotTestDetailsList?.[0]?.OdometerReading || "Not available",

      motHistory: vehicle.MotTestDetailsList || [],
    };

    // ✅ SAVE TO FIREBASE (UNCHANGED)
    await db.collection("history").add({
      userId,
      registration: key,
      make: result.make,
      model: result.model,
      fuel: result.fuel,
      colour: result.colour,
      motDue: result.motDue,
      lastTest: result.lastTest,
      createdAt: new Date(),
    });

    // ✅ CACHE SAVE
    setCache(key, result);

    return res.status(200).json(result);
  } catch (err) {
    console.error("🔥 API ERROR:", err);

    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}