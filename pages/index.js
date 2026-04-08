import { useState, useEffect } from "react";
import { auth } from "../lib/firebase";
import { db } from "../lib/firebase";
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
        // New user → create with 0 credits
        await setDoc(userRef, {
          credits: 0,
          email: firebaseUser.email,
        });
        setUser({ loggedIn: true, credits: 0, uid: firebaseUser.uid });
      } else {
        // Existing user → load credits
        const data = userSnap.data();
        setUser({
          loggedIn: true,
          credits: data.credits,
          uid: firebaseUser.uid,
        });
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

  const handleBuyCredits = async () => {
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
  };
  
  const addCredits = async () => {
  if (!user.uid) return;

  try {
    const userRef = doc(db, "users", user.uid);

    await updateDoc(userRef, {
      credits: user.credits + 5,
    });

    setUser((prev) => ({
      ...prev,
      credits: prev.credits + 5,
    }));
  } catch (err) {
    alert("Error adding credits");
  }
};

  const handleCheck = async () => {
    if (!reg) return;

    if (!user.loggedIn) {
      alert("Please log in first");
      return;
    }

    if (user.credits <= 0) {
      alert("You need credits to run a check");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/check-car", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ registration: reg }),
      });

      const data = await res.json();
      setResult(data);

      // deduct credit (temporary)
      const userRef = doc(db, "users", user.uid);

await updateDoc(userRef, {
  credits: user.credits - 1,
});

setUser((prev) => ({ ...prev, credits: prev.credits - 1 }));
    } catch (err) {
      setResult({ error: "Something went wrong" });
    }

    setLoading(false);
  };

  return (
    <div style={{ fontFamily: "Arial", padding: "20px", maxWidth: "500px", margin: "auto" }}>
      <h1>Car History Check</h1>
      <p>Instant UK vehicle data powered by DVLA</p>

      {/* 🔐 Login UI */}
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

      <h2>Buy Credits</h2>
<p>£4.99 for 5 checks</p>
<button onClick={handleBuyCredits}>Buy Now</button>

<br /><br />

      <hr />

      <input
        placeholder="Enter registration (e.g. AB12 CDE)"
        value={reg}
        onChange={(e) => setReg(e.target.value)}
      />

      <br /><br />

      <button onClick={handleCheck}>
        {loading ? "Checking..." : "Check Vehicle"}
      </button>

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
