(function () {
  'use strict';
  var querySelector = document.querySelector.bind(document);

  var degToRad = Math.PI / 180.;
  var logger1 = querySelector('#logger1');
  var logger2 = querySelector('#logger2');
  var video = querySelector('#local-video');
  var canvas = querySelector('#canvas');

  var ImuMeasurements = function (imu) {
    this.acc = [
      imu.accelerationIncludingGravity.x,
      imu.accelerationIncludingGravity.y,
      imu.accelerationIncludingGravity.z ];

    this.angVel = [
      imu.rotationRate.alpha * degToRad,
      imu.rotationRate.beta * degToRad,
      imu.rotationRate.gamma * degToRad
    ];

    this.t = imu.timeStamp;
  };

  var closedForm = {};

  var ctx, width, height, img_u8, corners;
  var allImu = [];
  var allObs = [];

  closedForm.init = function(w,h) {
    ctx = canvas.getContext('2d');
    ctx.fillStyle = "rgb(0,255,0)";
    ctx.strokeStyle = "rgb(0,255,0)";
    width = w;
    height = h;
    img_u8 = new jsfeat.matrix_t(w, h, jsfeat.U8_t | jsfeat.C1_t);
    corners = [];
    var i = w*h;
    while(--i >= 0) {
      corners[i] = new jsfeat.keypoint_t(0,0,0,0);
    }
    jsfeat.fast_corners.set_threshold(50);
  }


  closedForm.onObservation = function() {
    requestAnimationFrame(closedForm.onObservation);
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      ctx.drawImage(video, 0, 0, width, height);
      var imageData = ctx.getImageData(0, 0, width, height);
      jsfeat.imgproc.grayscale(imageData.data, width, height, img_u8, jsfeat.COLOR_RGBA2GRAY);
      var count = jsfeat.fast_corners.detect(img_u8, corners, 5);
      // render result back to canvas
      var data_u32 = new Uint32Array(imageData.data.buffer);

      if (allObs.length === 0) {
        // initial obs: push all image ref
        var newObs = [];
        for(var i=0; i < count; ++i)
        {
          newObs.push(corners[i]);
        }
        allObs.push(newObs);
      }
      else {
        matchCorners(allObs, corners, count);
      }

      render_corners(corners, count, data_u32, width);
      ctx.putImageData(imageData, 0, 0);
    }
  }

  function matchCorners (previousObs, corners, count) {
    var lastCorners = previousObs[previousObs.length - 1];
    var minimumDist = 3;
    var matchedIndexes = [];
    var newObs = [];
    var size = 11;
    for(var i=0; i < lastCorners.length; ++i)
    {
      var curCorner = lastCorners[i];
      var closeCorners = findCloseCorners(curCorner, corners, size);
      var bestMatch = closestScore(curCorner, closeCorners, minimumDist);
      if (bestMatch) {
        matchedIndexes.push(true);
        newObs.push(bestMatch);
      }
      else {
        matchedIndexes.push(false);
      }
    }
    // remove trails that didn't get a new match
    previousObs.forEach(function(obs) {
      obs = obs.filter(function(corner, idx) {
        return matchedIndexes[idx];
      });
    });

    previousObs.push(newObs);
  };

  function findCloseCorners(target, corners, dist) {
    var halfDist = dist/2.;
    return corners.filter(function(c) {
      return c.x - halfDist < target.x && c.x + halfDist > target.x &&
        c.y - halfDist < target.y && c.y + halfDist > target.y
    });
  };
  function closestScore(target, corners, distLimit) {
    var minDist = Infinity;
    var minIdx = null;
    corners.forEach(function(c, idx) {
      var curDist = Math.abs(c.score - target.score);
      if (curDist < distLimit) {
        if (curDist < minDist) {
          minDist = curDist;
          minIdx = idx;
        }
      }
    });
    if (minIdx) {
      return corners[minIdx];
    }
    else {
      return null;
    }
  };
  function render_corners(corners, count, img, step) {
    var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
    for(var i=0; i < count; ++i)
    {
      var x = corners[i].x;
      var y = corners[i].y;
      var off = (x + y * step);
      img[off] = pix;
      img[off-1] = pix;
      img[off+1] = pix;
      img[off-step] = pix;
      img[off+step] = pix;
    }
  };



  closedForm.onImu = function(imu) {
    if (allImu.length < 5000) {
      allImu.push(new ImuMeasurements(imu));
    }
  };
  window.closedForm = closedForm;

})();
