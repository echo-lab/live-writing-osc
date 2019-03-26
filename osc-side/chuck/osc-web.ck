OscSend xmit;
xmit.setHost("127.0.0.1", 3333);

xmit.startMsg("/add, i, i, s"); 
xmit.addInt(0);
xmit.addInt(0);
xmit.addString("Un sonido");

1::second => now;
xmit.startMsg("/add, i, i, s");
xmit.addInt(1);
xmit.addInt(0);
xmit.addString("A veces");

1::second => now;
xmit.startMsg("/add, i, i, s");
xmit.addInt(2);
xmit.addInt(0);
xmit.addString("Un Suave discurso,");


1::second => now;
xmit.startMsg("/add, i, i, s");
xmit.addInt(2);
xmit.addInt(28);
xmit.addString("y multiplicado,");

1::second => now;

xmit.startMsg("/add, i, i, s");
xmit.addInt(2);
xmit.addInt(59);
xmit.addString("movimientos");

1::second => now;

xmit.startMsg("/add, i, i, s");
xmit.addInt(0);
xmit.addInt(10);
xmit.addString("sutil,");

1::second => now;

xmit.startMsg("/add, i, i, s");
xmit.addInt(0);
xmit.addInt(16);
xmit.addString(" subjetivo.");

1::second => now;

xmit.startMsg("/add, i, i, s");
xmit.addInt(1);
xmit.addInt(8);
xmit.addString("suspiros");

1::second => now;

xmit.startMsg("/add, i, i, s");
xmit.addInt(1);
xmit.addInt(17);
xmit.addString("y susurros.");

1::second => now;
xmit.startMsg("/add, i, i, s, s");
xmit.addInt(2);
xmit.addInt(19);
xmit.addString("repetido");
xmit.addString("true");



1::second => now;
xmit.startMsg("/add, i, i, s, s");
xmit.addInt(2);
xmit.addInt(44);
xmit.addString("sobre sinuosos");
xmit.addString("true");



1::second => now;
xmit.startMsg("/add, s");
xmit.addInt(2);
xmit.addInt(44);
xmit.addString("sobre sinuosos");
xmit.addString("true");


