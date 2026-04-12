import { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

export default function CarHistorySaaS() {
  const [reg, setReg] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ loggedIn: false, credits: 0 });

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 🔐 Track logged in user
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

          setUser({ loggedIn: true, credits: 0, uid: firebaseUser.uid });
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

  // 🔐 Signup
  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  };

  // 🔐 Login
  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert(err.message);
    }
  };

  // 💳 Buy credits (Stripe)
  const handleBuyCredits = async () => {
    if (!user.loggedIn) {
      alert("Login required");
      return;
    }

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      });

      const data = await res.json();
      window.location.href = data.url;
    } catch (err) {
      alert("Payment error");
    }
  };

    // 🚗 Check vehicle
  const handleCheck = async () => {
    if (!reg || reg.length > 10) {
      alert("Enter a valid registration");
      return;
    }

    if (!user.loggedIn) {
      alert("Please log in first");
      return;
    }

    if (!auth.currentUser) {
      alert("User not ready");
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

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResult(data);
    } catch (err) {
      setResult({ error: err.message || "Something went wrong" });
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
    <div style={{ fontFamily: "Arial", padding: "20px", maxWidth: "500px", margin: "auto" }}>
      <h1>Car History Check</h1>
      <p>Instant UK vehicle data powered by DVLA</p>

      {/* 🔐 Auth */}
      {!user.loggedIn ? (
        <div>
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <br /><br />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br /><br />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleSignup}>Sign Up</button>
        </div>
      ) : (
        <p>Credits: {user.credits}</p>
      )}

      <hr />

      {/* 💳 Payments */}
      <h2>Buy Credits</h2>
      <p>£4.99 for 5 checks</p>
      <button onClick={handleBuyCredits}>Buy Now</button>

      
      {/* 🚗 Input */}
      <input
        placeholder="Enter registration (e.g. AB12 CDE)"
        value={reg}
        onChange={(e) => setReg(e.target.value.toUpperCase())}
      />

      <br /><br />

      <button onClick={handleCheck} disabled={loading}>
        {loading ? "Checking..." : "Check Vehicle"}
      </button>

      {/* 📊 Result */}
      {result && (
        <div style={{ marginTop: "20px" }}>
          {result.error ? (
            <p style={{ color: "red" }}>{result.error}</p>
          ) : (
            <div>
              <p><strong>Make:</strong> {result.make}</p>
              <p><strong>Year:</strong> {result.year}</p>
              <p><strong>Fuel:</strong> {result.fuel}</p>
              <p><strong>Colour:</strong> {result.colour}</p>
              <p><strong>MOT Status:</strong> {result.motStatus}</p>
              <p><strong>Tax Status:</strong> {result.taxStatus}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}