(function() {
  jsfeat.keypoint_t.prototype.clone = function() {
    return new jsfeat.keypoint_t (this.x, this.y, this.score, this.level);
  }
})();
