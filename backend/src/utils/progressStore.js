const progressMap = new Map();

exports.setProgress = (id, data) => {
  progressMap.set(id, data);
};

exports.getProgress = (id) => {
  return progressMap.get(id);
};

exports.clearProgress = (id) => {
  progressMap.delete(id);
};
