/*!
 *
 *  Web Starter Kit
 *  Copyright 2014 Google Inc. All rights reserved.
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License
 *
 */
(function () {
  'use strict';

  var querySelector = document.querySelector.bind(document);

  var navdrawerContainer = querySelector('.navdrawer-container');
  var body = document.body;
  var appbarElement = querySelector('.app-bar');
  var menuBtn = querySelector('.menu');
  var main = querySelector('main');
  var console = querySelector('#console');
  var console2 = querySelector('#console2');
  var localVideo = querySelector('#local-video');

  function closeMenu() {
    body.classList.remove('open');
    appbarElement.classList.remove('open');
    navdrawerContainer.classList.remove('open');
  }

  function toggleMenu() {
    body.classList.toggle('open');
    appbarElement.classList.toggle('open');
    navdrawerContainer.classList.toggle('open');
    navdrawerContainer.classList.add('opened');
  }

  if (window.DeviceMotionEvent == undefined) {
    //No accelerometer is present. Use buttons.
    alert("no accelerometer");
  }
  else {
    window.addEventListener("devicemotion", accelerometerUpdate, true);
    window.addEventListener("deviceorientation", gyroscopeUpdate, true);
  }
  function accelerometerUpdate(e) {
    var aX = event.accelerationIncludingGravity.x*1;
    var aY = event.accelerationIncludingGravity.y*1;
    var aZ = event.accelerationIncludingGravity.z*1;
    var gyro = {};
    gyro.x = event.rotationRate.alpha;
    gyro.y = event.rotationRate.beta;
    gyro.z = event.rotationRate.gamma;

    var t = event.timeStamp;

    console.innerHTML = ''+gyro.x +"<br>"+gyro.y+"<br>"+gyro.z;
  }
  function gyroscopeUpdate(event) {
    console2.textContent = Object.keys(event).join(" ")
  }

  var localStream = null;
  // get the local video and audio stream and show preview in the
  // "LOCAL" video element
  // successCb: has the signature successCb(stream); receives
  // the local video stream as an argument
  var getLocalStream = function (successCb) {
    if (localStream && successCb) {
      successCb(localStream);
    }
    else {
      navigator.webkitGetUserMedia(
        {
          video: true
        },
        function (stream) {
          localStream = stream;

          localVideo.src = window.URL.createObjectURL(stream);

          if (successCb) {
            successCb(stream);
          }
        },

        function (err) {
          logError('failed to access local camera');
          logError(err.message);
        }
      );
    }
  };
  getLocalStream(function (stream) {
      logMessage('outgoing call initiated');

  });

  main.addEventListener('click', closeMenu);
  menuBtn.addEventListener('click', toggleMenu);
  navdrawerContainer.addEventListener('click', function (event) {
    if (event.target.nodeName === 'A' || event.target.nodeName === 'LI') {
      closeMenu();
    }
  });
})();
