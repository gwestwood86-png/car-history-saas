import { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

const theme = {
  bg: "#0a0a0a",
  red: "#e10600",
  card: "#141414",
  text: "#ffffff",
};

export default function CarHistorySaaS() {
  const [reg, setReg] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ loggedIn: false, credits: 0 });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await res.json();
      window.location.href = data.url;
    } catch {
      alert("Payment error");
    }
  };

  const handleCheck = async () => {
    if (!reg || reg.length > 10) {
      alert("Enter a valid registration");
      return;
    }

    if (!user.loggedIn) {
      alert("Please log in first");
      return;
    }

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
    } catch (err) {
      setResult({ error: err.message });
    }

    setLoading(false);
  };

  const refreshCredits = async () => {
    if (!auth.currentUser) return;

    const userRef = doc(db, "users", auth.currentUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      setUser((prev) => ({
        ...prev,
        credits: userSnap.data().credits,
      }));
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        color: "white",
        fontFamily: "Arial",
        backgroundImage:
          "url('https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1500&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div
        style={{
          minHeight: "100vh",
          background: "rgba(0,0,0,0.85)",
          padding: "20px",
        }}
      >
        {/* BRAND */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ color: theme.red, fontSize: "40px", margin: 0 }}>
            1 CAR CHECK
          </h1>
          <p style={{ opacity: 0.8 }}>
            UK Vehicle Intelligence • DVLA Data • Built for Car Enthusiasts
          </p>
        </div>

        <div style={{ marginBottom: 15 }}>
  <a href="/history" style={{ color: "#e10600", fontWeight: "bold" }}>
    📜 View History
  </a>
</div>

        {/* CARD */}
        <div
          style={{
            maxWidth: "600px",
            margin: "auto",
            background: theme.card,
            padding: "20px",
            borderRadius: "12px",
            border: `1px solid ${theme.red}`,
            boxShadow: "0 0 25px rgba(225, 6, 0, 0.3)",
          }}
        >
          {/* AUTH */}
          {!user.loggedIn ? (
            <div>
              <h2>Login</h2>

              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <br />
              <br />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />

              <br />
              <br />

              <button style={btnStyle} onClick={handleLogin}>
                Login
              </button>

              <button style={btnStyle} onClick={handleSignup}>
                Sign Up
              </button>
            </div>
          ) : (
            <p>🔥 Credits: {user.credits}</p>
          )}

          <hr />

          {/* PAYMENT */}
          <h2>Buy Credits</h2>
          <p>£4.99 for 5 checks</p>
          <button style={btnStyle} onClick={handleBuyCredits}>
            Buy Now
          </button>

          <hr />

          {/* SEARCH */}
          <h2>Check Vehicle</h2>

          <input
            placeholder="AB12 CDE"
            value={reg}
            onChange={(e) => setReg(e.target.value.toUpperCase())}
            style={inputStyle}
          />

          <br />
          <br />

          <button style={btnStyle} onClick={handleCheck} disabled={loading}>
            {loading ? "Checking..." : "Search Vehicle"}
          </button>

          {/* RESULT */}
          {result && (
            <div style={resultStyle}>
              {result.error ? (
                <p style={{ color: "red" }}>{result.error}</p>
              ) : (
                <>
                  <p>🚗 Make: {result.make}</p>
                  <p>📅 Year: {result.year}</p>
                  <p>⛽ Fuel: {result.fuel}</p>
                  <p>🎨 Colour: {result.colour}</p>
                  <p>🧾 MOT: {result.motStatus}</p>
                  <p>💷 Tax: {result.taxStatus}</p>
                </>
              )}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 30, opacity: 0.6 }}>
          © {new Date().getFullYear()} 1 Car Check • Performance Vehicle Data
        </div>
      </div>
    </div>
  );
}

/* styles */
const btnStyle = {
  padding: "10px 15px",
  background: "#e10600",
  color: "white",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
  marginRight: "10px",
  fontWeight: "bold",
};

const inputStyle = {
  padding: "10px",
  width: "96%",
  marginTop: "10px",
  borderRadius: "6px",
  border: "1px solid #333",
  background: "#111",
  color: "white",
};

const resultStyle = {
  marginTop: "20px",
  padding: "15px",
  background: "#111",
  borderRadius: "10px",
  borderLeft: "4px solid #e10600",
};