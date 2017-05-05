var soundmap = {
  'chatter':'sound/chatter_amp_3db.mp3' // chatter that starts in the thrid page.
  , 'gong' : 'sound/indonesian_gong.wav' // click sound from the 2nd page.
  , 'tick1' : 'sound/tick1.wav' // click sound from the 2nd page.
  , 'ir1' : 'sound/ir1.wav' // reverb impulse response.
  , 'sus1' : 'sound/sus_note.wav' // another reberb response
  , 'piano1': 'sound/piano_note1_f_sharp.wav' // this is not used
  , 'reversegate' :'sound/H3000-ReverseGate.mp3'
  ,'pianoloop2':'sound/pianoloop2.wav'
  ,'nnote1':'sound/nnote1.wav'
  ,'pause1':'sound/note_fio.wav'
  ,'pause2':'sound/nnote1.wav'
  ,'click':'sound/click.wav'
  ,'woodangtang':'sound/woodangtang.wav'
  , 'june_A' : 'sound/june_A.mp3'
  , 'june_B' : 'sound/june_B.mp3'
  , 'june_C' : 'sound/june_C.mp3'
  , 'june_D' : 'sound/june_D.mp3'
  , 'june_E' : 'sound/june_E.mp3'
  , 'june_F' : 'sound/june_F.mp3'
  , 'june_G' : 'sound/june_G.mp3'
  , 'june_A1' : 'sound/june_A1.mp3'
  , 'reverb1' : 'sound/960-BigEmptyChurch.mp3'
  , 'reverse_reverb' : 'sound/H3000-ReverseGate.mp3'
  , 'heartbeat':'sound/heartbeat0.wav'};

// currently y o u is colored white (based on volume )
var coloredStr = [0,
                    0,0,0,0,0, // abcde
                    0,0,0,0,0, // fghij
                    0,0,0,0,0, // klmno
                    0,0,0,0,0, // pqrst
                    0,0,0,0,0,0]; //uvwxyz

var pauseFlag = false; // false will disable the pause sample
