(function () {
  'use strict';
  var querySelector = document.querySelector.bind(document);

  var degToRad = Math.PI / 180.;
  var logger1 = querySelector('#logger1');
  var logger2 = querySelector('#logger2');
  var video = querySelector('#local-video');
  var canvas = querySelector('#canvas');
  var minNbFeatures = 3;
  var initialTime;

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
      var currentTime = new Date();
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
        initialTime = new Date();
        var newObs = [];
        newObs.t = initialTime;
        for(var i=0; i < count; ++i)
        {
          newObs.push(corners[i].clone());
        }
        allObs.push(newObs);
      }
      else {
        // remove non matched image corners, add the matched ones
        matchCorners(allObs, corners, count, currentTime);
      }

      if (!allObs.length) {
        return;
      }
      render_corners(ctx, allObs);

      var elapsedTime = (currentTime - initialTime) / 1000.;
      if (elapsedTime >= 3.0) {
        var opticalRays = unprojectObs(allObs);
        syncImuTime(allImu, opticalRays.initialTimestamp);

        var solution = computeClosedForm(opticalRays, allImu);

        allObs = [];
        allImu = [];
      }
    }
  }

  function unprojectObs(allObs) {
    var ret = [];
    ret.initialTimestamp = allObs[0].t;

    allObs.forEach(function(obs) {
      var newObs = [];
      newObs.t = (obs.t - ret.initialTimestamp) / 1000.;
      obs.forEach(function(ft) {
        newObs.push(unproject(ft));
      });
      ret.push(newObs);
    });
    return ret;
  }

  function unproject (ft) {
    var norm = ft.x + ft.y + 1;
    return [ ft.x / norm , ft.y / norm , 1 / norm ];
  }

  function syncImuTime (imu, initialTime) {
    imu.forEach(function(tick) {
      tick.t = (tick.t - initialTime)/1000.;
    });
  }

  function computeClosedForm(rays, imu) {
    // var nFeatures = rays[0].length;
    // var nObs = rays.length;
    var nFeatures = 3;
    var nObs = 3;


    var nEquations = 3*(nObs - 1)*nFeatures;
    var nUnknowns = nFeatures * nObs + 6;

    var Tj, Sj, bv;

    var leftHandSide = numeric.rep([nEquations, nUnknowns], 0);
    var rightHandSide = numeric.rep([nEquations], 0);

    var mu1 = numeric.rep([nFeatures*3, nFeatures], 0);
    // build mu1 matrix with all first measurements
    for (var iFeature = 0; iFeature < nFeatures; iFeature++) {
      var ray = rays[0][iFeature];
      var from = [iFeature*3, iFeature];
      numeric.setBlockOffset(mu1,from, [3, 1], numeric.toRow(ray));
    }

    for (var iObs = 1; iObs < nObs; iObs++) {
      var obs = rays[iObs];
      var tj = obs.t;

    //   integrateImuUpToTime(initialTime, tj, imuMsgs, rotationGyro, CAv, tCAv);
      var rowIdx = 3 * nFeatures * (iObs - 1);
      var colIdx = 6 + nFeatures * iObs;

      /////// Tj submatrix
      Tj = numeric.mul(numeric.mul(numeric.mul(numeric.identity(3), -.5), tj), tj);
      /////// Sj submatrix
      Sj = numeric.mul(numeric.identity(3),-tj);

    //   /////// Sv (b vector)
      // bv = tj * CAv - tCAv;

      for (iFeature = 0; iFeature < nFeatures; iFeature++)
      {
        numeric.setBlockOffset(leftHandSide, [rowIdx + iFeature*3, 0], [3, 3], Tj);
        numeric.setBlockOffset(leftHandSide, [rowIdx + iFeature*3, 3], [3, 3], Sj);
        // b.slice(rowIdx + iFeature*3, 3) = bv;

        numeric.setBlockOffset(leftHandSide, [rowIdx + iFeature*3, colIdx + iFeature], [3, 1],
                               // -(rotationGyro * (*bearIt).as_col());
                               numeric.toRow(obs[iFeature]));
      }


      // first feature observation (mu1)
      numeric.setBlockOffset(leftHandSide,[rowIdx, 6],[ nFeatures*3, nFeatures], mu1);
    }
    var svd = numeric.svd(leftHandSide);
    // var X = numeric.solveQP(leftHandSide, [rightHandSide]);

    return {};
  }

  function matchCorners (previousObs, corners, count, currentTime) {
    var lastCorners = previousObs[previousObs.length - 1];
    var minimumDist = 3;
    var idxMatched = [];
    var newObs = [];
    newObs.t = currentTime;
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
      previousObs[obsIdx].t = obs.t;
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
