import express from "express";
import bcrypt from "bcrypt";
import bodyParser from "body-parser";
import cors from "cors";
import User from "./model.js";
import session from "express-session";
import jwt from 'jsonwebtoken';
import { config as configDotenv } from 'dotenv';

configDotenv();

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV, // true if in production
    httpOnly: true,
    maxAge: 3600000, // 1 hour
  }
}));

const JWT_SECRET = 'process.env.JWT_SECRET';

// Handle POST requests for /signup
app.post('/signup', async (req, res) => {
  const { email, firstname, lastname, password, confirmpassword } = req.body;

  console.log("Received signup request with body:", req.body);

  try {

    // Validate that passwords match
    if (password !== confirmpassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      email,
      firstname,
      lastname,
      password: hashedPassword
    });

    await newUser.save();
    res.status(200).json({ message: 'User created successfully' });
  } catch (err) {
    console.error("Error creating user:", err);

    // Handle duplicate email error
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Error creating user' });
    }
  }
});

// Handle POST requests for /signin
app.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const name = user.firstname;

    // Compare the hashed password
    const validPassword = await bcrypt.compare(password, user.password);

    if (validPassword) {
      // Create a JWT token
      const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

      // Respond with the token
      res.json({ token, name });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  } catch (err) {
    console.error("Error signing in:", err);
    res.status(500).json({ error: 'Error signing in' });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
