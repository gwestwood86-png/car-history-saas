import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "5 Vehicle Checks",
            },
            unit_amount: 499, // £4.99
          },
          quantity: 1,
        },
      ],
          success_url: `${process.env.APP_URL}`,
          cancel_url: `${process.env.APP_URL}`,
      metadata: {
        userId: userId,
        credits: 5,
      },
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error("STRIPE ERROR:", err);

    return res.status(500).json({
      error: err.message || "Something went wrong",
    });
  }
}