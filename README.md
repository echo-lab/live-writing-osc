# live-writing-osc

## installation.

1. install `node.js`
2. download this repository.
3. open Terminal and go to the directory.
4. run `npm install`

## run
1. run `node server.js`
2. on a web browser visit http://localhost:8080
3. you have to run the step 1 everytime you refresh the web page.

## osc messages

- sending port : 3334 (LW --> App)
- types
   - `/added/[line]/[ch]/[content]`
   - `/removed/[line]/[ch]/[content]`
   - `/mousemove/[x coodrinate]/[y coodrinate]`
   - `/moseup/[x coodrinate]/[y coodrinate]`
   - `/mosedown/[x coodrinate] [y coodrinate]`
   - `/wheel/[wheel data]`
- receving port : 3333 (App --> LW)
- types
    - `/camrotate [x-angle] [y-angle] [z-angle]` : in the unit of degree
    - `/camtranslate [x] [y] [z]` : some number between [-300,300]
    - `/add [row] [col] [content]` : insert [content] at position (row, col)
    - `/add [row] [col] [content] true` : replace [content] at position (row, col)
    - `/add [content]` : append [content] at the current cursor position (typically the last one. )
    - `/rotation [scale]` : scale of the rotation effect. [0,]
    - `/distort [scale]` : scale of the letter distortion [0,100]
    - `/color [red] [green] [blue]` : the background color RGB value [0,255]
    - `/color [greyscale]` : the background color in grayscale [0,255]
    - `/fontcolor [greyscale]`:  the font color in grayscale [0,255]
- reference
