const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Feedback = require("./models/Feedback");
const path = require("path");
require("dotenv").config();

const app = express();

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.error(err));

// Middlewares
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
}));
app.use(flash());

// Passport Config
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(async (username, password, done) => {
  const user = await User.findOne({ username });
  if (!user) return done(null, false, { message: "User not found" });
  const isMatch = await bcrypt.compare(password, user.password);
  return isMatch ? done(null, user) : done(null, false, { message: "Invalid credentials" });
}));
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => User.findById(id).then(user => done(null, user)));

// Global variables
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

// Routes
app.get("/", (req, res) => res.render("home"));

app.get("/register", (req, res) => res.render("register"));
app.post("/register", async (req, res) => {
  const { username, password, email } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      req.flash("error", "Username already exists");
      return res.render("register", { old: { username, email } });
    }

    const hashedPwd = await bcrypt.hash(password, 12);
    const user = new User({ username, password: hashedPwd, email });
    await user.save();

    req.login(user, err => {
      if (err) return next(err);
      res.redirect("/feedback");
    });

  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong during registration");
    res.render("register", { old: { username, email } });
  }
});


app.get("/login", (req, res) => res.render("login"));
app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/feedback",
    failureRedirect: "/login",
    failureFlash: true,
  })
);

app.get("/logout", (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash("success", "Logged out successfully");
    res.redirect("/");
  });
});

function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.flash("error", "Please login first");
  res.redirect("/login");
}

app.get("/feedback", async (req, res) => {
  const feedbacks = await Feedback.find().populate("user");
  res.render("feedback", { feedbacks });
});

app.post("/feedback", isLoggedIn, async (req, res) => {
  const newFeedback = new Feedback({
    user: req.user._id,
    message: req.body.message
  });
  await newFeedback.save();
  res.redirect("/feedback");
});

app.post("/feedback/:id/like", async (req, res) => {
  try {
    await Feedback.findByIdAndUpdate(req.params.id, { $inc: { likes: 1 } });
    res.redirect("/feedback");
  } catch (err) {
    req.flash("error", "Could not like feedback");
    res.redirect("/feedback");
  }
});

app.post("/feedback/:id/dislike", async (req, res) => {
  try {
    await Feedback.findByIdAndUpdate(req.params.id, { $inc: { dislikes: 1 } });
    res.redirect("/feedback");
  } catch (err) {
    req.flash("error", "Could not dislike feedback");
    res.redirect("/feedback");
  }
});


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
