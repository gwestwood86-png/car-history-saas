import { isValidUKPlate } from "../../utils/validatePlate";
import { getCache, setCache } from "../../utils/cache";
import { db } from "../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

if (!token) {
  return res.status(401).json({
    error: "Unauthorized - no token provided",
  });
}

const decoded = await getAuth().verifyIdToken(token);
const userId = decoded.uid;

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { registration } = req.body;

    // 1. Validate input
    if (!isValidUKPlate(registration)) {
      return res.status(400).json({
        error: "Invalid UK registration number",
      });
    }

    const key = registration.replace(/\s/g, "").toUpperCase();

    // 2. Check cache first
    const cached = getCache(key);
    if (cached) {
      return res.status(200).json(cached);
    }

    // 3. Call DVLA
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

    // 4. Handle errors
    if (response.status === 404) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    if (!response.ok) {
      throw new Error("DVLA API request failed");
    }

    const data = await response.json();

    // 5. Format response
    const result = {
      make: data.make || "Unknown",
      year: data.yearOfManufacture || "Unknown",
      fuel: data.fuelType || "Unknown",
      colour: data.colour || "Unknown",
      motStatus: data.motStatus || "Unknown",
      taxStatus: data.taxStatus || "Unknown",
    };

    await db.collection("History").add({
  userId,
  registration: registration.toUpperCase(),
  make: data.make,
  year: data.yearOfManufacture,
  fuel: data.fuelType,
  colour: data.colour,
  motStatus: data.motStatus,
  taxStatus: data.taxStatus,
  createdAt: new Date(),
});

    // save to Firebase
await db.collection("carHistory").add({
  userId,
  registration,
  make: data.make,
  year: data.yearOfManufacture,
  fuel: data.fuelType,
  colour: data.colour,
  motStatus: data.motStatus,
  taxStatus: data.taxStatus,
  createdAt: new Date(),
});

    // 6. Save cache
    setCache(key, result);

    return res.status(200).json(result);

  } catch (err) {
    console.error("API ERROR:", err);

    return res.status(500).json({
      error: err.message || "Server error",
    });
  }
}