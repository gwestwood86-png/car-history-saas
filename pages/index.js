import { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

const theme = {
  red: "#e10600",
  card: "#141414",
};

export default function CarHistorySaaS() {
  const [reg, setReg] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ loggedIn: false, credits: 0 });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ✅ FIX: history state in correct place
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          await setDoc(userRef, {
            credits: 0,
            email: firebaseUser.email,
          });

          setUser({
            loggedIn: true,
            credits: 0,
            uid: firebaseUser.uid,
          });
        } else {
          const data = userSnap.data();
          setUser({
            loggedIn: true,
            credits: data.credits,
            uid: firebaseUser.uid,
          });

          await refreshCredits();
          await loadHistory(); // ✅ now works
        }
      } else {
        setUser({ loggedIn: false, credits: 0 });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleBuyCredits = async () => {
    if (!user.loggedIn) return alert("Login required");

    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.uid }),
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  const handleCheck = async () => {
    if (!reg || reg.length > 10) return alert("Invalid reg");
    if (!user.loggedIn) return alert("Login first");

    setLoading(true);
    setResult(null);

    try {
      const token = await auth.currentUser.getIdToken();

      const res = await fetch("/api/check-car", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          registration: reg.toUpperCase().trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setResult(data);
      await loadHistory(); // ✅ refresh after search
    } catch (err) {
      setResult({ error: err.message });
    }

    setLoading(false);
  };

  const refreshCredits = async () => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      setUser((prev) => ({
        ...prev,
        credits: snap.data().credits,
      }));
    }
  };

  // ✅ FIX: defined OUTSIDE properly
  const loadHistory = async () => {
    if (!auth.currentUser) return;

    try {
      const token = await auth.currentUser.getIdToken();

      const res = await fetch("/api/history", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 20, color: "white", background: "#000", minHeight: "100vh" }}>
      <h1 style={{ color: theme.red }}>1 CAR CHECK</h1>

      {!user.loggedIn ? (
        <>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleSignup}>Sign Up</button>
        </>
      ) : (
        <p>Credits: {user.credits}</p>
      )}

      <hr />

      <input
        value={reg}
        onChange={(e) => setReg(e.target.value)}
        placeholder="Enter reg"
      />

      <button onClick={handleCheck}>
        {loading ? "Checking..." : "Search"}
      </button>

      <button onClick={loadHistory}>📜 Load History</button>

      {result && (
        <div>
          <p>{result.make}</p>
          <p>{result.year}</p>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <h3>History</h3>
          {history.map((h, i) => (
            <div key={i}>
              {h.registration} - {h.make}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}