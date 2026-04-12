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

    // 🚗 DVLA API
    const response = await fetch(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.DVLA_API_KEY,
        },
        body: JSON.stringify({
          registrationNumber: key,
        }),
      }
    );

    // ❌ NOT FOUND
    if (response.status === 404) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (!response.ok) {
      throw new Error("DVLA API request failed");
    }

    const data = await response.json();

    // ✅ FORMAT RESPONSE
const result = {
  make: data.make || "Unknown",
  year: data.yearOfManufacture || "Unknown",
  fuel: data.fuelType || "Unknown",
  colour: data.colour || "Unknown",

  // ✅ safer handling
  motStatus: data.motStatus ?? "Not available",
  taxStatus: data.taxStatus ?? "Not available",
};

    // ✅ SAVE TO FIREBASE (FIXED — SINGLE COLLECTION)
    await db.collection("history").add({
      userId,
      registration: key,
      make: result.make,
      year: result.year,
      fuel: result.fuel,
      colour: result.colour,
      motStatus: result.motStatus,
      taxStatus: result.taxStatus,
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