

// log if an error occurs
function onError(e) {
    console.log(e);
}

 function getAverage(array) {
    var values = 0;
    var average;

    var length = array.length;

    // get all the frequency amplitudes
    for (var i = 0; i < length; i++) {
        values += array[i];
    }

    average = values / length;
    return average;
}
function getKeyTabular(fontSize, fontType, lettersPerSide){

    var c = document.createElement('canvas');
    c.width = c.height = fontSize*lettersPerSide;
    var ctx = c.getContext('2d');
    ctx.font = fontSize+'px '+fontType;
    var i=0;

    for (var y=0; y<lettersPerSide; y++) {
        for (var x=0; x<lettersPerSide; x++,i++) {
            var ch = String.fromCharCode(i);
            ctx.fillText(ch, x*fontSize, -(8/32)*fontSize+(y+1)*fontSize);
        }
    }
  //  if(DEBUG)document.body.appendChild(c);

    return new THREE.Texture(c);

}
