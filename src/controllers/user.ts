import * as async from "async";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import * as passport from "passport";
import { default as User, UserModel } from "../models/User";
import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";
import { WriteError } from "mongodb";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

const request = require("express-validator");
dotenv.config({ path: ".env" });

/**
 * POST /login
 * Sign in using email and password.
 */
export let postLogin = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("password", "Password cannot be blank").notEmpty();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    return res.json({ err: errors, user: "", token: "" });
  }

  passport.authenticate("local", (err: Error, user: UserModel, info: LocalStrategyInfo) => {
    if (err) {
      return res.json({ err: err, user: "", token: "" });
    }
    if (!user) {
      return res.json({ err: info.message, user: "", token: "" });
    }
    const token = jwt.sign({ user: user }, process.env.SECRET_TOKEN);
    req.logIn(user, (err) => {
      if (err) {
        return res.json({ err: err, user: {}, token: "" });
      }
      res.json({ user: user, err: "", token: token });
    });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
export let logout = (req: Request, res: Response) => {
  req.logout();
  res.json({ user: "", err: "non" });
};

/**
 * POST /signup
 * Create a new local account.
 */
export let postSignup = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Email is not valid").isEmail();
  req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
  // req.assert("confirmationPassword", "Passwords do not match").equals(req.body.password);
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    return res.json({ err: errors, user: "", token: "" });
  }
  if (req.body.password !== req.body.confirmation_password) {
    return res.json({ err: "Passwords do not match", user: "", token: "" });
  }

  const user = new User({
    email: req.body.email,
    password: req.body.password
  });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) {
      return res.json({ err: err, user: "", token: "" });
    }
    if (existingUser) {
      return res.json({ user: "", err: "Account with that email address already exists.", token: "" });
    }
    user.save((err) => {
      if (err) {
        return res.json({ err: err, user: "", token: "" });
      }
      const token = jwt.sign({ user: user }, process.env.SECRET_TOKEN);
      req.logIn(user, (err) => {
        if (err) {
          return res.json({ err: err, user: "", token: "" });
        }
        return res.json({ err: "", user: user, token: token });
      });
    });
  });
};

export let getUsers = (req: Request, res: Response) => {
  User.find({}, (err, users) => {
    if (err) {
      return res.json({ err: err, user: [], token: "" });
    }
    return res.json({ err: "", user: users, token: "" });
  });
};
export let getUser = (req: Request, res: Response) => {
  if (req.params.id == 0) {
    return res.json({ err: "User with id '0' don't exist!", user: "", token: "" });
  }
  User.findOne({ _id: req.params.id }, (err, user) => {
    if (typeof user === "undefined") {
      return res.json({ err: "User is undefined!", user: "", token: "" });
    }
    if (err) {
      return res.json({ err: err, user: "", token: "" });
    }
    return res.json({ err: "", user: user, token: "" });
  });
};
