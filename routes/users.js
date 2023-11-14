import { Router } from 'express';
const router = Router();
// import data functions
import * as lastfm from '../data/lastfm.js';
// import validation functions


router
  .route('/')
  .get(async (req, res) => {
    const data = await lastfm.searchArtistByName('cher', 5);
    return res.status(200).json({test: 'success', data});
  });

export default router;
