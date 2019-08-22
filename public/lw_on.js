
var socket = io('http://localhost:8081');		var cursorNotSelected = true;
var cursorColor = 0xa3c6ff;
var oscAdded = false;
var oscRemoved = false;
//socket = io.connect('https://localhost', { port: 8081, rememberTransport: false});
//var socket = io('http://localhost:8081');

socket.on('connect_failed', function(obj){
    console.log('Connection Failed\n', obj);
});

var audioSource1;
var audioSource2;
var analyser1;
var analyser2;
var gSizeFactor = 0;
var gFadeInDelay = 0.0;
var gDisintegrateSpeed = 1.0;
var gLayer = 0;

function audioContextReady(){
  // Start off by initializing a new context.
  context = new (window.AudioContext || window.webkitAudioContext)();
  var compressor = context.createDynamicsCompressor();
      compressor.threshold.value = 10;
      compressor.ratio.value = 20;
      compressor.reduction.value = -20;
  compressor.connect(context.destination);


  if (!context.createGain)
    context.createGain = context.createGainNode;
  if (!context.createDelay)
    context.createDelay = context.createDelayNode;
  if (!context.createScriptProcessor)
    context.createScriptProcessor = context.createJavaScriptNode;

  // shim layer with setTimeout fallback
  window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function( callback ){
    window.setTimeout(callback, 1000 / 60);
  };
  })();


  function playSound(buffer, time) {
    var source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source[source.start ? 'start' : 'noteOn'](time);
  }

  function loadSounds(obj, soundMap, callback) {
    // Array-ify
    var names = [];
    var paths = [];
    for (var name in soundMap) {
      var path = soundMap[name];
      names.push(name);
      paths.push(path);
    }
    bufferLoader = new BufferLoader(context, paths, function(bufferList) {
      for (var i = 0; i < bufferList.length; i++) {
        var buffer = bufferList[i];
        var name = names[i];
        obj[name] = buffer;
      }
      if (callback) {
        callback();
      }
    });
    bufferLoader.load();
  }

  BufferLoader = function (context, urlList, callback) {
    this.context = context;
    this.urlList = urlList;
    this.onload = callback;
    this.bufferList = new Array();
    this.loadCount = 0;
  }

  hasGetUserMedia = function () {
    return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
              navigator.mozGetUserMedia || navigator.msGetUserMedia);
  }

  BufferLoader.prototype.loadBuffer = function(url, index) {
    // Load buffer asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    var loader = this;

    request.onload = function() {
      // Asynchronously decode the audio file data in request.response
      loader.context.decodeAudioData(
        request.response,
        function(buffer) {
          if (!buffer) {
            alert('error decoding file data: ' + url);
            return;
          }
          loader.bufferList[index] = buffer;
          if (++loader.loadCount == loader.urlList.length)
            loader.onload(loader.bufferList);
        },
        function(error) {
          console.error('decodeAudioData error', error);
        }
      );
    }

    request.onerror = function() {
      alert('BufferLoader: XHR error');
    }

    request.send();
  };

  BufferLoader.prototype.load = function() {
    for (var i = 0; i < this.urlList.length; ++i)
    this.loadBuffer(this.urlList[i], i);
  };


  if (!hasGetUserMedia()) {
      alert('getUserMedia() is not supported in your browser. Please visit http://caniuse.com/#feat=stream to see web browsers available for this demo.');
  }

  context.resume().then(() => {
    console.log('Playback resumed successfully');
  });

  volume = 0;
  freqIndex = 0;

  navigator.getUserMedia = (navigator.getUserMedia ||
                            navigator.webkitGetUserMedia ||
                            navigator.mozGetUserMedia ||
                            navigator.msGetUserMedia);

  analyser1 = context.createAnalyser();
  analyser2 = context.createAnalyser();

  analyser1.smoothingTimeConstant = 0.3;
  analyser1.fftSize = 512;

  analyser2.smoothingTimeConstant = 0.3;
  analyser2.fftSize = 512;


  var audioSelect1 = document.querySelector('select#audioSource1');
  var audioSelect2 = document.querySelector('select#audioSource2');

  function getSourceID(){
    var MicId = this.item(this.selectedIndex).value;
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
           navigator.mediaDevices.getUserMedia (audioOpts).then(
          // Success callback
            function(stream) {
                if (sourceType == "audioSource1") {
                    audioSource1 =  context.createMediaStreamSource(stream);
                    audioSource1.connect(analyser1); // ON/OFF
                }
                else if (sourceType == "audioSource2"){ // first selected (e.g. mic from audio interface)
                    audioSource2 = context.createMediaStreamSource(stream);
                    audioSource2.connect(analyser2); // ON/OFF
                }
            })
            .catch(  function(err) {
                console.log('The following gUM error occured: ' + err);
            }); // end of navigator.getUserMedia
      } else {
      console.log('getUserMedia not supported on your browser!');
      }
  }

  audioSelect1.onchange = getSourceID;
  audioSelect1.sourceType = "audioSource1";
  audioSelect2.onchange = getSourceID;
  audioSelect2.sourceType = "audioSource2";
//https://simpl.info/getusermedia/sources/
  function gotSource(sourceInfo) {
      var option1 = document.createElement('option');
      var option2 = document.createElement('option');
      option1.value = sourceInfo.deviceId;
      option2.value = sourceInfo.deviceId;
      if (sourceInfo.kind === 'audioinput') {
        option1.text = sourceInfo.label || 'microphone ' + (audioSelect1.length);
        option2.text = sourceInfo.label || 'microphone ' + (audioSelect1.length);
      audioSelect1.appendChild(option1);
      audioSelect2.appendChild(option2);
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


  analyzerFreqArray1 =  new Uint8Array(analyser1.frequencyBinCount);
  analyzerAmpArray1 =  new Uint8Array(analyser1.frequencyBinCount);
  analyzerFreqArray2 =  new Uint8Array(analyser2.frequencyBinCount);
  analyzerAmpArray2 =  new Uint8Array(analyser2.frequencyBinCount);



  getAverageVolume = function (array) {
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

  animate(Date.now());

  $("#micselect").show();
  $("#audoiContexReady").hide();



}

var port ="";


socket.on('connect', function() {
    console.log('Connected');

     // sends to socket.io server the host/port of oscServer
     // and oscClient
     socket.emit('config',
         {
             server: {
                 port: port,// listening to 3333
                 host: '127.0.0.1'
             },
             client: {
                 port: 3334,// sending to 3334
                 host: '127.0.0.1'
             }
         }
     );
 });


function getRandomInt (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

window.onload = function() {


    var DEBUG = true;
    var enableSound = true;
    var enableCodeMirror = true;
    var  randomcolor = [ "#c0c0f0", "#f0c0c0", "#c0f0c0", "#f090f0", "#90f0f0", "#f0f090"],
       keyup_debug_color_index=0,
       keydown_debug_color_index=0,
       keypress_debug_color_index=0;


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

    $("#micselect").hide();

    while(isNaN(parseInt(port)) || parseInt(port) < 1024 || parseInt(port)>65535){
      port =  prompt("Please enter port number [1024,65535] that the livewriting will listen to", "3333");
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

    $("#audoiContexReadyButton").click(audioContextReady);

    // set up forked web audio context, for multiple browsers
    // window. is needed otherwise Safari explodes


    // load the sound
    if(DEBUG==true){
      $("#debug-panel").show();
    }
    else{
      $("#debug-panel").hide();
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
      alphabetIndex:{type:'f', value: []},
      appearTime:{type:'f',value:[]},
      disintegrateTime:{type:'f',value:[]},
      disintegrateXSpeed:{type:'f',value:[]},
      disintegrateYSpeed:{type:'f',value:[]},
      letterAlpha:{type:'f',value:[]}
    };



// keycode table is available here
// https://css-tricks.com/snippets/javascript/javascript-keycodes/
    var sanityCheckRegion = function(startLine, startCh, endLine, endCh){
      if( startLine > endLine){
        alert("disintegrate parameters error:startLine("+ startLine + ") > endLine(" + endLine + ")");
        return false;
      }

      if( startLine == endLine && startCh >=endCh){
        alert("disintegrate parameters error:startCh("+ startCh + ") > endCh(" + endCh + ")");
        return false;
      }

      if(cmGrid[currentPage] == undefined
        || cmGrid[currentPage][startLine]== undefined
        || cmGrid[currentPage][startLine][startCh] == undefined){
        alert("No letter at the specified starting position is not available");
        return false;
      }

      if(cmGrid[currentPage] == undefined
        || cmGrid[currentPage][endLine]== undefined
        || cmGrid[currentPage][endLine][endCh] == undefined){
        alert("No letter at the specified ending position is not available");
        return false;
      }

      return true;

    }

    var setRegionAlpha = function(startLine, startCh, endLine, endCh, alpha){
      if(!sanityCheckRegion(startLine, startCh, endLine, endCh))
        return;

      var setLetterAlpha = function(strIndex){
          for (var k=0; k<4;k++){
            attributes.letterAlpha.value[strIndex*4+k] = alpha;
          }
      }

      if(startLine == endLine){// if they are the same lines
        for (var j=startCh; j<endCh; j++){
        //  removeLetterCodeMirror(startLine,j);
          setLetterAlpha(cmGrid[currentPage][startLine][j].index);
        }
      }
      else{// if they are not the same lines
        // the first line
        for (var j=startCh; j< cmGrid[currentPage][startLine].length; j++){
          setLetterAlpha(cmGrid[currentPage][startLine][j].index);
        }

        // the last line
        for (var j=0; j<endCh; j++){
          setLetterAlpha(cmGrid[currentPage][endLine][j].index);

        }

        // the ones in the middle if the selection is more than two lines
        for (var i=startLine+1; i< endLine; i++){
          if(cmGrid[currentPage][i] == undefined){
            alert("oops no removed[i] is undefined");
            debugger;
          }
          for (var j=0; j<cmGrid[currentPage][i].length; j++){
            setLetterAlpha(cmGrid[currentPage][i][j].index);

          }
        }
      }
      attributes.letterAlpha.needsUpdate = true;

    }

    var disintegrate = function(startLine, startCh, endLine, endCh, direction){
      // sanity check
      // 1. startLine < endLine
      // 2. startLine,startCh exists
      // 3. endLine,endCh exists

      if(!sanityCheckRegion(startLine, startCh, endLine, endCh))
        return;
      var object;
      var strIndex;
      var disintegrateTime = uniforms.time.value;

      var setDisintegrate = function(strIndex,_direction){

        if(_direction){
          var ranndomAngle = Math.PI * 2 * Math.random();
          for (var k=0; k<4;k++){
            attributes.disintegrateTime.value[strIndex*4+k] = disintegrateTime;
            attributes.disintegrateXSpeed.value[strIndex*4+k] = Math.cos(ranndomAngle) * gDisintegrateSpeed;
            attributes.disintegrateYSpeed.value[strIndex*4+k] = Math.sin(ranndomAngle) * gDisintegrateSpeed;
          }
        }else{
          for (var k=0; k<4;k++){
            attributes.disintegrateTime.value[strIndex*4+k] = disintegrateTime;
            attributes.disintegrateXSpeed.value[strIndex*4+k] = 0 ;
            attributes.disintegrateYSpeed.value[strIndex*4+k] = 0;
          }
        }
      }

      if(startLine == endLine){// if they are the same lines
        for (var j=startCh; j<endCh; j++){
        //  removeLetterCodeMirror(startLine,j);
          setDisintegrate(cmGrid[currentPage][startLine][j].index,direction);
        }
      }
      else{// if they are not the same lines
        // the first line
        for (var j=startCh; j< cmGrid[currentPage][startLine].length; j++){
          setDisintegrate(cmGrid[currentPage][startLine][j].index,direction);
        }

        // the last line
        for (var j=0; j<endCh; j++){
          setDisintegrate(cmGrid[currentPage][endLine][j].index,direction);

        }

        // the ones in the middle if the selection is more than two lines
        for (var i=startLine+1; i< endLine; i++){
          if(cmGrid[currentPage][i] == undefined){
            alert("oops no removed[i] is undefined");
            debugger;
          }
          for (var j=0; j<cmGrid[currentPage][i].length; j++){
            setDisintegrate(cmGrid[currentPage][i][j].index,direction);

          }
        }
      }

      attributes.disintegrateTime.needsUpdate = true;
      attributes.disintegrateXSpeed.needsUpdate = true;
      attributes.disintegrateYSpeed.needsUpdate = true;
    }

    var removeLetterCodeMirror = function(line,ch){
      var object = cmGrid[currentPage][line][ch];
      var strIndex = object.index;

      console.log("removing letter index(",line,",",ch,") : ", strIndex);
      geo[currentPage][geoindex].vertices[strIndex*4].z = +50;
      geo[currentPage][geoindex].vertices[strIndex*4+1].z = +50;
      geo[currentPage][geoindex].vertices[strIndex*4+2].z = +50;
      geo[currentPage][geoindex].vertices[strIndex*4+3].z = +50;
    }
    //end of removeLetterCodeMirror

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
    // end of shiftLetterVerticallyCodeMirror


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
    // end shiftLetterHorizontallyCodeMirror

    var addLetterCodeMirror = function (line, ch, sizeFactor, char, zLayer){
      zLayer = zLayer ? zLayer : 0;
      if (rightMostPosition<ch){
          rightMostXCoord = ch*scaleX+offset;
          rightMostPosition = ch;
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
          new THREE.Vector3( ch*scaleX, localY, zLayer ), // left bottom
          new THREE.Vector3( ch*scaleX+localOffset, localY, zLayer ), //right bottom
          new THREE.Vector3( ch*scaleX+localOffset, localY+localOffset, zLayer ),// right top
          new THREE.Vector3( ch*scaleX, localY+localOffset, zLayer )// left top
      );
      var appearTime = uniforms.time.value + gFadeInDelay;
      for (var k=0; k<4;k++){
        attributes.pageIndex.value[strIndex*4+k] = currentPage;
        attributes.strIndex.value[strIndex*4+k] = strIndex;// THREE.Vector2(6.0,12.0);
        attributes.lineIndex.value[strIndex*4+k] = line;// THREE.Vector2(6.0,12.0);
        attributes.chIndex.value[strIndex*4+k] = ch;// THREE.Vector2(6.0,12.0);
        attributes.alphabetIndex.value[strIndex*4+k] = alphabetIndex;// THREE.Vector2(6.0,12.0);
        attributes.appearTime.value[strIndex*4+k] = appearTime;// THREE.Vector2(6.0,12.0);
        attributes.disintegrateTime.value[strIndex*4+k] = 0.0;// THREE.Vector2(6.0,12.0);
        attributes.disintegrateXSpeed.value[strIndex*4+k] = 0.0;// THREE.Vector2(6.0,12.0);
        attributes.disintegrateYSpeed.value[strIndex*4+k] = 0.0;// THREE.Vector2(6.0,12.0);
        attributes.letterAlpha.value[strIndex*4+k] = 1.0;
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
    // end of addLetterCodeMirror

    var renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setClearColor( 0xffffff );
    document.body.appendChild(renderer.domElement);
    // FIME (Text vIsualization for Musical Expression
    //   var BOOK="H";

    var tex = getKeyTabular(fontSize,"Courier New",lettersPerSide);
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
        rotation : {type:"f", value:0.0},
        timeDomain : { type:"fv1", value:new Float32Array(128)},
        coloredStr : { type:"iv1", value:coloredStr},
    //        timeDomain2 : { type:"fv1", value:new Float32Array(512)},
    //    center : { type: "v2", value: new THREE.Vector2(centerX,centerY) },
        map : { type: "t", value: tex },
        rightMostXCoord : { type: "f", value: 0.0 },
        distort : {type:"f", value:0.0},
        fontcolor : {type:"f", value:0.0},
        gAlpha : {type:"f", value:1.0},
        mixval : {type:"f", value:1.0},
        fadeInDelay : {type:"f", value:gFadeInDelay}
      //  xCoord : { type: "f", value: 0.0 }
    };

    uniforms.rightMostXCoord.value = rightMostXCoord;
// initial shader
    var shaderMaterial = new THREE.ShaderMaterial({
        uniforms : uniforms,
        attributes : attributes,
        vertexShader : document.querySelector('#vertex2').textContent,
        fragmentShader : document.querySelector('#fragment2').textContent
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

  //    camera.position.y = 40;
    camera.lookAt(scene.position);

    var droneState = false;
    var snapToggle = false;
    var tdscale = 5.0; // timedomain distortion scale

    animate = function(t) {

        var alphaConstant = 0.5;
        // get the average, bincount is fftsize / 2
        analyser1.getByteFrequencyData(analyzerFreqArray1);
        analyser1.getByteTimeDomainData(analyzerAmpArray1);
        analyser2.getByteFrequencyData(analyzerFreqArray1);
        analyser2.getByteTimeDomainData(analyzerAmpArray1);

        var resultArr = getAverageVolume(analyzerFreqArray1);
        volume = alphaConstant * (resultArr[0]/128.0) + (1-alphaConstant) * volume;
        uniforms.volume.value = volume/1.5;
        uniforms.time.value += 0.05;
        freqIndex = resultArr[1];

        alphaConstant = 0.85;
        uniforms.rightMostXCoord.value = rightMostXCoord;

        for (var l=0;l<128;l++){
            uniforms.timeDomain.value[l] = uniforms.timeDomain.value[l] * alphaConstant + (1-alphaConstant ) * (analyzerAmpArray1[l]/256.0-0.5) * tdscale;
        }
        try {
          renderer.render(scene, camera);
        }
        catch(err){
          console.error("renderer errorrorro ");
        }

        requestAnimationFrame(animate, renderer.domElement);
    };// the end of animate()


    //  document.body.appendChild(c);
    var down = false;
    var sx = 0, sy = 0;
    var toggle = true;
    var interval = 1, alpha = 0.9, lastKeyTime = 0;
    var index = 30;
    var first = true;


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
          if (currentPage == 1){ // the 2nd page
            // the 2nd page shader
        /*      var shaderMaterial = new THREE.ShaderMaterial({
                  uniforms : uniforms,
                  attributes : attributes,
                  vertexShader : document.querySelector('#vertex2').textContent,
                  fragmentShader : document.querySelector('#fragment2').textContent
              });
              shaderMaterial.transparent = true;
              shaderMaterial.depthTest = false;
              uniforms.time.value = 0;
              //for (var i=0; i< numPage-1; i++)
              books[1].material = shaderMaterial;
          */
          }
        }

        if(DEBUG){
          $("#keydown_debug").html(keycode);
          keydown_debug_color_index++;
          keydown_debug_color_index%=randomcolor.length;
          $("#keydown_debug").css("background-color", randomcolor[keydown_debug_color_index]);
        }
         // THIS IS OLD onkeypress part starting
        var keycode = ev.which;
        //  return;
        // update the visual first.
        if (enableCodeMirror){
          var code = keycode;
        }
        else{
          var code = strPage[currentPage].charCodeAt(strPage[currentPage].length-1);
        }


        if(keycode == 57&&ev.metaKey){// 9 + command key
          DEBUG = !DEBUG;
          $("#debug-panel").toggle();
        }

        if(keycode == 48&&ev.metaKey){ // 0 + command key
          snapToggle = !snapToggle
          rightMostXCoord = rightMostPosition*scaleX+offset;
        }
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
        zoom(ds);
        ev.preventDefault();

    };
    socket.on('message2', function(obj) {
      var osc_received = document.getElementById("osc_received");
      if(osc_received)
        osc_received.innerHTML = obj;
      console.log("received osc messages", obj);
      var command = obj[0];
      switch(command) {
        case "/zoom":
          zoomabs(obj[1]/255.0+1);
          break;

        case "/camrotate":
          camera.rotation.x = obj[1]/180 *3.14159;
          camera.rotation.y = obj[2]/180 *3.14159;
          camera.rotation.z = obj[3]/180 *3.14159;
          break;
        case "/camtranslate":
          camera.position.x = obj[1]/10;
          camera.position.y = obj[2]/10;
          camera.position.z = obj[3]/10;
          break;
        case "/rotation":
          if (!Number.isInteger(obj[1])){
            alert("received osc message contains non-numbers : ", obj);
            return;
          }
          uniforms.rotation.value = parseFloat(obj[1])/100.0;
          break;
        case "/distort":
          if (!Number.isInteger(obj[1])){
            alert("received osc message contains non-numbers : ", obj);
            return;
          }
          uniforms.distort.value = parseFloat(obj[1])/10000.0;
          break;
        case "/panic":
          panicCamera();
          break;
        case "/clear":
          editor.getDoc().setSelection({line:0, ch:0}, {line:editor.getDoc().size+1, ch:0});
          editor.getDoc().replaceSelection("");
          break;
        case "/color":
          console.log(obj[1]| 0x000000);
          if(obj.length==4){
            renderer.setClearColor('rgb('+parseInt(obj[1])+","+parseInt(obj[2])+","+parseInt(obj[3])+")");
          }else if (obj.length == 2){
            var grayColor = parseInt(obj[1]);
              renderer.setClearColor('rgb('+grayColor+","+grayColor+","+grayColor+")");
          }else{
            alert("We need 3 parameters for /color");
          }
          break;
        case "/fontcolor":
          if(obj.length!=2){
            alert("We need 1 parameters for /color")
          }else{
            uniforms.fontcolor.value = obj[1]/255.0;
          }
          break;
        case "/alpha":
          if(obj.length==2){
            if(isNaN(obj[1])){
              alert("The parameters of /alpha should be numeric.");
              return;
            }
            uniforms.gAlpha.value = parseFloat(obj[1])/255.0;
          }else if (obj.length==6){

            var startLine = parseInt(obj[2]),
            startCh = parseInt(obj[3]),
            endLine = parseInt(obj[4]),
            endCh = parseInt(obj[5]),
            content = parseFloat(obj[1]);
            if(isNaN(startLine)||isNaN(startCh)||isNaN(endLine)||isNaN(endCh)||isNaN(content)){
              alert("The parameters of /alpha should be numeric.");
              return;
            }
            setRegionAlpha(startLine, startCh, endLine, endCh, content/255.0);
          }else{
            alert("We need 1 or 4 parameters for /alpha", obj);
          }
          break;
        case "/fadeindelay":
          if(obj.length!=2){
            alert("We need 1 parameters for /alpha")
          }else{
            gFadeInDelay = parseFloat(obj[1]);
            uniforms.fadeInDelay.value =gFadeInDelay;
          }
          break;
        case "/mix":
          if(obj.length!=2){
            alert("We need 1 parameters for /mix")
          }else{
            uniforms.mixval.value = obj[1]/100.0;
          }
          break;
        case "/fontscale":
          if(obj.length!=2){
            alert("/fontscale expect one or three parameters.");
            return;
          }
          var content = obj[1];
          if(isNaN(content)){
            alert("The 2nd parameter of /fontscale should be numeric.");
            return;
          }
          gSizeFactor = parseFloat(content)/50;
          break;
        case "/add":
          var doc = editor.getDoc();
          var content = obj[1];
          var replace = false;
          if(obj.length>=4){ // location is specified
            var  line = parseInt(obj[1]),
            ch = parseInt(obj[2]);
            content = obj[3];
            if (!Number.isInteger(line) || !Number.isInteger(ch)){
              alert("received osc message contains non-numbers : ", obj);
              return;
            }
            if(obj.length==5){
                replace = (obj[4] == 'true');
            }
          }else if (obj.length==2){ // location is not specified so get the current cursor position.
            var line = doc.getCursor().line,
            ch = doc.getCursor().ch; // gets the line number in the cursor position
          }else{
            alert("/add expect one or three parameters.");
          }
          oscAdded = true;

          if (content == 32){ //
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

            // pad line
            while(doc.size <= line){
              // padding lines
              doc.replaceRange("\n", { // create a new object to avoid mutation of the original selection
                  line: line,
                  ch: ch // set the character position to the end of the line
              });
            }
            // pad space
            if(doc.getLine(line).length < ch){
              doc.replaceRange("".padStart(ch-doc.getLine(line).length," "),{
                line:line,
                ch:ch
              })
            }
            var toline = line;
            var toch = ch;
            if(replace){
              var arr = str.split("\r\n|\r|\n");
              toline = line + arr.length-1;
              toch = ch + content.length;
              if(toline > line){
                toch = arr[arr.length-1].length
              }
            }

            if(content.search(/\\/)>=0){
              content = content.replace('\\\'a','\xE1' );
              content = content.replace('\\\'e','\xE9' );
              content = content.replace('\\\'i','\xED' );
              content = content.replace('\\\'o','\xF3' );
              content = content.replace('\\\'u','\xFA' );
              content = content.replace('\\\'n','\xF1' );

              content = content.replace('\\\'A','\xC1' );
              content = content.replace('\\\'E','\xC9' );
              content = content.replace('\\\'I','\xCD' );
              content = content.replace('\\\'O','\xD3' );
              content = content.replace('\\\'U','\xDA' );
              content = content.replace('\\\'N','\xD1' );
              content = content.replace('\\n','\n')
            }
            doc.replaceRange(content, { // create a new object to avoid mutation of the original selection
                line: line,
                ch: ch // set the character position to the end of the line
            },{ // create a new object to avoid mutation of the original selection
                line: toline,
                ch: toch // set the character position to the end of the line
            });
          }
          break;
        case "/disintegrate":
          if(obj.length!=5){
            alert("removed requires 4 more parameters", obj);
            return;
          }
          var startLine = parseInt(obj[1]),
          startCh = parseInt(obj[2]),
          endLine = parseInt(obj[3]),
          endCh = parseInt(obj[4]);
          disintegrate(startLine, startCh, endLine, endCh, true);
          break;
        case "/integrate":
          if(obj.length!=5){
            alert("removed requires 4 more parameters", obj);
            return;
          }
          var startLine = parseInt(obj[1]),
          startCh = parseInt(obj[2]),
          endLine = parseInt(obj[3]),
          endCh = parseInt(obj[4]);
          disintegrate(startLine, startCh, endLine, endCh, false);
          break;
        case "/disintegrateSpeed":
          if(obj.length!=2){
            alert("/disintegrateSpeed expect one parameter");
            return;
          }
          var content = obj[1];
          if(isNaN(content)){
            alert("The 2nd parameter of /disintegrateSpeed should be numeric.");
            return;
          }
          gDisintegrateSpeed = parseFloat(content)/10;
          break;
        case "/remove":
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
          break;
        case "/z":
          if(obj.length!=2){
            alert("/layer expect one parameter");
            return;
          }
          var content = obj[1];
          if(isNaN(content)){
            alert("The 2nd parameter of /fontscale should be numeric.");
            return;
          }
          gLayer = parseFloat(content)/10;
          break;

        default:
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
    };
    window.onmouseup = function(ev){
        down = false;
        socket.emit('message', '/mouseUp/'+ev.clientX+ '/' + ev.clientY);

    };


    var changeCodeMirrorFunc = function(instance, change){
      if(DEBUG)console.log(change);
      if(change.origin=="setValue")
        return;
      var startLine = change.from.line;
      var startCh = change.from.ch;
      var endLine = change.to.line;
      var endCh = change.to.ch;

      var added = change.text.join('\n').length>0
      var removed = change.removed.join('\n').length>0



      // create a new geometry
      var prevgeoindex = geoindex;
      geoindex++;
      geoindex%=2;
      geo[currentPage][geoindex] = geo[currentPage][prevgeoindex].clone();

      // take care of removed first.
      if(removed){
        if(!oscRemoved){
          socket.emit('message', '/removed/'+change.from.line+"/" + change.from.ch+" " +change.removed.join('\n'));
        }
        oscRemoved = false;

        // if nothing is added, we need to move
        // if anything is added, we do not need to move as next if block will set it in a correct position.
        for (var j=startCh; j<startCh + change.removed[0].length; j++){
          removeLetterCodeMirror(startLine,j);
        }

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
          }
          oscAdded = false;

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
          addLetterCodeMirror(startLine, j+startCh, gSizeFactor, change.text[0][j], gLayer);
        }

        // middle lines to the last lines
        for (var i=1; i<change.text.length; i++){
          for (var j=0; j<change.text[i].length; j++){
            addLetterCodeMirror(startLine+i, j, gSizeFactor, change.text[i][j], gLayer);
          }
        }


      }//

      books[currentPage].geometry = geo[currentPage][geoindex];

    };
    if(enableCodeMirror){
        editor.on("change", changeCodeMirrorFunc);
    }




}; // end of window.onload = function() {
