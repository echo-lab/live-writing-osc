var soundmap = {
  'chatter':'chatter_amp.mp3' // chatter that starts in the thrid page.
  , 'gong' : 'indonesian_gong.wav' // click sound from the 2nd page.
  , 'tick1' : 'tick1.wav' // click sound from the 2nd page.
  , 'ir1' : 'ir1.wav' // reverb impulse response.
  , 'sus1' : 'sus_note.wav' // another reberb response
  , 'piano1': 'piano_note1_f_sharp.wav' // this is not used
  , 'reversegate' :'H3000-ReverseGate.mp3'
  ,'pianoloop2':'pianoloop2.wav'
  ,'nnote1':'nnote1.wav'
  ,'pause1':'note_fio.wav'
  ,'pause2':'nnote1.wav'
  ,'click':'click.wav'
  ,'woodangtang':'woodangtang.wav'
  , 'june_A' : 'june_A.mp3'
  , 'june_B' : 'june_B.mp3'
  , 'june_C' : 'june_C.mp3'
  , 'june_D' : 'june_D.mp3'
  , 'june_E' : 'june_E.mp3'
  , 'june_F' : 'june_F.mp3'
  , 'june_G' : 'june_G.mp3'
  , 'june_A1' : 'june_A1.mp3'
  , 'reverb1' : '960-BigEmptyChurch.mp3'
  , 'reverse_reverb' : 'H3000-ReverseGate.mp3'
  , 'heartbeat':'newsamples/heartbeat0.wav'};

// currently y o u is colored white (based on volume )
var coloredStr = [0,
                    0,0,0,0,0, // abcde
                    0,0,0,0,0, // fghij
                    0,0,0,0,0, // klmno
                    0,0,0,0,0, // pqrst
                    0,0,0,0,0,0]; //uvwxyz

var pauseFlag = false; // false will disable the pause sample
