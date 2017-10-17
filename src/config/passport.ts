import * as passport from "passport";
import * as request from "request";
import * as passportLocal from "passport-local";
import * as passportFacebook from "passport-facebook";
import * as _ from "lodash";
import * as jwt from "jsonwebtoken";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// import { User, UserType } from '../models/User';
import { default as User } from "../models/User";
import { Request, Response, NextFunction } from "express";

const LocalStrategy = passportLocal.Strategy;
const FacebookStrategy = passportFacebook.Strategy;

passport.serializeUser<any, any>((user, done) => {
  done(undefined, user.id);
});

passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});


/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
  User.findOne({ email: email.toLowerCase() }, (err, user: any) => {
    if (err) { return done(err); }
    if (!user) {
      return done(undefined, false, { message: `Email ${email} not found.` });
    }
    user.comparePassword(password, (err: Error, isMatch: boolean) => {
      if (err) { return done(err); }
      if (isMatch) {
        return done(undefined, user);
      }
      return done(undefined, false, { message: "Invalid email or password." });
    });
  });
}));

/**
 * Sign in with Facebook.
 */
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_ID,
  clientSecret: process.env.FACEBOOK_SECRET,
  callbackURL: "/auth/facebook/callback",
  profileFields: ["id", "last_name", "photos", "email", "first_name"],
  passReqToCallback: true
}, (req: any, accessToken, refreshToken, profile, done) => {

  const email = profile.emails[0].value;
  const cond = { facebook : profile.id };

  User.findOne(cond, function(err: any, result: any){
    if (!result) {
      User.findOne({ email: email }, function(error: any, res: any){
        if (res) {
          res.firstname = profile.name.givenName;
          res.lastname = profile.name.familyName;
          res.image = `https://graph.facebook.com/${profile.id}/picture?type=large`;
          res.gender = profile.gender;
          res.facebook = profile.id;
          res.token = accessToken;
          res.save();
          done(undefined, res);
        }
        else {
          done("Please register with the same email used in your Facebook account.");
        }
      });
    } else {
      done(undefined, result);
    }
  });
}));

/**
 * Login Required middleware.
 */
export let isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

/**
 * Authorization Required middleware.
 */
export let isAuthorized = (req: Request, res: Response, next: NextFunction) => {
  const provider = req.path.split("/").slice(-1)[0];

  if (_.find(req.user.tokens, { kind: provider })) {
    next();
  } else {
    res.redirect(`/auth/${provider}`);
  }
};
