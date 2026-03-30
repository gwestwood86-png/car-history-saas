export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { registration } = req.body;

  try {
    const response = await fetch(
      "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.DVLA_API_KEY,
        },
        body: JSON.stringify({
          registrationNumber: registration,
        }),
      }
    );

    const data = await response.json();

    // Format response for frontend
    return res.status(200).json({
      make: data.make,
      year: data.yearOfManufacture,
      fuel: data.fuelType,
      colour: data.colour,
      motStatus: data.motStatus,
      taxStatus: data.taxStatus,
    });
  } catch (error) {
    return res.status(500).json({ error: "Something went wrong" });
  }
}