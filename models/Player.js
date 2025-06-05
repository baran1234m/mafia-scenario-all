const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
  player_id: { type: String, required: true, unique: true },
  qr_url: { type: String, required: true }
});

module.exports = mongoose.model('Player', PlayerSchema);
