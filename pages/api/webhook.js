import Stripe from "stripe";
import { buffer } from "micro";
import { db } from "../../lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    const buf = await buffer(req);

    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata.userId;

    if (userId) {
      try {
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const currentCredits = userSnap.data().credits || 0;

          await updateDoc(userRef, {
            credits: currentCredits + 5,
          });
        }
      } catch (err) {
        console.error("Error updating credits:", err);
      }
    }
  }

  res.status(200).json({ received: true });
}