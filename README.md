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
    - `/fontscale [fontsize]`:  the font size - numeric value 0 is default size.
    - `/alpha [alphavalue]`:  set alpha value of all text [0,255] 0 being transparent.
    - `/alpha [alphavalue] [start line] [start ch] [end line] [end ch]`:  set alpha value of text in the specified region, [0,255] 0 being transparent.
    - `/fadeindelay [delay]`:  delay value for text addition. if positive value, the text will fade in slowly. [0,-]
    - `/fontscale [fontsize]`:  the font size - numeric value 0 is default size.
    - `/disintegrate [start line] [start ch] [end line] [end ch]`: any letter within the specified region will be dispersed to a random direction.
    - `/integrate [start line] [start ch] [end line] [end ch]`: any letters dispersed by `/disintegrate` within the specified region will be reset.
    - `/remove [start line] [start ch] [end line] [end ch]`
- reference
