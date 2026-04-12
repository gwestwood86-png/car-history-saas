import { useEffect, useState } from "react";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      setUser(firebaseUser);

      try {
        const q = query(
          collection(db, "carHistory"),
          where("userId", "==", firebaseUser.uid)
        );

        const snapshot = await getDocs(q);

        const data = snapshot.docs.map((doc) => doc.data());

        setHistory(data);
      } catch (err) {
        console.error(err);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!user) {
    return (
      <div style={{ padding: 20, fontFamily: "Arial" }}>
        <h1>📜 History</h1>
        <p>Please log in to view your history.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, fontFamily: "Arial", maxWidth: 700, margin: "auto" }}>
      <h1>📜 Your Car Check History</h1>

      {loading && <p>Loading...</p>}

      {!loading && history.length === 0 && <p>No history found yet.</p>}

      {history.map((item, index) => (
        <div
          key={index}
          style={{
            background: "#111",
            color: "white",
            padding: 15,
            marginBottom: 10,
            borderRadius: 10,
            borderLeft: "4px solid #e10600",
          }}
        >
          <p><b>Reg:</b> {item.registration}</p>
          <p><b>Make:</b> {item.make}</p>
          <p><b>Year:</b> {item.year}</p>
          <p><b>Fuel:</b> {item.fuel}</p>
          <p><b>Colour:</b> {item.colour}</p>
        </div>
      ))}
    </div>
  );
}