import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import cors from "cors";
import { config as configDotenv } from "dotenv";
import express from "express";
import session from "express-session";
import jwt from "jsonwebtoken";
import User from "./model.js";

configDotenv();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV, // true if in production
      httpOnly: true,
      maxAge: 3600000, // 1 hour
    },
  })
);

const JWT_SECRET = "process.env.JWT_SECRET";

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

// Handle POST requests for /signup
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      email,
      password: hashedPassword,
    });

    const newuser = await newUser.save();
    res.status(200).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Error creating user:", err);

    res.status(500).json({ error: "Error creating user" });
  }
});

// Handle POST requests for /signin
app.post("/signin", async (req, res) => {
  const { email, password, remember } = await req.body;
  try {
    const user = await User.findOne({ email });
    console.log("🚀 ~ app.post ~ user:", user);

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    // Compare the hashed password
    const validPassword = await bcrypt.compare(password, user.password);

    if (validPassword) {
      const token = await jwt.sign({ userId: user._id }, JWT_SECRET, {
        expiresIn: "1h",
      });
      // Respond with the token
      res.json({ token, user,remember });
    } else {
      res.status(401).json({ error: "Invalid email or password" });
    }
  } catch (err) {
    console.error("Error signing in:", err);
    res.status(500).json({ error: "Error signing in" });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
