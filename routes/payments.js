const express = require("express");
const Razorpay = require("razorpay");
const router = express.Router();
const pool = require("../db");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

router.post("/create", async (req, res) => {
  const { task_id } = req.body;
  const user_id = req.user.user_id;

  const [task] = await pool.query(
    "SELECT reward, helper_id FROM tasks WHERE task_id=?",
    [task_id]
  );

  if (!task.length) return res.status(404).json({ message: "Task not found" });

  const amount = task[0].reward * 100; // paise
  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: "task_" + task_id
  });

  res.json({
    order_id: order.id,
    amount: order.amount,
    key: process.env.RAZORPAY_KEY_ID
  });
});

module.exports = router;
