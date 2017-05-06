var null_geo,cursorTop, cursorMiddle, cursorBottom,cursorBlinkCount,cursorBlink,cursorBlinkFunction;
var socket = io('http://localhost:8081');		var cursorNotSelected = true;
var cursorColor = 0xa3c6ff;
var oscAdded = false;
var oscRemoved = false;
//socket = io.connect('https://localhost', { port: 8081, rememberTransport: false});
var socket = io('http://localhost:8081');

console.log('oi');
socket.on('connect_failed', function(obj){
    console.log('Connection Failed\n', obj);
});




socket.on('connect', function() {
    console.log('Connected');

     // sends to socket.io server the host/port of oscServer
     // and oscClient
     socket.emit('config',
         {
             server: {
                 port: 3333,// listening to 3333
                 host: '127.0.0.1'
             },
             client: {
                 port: 3334,// sending to 3334
                 host: '127.0.0.1'
             }
         }
     );
 });

function ScissorVoice(noteNum, numOsc, oscType, detune){
  this.output  = new ADSR();
  this.maxGain = 1 / numOsc;
  this.noteNum = noteNum;
  this.frequency = noteNum2Freq(noteNum);
  this.oscs = [];
  for (var i=0; i< numOsc; i++){
    var osc = context.createOscillator();
    osc.type = oscType;
    osc.frequency.value = this.frequency;
    osc.detune.value = -detune + i * 2 * detune / (numOsc - 1);
    osc.start(context.currentTime);
    osc.connect(this.output.node);
    this.oscs.push(osc);
  }
}

ScissorVoice.prototype.stop = function(time){
  time =  time | context.currentTime;
  var it = this;
  setTimeout(function(){
    for (var i=0; i<it.oscs.length; i++){
        it.oscs[i].disconnect();
    }

  }, Math.floor((time-context.currentTime)*1000));
}

ScissorVoice.prototype.detune = function(detune){
    for (var i=0; i<this.oscs.length; i++){
        //this.oscs[i].frequency.value = noteNum2Freq(noteNum);
        this.oscs[i].detune.value -= detune;
    }

}

ScissorVoice.prototype.connect = function(target){
  this.output.node.connect(target);
}

var context = WX._ctx;
function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function noteNum2Freq(num){
    return Math.pow(2,(num-57)/12) * 440
}

function ADSR(){
    this.node = context.createGain();
    this.node.gain.value = 0.0;
}

ADSR.prototype.noteOn= function(delay, A,D, peakLevel, sustainlevel){
    peakLevel = peakLevel || 0.3;
    sustainlevel = sustainlevel || 0.1;

    this.node.gain.linearRampToValueAtTime(0.0,delay + context.currentTime);
    this.node.gain.linearRampToValueAtTime(peakLevel,delay + context.currentTime + A); // Attack
    this.node.gain.linearRampToValueAtTime(sustainlevel,delay + context.currentTime + A + D);// Decay
}

ADSR.prototype.noteOff= function(delay, R, sustainlevel){
    sustainlevel = sustainlevel || 0.1;

    this.node.gain.linearRampToValueAtTime(sustainlevel,delay + context.currentTime );// Release
    this.node.gain.linearRampToValueAtTime(0.0,delay + context.currentTime + R);// Release

}

ADSR.prototype.play= function(time, A,D,S,R, peakLevel, sustainlevel){
    this.noteOn(time,A,D, peakLevel, sustainlevel);
    this.noteOff(time+A+D+S,R, sustainlevel);
}


function Envelope(){
    this.node = context.createGain();
    this.node.gain.value = 1.0;
}

Envelope.prototype.noteOn= function(time, A,D,S,R){
  //  this.node.gain.linearRampToValueAtTime(0.0,context.currentTime);

}

function Oscillator(noteNum, type){
    this.node = context.createOscillator();
  //  this.node.connect(compressor);
    this.node.frequency.value = noteNum2Freq(noteNum);
    this.node.type = type;
    this.playing = false;
    if ( type != null && (type == "sine"
    || type == "square"
    || type =="sawtooth"
    || type == "triangle"))
    {
        this.node.type = type;
    }
}

Oscillator.prototype.play = function(time){

    this.node.start(time);

}

Oscillator.prototype.stop = function( time){
        this.node.stop(time);
}

window.onload = function() {
    var DEBUG = true;
    var enableSound = true;
    var enableCodeMirror = true;
    var  randomcolor = [ "#c0c0f0", "#f0c0c0", "#c0f0c0", "#f090f0", "#90f0f0", "#f0f090"],
       keyup_debug_color_index=0,
       keydown_debug_color_index=0,
       keypress_debug_color_index=0;

    if (!hasGetUserMedia()) {
        alert('getUserMedia() is not supported in your browser. Please visit http://caniuse.com/#feat=stream to see web browsers available for this demo.');
    }

    var options = {
      lineNumbers: false,
      smartIndent : false,
      indentUnit:0,
      lineWrapping:true,
      mode:"Plain Text",
      height:"100%"
    };
    if(enableCodeMirror){
      var editor = CodeMirror.fromTextArea(document.getElementById("livetext"),options);
      editor.setSize("96%", "98%");
    }

    $("#hide").click(function(){
        // remove select
        $("#micselect").hide();
    });
    if(DEBUG == false){
      $("#debug-panel").hide();
    }

  $("#debug_button").click(function(){
        $("#debug-panel").hide();
        DEBUG = false;
    })

    // set up forked web audio context, for multiple browsers
    // window. is needed otherwise Safari explodes

    var volume = 0;
    var freqIndex;

    navigator.getUserMedia = (navigator.getUserMedia ||
                              navigator.webkitGetUserMedia ||
                              navigator.mozGetUserMedia ||
                              navigator.msGetUserMedia);
    var level_original = context.createGain();
    var level_reverb = context.createGain();
    var gain_filterbank = context.createGain();

    var panNode = context.createStereoPanner();

    var pitch_convolver = [];
    var pitch_convolver_id = 0;
    var pitch_convolver_ADSR = [];
    pitch_convolver[0] = context.createConvolver();
    pitch_convolver[1] = context.createConvolver();
    pitch_convolver_ADSR[0] = new ADSR();
    pitch_convolver_ADSR[1] = new ADSR();
    var pitch_convolver_level = context.createGain();
    var reverb = context.createConvolver();
    var reverb2 = context.createConvolver();
    var chatter = context.createBufferSource();
    var chatterStart = true;
    var heartbeat = context.createBufferSource();
    var ending = context.createBufferSource();
    var heartbeatGainValue = 0;
    var endingGainValue = 0;

    var pause_handle = null;
    var pause = null;
    var pauseADSR = new ADSR();
    pauseADSR.node.connect(level_reverb);
    panNode.connect(reverb);


    var chatter_filterGain = context.createGain();
    var heartbeatGain = context.createGain();
    var endingGain = context.createGain();
    var chatter_reverbGain = context.createGain();
    var sourceMic;
    var sourceBuiltInMic;

    var delay = WX.StereoDelay();
    var filter = context.createBiquadFilter();
    var noiseBurst =   WX.Noise({ output: 0.0 , type: "white"});
    var noiseBurstadsr = new ADSR();
    var noiseBurstAnalyser = context.createAnalyser();
    var noiseBurstOn = false;

    noiseBurstAnalyser.smoothingTimeConstant = 0.3;
    noiseBurstAnalyser.fftSize = 512;

    noiseBurst.to(noiseBurstadsr.node).to(noiseBurstAnalyser).to(level_original);

    var reverseGate = WX.ConVerb({ mix: 0, output:0.2});
    var filterOn = false;

    reverseGate.to(delay).to(level_original);

    var compressor = context.createDynamicsCompressor();
    var masterGain = context.createGain();
    var analyser = context.createAnalyser();

    var triangle_osc = new Oscillator(22, 'triangle');
    var triangle_adsr = new ADSR();
    var triangle_drone = context.createGain();


    var noise = WX.Noise({ output: 0.25 });
    var fbank = WX.FilterBank();
    var cverb = WX.ConVerb({ mix: 0.85 });

    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 512;

    masterGain.gain.value =1.0;
    level_reverb.gain.value = 0.0;
    level_original.gain.value = 1.0;

    chatter_filterGain.gain.value = 1.0;
    chatter_reverbGain.gain.value = 0.0;
    heartbeatGain.gain.value = 0.0;
    endingGain.gain.value = 0.0;

    compressor.threshold.value = 10;
    compressor.ratio.value = 20;
    compressor.reduction.value = -20;

    filter.type = (typeof filter.type === 'string') ? 'bandpass' : 0; // LOWPASS
    filter.frequency.value = 500;

    //connection
    compressor.connect(masterGain)
    masterGain.connect(context.destination);
    level_original.connect(compressor); // ONOFF live mic sound
    level_reverb.connect(compressor);
    pitch_convolver[0].connect(pitch_convolver_ADSR[0].node);
    pitch_convolver[1].connect(pitch_convolver_ADSR[1].node);
    pitch_convolver_ADSR[0].node.connect(pitch_convolver_level);
    pitch_convolver_ADSR[1].node.connect(pitch_convolver_level);
    pitch_convolver_level.connect(level_reverb);
    pitch_convolver_ADSR[0].noteOn(0,0,0, 1, 1);

    reverb.connect(level_reverb);
    reverb2.connect(level_reverb);

    fbank.set('scale', 'mixolydian');
    fbank.set('pitch', 23);

    heartbeat.connect(heartbeatGain).connect(level_reverb);
    heartbeatGain.connect(analyser);

    ending.connect(endingGain).connect(level_reverb);
    endingGain.connect(analyser);


    chatter.connect(analyser);
    chatter.to(chatter_filterGain).connect(analyser);
    chatter.to(chatter_reverbGain).connect(reverb);

    var clip1 = {
        name: 'Big Empty Church',
        url: soundmap.reverb1
    };
    var clip2 = {
        name: 'Reverse Gate',
        url: soundmap.reverse_reverb
    };
if(enableSound){
    WX.loadClip(clip2,function(){
        reverseGate.setClip(clip2);
    });
    WX.loadClip(clip1, function() {
        cverb.setClip(clip1);
    });
  }

    var audioSelectVisual = document.querySelector('select#audioSource1');
    var audioSelectAudio = document.querySelector('select#audioSource2');

    function getSourceID(){
      var MicId = this.value;
      var sourceType = this.sourceType;
        if (navigator.getUserMedia) {
            console.log('getUserMedia supported.');
            var audioOpts = {
              audio: {
                optional: [
                  //{sourceId: audio_source},  // do it like this to take the default audio src
                  {googAutoGainControl: false},
                  {googAutoGainControl2: false},
                  {googEchoCancellation: false},
                  {googEchoCancellation2: false},
                  {googNoiseSuppression: false},
                  {googNoiseSuppression2: false},
                  {googHighpassFilter: false},
                  {googTypingNoiseDetection: false},
                  {googAudioMirroring: false},
                  {sourceId: MicId}
                ]
             },
             video: false
            };
            navigator.getUserMedia (audioOpts,
            // Success callback
              function(stream) {
                  if (sourceType == "visual") {
                      sourceBuiltInMic =  context.createMediaStreamSource(stream);
                      sourceBuiltInMic.connect(analyser); // ON/OFF
                      console.log('builtin mic connected.');
                  }
                  else if (sourceType == "audio"){ // first selected (e.g. mic from audio interface)
                      sourceMic = context.createMediaStreamSource(stream);
                      sourceMic.connect(level_original); // ON/OFF
                      if(droneState){
                        sourceMic.connect(pitch_convolver[0]); // ON/OFF
                        sourceMic.connect(pitch_convolver[1]); // ON/OFF
                      }
                      sourceMic.connect(reverb); // ON/OFF
                      console.log('separate mic connected.');
                  }
              },
            // Error callback
              function(err) {
                  console.log('The following gUM error occured: ' + err);
              }
          ); // end of navigator.getUserMedia
        } else {

        console.log('getUserMedia not supported on your browser!');

        }
    }

    audioSelectVisual.onchange = getSourceID;
    audioSelectVisual.sourceType = "visual";
    audioSelectAudio.onchange = getSourceID;
    audioSelectAudio.sourceType = "audio";
//https://simpl.info/getusermedia/sources/
    function gotSource(sourceInfo) {
        var option1 = document.createElement('option');
        var option2 = document.createElement('option');
        option1.value = sourceInfo.id;
        option2.value = sourceInfo.id;
        if (sourceInfo.kind === 'audioinput') {
          option1.text = sourceInfo.label || 'microphone ' + (audioSelectVisual.length);
          option2.text = sourceInfo.label || 'microphone ' + (audioSelectVisual.length);
        audioSelectVisual.appendChild(option1);
        audioSelectAudio.appendChild(option2);
        } else {
          console.log('Some other kind of source: ', sourceInfo);
        }
    }
    // end of     function gotSources(sourceInfos)
    navigator.mediaDevices.enumerateDevices()
    .then(function(devices) {
      devices.forEach(gotSource);
    })
    .catch(function(err) {
      console.log(err.name + ": " + err.message);
    });


    //  pitch_convolver.buffer = context.createBuffer(2, 2048, context.sampleRate);

    var buffers = {};
    if (enableSound){

      loadSounds(buffers, soundmap, function(){
          pitch_convolver[0].buffer = buffers['june_C'];
          reverb.buffer = buffers['ir1'];
          reverb2.buffer = buffers['sus1'];
          chatter.buffer = buffers['chatter'];
          heartbeat.buffer = buffers['heartbeat'];
          ending.buffer = buffers['nnote1'];
      });
    }
    var pauseStart = false;
    var amplitudeArray =  new Uint8Array(analyser.frequencyBinCount);
    var amplitudeArray2 =  new Uint8Array(analyser.frequencyBinCount);
    var amplitudeArray3 =  new Uint8Array(noiseBurstAnalyser.frequencyBinCount);

    // load the sound
    if(DEBUG==true){
      $("#debug-panel").show();
    }
    else{
      $("#debug-panel").hide();
    }


    function getAverageVolume(array) {
        var values = 0;
        var average;
        var weightedAverageIndex = 0;
        var length = array.length;

        // get all the frequency amplitudes
        for (var i = 0; i < length; i++) {
            values += array[i];
            weightedAverageIndex += array[i] * i;
        }
        if ( values > 0 )weightedAverageIndex /= values;
        average = values / length;
        return [average, weightedAverageIndex];
    }

/*****************************************************************************
/*****************************************************************************

        graphic part START

/*****************************************************************************
/*****************************************************************************/

    var book;
    var geoindex = 0;
    var geo = {};
    var pageStrIndex = [];
    var books = [];
    var currentPage = 0;
    var pageContent = [];
    var strPage = [];
    var lineindex = [];

    var numCharPage = [400, 670, 376];

    var numPage = 3;
    var cmGrid = [];

    for (var i=0; i< numPage; i++)
    {
        lineindex[i] = 0;
        geo[i] = [];
        geo[i][0] = new THREE.Geometry();
        strPage[i] = "";
        pageStrIndex[i] = 0;
        cmGrid[i] = [];
        // strPage[i] = "blocks of the streets becomes my poem.\ntrees of the road becomes my court\ndimmed lights reflecting in my eyes\npeople walking round in their disguise.\n\ni am feeling lonely in this zone.\ni feel the chill deep in my bones.\nthe crowd is isolating me.\nin paranoia i will be.\n\nthis gloomy streets are nursing me.\ndark alleys are my home to be.\nnocturnal fog becomes my air\nif i live or die.\nwould you care?";
        // var BOOK="Writing efficient WebGL code requires a certain mindset. The usual way to draw using WebGL is to set up your uniforms, buffers and shaders for each object, followed by a call to draw the object. This way of drawing works when drawing a small number of objects. To draw a large number of objects, you should minimize the amount of WebGL state changes. To start with, draw all objects using the same shader after each other, so that you don't have to change shaders between objects. For simple objects like particles, you could bundle several objects into a single buffer and edit it using JavaScript. That way you'd only have to reupload the vertex buffer instead of changing shader uniforms for every single particle.";

    }

    var fontSize = 32;
    var lettersPerSide = 16;

    var currIndex=[0,0,0], currentLine=[1,1,1], prevJLastLine=[0,0,0];
    var scaleX = 0.7, scaleY = 1.9;
  //  var scaleX = 5, scaleY = 12;

    var rightMostPosition = 0;
    var rightMostXCoord = 50;
    var letterPerLine = 50;
    var linePerScreen = 10;
    var offset = scaleY * 0.6;
//    var offset = 8.0;
    var attributes = {
      pageIndex: {type: 'f', value: [] },
      strIndex: {type: 'f', value: [] },
      lineIndex: {type: 'f', value: [] },
      chIndex: {type: 'f', value: [] },
      alphabetIndex:{type:'f', value: []}
    };

// keycode table is available here
// https://css-tricks.com/snippets/javascript/javascript-keycodes/


    function addLetter(code, strIndex, sizeFactor){
        var alphabetIndex = String.fromCharCode(code).toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 1;
        console.log("code: " + String.fromCharCode(code)+ " alphabetIndex:" + alphabetIndex)
        if(alphabetIndex < 1 || alphabetIndex > 26 )
          alphabetIndex = 0;
        var cx = code % lettersPerSide;
        var cy = Math.floor(code / lettersPerSide);
        //  var localscaleX = scaleX * (1+sizeFactor);
        var localOffset = offset * (1+sizeFactor*2.0);
        var localY = currentLine[currentPage]*scaleY - (sizeFactor/4.0);
        geo[currentPage][geoindex].vertices.push(
            new THREE.Vector3( currIndex[currentPage]*scaleX, localY, 0 ), // left bottom
            new THREE.Vector3( currIndex[currentPage]*scaleX+localOffset, localY, 0 ), //right bottom
            new THREE.Vector3( currIndex[currentPage]*scaleX+localOffset, localY+localOffset, 0 ),// right top
            new THREE.Vector3( currIndex[currentPage]*scaleX, localY+localOffset, 0 )// left top
        );
        //   console.log("sizeFactor:" + sizeFactor + " added(" + (j*scaleX) + "," + (j*scaleX + offset) +" strIndex : " + strIndex + ")");
        for (var k=0; k<4;k++){
          attributes.strIndex.value[strIndex*4+k] = strIndex;// THREE.Vector2(6.0,12.0);
          attributes.alphabetIndex.value[strIndex*4+k] = alphabetIndex;// THREE.Vector2(6.0,12.0);
        }
        var face = new THREE.Face3(strIndex*4+0, strIndex*4+1, strIndex*4+2);
        geo[currentPage][geoindex].faces.push(face);
        face = new THREE.Face3(strIndex*4+0, strIndex*4+2, strIndex*4+3);
        geo[currentPage][geoindex].faces.push(face);
        var ox=(cx)/lettersPerSide, oy=(cy+0.05)/lettersPerSide, off=0.9/lettersPerSide;
      //  var sz = lettersPerSide*fontSize;
        geo[currentPage][geoindex].faceVertexUvs[0].push([
            new THREE.Vector2( ox, oy+off ),
            new THREE.Vector2( ox+off, oy+off ),
            new THREE.Vector2( ox+off, oy )
        ]);
        geo[currentPage][geoindex].faceVertexUvs[0].push([
            new THREE.Vector2( ox, oy+off ),
            new THREE.Vector2( ox+off, oy ),
            new THREE.Vector2( ox, oy )
        ]);

        if (code == 10 || code == 13 || currIndex[currentPage]  == letterPerLine) {
            currentLine[currentPage]--;
            prevJLastLine[currentPage] = currIndex[currentPage];
            currIndex[currentPage]=0;
        } else {
            currIndex[currentPage]++;
            if (rightMostPosition<currIndex[currentPage]){
                rightMostXCoord = currIndex[currentPage]*scaleX+offset;
                rightMostPosition = currIndex[currentPage];
            }
        }
    } // the end of addLetter


    var removeLetterCodeMirror = function(line,ch){
      var object = cmGrid[currentPage][line][ch];
      var strIndex = object.index;

      console.log("removing letter index(",line,",",ch,") : ", strIndex);
      geo[currentPage][geoindex].vertices[strIndex*4].z = +50;
      geo[currentPage][geoindex].vertices[strIndex*4+1].z = +50;
      geo[currentPage][geoindex].vertices[strIndex*4+2].z = +50;
      geo[currentPage][geoindex].vertices[strIndex*4+3].z = +50;
    }

    var shiftLetterVerticallyCodeMirror = function(line,ch,shiftAmount){
      var object = cmGrid[currentPage][line][ch];
      if(!object) debugger;
      var strIndex = object.index;
      var sizeFactor = object.sizeFactor;
      var localY = (2-line - shiftAmount)*scaleY - (sizeFactor/4.0);
      var localOffset = offset * (1+sizeFactor*2.0);

      geo[currentPage][geoindex].vertices[strIndex*4].y = localY;
      geo[currentPage][geoindex].vertices[strIndex*4+1].y = localY;
      geo[currentPage][geoindex].vertices[strIndex*4+2].y = localY+localOffset;
      geo[currentPage][geoindex].vertices[strIndex*4+3].y = localY+localOffset;
    }



    var shiftLetterHorizontallyCodeMirror = function(line,ch, shiftAmount){
      var object = cmGrid[currentPage][line][ch];
      if(!object) debugger;
      if (rightMostPosition<ch+shiftAmount){
          rightMostPosition = ch+shiftAmount
          rightMostXCoord = rightMostPosition*scaleX+offset;
      }
      var strIndex = object.index;
      var sizeFactor = object.sizeFactor;
      console.log("move the ", strIndex,"th letter ",shiftAmount," spaces.");
      var localOffset = offset * (1+sizeFactor*2.0);
      geo[currentPage][geoindex].vertices[strIndex*4].x = (ch+shiftAmount) * scaleX;
      geo[currentPage][geoindex].vertices[strIndex*4+1].x = (ch+shiftAmount) * scaleX+localOffset;
      geo[currentPage][geoindex].vertices[strIndex*4+2].x = (ch+shiftAmount) * scaleX+localOffset;
      geo[currentPage][geoindex].vertices[strIndex*4+3].x = (ch+shiftAmount) * scaleX;
    }

    var addLetterCodeMirror = function (line, ch, sizeFactor, char){
      if (rightMostPosition<ch){
          rightMostXCoord = ch*scaleX+offset;
          rightMostPosition = ch;
      }

      if ( snapToggle ){
          rightMostXCoord = ch*scaleX+offset;// this creates an really interesting animations
          if ( line %3 == 0 && ch == 0){
            var keycode = char.charCodeAt(0);
            var source = context.createBufferSource();
            var gain = context.createGain();
            gain.gain.value = 0.1;
            source.buffer = buffers['woodangtang'];
            //source.playbackRate.value = 1 + Math.random()*2;
            var freqNum = keycode;

            source.playbackRate.value = 0.1 + (freqNum-65) / 60;
            source.connect(level_original);
            source.start(0);
          }
      }

      var strIndex = pageStrIndex[currentPage];
      pageStrIndex[currentPage]++;
      cmGrid[currentPage][line][ch] = {index:strIndex, sizeFactor:sizeFactor, char: char};

      if(char.length!=1){
        console.error("addLetterCodeMirror : no char added");
        return;
      }

      var code = char.charCodeAt(0);
      var alphabetIndex = String.fromCharCode(code).toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 1;
      console.log("addLetterCodeMirror. (", line, ",", ch,")", " code: " + String.fromCharCode(code)+ " alphabetIndex:" + alphabetIndex)
      if(alphabetIndex < 1 || alphabetIndex > 26 )
        alphabetIndex = 0;
      var cx = code % lettersPerSide;
      var cy = Math.floor(code / lettersPerSide);
      //  var localscaleX = scaleX * (1+sizeFactor);
      var localOffset = offset * (1+sizeFactor*2.0);
      var localY = (2-line)*scaleY - (sizeFactor/4.0);
      geo[currentPage][geoindex].vertices.push(
          new THREE.Vector3( ch*scaleX, localY, 0 ), // left bottom
          new THREE.Vector3( ch*scaleX+localOffset, localY, 0 ), //right bottom
          new THREE.Vector3( ch*scaleX+localOffset, localY+localOffset, 0 ),// right top
          new THREE.Vector3( ch*scaleX, localY+localOffset, 0 )// left top
      );

      for (var k=0; k<4;k++){
        attributes.pageIndex.value[strIndex*4+k] = currentPage;
        attributes.strIndex.value[strIndex*4+k] = strIndex;// THREE.Vector2(6.0,12.0);
        attributes.lineIndex.value[strIndex*4+k] = line;// THREE.Vector2(6.0,12.0);
        attributes.chIndex.value[strIndex*4+k] = ch;// THREE.Vector2(6.0,12.0);
        attributes.alphabetIndex.value[strIndex*4+k] = alphabetIndex;// THREE.Vector2(6.0,12.0);
      }
      var face = new THREE.Face3(strIndex*4+0, strIndex*4+1, strIndex*4+2);
      geo[currentPage][geoindex].faces.push(face);
      face = new THREE.Face3(strIndex*4+0, strIndex*4+2, strIndex*4+3);
      geo[currentPage][geoindex].faces.push(face);
      var ox=(cx)/lettersPerSide, oy=(cy+0.05)/lettersPerSide, off=0.9/lettersPerSide;
    //  var sz = lettersPerSide*fontSize;
      geo[currentPage][geoindex].faceVertexUvs[0].push([
          new THREE.Vector2( ox, oy+off ),
          new THREE.Vector2( ox+off, oy+off ),
          new THREE.Vector2( ox+off, oy )
      ]);
      geo[currentPage][geoindex].faceVertexUvs[0].push([
          new THREE.Vector2( ox, oy+off ),
          new THREE.Vector2( ox+off, oy ),
          new THREE.Vector2( ox, oy )
      ]);


    }

    var renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor( 0xffffff );
    document.body.appendChild(renderer.domElement);
    // FIME (Text vIsualization for Musical Expression
    //   var BOOK="H";

    var tex = getKeyTabular(fontSize,"Monospace",lettersPerSide);

    tex.flipY = false;
    tex.needsUpdate = true;

    var mat = new THREE.MeshBasicMaterial({map: tex});
    mat.transparent = true;

    var camera = new THREE.PerspectiveCamera(45,1,4,40000);
    camera.setLens(35);

    window.onresize = function() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    };
    window.onresize();

    var panicCamera = function(){
      camera.position.z = radius;
      camera.position.x = 0;
      camera.position.y = 0;
      camera.fov = 45;
      camera.setLens(35);
      camera.rotation.x = 0;
      camera.rotation.y = 0;
      camera.rotation.z = 0;
    }
    var radius = 0;

    var scene = new THREE.Scene();


    camera.position.z = radius;
    scene.add(camera);

    var str = strPage[currentPage];
    var centerX = (letterPerLine) * scaleX / 2.0;
    var centerY = (-linePerScreen * scaleY )/2.0;

    for (i=0; i<str.length; i++) {
        addLetter(str.charCodeAt(i),i,0);
    }
    geo[1][geoindex] = geo[0][geoindex].clone();
    geo[2][geoindex] = geo[0][geoindex].clone();
    rightMostXCoord = (rightMostPosition+1) * scaleX;

    //  console.log("length:" + attributes.attCenter.value.length);
    /*    for (var k=0; k<attributes.attCenter.value.length;k++){
        attributes.attCenter.value[k].x -=centerX;
        attributes.attCenter.value[k].y -=centerY;
    }
    */
    var top = new THREE.Object3D();

    var width = window.innerWidth,
        height = window.innerHeight;

    var uniforms = {
        time: {type:"f", value:0.0},
        interval : {type:"f", value:0.0},
        volume : {type:"f", value:0.0},
        timeDomain : { type:"fv1", value:new Float32Array(512)},
        coloredStr : { type:"iv1", value:coloredStr},
    //        timeDomain2 : { type:"fv1", value:new Float32Array(512)},
    //    center : { type: "v2", value: new THREE.Vector2(centerX,centerY) },
        map : { type: "t", value: tex },
        rightMostXCoord : { type: "f", value: 0.0 },
        noise : {type:"f", value:0.0},
        fontcolor : {type:"f", value:0.0}

      //  xCoord : { type: "f", value: 0.0 }
    };

    uniforms.rightMostXCoord.value = rightMostXCoord;
// initial shader
    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms : uniforms,
        attributes : attributes,
        vertexShader : document.querySelector('#vertex0').textContent,
        fragmentShader : document.querySelector('#fragment0').textContent
    });

    shaderMaterial.transparent = true;
    shaderMaterial.depthTest = false;
    var w = 80 * 1.1;
    var n = 18;
    var r = w  * 1/Math.PI * 2;
    for (var i=0; i<numPage; i++) {

        pageContent[i] = "";

        books[i] = new THREE.Mesh(
            geo[i][geoindex],
            shaderMaterial
        );


        books[i].doubleSided = true;
        var a = i/n * Math.PI*4 + Math.PI/2;
        books[i].position.x = Math.cos(Math.PI*0.9+a) * r;
        books[i].position.z = Math.sin(Math.PI*0.9+a) * r;
        books[i].rotation.y = Math.PI/2 - a;
        //book.position.x -= centerX;
        books[i].position.y -= centerY;
        //book.position.z = 0;
        top.add(books[i]);
      }

      scene.add(top);

/*
    var w = 80 * 1.0;
    var r = w * 1/2 * 1/Math.PI ;
    //var material = new THREE.MeshBasicMaterial( { color: 0xff0000 } );

    book = new THREE.Mesh(
        geo[geoindex],
        shaderMaterial
    //    material
    );

    book.doubleSided = true;

    var a = Math.PI/2;
    book.position.x -= centerX;
    book.position.y -= centerY;
    book.position.z = 0;
    top.add(book);

    scene.add(top);
*/

    //    camera.position.y = 40;
    camera.lookAt(scene.position);
    /*   var sp1 = WX.SP1({ ampSustain: 1.0 });

    sp1.to(WX.Master);

    sp1.onReady = function () {
        sp1.noteOn(60, 100);
    };
    sp1.loadClip({
        name: 'drums',
        url: './drums.mp3'
    });*/
    //  scene.add(geo);

    var tickState = 0;
    var droneState = false;
    var snapToggle = false;
    var tdscale = 5.0;

    var currengPage1StartTime = 0;
    var animate = function(t) {

        var alpha = 0.8;
        // get the average, bincount is fftsize / 2
        analyser.getByteFrequencyData(amplitudeArray);
        analyser.getByteTimeDomainData(amplitudeArray2);

        if(noiseBurstOn){
            noiseBurstAnalyser.getByteTimeDomainData(amplitudeArray3);
            var noiseVolume = getAverageVolume(amplitudeArray3);
            uniforms.noise.value = noiseVolume[0] / 128.0 * 0.005;
        }

        var resultArr = getAverageVolume(amplitudeArray);
        volume = alpha * (resultArr[0]/128.0) + (1-alpha) * volume;
        uniforms.volume.value = volume/1.5;
        freqIndex = resultArr[1];
        if(currentPage == 1 && lineindex[currentPage] <=8 ){
            camera.rotation.y -= 0.00015;
            uniforms.time.value += 0.05;
            uniforms.interval.value = Math.max(Math.min(interval,1.0),0.0);
        }
        else if ( currentPage >= 1){
            camera.rotation.y -= 0.00005;
            uniforms.time.value -= 0.12;
        }
        alpha = 0.85;
        uniforms.rightMostXCoord.value = rightMostXCoord;

        for (var l=0;l<512;l++){
            uniforms.timeDomain.value[l] = uniforms.timeDomain.value[l] * alpha + (1-alpha ) * (amplitudeArray2[l]/256.0-0.5) * tdscale;
        }
        try {
          renderer.render(scene, camera);
        }
        catch(err){
          console.error("renderer errorrorro ");
        }

        requestAnimationFrame(animate, renderer.domElement);
    };// the end of animate()



    animate(Date.now());
    //  document.body.appendChild(c);
    var down = false;
    var sx = 0, sy = 0;
    var toggle = true;




    var scaleModel = fbank.getScaleModel();
    //console.log(scaleModel);
    var oscillator_list = {};

    var interval = 1, alpha = 0.9, lastKeyTime = 0;
    var index = 30;
    var previousKeyPressTime = context.currentTime;
    var first = true;
    function equalPowerCrossfade (percent, gain1, gain2, amp1, amp2){
        var level1 = Math.cos(percent*0.5*Math.PI);
        var level2 = Math.cos((1.0-percent) * 0.5 * Math.PI);
        gain1.gain.value = level1 * amp1;
        gain2.gain.value = level2 * amp2 ;
    }

    var keyInterval = 0;
    var keyIntervalCnt = 0;

    window.onkeyup = function(ev){

         var keycode = ev.which;
         if(DEBUG){
            $("#keyup_debug").html(keycode);
            //        $("#start_down_debug").html(pos[0]);
            //        $("#end_down_debug").html(pos[1]);

            keyup_debug_color_index++;
            keyup_debug_color_index%=randomcolor.length;
            $("#keyup_debug").css("background-color", randomcolor[keyup_debug_color_index]);
        }
    };

    var currentOuput = 0.0; // noise burst output


    window.onkeydown = function(ev){
        if(enableCodeMirror)editor.focus();

        var keycode = ev.which;
        if(keycode <=46 || keycode >=91){
          socket.emit('message', '/key/'+keycode);
        }

        if (keycode == 8){// backspace
            // backspace is not supported for now. j
            ev.preventDefault();
        }
       /* else if (keycode == 18){ // alt key
          //  filterOn = !filterOn;
            console.log("filteron:" + filterOn);
            if (filterOn){
                level_reverb.disconnect(0.001);
                level_reverb.connect(filter);
                filter.connect(compressor);
            }else{
                filter.disconnect(0.001);
                level_reverb.disconnect(0.001);
                level_reverb.connect(compressor);
            }
        }*/
        else if (keycode == 93 || keycode == 18 || keycode == 92){ // right command key
          pageContent[currentPage] = editor.getDoc().getValue();
          var prevgeoindex = geoindex;
          geoindex++;
          geoindex%=2;
          geo[currentPage][geoindex] = geo[currentPage][prevgeoindex].clone();
          geoindex = 0;
          currentPage++;
          currentPage%=numPage;

          editor.getDoc().setValue(pageContent[currentPage]);
          editor.focus();
          editor.execCommand("goDocEnd")

            if (currentPage == 2){
                //
                var source = context.createBufferSource();
                var gain = context.createGain();
                gain.gain.value = 0.4;
                source.buffer = buffers['tick1'];
                //source.playbackRate.value = 1 + Math.random()*2;
                source.playbackRate.value = 0.3;
                source.connect(gain);
                gain.connect(compressor);
                source.start(0);
                if(chatterStart)
                {
                  chatter.start(0);
                  chatterStart = false;
                }
                reverseGate.params.mix.set(0.0,context.currentTime,1);
                reverseGate.params.mix.set(1.0,context.currentTime + 90,1);

            }
            else if (currentPage == 1){ // the 2nd page
              // the 2nd page shader
                var shaderMaterial = new THREE.ShaderMaterial({
                    uniforms : uniforms,
                    attributes : attributes,
                    vertexShader : document.querySelector('#vertex2').textContent,
                    fragmentShader : document.querySelector('#fragment2').textContent
                });
                shaderMaterial.transparent = true;
                shaderMaterial.depthTest = false;
                interval = 1.0;
                uniforms.time.value = 0;
                //for (var i=0; i< numPage-1; i++)
                books[1].material = shaderMaterial;
                if(!heartbeat.loop){
                  heartbeat.start(0);
                  heartbeat.loop = true;
                }


            }

        }
        else if (currentPage ==2 && lineindex[currentPage] >4 && (keycode == 69 || keycode == 79)){ // either e or o
        // clear the whole writing if commnad enter pressed.

            var dur = (keyInterval+0.1) / (keyIntervalCnt+0.1) / 4;
            noiseBurstadsr.play(0,dur, dur, dur, dur,1.0,0.1);

            noiseBurstOn = true;
            setTimeout(function(){
                noiseBurstOn = false;
                uniforms.noise.value = 0.0;
            }, dur * 4000)
        }
        else if(ev.shiftKey == true && keycode == 13){ // shift enter
            if ( currentPage == 2){
                noiseBurstadsr.node.gain.linearRampToValueAtTime(1.0, context.currentTime );
                noiseBurstadsr.node.gain.linearRampToValueAtTime(1.0, context.currentTime +8);
                uniforms.time.value -= 0.1;
                noiseBurstOn = true;
                masterGain.gain.linearRampToValueAtTime(1.0,context.currentTime);
                masterGain.gain.linearRampToValueAtTime(1.0,context.currentTime + 5);
                masterGain.gain.linearRampToValueAtTime(0.0,context.currentTime + 12);
            }
        }
          if(DEBUG){
            $("#keydown_debug").html(keycode);
    //        $("#start_down_debug").html(pos[0]);
    //        $("#end_down_debug").html(pos[1]);

            keydown_debug_color_index++;
            keydown_debug_color_index%=randomcolor.length;
            $("#keydown_debug").css("background-color", randomcolor[keydown_debug_color_index]);
        }
         // THIS IS OLD onkeypress part starting
        var keycode = ev.which;
        //  return;
        if(ev.ctrlKey == true){
          // turn on keycode
          var alphabetIndex = ev.key.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0) + 1;
          if (currentPage >= 1 && alphabetIndex>=0 && alphabetIndex <=26){
            coloredStr[alphabetIndex]++;
            coloredStr[alphabetIndex]%=3;
            uniforms.coloredStr.value = coloredStr;
          }
          else if(keycode == 189){
            tdscale--;
          }
          else if(keycode == 187){
            tdscale++;
          }
          else if (keycode == 49){ // 1 pressed
              pitch_convolver[pitch_convolver_id].buffer = buffers['june_A'];
              return;
          } else if (keycode == 50){ // 2 pressed
              pitch_convolver[pitch_convolver_id].buffer = buffers['june_B'];
              return;
          }
          else if (keycode == 51){ // 3 pressed
              pitch_convolver[pitch_convolver_id].buffer = buffers['june_C'];
              return;
          }
          else if (keycode == 52){ // 4 pressed
              pitch_convolver[pitch_convolver_id].buffer = buffers['june_D'];
              return;
          }
          else if (keycode == 53){ // 5 pressed
              pitch_convolver[pitch_convolver_id].buffer = buffers['june_E'];
              return;
          }
          else if (keycode == 54){ // 6 pressed
              pitch_convolver[pitch_convolver_id].buffer = buffers['june_F'];
              return;
          }
          else if (keycode == 55){ // 7 pressed
              pitch_convolver[pitch_convolver_id].buffer = buffers['june_G'];
              return;
          }
          else if (keycode == 56){ // 8 pressed
              pitch_convolver[pitch_convolver_id].buffer = buffers['june_A1'];
              return;
          }

          return;
        }


        if ( ev.shiftKey == true && ev.which == 13) // shift_enter
        {
            strPage[currentPage] = "";
        }

        // update the visual first.
        if (enableCodeMirror){
          var code = keycode;
        }
        else{
          var code = strPage[currentPage].charCodeAt(strPage[currentPage].length-1);
        }

        if(keycode>=49 && keycode<=56){
          //(delay, R, sustainlevel)
          pitch_convolver_ADSR[pitch_convolver_id].noteOff(0,2,1);
          pitch_convolver_id++;
          pitch_convolver_id%=2;
          pitch_convolver_ADSR[pitch_convolver_id].noteOn(0,1,0.1, 1, 1);

        }

        if(keycode == 57&&ev.metaKey){
          DEBUG = !DEBUG;
          $("#debug-panel").toggle();
        }

        if(keycode == 48&&ev.metaKey){
          snapToggle = !snapToggle
          rightMostXCoord = rightMostPosition*scaleX+offset;
        }






        if(!enableCodeMirror){


          var prevgeoindex = geoindex;
          geoindex++;
          geoindex%=2;
          geo[currentPage][geoindex] = geo[currentPage][prevgeoindex].clone();
          if ( currentPage == 2 && currentLine[2] <-7 && keycode >= 97 && keycode <=122)
              keycode -= getRandomInt(0,1) * 32;
          strPage[currentPage] +=String.fromCharCode(keycode);
          if (lineindex[currentPage] <=11 && currentPage == 0)
              volume = 0;
          addLetter(strPage[currentPage].charCodeAt(strPage[currentPage].length-1),strPage[currentPage].length-1,volume);
          if (currIndex[currentPage] == letterPerLine){
              strPage[currentPage] += "\n";
              addLetter(code,strPage[currentPage].length-1,0);
          }
        }

        var currentTime = context.currentTime;

        keyInterval += currentTime - previousKeyPressTime;
        keyIntervalCnt ++;
        previousKeyPressTime = currentTime;
        // play dron if interval is over threhold?
        if ( keycode == 13 || keycode == 32 ){ // space or enter
            var avgInterval = keyInterval/keyIntervalCnt;
                // play drone sound
            console.log("space or enter : " + avgInterval + "(" + keyInterval + "," + keyIntervalCnt + ")");

            if ( droneState && avgInterval > 0.4){
                var randompitch = [26,27,28,29,29,34][getRandomInt(0,5)];
                console.log("drone triggered : " + randompitch);
                var osc = new Oscillator(randompitch, 'sawtooth');
                var adsr = new ADSR();
                osc.node.connect(adsr.node);
                adsr.node.connect(reverb2);

                osc.play(0);
                osc.stop(context.currentTime +keyInterval);
                var dur = keyInterval/4;
                adsr.play(0,dur, dur, dur, dur,0.1,0.05);
            }
            keyInterval = 0;
            keyIntervalCnt = 0;
        }else if (keycode == 49 && ev.shiftKey == true ){
          // disable drone
          droneState = !droneState;
          if(droneState){
            //sourceMic.connect(pitch_convolver[0]); // ON/OFF
            //sourceMic.connect(pitch_convolver[1]); // ON/OFF
            pitch_convolver_level.gain.linearRampToValueAtTime(1.0, context.currentTime + 0.1);
            gain_filterbank.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.1);
            triangle_drone.gain.linearRampToValueAtTime(1.0, context.currentTime + 0.1);
          }else{
            //sourceMic.disconnect(pitch_convolver[0]); // ON/OFF
            //sourceMic.disconnect(pitch_convolver[1]); // ON/OFF
            pitch_convolver_level.gain.linearRampToValueAtTime(0.0, context.currentTime + 0.1);
            triangle_drone.gain.linearRampToValueAtTime(0.0, context.currentTime + 0.1);
            gain_filterbank.gain.linearRampToValueAtTime(0.0, context.currentTime + 0.1);
          }
        }
        else if (keycode == 191){ // question marks
            tickState ++;
            if (tickState == 1){
               // reverseGate.set('mix', 1.0,context.currenTime + 10);

                delay.params.mix.set(0.0,context.currentTime,1);
                delay.params.mix.set(0.0,context.currentTime+60,1);
                delay.params.mix.set(1.0,context.currentTime+90,1);
                delay.params.mix.set(0.0,context.currentTime+120,1);

                gain_filterbank.gain.value = 0.0;
                noise.to(fbank).to(cverb).to(gain_filterbank);
                chatter.to(fbank._inlet);


                gain_filterbank.connect(compressor)
                gain_filterbank.gain.linearRampToValueAtTime(0., context.currentTime);
                if(droneState)gain_filterbank.gain.linearRampToValueAtTime(0.3, context.currentTime + 3);

            }
        }



        //gain.connect(pitch_convolver);
        //  gain.connect(level_reverb);
        // pitch_convolver.connect(compressor);
        //    gain.connect(context.destination);
/*
        if(Math.random() > 0.95){
          var randomPitch = 24 + getRandomInt(-3,12);

          var osc = new Oscillator(randomPitch, 'triangle');
          var adsr = new ADSR();
          osc.node.connect(adsr.node);
          adsr.node.connect(level_reverb);

          osc.play(0);
          osc.stop(context.currentTime + 3.2);
          adsr.play(0,0.1,0.1,2,1);
        }
*/

        var currentTime = (new Date()).getTime();
        if (lastKeyTime == 0)
            lastKeyTime = currentTime;
        interval = interval * alpha + (1-alpha) * (currentTime - lastKeyTime) / 1000.0;
        if ((currentTime - lastKeyTime) / 1000.0 > 0.5)
            interval = 1;
        //interval = (currentTime - lastKeyTime);
        //  console.log(interval);
        lastKeyTime = currentTime;


        if (tickState%2== 1){ // alternate by question mark.
            var source = context.createBufferSource();
            source.buffer = buffers['tick1'];
            //source.playbackRate.value = 1 + Math.random()*2;
            var freqNum = keycode;
            if(ev.shiftKey){
              freqNum-=32;
            }
            source.playbackRate.value = 0.2 + (freqNum-65) / 60*4;
            source.connect(reverseGate._inlet);
            source.start(0);
        }

        if (currentPage == 2){ // the third page
            var length = editor.getDoc().getValue().length;
            var percent = WX.clamp(length/numCharPage[currentPage],0,1.0);
            // slowly increase
            equalPowerCrossfade(percent, chatter_filterGain, chatter_reverbGain, 0.5, 0.1);
            currentOuput = noiseBurst.get('output');
            noiseBurst.params.output.set(currentOuput, context.currentTime, 1);
            currentOuput = percent * 0.1;
            noiseBurst.params.output.set(currentOuput, context.currentTime + 0.1, 1);
        }

        if (code == 10 || code == 13){ // enter or linebreak (carrige return)
            lineindex[currentPage] = editor.getDoc().lineCount()-1;

            fbank.set('scale', scaleModel[getRandomInt(0,3)].value, WX.now + 4, 2);
           // fbank.set('pitch', fbank_pitchset[getRandomInt(0,3)]);
            if (lineindex[currentPage] == 2 && currentPage == 0){ // the third line the first page
              level_reverb.gain.linearRampToValueAtTime(0.0, context.currentTime )
              level_reverb.gain.linearRampToValueAtTime(1.0, context.currentTime + 30)

              if(droneState){
                triangle_osc.node.connect(triangle_adsr.node);
              }
              triangle_adsr.node.connect(triangle_drone);
              triangle_drone.connect(level_reverb);

              triangle_osc.play(0);
              // osc.stop(context.currentTime + 300);
              //adsr.play(0,30,120,30,120,0.05,0.025);
              triangle_adsr.noteOn(0,30,600,0.07,0.03);
              triangle_osc.node.detune.linearRampToValueAtTime(0.0, context.currentTime);
              triangle_osc.node.detune.linearRampToValueAtTime(0.0, context.currentTime + 30);
              triangle_osc.node.detune.linearRampToValueAtTime(900, context.currentTime + 120);
              triangle_osc.node.detune.linearRampToValueAtTime(200, context.currentTime + 240);
            }
            else if (lineindex[currentPage] == 4 && currentPage == 0){ // thr fifth line the first page
                var shaderMaterial = new THREE.ShaderMaterial({
                    uniforms : uniforms,
                    attributes : attributes,
                    vertexShader : document.querySelector('#vertex1').textContent,
                    fragmentShader : document.querySelector('#fragment1').textContent
                });
                shaderMaterial.transparent = true;
                shaderMaterial.depthTest = false;
                // turn on reverb gain slowly.
                for (var i=0; i< numPage; i++)
                    books[i].material = shaderMaterial;

           }else if (lineindex[currentPage] == 7&& currentPage == 2){
             if(!ending.loop){
               ending.start(0);
               ending.loop = true;
             }
           }


        }

     //books[currentPage].geometry = geo[currentPage][geoindex];
     // let's play pause until

     if (!pauseFlag) return;
     if (currentPage < 1) return;

     if(pause_handle){
       pause_handle.noteOff(1,0.1,0.5);
       pause.stop(context.currentTime + 3)
     }

      pause = context.createBufferSource();
      pause.loop = true;
      pause_handle = new ADSR();
      pause.connect(pause_handle.node);
      pause_handle.node.connect(level_reverb);
      var rn = Math.random();
      if(rn < 0.5){
        pause.buffer = buffers['pause1'];
      }else {
        pause.buffer = buffers['pause2'];
      }
      //source.playbackRate.value = 1 + Math.random()*2;
      pause.playbackRate.value = (1 + (keycode%65) / 200*4)*0.2 * (keycode%4+1) ;
      pause.start(context.currentTime + 3);
      //pause_handle.noteOn(1,7,7, 0.3, 0);
      pause_handle.play(3,12, 3, 3, 3,1.0,0.1)
    }

    window.onkeypress = function(ev){
      var keycode = ev.which;

      if(DEBUG){
         $("#keypress_debug").html(keycode);
           //        $("#start_down_debug").html(pos[0]);
           //        $("#end_down_debug").html(pos[1]);
         keypress_debug_color_index++;
         keypress_debug_color_index%=randomcolor.length;
         $("#keypress_debug").css("background-color", randomcolor[keypress_debug_color_index]);
     }
    }
    var zoom = function(ds){
      var fov = camera.fov * ds;
      fov = Math.min(120, Math.max(1, fov));
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    var zoomabs = function(ds){
      var fov = 45 / ds;
      fov = Math.min(120, Math.max(1, fov));
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    var wheelHandler = function(ev) {
      socket.emit('message', '/wheel/'+ev.wheelDelta);

        var ds = (ev.detail < 0 || ev.wheelDelta > 0) ? (1/1.01) : 1.01;
        if (ev.detail < 0 || ev.wheelDelta > 0) {
          heartbeatGainValue += 0.01;
          if(ending.loop)  endingGainValue -= 0.002;
        }else{
          heartbeatGainValue -= 0.01;
          if(ending.loop)  endingGainValue += 0.002;
        }

        heartbeatGain.gain.value = WX.clamp(heartbeatGainValue,0,1);
        endingGain.gain.value = WX.clamp(endingGainValue,0,1);
        zoom(ds);
        ev.preventDefault();

    };

    socket.on('message2', function(obj) {
      var osc_received = document.getElementById("osc_received");
      if(osc_received)
        osc_received.innerHTML = obj;
      console.log("received osc messages", obj);
      if(obj[0] == "/zoom"){
        zoomabs(obj[1]+1);
      }else if (obj[0] == "/camrotate"){
        camera.rotation.x = obj[1] *3.14159;
        camera.rotation.y = obj[2] *3.14159;
        camera.rotation.z = obj[3] *3.14159;
      }
      else if(obj[0] == "/camtranslate"){
        camera.position.x = obj[1]*50;
        camera.position.y = obj[2]*50;
        camera.position.z = obj[3]*50;
      }else if(obj[0] == "/panic"){
        panicCamera();
      }else if(obj[0] == "/color"){
        console.log(obj[1]| 0x000000);
        if(obj.length==4){
          renderer.setClearColor('rgb('+parseInt(obj[1]*255)+","+parseInt(obj[2]*255)+","+parseInt(obj[3]*255)+")");
        }else if (obj.length == 2){
          var grayColor = parseInt(obj[1]*255);
            renderer.setClearColor('rgb('+grayColor+","+grayColor+","+grayColor+")");
        }else{
          alert("We need 3 parameters for /color");
        }
      }else if(obj[0] == "/fontcolor"){
        if(obj.length!=2){
          alert("We need 1 parameters for /color")
        }else{
          uniforms.fontcolor.value = obj[1];
        }
      }else if (obj[0] == "/add"){
        var content = obj[1];
        var doc = editor.getDoc();
        if(obj.length>2){
          var  line = parseInt(obj[2]),
          ch = parseInt(obj[3]);
          if (!Number.isInteger(line) || !Number.isInteger(ch)){
            alert("received osc message contains non-numbers : ", obj);
            return;
          }

        }else{
          var line = doc.getCursor().line,
          ch = doc.getCursor().ch; // gets the line number in the cursor position
        }
        oscAdded = true;

        if (content == 32){
          doc.replaceRange(" ", { // create a new object to avoid mutation of the original selection
              line: line,
              ch: ch // set the character position to the end of the line
          });
        }else if (content == 13){
          doc.replaceRange("\n", { // create a new object to avoid mutation of the original selection
              line: line,
              ch: ch // set the character position to the end of the line
          });
        }else if (content == 9){
          doc.replaceRange("\t", { // create a new object to avoid mutation of the original selection
              line: line,
              ch: ch // set the character position to the end of the line
          });
        }else{
          doc.replaceRange(content, { // create a new object to avoid mutation of the original selection
              line: line,
              ch: ch // set the character position to the end of the line
          });
          if (tickState%2== 1){ // alternate by question mark.
              var source = context.createBufferSource();
              source.buffer = buffers['tick1'];
              //source.playbackRate.value = 1 + Math.random()*2;
              var freqNum = content.charCodeAt(0)
              ;
              source.playbackRate.value = 0.2 + (freqNum-65) / 60*4;
              source.connect(reverseGate._inlet);
              source.start(0);
          }
        }
      }
      else if (obj[0] == "/remove"){
        if(obj.length!=5){
          alert("removed requires 4 more parameters", obj);
          return;
        }
        var startLine = parseInt(obj[1]),
        startCh = parseInt(obj[2]),
        endLine = parseInt(obj[3]),
        endCh = parseInt(obj[4]);
        oscRemoved = true;
        editor.getDoc().setSelection({line:startLine, ch:startCh}, {line:endLine, ch:endCh});
        editor.getDoc().replaceSelection("");
      }
      else{
        alert("unknown osc message: Cannot parse it ", obj);
      }

      return;
    });



    window.addEventListener('DOMMouseScroll', wheelHandler, false);
    window.addEventListener('mousewheel', wheelHandler, false);
    var drone;
    var pitchListforDrone = [15,17,22,21,16,10];
    var pitchIndex=0;
    window.onmousemove = function(ev) {
        if (down) {
          socket.emit('message', '/mousedrag/'+ev.clientX+ '/' + ev.clientY);

            var dx = ev.clientX - sx;
            var dy = ev.clientY - sy;
      //      books[currentPage].rotation.x += dy/50.0;
    //        books[currentPage].rotation.y += dx/50.0;
            camera.rotation.y += dx/500 * (camera.fov/45);
            //camera.rotation.y += dx/500 * (camera.fov/45);;
            camera.rotation.x += dy/500 * (camera.fov/45);
            sx += dx;
            sy += dy;
            //hellow
            if (drone){
              drone.detune(dy);
              if (dx > 0){
                panNode.pan.value += 0.05;
              }
              else if (dx < 0){
                panNode.pan.value -= 0.05;
              }
              if (panNode.pan.value >=1){
                panNode.pan.value = 1;
              }else if (panNode.pan.value <= -1)
              {
                panNode.pan.value = -1;
              }
            }
        }
        else{
          socket.emit('message', '/mousemove/'+ev.clientX+ '/' + ev.clientY);
        }
    };
    var reached = false
    window.onmousedown = function (ev){
      socket.emit('message', '/mousedown/'+ev.clientX+ '/' + ev.clientY);

       if (ev.target == renderer.domElement) {
            down = true;
            sx = ev.clientX;
            sy = ev.clientY;
       }
//function ScissorVoice(noteNum, numOsc, oscType, detune){
        if ( currentPage >= 1 || reached){
          reached = true;
            if (drone){
                drone.output.noteOff(0,1,drone.maxGain*2.0);
                drone.stop(context.currentTime + 1);
            }
           drone = new ScissorVoice(pitchListforDrone[pitchIndex]+12,getRandomInt(7,10),"triangle", 12);
           //drone = new ScissorVoice(pitchListforDrone[pitchIndex],getRandomInt(3,10),"triangle", [3,5,7,12][getRandomInt(0,3)]);
           drone.connect(panNode);
           panNode.pan.value = 0;
           drone.detune(getRandomInt(0,100));

           drone.output.noteOn(0,1,6000,drone.maxGain*5.0,drone.maxGain*5.0);
           pitchIndex+=getRandomInt(0,1);
           pitchIndex %= pitchListforDrone.length;
        }
    };
    window.onmouseup = function(ev){
        down = false;
        socket.emit('message', '/mouseUp/'+ev.clientX+ '/' + ev.clientY);

        if ( drone && currentPage >= 1)
        { // ADSR.prototype.noteOff= function(delay, R, sustainlevel){
            drone.output.noteOff(0,1,drone.maxGain);
            drone.stop(context.currentTime + 1);
            delete drone;
        }
    };


    var changeCodeMirrorFunc = function(instance, change){
      if(DEBUG)console.log(change);
      if(change.origin=="setValue")
        return;
      var startLine = change.from.line;
      var startCh = change.from.ch;
      var endLine = change.to.line;
      var endCh = change.to.ch;
      var sizeFactor = 0;
      var added = change.text.join('\n').length>0
      var removed = change.removed.join('\n').length>0

      if (editor.getDoc().lineCount() <=8 && currentPage == 0)
        volume = 0;
      sizeFactor = volume;


      // create a new geometry
      var prevgeoindex = geoindex;
      geoindex++;
      geoindex%=2;
      geo[currentPage][geoindex] = geo[currentPage][prevgeoindex].clone();

      // take care of removed first.
      if(removed){
        if(!oscRemoved){
          socket.emit('message', '/removed/'+change.from.line+"/" + change.from.ch+" " +change.removed.join('\n'));
          oscRemoved = false;
        }

        // if nothing is added, we need to move
        // if anything is added, we do not need to move as next if block will set it in a correct position.
        for (var j=startCh; j<startCh + change.removed[0].length; j++){
          removeLetterCodeMirror(startLine,j);
        }

/*
        for (var i=1; i< change.removed.length-1; i++){
          for (var j=0; j<change.removed[i].length; j++){
            removeLetterCodeMirror(startLine+i,j);
          }
        }
*/
        if (startLine != endLine){
          for (var j=0; j<endCh; j++){
            removeLetterCodeMirror(endLine,j);
          }
          // the ones in the middle if the selection is more than two lines
         for (var i=startLine+1; i< endLine; i++){
           if(change.removed[i-startLine] == undefined){
             alert("oops no removed[i] is undefined");
             debugger;
           }
           for (var j=0; j<change.removed[i-startLine].length; j++){
             removeLetterCodeMirror(i,j);
           }
         }
        }

        // shift any leftover in the firstline
        if (change.removed.length==1 ){// for the first line we need to shift any following letters.
          if(endCh < cmGrid[currentPage][startLine].length){
            if(startLine != endLine) alert("startLine is not same as endLine something wrong.");
            for (var i=endCh; i<cmGrid[currentPage][endLine].length; i++){
              shiftLetterHorizontallyCodeMirror(endLine,i,-change.removed[0].length);
              cmGrid[currentPage][endLine][i - change.removed[0].length] = cmGrid[currentPage][endLine][i];
            }
          }
          cmGrid[currentPage][startLine].splice(cmGrid[currentPage][startLine].length-(endCh-startCh),change.removed[0].length);
        }


        // shift the first line leftover after endLine
        if (change.removed.length>1 ){// for the first line we need to concatenate them to the line
          for (var i=endCh; i<cmGrid[currentPage][endLine].length; i++){
            if(startCh-endCh !=0)
              shiftLetterHorizontallyCodeMirror(endLine,i,startCh-endCh);
            shiftLetterVerticallyCodeMirror(endLine,i,startLine-endLine);
            cmGrid[currentPage][startLine][startCh+i-endCh] = cmGrid[currentPage][endLine][i];
          }
          cmGrid[currentPage][startLine].splice(startCh+(cmGrid[currentPage][endLine].length-endCh),cmGrid[currentPage][startLine].length - startCh+(cmGrid[currentPage][endLine].length-endCh));


          for (var i=endLine+1; i<cmGrid[currentPage].length; i++){
            for (var j=0; j<cmGrid[currentPage][i].length; j++){
              shiftLetterVerticallyCodeMirror(i,j,startLine-endLine);
            }
          }
          cmGrid[currentPage].splice(startLine+1,endLine-startLine);
          if(cmGrid[currentPage][startLine].length == 0)
            cmGrid[currentPage].splice(startLine, 1);
        }
      }



      if(added){

        var joinedText = change.text.join("\n");
          if(!oscAdded){
            socket.emit('message', '/added/'+change.from.line+"/" + change.from.ch+" " +joinedText);
            oscAdded = false;
          }

        if(cmGrid[currentPage][startLine]=== undefined){
          cmGrid[currentPage][startLine] = [];
        }


        if(change.text.length == 1){
          // the first line first.
          // visually move
          for (var i=startCh; i<cmGrid[currentPage][startLine].length; i++){
            shiftLetterHorizontallyCodeMirror(startLine,i,change.text[0].length);
          }
          // update datastructure move
          for (var i=0; i<change.text[0].length; i++){
            cmGrid[currentPage][startLine].splice(startCh,0,undefined);
          }
        }else{
          // last line shifting
          for (var i=startCh; i<cmGrid[currentPage][startLine].length; i++){
            if(change.text.length>1)
              shiftLetterVerticallyCodeMirror(startLine,i,change.text.length-1);
            shiftLetterHorizontallyCodeMirror(startLine,i,-startCh+change.text[change.text.length-1].length);
          }
          // following lines shifting
          for (var i=startLine+1; i<cmGrid[currentPage].length; i++){
            for (var j=0; j<cmGrid[currentPage][i].length; j++){
              shiftLetterVerticallyCodeMirror(i,j,change.text.length-1);
            }
          }

          for (var i=1; i<change.text.length; i++){
            cmGrid[currentPage].splice(startLine+1, 0, []);
          }
          var len = cmGrid[currentPage][startLine].length;
          // update the data structure;
          for (var i=startCh; i<len; i++){
            var object = cmGrid[currentPage][startLine].pop();
            cmGrid[currentPage][startLine + change.text.length-1].splice(0,0,object);
          }

          // make a space for overwrite
          for (var i=0; i<change.text[change.text.length-1].length; i++){
            cmGrid[currentPage][startLine + change.text.length-1].splice(0,0,undefined);
          }

        }

        // add first line;
        for (var j=0; j< change.text[0].length; j++){
          addLetterCodeMirror(startLine, j+startCh, sizeFactor, change.text[0][j]);
        }

        // middle lines to the last lines
        for (var i=1; i<change.text.length; i++){
          for (var j=0; j<change.text[i].length; j++){
            addLetterCodeMirror(startLine+i, j, sizeFactor, change.text[i][j]);
          }
        }

// sanity check

      }//

      books[currentPage].geometry = geo[currentPage][geoindex];
/*

      if (instance.getDoc().lineCount() != cmGrid[currentPage].length && !(instance.getDoc().lineCount()==1&&cmGrid[currentPage].length==0)){

        console.error("line does not match");
        debugger;
      }

      if(!(instance.getDoc().lineCount()==1&&cmGrid[currentPage].length==0)){
        for (var i=0; i<instance.getDoc().lineCount(); i++){
          if(instance.getDoc().getLine(i).length!= cmGrid[currentPage][i].length){
            console.error("line", i, "doesnot match");
            debugger;
          }
          for (var j=0; j<instance.getDoc().getLine(i).length; j++){
            if(instance.getDoc().getLine(i)[j]!= cmGrid[currentPage][i][j].char){
              console.error("character", i, "doesnot match");
              debugger;
            }
          }
        }
      }

*/

    };
    if(enableCodeMirror){
        editor.on("change", changeCodeMirrorFunc);
    }

    //editor.on("cursorActivity", cursorCodeMirrorFunc);
    //editor.on("scroll", viewPortchangeCodeMirrorFunc);



}; // end of window.onload = function() {
