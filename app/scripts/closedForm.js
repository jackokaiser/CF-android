(function () {
  'use strict';
  var querySelector = document.querySelector.bind(document);

  var degToRad = Math.PI / 180.;
  var logger1 = querySelector('#logger1');
  var logger2 = querySelector('#logger2');
  var video = querySelector('#local-video');
  var canvas = querySelector('#canvas');
  var minNbFeatures = 3;

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
    jsfeat.fast_corners.set_threshold(40);
  }


  closedForm.onObservation = function() {
    requestAnimationFrame(closedForm.onObservation);
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      ctx.drawImage(video, 0, 0, width, height);
      var imageData = ctx.getImageData(0, 0, width, height);
      jsfeat.imgproc.grayscale(imageData.data, width, height, img_u8, jsfeat.COLOR_RGBA2GRAY);
      var count = jsfeat.fast_corners.detect(img_u8, corners, 5);

      if (!count) {
        allObs = [];
        return;
      }

      if (allObs.length === 0) {
        // initial obs: push all image ref
        var newObs = [];
        for(var i=0; i < count; ++i)
        {
          newObs.push(corners[i].clone());
        }
        allObs.push(newObs);
      }
      else {
        matchCorners(allObs, corners, count);
      }

      render_corners(ctx, allObs);
    }
  }

  function matchCorners (previousObs, corners, count) {
    var lastCorners = previousObs[previousObs.length - 1];
    var minimumDist = 3;
    var idxMatched = [];
    var newObs = [];
    var size = 11;

    lastCorners.forEach(function(c, idx) {
      var bestMatch = findClosestCorner(c, corners, count, size);
      if (bestMatch) {
        newObs.push(bestMatch.clone());
        idxMatched.push(true);
      }
      else {
        idxMatched.push(false);
      }
    });

    // remove trails that didn't get a new match
    previousObs.forEach(function(obs, obsIdx) {
      previousObs[obsIdx] = obs.filter(function(corner, idx) {
        return idxMatched[idx];
      });
    });

    if (!newObs.length || newObs.length < minNbFeatures) {
      // remove all obs
      previousObs.splice(0, previousObs.length);
    }
    else {
      previousObs.push(newObs);
    }
  };

  function findClosestCorner(target, corners, count, dist) {
    var halfDist = dist/2.;
    var minDist = Infinity;
    var minIdx = null;
    for (var idx=0; idx < count; idx++) {
      var c = corners[idx];
      if (c.x - halfDist < target.x && c.x + halfDist > target.x &&
          c.y - halfDist < target.y && c.y + halfDist > target.y) {
        // is in the patch
        var curDist = Math.pow(c.x - target.x,2) + Math.pow(c.y - target.y,2);
        if (curDist < minDist) {
          minDist = curDist;
          minIdx = idx;
        }
      }
    }

    if (minIdx) {
      return corners[minIdx];
    }
    else {
      return null;
    }
  };

  function render_corners(ctx, allObs) {
    if (!allObs.length || !allObs[0].length) {
      return;
    }

    var pix = (0xff << 24) | (0x00 << 16) | (0xff << 8) | 0x00;
    var nFeatures = allObs[0].length;
    for (var iFt=0;iFt<nFeatures; iFt++) {
      ctx.beginPath();
      var curImRef = allObs[0][iFt];
      ctx.moveTo(curImRef.x, curImRef.y);

      for (var iObs=1; iObs < allObs.length; iObs++) {
        curImRef = allObs[iObs][iFt];
        ctx.lineTo(curImRef.x, curImRef.y);
      }
      ctx.stroke();
    }
  };



  closedForm.onImu = function(imu) {
    if (allImu.length < 5000) {
      allImu.push(new ImuMeasurements(imu));
    }
  };
  window.closedForm = closedForm;

})();
