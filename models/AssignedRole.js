const mongoose = require('mongoose');

const AssignedRoleSchema = new mongoose.Schema({
  game_id: {
    type: String,
    required: true
  },
  player_number: {      // ← بهتر از player_id هست چون در سرورت عدد استفاده کردی
    type: Number,
    required: true
  },
  role: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  scenario: {
    type: String  // اختیاریه، اگه تو برنامه استفاده می‌کنی نگهش دار
  }
});

module.exports = mongoose.model('AssignedRole', AssignedRoleSchema);
