/**
 * Module dependencies.
 */
import * as express from "express";
import * as compression from "compression";  // compresses requests
import * as session from "express-session";
import * as bodyParser from "body-parser";
import * as logger from "morgan";
import * as errorHandler from "errorhandler";
import * as lusca from "lusca";
import * as dotenv from "dotenv";
import * as mongo from "connect-mongo";
import * as flash from "express-flash";
import * as path from "path";
import * as mongoose from "mongoose";
import * as passport from "passport";
import expressValidator = require("express-validator");
import * as cors from "cors";
import User from "./models/User";
import * as jwt from "jsonwebtoken";

const MongoStore = mongo(session);

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env" });


/**
 * Controllers (route handlers).
 */
import * as userController from "./controllers/user";
import * as apiController from "./controllers/api";

/**
 * API keys and Passport configuration.
 */
import * as passportConfig from "./config/passport";

/**
 * Create Express server.
 */
const app = express();
app.use(cors());

/**
 * Socket.io
 */
const server = require("http").Server(app);
const io = require("socket.io")(server);

server.listen(3333);

io.on("connection", function (socket: any) {

});

/**
 * Connect to MongoDB.
 */
// mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI);

mongoose.connection.on("error", () => {
  console.log("MongoDB connection error. Please make sure MongoDB is running.");
  process.exit();
});

/**
 * Express configuration.
 */
app.set("port", process.env.PORT || 3000);
app.use(compression());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
    autoReconnect: true
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
      req.path !== "/login" &&
      req.path !== "/signup" &&
      !req.path.match(/^\/auth/) &&
      !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  } else if (req.user &&
      req.path == "/account") {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

/**
 * Primary app routes.
 */
app.get("/api/users", userController.getUsers);
app.get("/api/user/:id", userController.getUser);
app.get("/api/logout", userController.logout);
app.post("/api/login", userController.postLogin);
app.post("/api/signup", userController.postSignup);

app.get("/api", function (req, res) {
  return res.json({ msg: "Ok, this is the API" });
});
app.get("/api/facebook", passportConfig.isAuthenticated, passportConfig.isAuthorized, apiController.getFacebook);
app.get("/api/albums/:id", apiController.getAlbums);
app.get("/api/album/:id/:album_id", apiController.getAlbumPhotos);
app.get("/api/photo/:id/:photo_id", apiController.getPhoto);
/**
 * OAuth authentication routes. (Sign in)
 */
app.get("/auth/facebook", passport.authenticate("facebook", { scope: ["email", "public_profile", "user_photos"] }));
app.get("/auth/facebook/callback",
passport.authenticate("facebook", { failureRedirect: "/api", scope: ["public_profile", "email", "user_photos"] }),
function(req, res) {
  User.findOne({email: req.user.email}, function (err, user: any) {
    if (err) {
      io.emit("fb_auth_response", { err: err, user: "", token: "" });
      return res.end();
    }
    if (user.facebook) {
      io.emit("fb_auth_response", { err: "This facebook account is linked with a other account.", user: "", token: "" });
      return res.end();
    }
    const token = jwt.sign({ user: user }, process.env.SECRET_TOKEN);
    io.emit("fb_auth_response", { user: req.user, err: "", token: token });
    return res.end();
  });
  return 0;
}
);


/**
 * Error Handler. Provides full stack - remove for production
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
  console.log(("  App is running at http://localhost:%d in %s mode"), app.get("port"), app.get("env"));
  console.log("  Press CTRL-C to stop\n");
});

module.exports = app;