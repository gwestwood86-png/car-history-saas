import { isValidUKPlate } from "../../utils/validatePlate";
import { getCache, setCache } from "../../utils/cache";
import { db } from "../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req, res) {
  try {
    // =========================
    // 🔐 AUTH
    // =========================
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const userId = decoded.uid;

    // =========================
    // METHOD CHECK
    // =========================
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { registration } = req.body;

    if (!isValidUKPlate(registration)) {
      return res.status(400).json({ error: "Invalid registration" });
    }

    const key = registration.replace(/\s/g, "").toUpperCase();

    // =========================
    // CACHE
    // =========================
    const cached = getCache(key);
    if (cached) {
      return res.status(200).json(cached);
    }

    // =========================================================
    // 1️⃣ VEHICLE DATA GLOBAL (PRIMARY SOURCE)
    // =========================================================
    let vehicle = null;

    try {
      const url = new URL("https://uk.api.vehicledataglobal.com/r2/lookup");

      url.searchParams.append("ApiKey", process.env.VEHICLE_API_KEY);
      url.searchParams.append("PackageName", "MotHistoryDetails");
      url.searchParams.append("Vrm", key);

      const vgResponse = await fetch(url);
      const vgData = await vgResponse.json();

      const status = vgData?.ResponseInformation?.StatusCode;

      if (vgResponse.ok && status === 0 && vgData?.Results?.MotHistoryDetails) {
        vehicle = vgData.Results.MotHistoryDetails;
      } else {
        console.log("⚠️ Vehicle Data failed, fallback to DVLA");
      }
    } catch (err) {
      console.log("⚠️ Vehicle Data exception:", err.message);
    }

    // =========================================================
    // 2️⃣ DVLA FALLBACK
    // =========================================================
    if (!vehicle) {
      const dvlaResponse = await fetch(
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

      if (!dvlaResponse.ok) {
        return res.status(404).json({
          error: "Vehicle not found in both APIs",
        });
      }

      const dvla = await dvlaResponse.json();

      vehicle = {
        Vrm: key,
        Make: dvla.make,
        Model: "Unknown",
        FuelType: dvla.fuelType,
        Colour: dvla.colour,
        MotDueDate: null,
        LatestTestDate: null,
        MotTestDetailsList: [],
      };
    }

    // =========================================================
    // 3️⃣ FORMAT OUTPUT (UNIFIED SaaS RESPONSE)
    // =========================================================
    const result = {
      registration: vehicle.Vrm,
      make: vehicle.Make || "Unknown",
      model: vehicle.Model || "Unknown",
      fuel: vehicle.FuelType || "Unknown",
      colour: vehicle.Colour || "Unknown",
      year: vehicle.FirstUsedDate
        ? new Date(vehicle.FirstUsedDate).getFullYear()
        : "Unknown",
      motDue: vehicle.MotDueDate || "Not available",
      lastTest: vehicle.LatestTestDate || "Not available",

      mileage:
        vehicle.MotTestDetailsList?.[0]?.OdometerReading || "Not available",

      motHistory: vehicle.MotTestDetailsList || [],
    };

    // =========================================================
    // 4️⃣ FIRESTORE SAVE
    // =========================================================
    await db.collection("history").add({
      userId,
      registration: key,
      make: result.make,
      model: result.model,
      fuel: result.fuel,
      colour: result.colour,
      createdAt: new Date(),
    });

    // =========================================================
    // 5️⃣ CACHE
    // =========================================================
    setCache(key, result);

    return res.status(200).json(result);
  } catch (err) {
    console.error("🔥 API ERROR:", err);

    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}