const mongoose = require("mongoose");

const movieSchema = new mongoose.Schema({
  tmdbId: Number,
  title: String,
  poster: String,
  statuses: {
    watched: { type: Boolean, default: false },
    watching: { type: Boolean, default: false },
    favorite: { type: Boolean, default: false },
    watchLater: { type: Boolean, default: false },
    bad: { type: Boolean, default: false },
  },
  updatedAt: { type: Date, default: Date.now }
});

const userMovieSchema = new mongoose.Schema({
  userEmail: { type: String, required: true, unique: true },
  movies: [movieSchema]
});

module.exports = mongoose.model("UserMovie", userMovieSchema);


// const mongoose = require('mongoose');

// const userMovieSchema = new mongoose.Schema({
//   tmdbId: { type: Number, required: true },
//   title: { type: String, required: true },
//   poster: { type: String },
//   statuses: {
//     watched: { type: Boolean, default: false },
//     watching: { type: Boolean, default: false },
//     favorite: { type: Boolean, default: false },
//     watchLater: { type: Boolean, default: false },
//     bad: { type: Boolean, default: false },
//   },
//   userEmail: { type: String, required: true }, // salvando pelo email
//   updatedAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('UserMovie', userMovieSchema);