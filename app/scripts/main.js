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

  var body = document.body;
  var main = querySelector('main');
  var localVideo = querySelector('#local-video');
  var canvas = querySelector('#canvas');

  var videoSource = null;

  if (window.DeviceMotionEvent == undefined) {
    //No accelerometer is present. Use buttons.
    alert("no accelerometer");
  }
  else {
    window.addEventListener("devicemotion", closedForm.onImu, true);
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
          video: {
            optional: [{sourceId: videoSource}]
          }
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

  function gotSources(sourceInfos) {
    for (var i = 0; i !== sourceInfos.length; ++i) {
      var sourceInfo = sourceInfos[i];
      if (videoSource === null || sourceInfo.facing.indexOf("environment") > -1 ) {
        videoSource = sourceInfo.id;
      }
    }
    getLocalStream();

    closedForm.init(640, 480);
    requestAnimationFrame(closedForm.onObservation);

  }

  if (typeof MediaStreamTrack === 'undefined'){
    alert('This browser does not support MediaStreamTrack.\n\nTry Chrome Canary.');
  } else {
    MediaStreamTrack.getSources(gotSources);
  }

  window.unload = function() {
    localVideo.pause();
    localVideo.src=null;
  };


})();
