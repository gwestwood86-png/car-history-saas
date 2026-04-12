import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { userId } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: "5 Vehicle Checks",
            },
            unit_amount: 499,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
		success_url: "https://car-history-saas.vercel.app",
		cancel_url: "https://car-history-saas.vercel.app",
      metadata: {
        userId: userId,
      },
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
}
const session = await stripe.checkout.sessions.create({
  payment_method_types: ["card"],
  mode: "payment",
  line_items: [
    {
      price_data: {
        currency: "gbp",
        product_data: {
          name: "Car History Checks",
        },
        unit_amount: 499,
      },
      quantity: 1,
    },
  ],
  metadata: {
    userId: req.body.userId,
    credits: 5,
  },
  success_url: `${YOUR_URL}/success`,
  cancel_url: `${YOUR_URL}/cancel`,
});