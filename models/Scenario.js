const mongoose = require('mongoose');

const ScenarioSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true, // سناریو با نام تکراری وارد نشه
    trim: true
  },
  roles: {
    type: [String],
    required: true,
    validate: [roles => roles.length >= 1, 'حداقل یک نقش باید تعریف شود']
  }
});

module.exports = mongoose.model('Scenario', ScenarioSchema);
