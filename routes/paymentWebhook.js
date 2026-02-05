const crypto = require("crypto");
const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/razorpay", express.raw({ type: "*/*" }), async (req, res) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  if (signature !== req.headers["x-razorpay-signature"]) {
    return res.status(400).send("Invalid signature");
  }

  const data = JSON.parse(req.body);
  const taskId = data.payload.payment.entity.notes.task_id;
  const total = data.payload.payment.entity.amount / 100;

  const platformFee = (total * process.env.PLATFORM_FEE_PERCENT) / 100;
  const helperAmount = total - platformFee;

  const [task] = await pool.query(
    "SELECT user_id, helper_id FROM tasks WHERE task_id=?",
    [taskId]
  );

  await pool.query(
    `INSERT INTO payments
     (task_id, customer_id, helper_id, total_amount, platform_fee, helper_amount, payment_status)
     VALUES (?,?,?,?,?,?,?)`,
    [taskId, task[0].user_id, task[0].helper_id, total, platformFee, helperAmount, "SUCCESS"]
  );

  // Notifications (existing system)
  await pool.query(
    "INSERT INTO notifications (user_id,title,message) VALUES (?,?,?)",
    [task[0].user_id, "Payment Successful", `₹${total} paid successfully`]
  );

  await pool.query(
    "INSERT INTO notifications (user_id,title,message) VALUES (?,?,?)",
    [task[0].helper_id, "Payment Received", `You earned ₹${helperAmount}`]
  );

  res.json({ status: "ok" });
});

module.exports = router;
