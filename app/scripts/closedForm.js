(function () {
  'use strict';
  var querySelector = document.querySelector.bind(document);

  var logger1 = querySelector('#logger1');
  var logger2 = querySelector('#logger2');
  var video = querySelector('#local-video');
  var canvas = querySelector('#canvas');


  var closedForm = {};

  var ctx, width, height, img_u8, corners;

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
    jsfeat.fast_corners.set_threshold(20);
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
      render_corners(corners, count, data_u32, width);
      ctx.putImageData(imageData, 0, 0);
    }
  }

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
    var aX = imu.accelerationIncludingGravity.x*1;
    var aY = imu.accelerationIncludingGravity.y*1;
    var aZ = imu.accelerationIncludingGravity.z*1;
    var gyro = {};
    gyro.x = imu.rotationRate.alpha;
    gyro.y = imu.rotationRate.beta;
    gyro.z = imu.rotationRate.gamma;

    var t = imu.timeStamp;

    logger1.innerHTML = ''+gyro.x +"<br>"+gyro.y+"<br>"+gyro.z;
  };
  window.closedForm = closedForm;

})();
