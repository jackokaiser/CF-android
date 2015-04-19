(function() {
  jsfeat.keypoint_t.prototype.clone = function() {
    return new jsfeat.keypoint_t (this.x, this.y, this.score, this.level);
  }
})();

(function() {
  numeric.toRow = function(v) {
    return numeric.transpose([v]);
  }

  numeric.setBlockOffset = function(mat, from, offset, data) {
    numeric.setBlock(mat, from,
                     numeric.sub(numeric.add(from, offset),
                                 [1,1]),
                     data);
  }
})();
