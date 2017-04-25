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
    - `/zoomin`
    - `/zoomout`
    - `/camrotate [dx-angle] [dy-angle] [dz-angle]`
    - `/camtranslate [dx] [dy] [dz]`
- reference
