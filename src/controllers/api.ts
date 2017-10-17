"use strict";

import * as async from "async";
import * as request from "request";
import * as graph from "fbgraph";
import User, { UserModel } from "../models/User";
import { Response, Request, NextFunction } from "express";


/**
 * GET /api
 * List of API examples.
 */
export let getApi = (req: Request, res: Response) => {
  res.render("api/index", {
    title: "API Examples"
  });
};

/**
 * GET /api/facebook
 * Facebook API example.
 */
export let getFacebook = (req: Request, res: Response, next: NextFunction) => {
  const token = req.user.tokens.find((token: any) => token.kind === "facebook");
  graph.setAccessToken(token.accessToken);
  graph.get(`${req.user.facebook}?fields=id,name,email,first_name,last_name,gender,link,locale,timezone`, (err: Error, results: graph.FacebookUser) => {
    if (err) { return next(err); }
    res.render("api/facebook", {
      title: "Facebook API",
      profile: results
    });
  });
};

export let getAlbums = (req: Request, res: Response) => {
  if (req.params.id == 0) {
    return res.json({ err: "User with id '0' don't exist!", user: "", token: "" });
  }
  User.findOne({ "_id": req.params.id }, (err, user: UserModel) => {
    const accessToken = user.token;
    graph.setAccessToken(accessToken);
    graph.get(`${user.facebook}/albums`, (err: Error, results: any) => {
      if (err) {
        return res.json(err);
      }
      return res.json(results);
    });
  });
};

export let getAlbumPhotos = (req: Request, res: Response) => {
  if (req.params.id == 0) {
    return res.json({ err: "User with id '0' don't exist!", user: "", token: "" });
  }
  User.findOne({ "_id": req.params.id }, (err, user: UserModel) => {
    const accessToken = user.token;
    graph.setAccessToken(accessToken);
    graph.get(`${req.params.album_id}/photos?fields=name,images,link`, (err: Error, results: any) => {
      if (err) {
        return res.json(err);
      }
      return res.json(results);
    });
  });
};

export let getPhoto = (req: Request, res: Response) => {
  User.findOne({ "_id": req.params.id }, (err, user: UserModel) => {
    const accessToken = user.token;
    graph.setAccessToken(accessToken);
    graph.get(`${req.params.photo_id}?fields=album`, (err: Error, results: any) => {
      if (err) {
        return res.json(err);
      }
      return res.json(results);
    });
  });
};

