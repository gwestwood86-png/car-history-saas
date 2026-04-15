import { db } from "../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = await getAuth().verifyIdToken(token);

    const snapshot = await db
      .collection("history")
      .where("userId", "==", decoded.uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const history = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json(history);

  } catch (err) {
    console.error("🔥 HISTORY ERROR:", err);

    return res.status(500).json({
      error: err.message || "History fetch failed",
    });
  }
}