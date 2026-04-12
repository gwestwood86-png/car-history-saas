import { db } from "../../lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req, res) {
  try {
    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = await getAuth().verifyIdToken(token);

    const snapshot = await db
      .collection("history")
      .where("userId", "==", decoded.uid)
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();

    const history = snapshot.docs.map(doc => doc.data());

    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}