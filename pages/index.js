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
  dark: "#0a0a0a",
  card: "#141414",
};

export default function CarHistorySaaS() {
  const [reg, setReg] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const [user, setUser] = useState({ loggedIn: false, credits: 0 });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(userRef, {
            credits: 0,
            email: firebaseUser.email,
          });

          setUser({ loggedIn: true, credits: 0, uid: firebaseUser.uid });
        } else {
          const data = snap.data();
          setUser({
            loggedIn: true,
            credits: data.credits,
            uid: firebaseUser.uid,
          });
        }

        await loadHistory();
      } else {
        setUser({ loggedIn: false, credits: 0 });
        setHistory([]); // reset history on logout
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

  try {
    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId: user.uid }),
    });

    // 👇 DEBUG: get raw response
    const text = await res.text();
    console.log("Checkout response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      alert("Server returned invalid response");
      return;
    }

    if (!res.ok) {
      alert(data.error || "Checkout failed");
      return;
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("No checkout URL returned");
    }

  } catch (err) {
    console.error("Payment error:", err);
    alert("Payment error");
  }
};

  const handleCheck = async () => {
    if (!reg || reg.length > 10) return alert("Invalid registration");
    if (!user.loggedIn) return alert("Please login");

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

      if (!res.ok) throw new Error(data.error || "Request failed");

      setResult(data);
      await loadHistory();
    } catch (err) {
      console.error("CHECK ERROR:", err);
      setResult({ error: err.message });
    }

    setLoading(false);
  };

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

      if (!res.ok) {
        console.error("HISTORY ERROR:", data);
        setHistory([]);
        return;
      }

      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("HISTORY FETCH ERROR:", err);
      setHistory([]);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundImage:
          "url('https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1500&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white",
      }}
    >
      <div style={{ background: "rgba(0,0,0,0.85)", minHeight: "100vh", padding: 20 }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ color: theme.red }}>1 CAR CHECK</h1>
          <p style={{ opacity: 0.8 }}>
            UK Vehicle Intelligence • DVLA Powered
          </p>
        </div>

        {/* CARD */}
        <div
          style={{
            maxWidth: 600,
            margin: "auto",
            background: theme.card,
            padding: 20,
            borderRadius: 12,
            border: `1px solid ${theme.red}`,
          }}
        >
          {!user.loggedIn ? (
            <>
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={input}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={input}
              />

              <button style={btn} onClick={handleLogin}>
                Login
              </button>
              <button style={btn} onClick={handleSignup}>
                Sign Up
              </button>
            </>
          ) : (
            <p>🔥 Credits: {user.credits}</p>
          )}

          <hr />

          <h3>Buy Credits</h3>
          <button style={btn} onClick={handleBuyCredits}>
            £4.99 for 5 checks
          </button>

          <hr />

          <h3>Check Vehicle</h3>

          <input
            placeholder="AB12CDE"
            value={reg}
            onChange={(e) => setReg(e.target.value.toUpperCase())}
            style={input}
          />

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleCheck} style={btn} disabled={loading}>
              {loading ? "Checking..." : "Search"}
            </button>

            <button
              onClick={loadHistory}
              style={{ ...btn, background: "#333" }}
              disabled={loading}
            >
              📜 History
            </button>
          </div>

          {/* RESULT */}
          {result && (
            <div style={card}>
              {result.error ? (
                <p style={{ color: "red" }}>{result.error}</p>
              ) : (
                <>
                  <p>🚗 {result.make}</p>
                  <p>📅 {result.year}</p>
                  <p>⛽ {result.fuel}</p>
                  <p>🎨 {result.colour}</p>
                  <p>🧾 MOT: {result.motStatus}</p>
                  <p>💷 Tax: {result.taxStatus}</p>
                </>
              )}
            </div>
          )}

          {/* HISTORY */}
          {history.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ color: theme.red }}>📜 Recent Searches</h3>

              {history.map((item, i) => (
                <div key={i} style={card}>
                  <p><b>{item.registration}</b></p>
                  <p>{item.make} • {item.year}</p>
                  <p>{item.fuel}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 20, opacity: 0.5 }}>
          © {new Date().getFullYear()} 1 Car Check
        </div>
      </div>
    </div>
  );
}

/* styles */
const btn = {
  padding: "10px",
  background: "#e10600",
  border: "none",
  color: "white",
  borderRadius: 6,
  cursor: "pointer",
  marginTop: 10,
  flex: 1,
};

const input = {
  width: "100%",
  padding: 10,
  marginTop: 10,
  background: "#111",
  color: "white",
  border: "1px solid #333",
  borderRadius: 6,
};

const card = {
  marginTop: 10,
  padding: 10,
  background: "#111",
  borderLeft: "4px solid #e10600",
  borderRadius: 6,
};