 var contexts = new Array();
  var version="0.1";
  var gameTitle="My Game";
  var gameLink="www.flipgame.org"
  var winText="Congratulations! You won!"
  var width=125;
  var height=140;
  var zoomFactor=4;
  var radius=5;

  var canvasIndex=0;
  var canvasses = new Array();
  for (var i=0;i<16;i++){
    canvasses[i] = new Uint8Array(width*height);
  }
  var dirty=false;
  var exitTriggered=false;
  var exitPointX=-1000;
  var exitPointY=-1000;
  var visibleCanvas;
  var visibleContext;
  var titleInput;
  var linkInput;
  var id;
  var id_d;

  var lastX=-1;
  var lastY=-1;

  var regionCanvasCount = 2;
  //canvas id 1 = empty space
  //canvas id 2 = regular wall
  var regionCanvas = new Uint32Array(width*height);
  var pivotPoints = [];
  var boundingBoxes = {};
  var regionTypes = [];

  var masterCanvas = new Uint8Array(width*height);

  

/*
//arne
  var colorPalette = [
           "#000000",
            "#c2c2c2",
            "#0000ff",
            "#bfe3f3",
            "#ff8700",
            "#ffff00",
            "#b4772c",
            "#ff0000",
            "#00bd00",
            "#bc4499",
            "#ffaf00",
            "#ffadd5",
            "#00ffff",
            "#005784",
            "#31A2F2",
            "#B2DCEF"
            ];
*/

//dawnbringer
//http://www.pixeljoint.com/forum/forum_posts.asp?TID=12795
  var colorPalette = [
          "#000000",//0
           "#000000",//1
            "#c2c2c2",//2
            "#0000ff",//3
            "#bfe3f3",//4
            "#ff8700",//5
            "#ffff00",//6
            "#b4772c",//7
            "#ff0000",//8
            "#00bd00",//9
            "#bc4499",//10
            "#ffaf00",//11
            "#00ffff",//12
            "#ffadd5",//13
            "#000079",//14
            "#8f0000",//15
            "#ff99ff", //16
            "#351d1d", //17
            "#8888ff" //18
            ];

var eraserCol=0;
var wallCol=2;
var bumperCol=3;
var bumperAuraCol=14;
var flipperCol=4;
var leftFlipperPivotCol=5;
var rightFlipperPivotCol=8;
var ballSpawnCol=15;
//var magnetCol=8;
//var magnetAuraCol=15;
var connectionCol=9;
var targetCol=10;
var targetActiveCol=16;
var togglableWallCol=11;
var togglableWallDisabledCol=17;
var exitCol=6;
var springCol=12;

var lastPlacedLeftPivot=false;
/*
//spectrum 
  var colorPalette = [
            "#000000",
            "#888888",
            "#CDCDCD",
            "#FFFFFF",
            "#0000CD",
            "#0000FF",
            "#CD0000",
            "#FF0000",
            "#CD00CD",
            "#FF00FF",
            "#00CD00",
            "#00FF00",
            "#00CDCD",
            "#00FFFF",
            "#CDCD00",
            "#FFFF00"
            ];
*/
  var colorElem = new Array();

var aurl = document.createElement('a');
function qualifyURL(url) {
  aurl.href = url;
  return aurl.href;
}



var standalone_HTML_String="";

var clientStandaloneRequest = new XMLHttpRequest();

clientStandaloneRequest.open('GET', 'play.html');
clientStandaloneRequest.onreadystatechange = function() {

    if(clientStandaloneRequest.readyState!=4) {
      return;
    }
    standalone_HTML_String=clientStandaloneRequest.responseText;
}
clientStandaloneRequest.send();


var get_blob = function() {
    return self.Blob;
}

function buildStandalone(sourceCode) {
  if (standalone_HTML_String.length===0) {
    alert("Can't export yet - still downloading html template.",true);
    return;
  }
  sourceCode=encodeURI(sourceCode);
  var htmlString = standalone_HTML_String.concat("");


  htmlString = htmlString.replace(/__EMBED__/g,sourceCode);

  var BB = get_blob();
  var blob = new BB([htmlString], {type: "text/plain;charset=utf-8"});
  saveAs(blob, gameTitle+".html");
}

function exportClick(){
  var embedDat = stateToString();
  buildStandalone(embedDat);
}

function importClick(){
  var reader = new FileReader();

  reader.onload = function(e) {
   var text = reader.result;
  }

  reader.readAsText(file, encoding);
}

Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

var connections=[];
function connectCables(region1,region2){

  var r1=null;
  var r1i=-1;
  var r2=null;
  var r2i=-1;
  for (var i=0;i<connections.length;i++){
    var r = connections[i];
    if (r.indexOf(region1)>=0){
      r1=r;
      r1i=i;
    }
    if (r.indexOf(region2)>=0){
      r2=r;
      r2i=i;
    }
    if (r1===r2){
      return;
    }
  }

  //order them so I can splice
  if (r2i<r1i){
    var t = r1;
    r1=r2;
    r2=t;
    var ti = r1i;
    r1i=r2i;
    r2i=ti;
    var tr = region1;
    region1=region2;
    region2=tr;
  } 


  if (r2===null){
    r2=[region2];
  } else {
    connections.splice(r2,r2i);
  }

  if (r1===null){
    r1=[region1];
  } else{  
    connections.splice(r1,r1i);
  }

  for (var i=0;i<r2.length;i++){
    var item=r2[i];
    if (r1.indexOf(item)===-1){
      r1.push(item);
    }
  }
  connections.push(r1.concat(r2).unique());
}

function makeConnections(){
  var canvas=masterCanvas;
  connections=[];
  activatedConnections=[];
  for (var i=0;i<width-1;i++){
    for (var j=0;j<height-1;j++){
      var index=i+width*j;
      var v1=canvas[index];
      var v1Conducts = v1 === connectionCol || v1 === targetCol || v1 === togglableWallCol;
      if (v1Conducts===false){
        continue;
      }

      var rightIndex=index+1;
      var belowIndex=index+width;

      var mainRegion = regionCanvas[index];
      var rightRegion = regionCanvas[rightIndex];
      var belowRegion = regionCanvas[belowIndex];


      var v2=canvas[rightIndex];
      var v3=canvas[belowIndex];

      var v2Conducts = v2 === connectionCol || v2 === targetCol || v2 === togglableWallCol;
      var v3Conducts = v3 === connectionCol || v3 === targetCol || v3 === togglableWallCol;
      if (v2Conducts && mainRegion!==rightRegion) {
        connectCables(mainRegion,rightRegion);
      }
      if (v3Conducts && rightRegion!==belowRegion && mainRegion!==belowRegion){
        connectCables(mainRegion,belowRegion);
      }
    }
  }
}

function shareClick() {
  var title = gameTitle;
  var str = stateToString();

  var gistToCreate = {
    "description" : title,
    "public" : true,
    "files": {
      "readme.txt" : {
        "content": "A game made with www.flipcode.org"
      },
      "game.txt" : {
        "content": str
      }
    }
  };

  var githubURL = 'https://api.github.com/gists';
  var githubHTTPClient = new XMLHttpRequest();
  githubHTTPClient.open('POST', githubURL);
  githubHTTPClient.onreadystatechange = function() {    
    var errorCount=0;
    if(githubHTTPClient.readyState!=4) {
      return;
    }   
    var result = JSON.parse(githubHTTPClient.responseText);
    if (githubHTTPClient.status===403) {
      errorCount++;
      alert(result.message);
    } else if (githubHTTPClient.status!==200&&githubHTTPClient.status!==201) {
      errorCount++;
      alert("HTTP Error "+ githubHTTPClient.status + ' - ' + githubHTTPClient.statusText);
    } else {
      var id = result.id;
      var url = "play.html?p="+id;
      url=qualifyURL(url);

      var editurl = "editor.html?hack="+id;
      editurl=qualifyURL(editurl);
      var sourceCodeLink = "link to source code:<br><a href=\""+editurl+"\">"+editurl+"</a>";

      var shareLink = document.getElementById("shareLink");
      shareLink.innerHTML = "<a target=\"_blank\" href=\""+url+"\">&#8627;"+id+"</a><br>";


      if (errorCount>0) {
        alert("Cannot link directly to playable game, because there are errors.",true);
      } else {

      } 


    }
  }
  githubHTTPClient.setRequestHeader("Content-type","application/x-www-form-urlencoded");
  var stringifiedGist = JSON.stringify(gistToCreate);
  githubHTTPClient.send(stringifiedGist);
    lastDownTarget=canvas;  
}

function RLE_encode(input) {
    var encoding = [];
    var prev, count, i;
    for (count = 1, prev = input[0], i = 1; i < input.length; i++) {
        if (input[i] != prev) {
            encoding.push(count);
            encoding.push(prev);
            count = 1;
            prev = input[i];
        }
        else 
            count ++;
    }
    encoding.push(count);
    encoding.push(prev);
    return encoding;
}

function RLE_decode(encoded) {
    var output = "";
    encoded.forEach(function(pair){ output += new Array(1+pair[0]).join(pair[1]) })
    return output;
}

function stateToString(){
  var state = new Object();
  state.gameTitle=gameTitle;
  state.winText=winText;
  state.gameLink=gameLink;
  state.canvasses=new Array();
  for (var i=0;i<16;i++){
    var canvas=canvasses[i];
    var s="";
    for (var j=0;j<width*height;j++){
      s+=canvas[j].toString(16);
    }
    var pairs=RLE_encode(s);    
    state.canvasses.push(pairs);
  }
  var result=JSON.stringify(state);
  return result;
}

function stringToState(str){
  var state = JSON.parse(str);
  gameTitle=state.gameTitle;
  winText=state.winText;
  gameLink=state.gameLink;
  canvasIndex=0;
  canvasses=new Array();
  for (var k=0;k<state.canvasses.length;k++){
    var s = state.canvasses[k];
    var ar = new Uint8Array(width*height);
    var index=0;
    for (var i=0;i<s.length;i+=2){
      var count=s[i];
      var ch=s[i+1];
      for (var j=0;j<count;j++){
        ar[index]=parseInt(ch,16);
        index++;
      }
    }
    canvasses.push(ar);
  }

}

document.addEventListener("keydown", press);
document.addEventListener("keyup", keyup);

var copyImage = null;

var savedString;

var keyBuffer=[];


function applyCanvasSweep(sweepArea){
  var x = Math.round(bpx);
  var y = Math.round(bpy);    
  var points = [
              [x-1,y+2],[x,y+2],[x+1,y+2],
    [x-2,y+1],[x-1,y+1],[x,y+1],[x+1,y+1],[x+2,y+1],
    [x-2,y  ],[x-1,y  ],[x,y  ],[x+1,y  ],[x+2,y  ],
    [x-2,y-1],[x-1,y-1],[x,y-1],[x+1,y-1],[x+2,y-1],
              [x-1,y-2],[x,y-2],[x+1,y-2]
    ];
    var maxDX=0;
    var maxDY=0;
  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      var pointIndex=px+width*py;
      var i2 = sweepArea[pointIndex];
      if (i2!==0){
        var tx = i2%(width);
        var ty = Math.floor(i2/width);
        var dx=tx-px;
        var dy=ty-py;
        if ( (dx*dx+dy*dy) > (maxDX*maxDX+maxDY*maxDY) ){
          maxDX=dx;
          maxDY=dy;
        }
      }
    }
  }


  if (maxDX!==0||maxDY!==0){
    //need to flip velocity about dx,dy
    var nSpeed = [-speedX,-speedY];
    var normal = [maxDX,maxDY];
    var refl = subV(mulV(2*dot(normal,nSpeed),normal),nSpeed);
    speedX=refl[0];
    speedY=refl[1];
  }

  bpx+=maxDX;
  bpy+=maxDY;
  speedX+=maxDX;
  speedY+=maxDY;
  clampSpeed();

  var xsign=0;
  var ysign=0;
  if (maxDX>0){
    xsign=1;
  } else if (maxDX<0){
    xsign=-1;
  }
  if (maxDY>0){
    ysign=1;
  } else if (maxDY<0){
    ysign=-1;
  }
  if(xsign===0&&ysign===0){
    ysign=-1;
  }

/*  while(ballCollides()){
    bpx+=xsign;
    bpy+=ysign;
  }
*/
}

function interpolateAreas(oldCanvasIndex,newCanvasIndex){
  var oldLeft = oldCanvasIndex%2;
  var newLeft = newCanvasIndex%2;

  var oldRight = (Math.floor(oldCanvasIndex/2))%2;
  var newRight = (Math.floor(newCanvasIndex/2))%2;

  var oldDown = (Math.floor(oldCanvasIndex/4))%2;
  var newDown = (Math.floor(newCanvasIndex/4))%2;

  if (oldDown===1&&newDown===0){
    playSound(62826107);
  } else if (oldDown===0&&newDown===1){
    playSound(67535707);    
  } else if ((oldLeft===0&&newLeft===1) ||(oldRight===0&&newRight===1)){
    playSound(64004107);
  }

  var result = [oldCanvasIndex];
  if (oldLeft!=newLeft){
    var newItem = result[result.length-1]-oldLeft+newLeft;
    result.push(newItem);
  }
  if (oldRight!=newRight){
    var newItem = result[result.length-1]-oldRight*2+newRight*2;
    result.push(newItem);
  }
  if (oldDown!=newDown){
    var newItem = result[result.length-1]-oldDown*4+newDown*4;
    result.push(newItem);
  }
  return result;
}

function setCanvasIndex(oldCanvasIndex,newCanvasIndex){
  
  var steps = interpolateAreas(oldCanvasIndex,newCanvasIndex);
  for (var i=0;i<steps.length-1;i++){
    var source = steps[i];
    var target = steps[i+1];
    
    var sweepArea =  sweepAreas[source][target];

    if (sweepArea==null){
      console.log( "setCanvasIndex not found " + source+" -> " + target );
      return;
    } else {
      console.log(source + " -> " + target);
    }

    applyCanvasSweep( sweepArea );
  }
}

var tilting=false;

function setFlipperCanvas(){  
  var oldCanvasIndex=canvasIndex;
  canvasIndex=0;
  if (keyBuffer[37]===true){//left
    canvasIndex=1;
  } 
  if (keyBuffer[39]===true){//right
    canvasIndex+=2;
  }
  if (keyBuffer[40]===true){//down
    canvasIndex+=4;
  }
  tilting = keyBuffer[38];//up

  if (oldCanvasIndex!=canvasIndex){
    setCanvasIndex(oldCanvasIndex,canvasIndex);
    //38 is up
    //40 is down
    setVisuals();
  }
}

function keyup(evt){
  evt = evt || window.event;
  keyBuffer[evt.keyCode]=false;
  setFlipperCanvas();
}

function prevent(e) {
    if (e.preventDefault) e.preventDefault();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.stopPropagation) e.stopPropagation();
    e.returnValue=false;
    return false;
}


function press(evt){
  evt = evt || window.event;
  keyBuffer[evt.keyCode]=true;

  if ([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1) {
    prevent(event);
  }

  /*
  if (evt.keyCode==83){//S(ave)
    savedString = stateToString();
  } else if (evt.keyCode==76){//L(oad)
    stringToState(savedString);
    setVisuals();
    setLayer(canvasIndex+1); 
  } */
  if (evt.keyCode===80){//p
    compile();
    spawnBall();
  } else if (evt.keyCode===67) { //c
    copyImage=JSON.stringify(masterCanvas);
    //copyImage=JSON.stringify(canvasses[canvasIndex])
  } else if (evt.keyCode===86){ //v
    if (copyImage!==null){
      preserveUndoState();
      var ar = JSON.parse(copyImage);
      var arui8 = new Uint8Array(width*height);
      for (var i=0;i<width*height;i++){
        arui8[i]=ar[i];
      }
      masterCanvas=arui8;
      compile();
      setVisuals();
    }
  } else if (evt.keyCode ===189 || evt.keyCode===173 ) {//-
    var datArray = ['eraser', eraserCol,
                  'wall', wallCol,
                  'bumper', bumperCol,
                  'flipper', flipperCol,
                  'ballSpawn',ballSpawnCol,
                  'exitPoint',exitCol,
                  'spring',springCol,
                  'leftFlipperPivot', leftFlipperPivotCol,
                  'rightFlipperPivot', rightFlipperPivotCol,
                  'connection', connectionCol,
                  'target', targetCol,
                  'togglableWall', togglableWallCol];

                  var index = datArray.indexOf(activeTool);
                  if (index>0){
                    var newTarget = datArray[index-2];
                    var newTargetCol = datArray[index-1];
                    selectTool(newTarget,newTargetCol);
                  }

  } else if (evt.keyCode===187 || evt.keyCode===61){//+
        var datArray = ['eraser', eraserCol,
                  'wall', wallCol,
                  'bumper', bumperCol,
                  'flipper', flipperCol,
                  'ballSpawn',ballSpawnCol,
                  'exitPoint',exitCol,
                  'spring',springCol,
                  'leftFlipperPivot', leftFlipperPivotCol,
                  'rightFlipperPivot', rightFlipperPivotCol,
                  'connection', connectionCol,
                  'target', targetCol,
                  'togglableWall', togglableWallCol];

                  var index = datArray.indexOf(activeTool);
                  if (index+2<datArray.length){
                    var newTarget = datArray[index+2];
                    var newTargetCol = datArray[index+3];
                    selectTool(newTarget,newTargetCol);
                  }
  } else if (evt.keyCode===90){//z
    if (undoList.length>0){
      var dat = undoList.pop();
      masterCanvas=dat.canvasDat;
      compile();
      setVisuals();
    }
  }

  setFlipperCanvas();
}
  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  var bucketElem;
  function titleChange(newTitle){
    gameTitle=newTitle;    
  }

  function linkChange(newLink){
    gameLink=newLink;
  }
  function winTextChange(newWinText){
    winText=newWinText;
  }
function clearPalette(){
  preserveUndoState();
  var canvas=masterCanvas;
  for (var i=0;i<width*height;i++){
    canvas[i]=0;
  }

    var basicCanvas = canvasses[0];
    for (var i=0;i<basicCanvas.length;i++){
      basicCanvas[i]=masterCanvas[i];
    }

  setVisuals();
}


var colorElem = new Array();

var ballSpawnPointX=width/2;
var ballSpawnPointY=height/2;

var bpx=-20;
var bpy=-20;
var ballFrame=0;
var ballPointFrames = [
[
      [1,0],[2,0],
[0,1],[1,1],      [3,1],
[0,2],            [3,2],
      [1,3],[2,3]
],
[
      [1,0],[2,0],
[0,1],      [2,1],[3,1],
[0,2],            [3,2],
      [1,3],[2,3]
],
[
      [1,0],[2,0],
[0,1],            [3,1],
[0,2],      [2,2],[3,2],
      [1,3],[2,3]
],
[
      [1,0],[2,0],
[0,1],            [3,1],
[0,2],[1,2],      [3,2],
      [1,3],[2,3]
]
];


function ballCollides(){
  var x = Math.round(bpx);
  var y = Math.round(bpy);
  var indices = [
                              x+1+width*(y+0),x+2+width*(y+0),
                  x+0+width*(y+1),x+1+width*(y+1),x+2+width*(y+1),x+3+width*(y+1),
                  x+0+width*(y+2),x+1+width*(y+2),x+2+width*(y+2),x+3+width*(y+2),
                              x+1+width*(y+3),x+2+width*(y+3)
                  ];
  var canvas=canvasses[canvasIndex];

  for (var i=0;i<indices.length;i++){
    var index = indices[i];
    var val = canvas[index];
    if (
          val>0 &&
          val!==bumperAuraCol &&
          val!==ballSpawnCol &&
          val!==exitCol &&
          val!==connectionCol){
      return true;
    }
  }
  return false;
}

  activatedConnections=[];
  function activateSwitch(index){
    var regionNumber = regionCanvas[index];
    var bbox = boundingBoxes[regionNumber];
    for (var x=bbox[0];x<=bbox[2];x++){      
      for (var y=bbox[1];y<=bbox[3];y++){   
        var i = x+width*y;
        if (regionCanvas[i]===regionNumber){
          for (var j=0;j<canvasses.length;j++){
            var canvas=canvasses[j];
            if (canvas[i]===targetCol){
              canvas[i]=targetActiveCol;
            }
          }
        }
      }
    }

    var connectionGroupIndex=-1;
    for (var i=0;i<connections.length;i++){
      var r = connections[i];
      if (r.indexOf(regionNumber)>=0){
        connectionGroupIndex=i;
        break;
      }
    }

    if (connectionGroupIndex===-1){
      return;
    }
    activatedConnections.push(regionNumber);

    var r = connections[connectionGroupIndex];

    var foundCables=0;
    var foundTriggers=0;
    var foundWalls=0;
    var triggeredTriggers=0;
    for (var i=0;i<r.length;i++){
      var rowRegionNum = r[i];
      var type = regionTypes[rowRegionNum];
      if (type === connectionCol){
        foundCables++;
      } else if (type === togglableWallCol){
        foundWalls++;
      } else if (type === targetCol){
        foundTriggers++;
        if (activatedConnections.indexOf(rowRegionNum)>=0){
          triggeredTriggers++;
        }
      }
    }
    if (triggeredTriggers===foundTriggers){
      removeTogglableWalls(r);
      playSound(66445903);
    } else {
      playSound(11285108);
    }
  }

  function removeTogglableWalls(row){

    for (var i=0;i<row.length;i++){
      var rowRegionNum = row[i];
      var type = regionTypes[rowRegionNum];
      if (type !== togglableWallCol){
        continue;
      }

      var bbox = boundingBoxes[rowRegionNum];

      for (var x=bbox[0];x<=bbox[2];x++){      
        for (var y=bbox[1];y<=bbox[3];y++){
          var i = x+width*y;
          if (regionCanvas[i]===rowRegionNum){            
            for (var j=0;j<canvasses.length;j++){
              var canvas=canvasses[j];
              if (canvas[i]===togglableWallCol){
                canvas[i]=togglableWallDisabledCol;
              }
            }
          }
        }
      }
    }
  }

  function collision(x,y){
    var indices = [
                                x+1+width*(y+0),x+2+width*(y+0),
                    x+0+width*(y+1),x+1+width*(y+1),x+2+width*(y+1),x+3+width*(y+1),
                    x+0+width*(y+2),x+1+width*(y+2),x+2+width*(y+2),x+3+width*(y+2),
                                x+1+width*(y+3),x+2+width*(y+3)
                    ];
    var canvas=canvasses[canvasIndex];

    var collisiondat = [];
    for (var i=0;i<indices.length;i++){
      var index = indices[i];
      var val = canvas[index];
      if (val === targetCol){
        activateSwitch(index);
      } else if (
            val>0 &&
            val!==bumperAuraCol &&
            val!==ballSpawnCol &&
            val!==exitCol &&
            val!==connectionCol && 
            val!==targetActiveCol &&
            val!==togglableWallDisabledCol){
        var px = (index%width)+0.5;
        var py = Math.floor(index/width)+0.5;
        var dx = px-x-2;
        var dy = py-y-2;
        collisiondat.push([val,-dx,-dy,index]);
      }
    }
    return collisiondat;
  }

  function dot(v1,v2){
    return v1[0]*v2[0]+v1[1]*v2[1];
  }

  function mag (v){
    return Math.sqrt(v[0]*v[0]+v[1]*v[1]);
  }

  function normalized(v){
    var m = mag(v);
    return [v[0]/m,v[1]/m];
  }

  function addV(v1,v2){
    return [v1[0]+v2[0],v1[1]+v2[1]];
  }

  function subV(v1,v2){
    return [v1[0]-v2[0],v1[1]-v2[1]];
  }

  function mulV(s,v){
    return [s*v[0],s*v[1]];
  }

  var speedX=0;
  var speedY=1;
  var ballSpin=1;
  var tickRecalcs=0;
  var tickLength=33;
  var bounceDamp=0.8;
  var bumperSpeed=2.0;
  var maxSpeed=3.0;
  var maxBallSpin=4.0;
  var spinDamp=0.0002;
  function clampSpeed(){    
    var v=  [speedX,speedY];
    var speedMag = mag(v);
    if (speedMag>maxSpeed){
      speedN = normalized(v);
      v = mulV(maxSpeed,speedN);
      speedX=v[0];
      speedY=v[1];
    }
    if (Math.abs(ballSpin)>maxBallSpin){
      ballSpin=ballSpin/Math.abs(ballSpin)*maxBallSpin;
    }
  }
  var ballSpinSpeed=0.4;
  var bumperHit=-1;
  function tick(){
    bumperHit=-1;
    var signum=ballSpin>0?1:-1;
    ballFrame=(((ballFrame+signum*Math.sqrt(Math.abs(ballSpin))*ballSpinSpeed)%4)+4)%4;

    var oldSpeedX=speedX;
    var oldSpeedY=speedY;
    var canvas=canvasses[canvasIndex];
    if (bpx<-10){
      return;
    }
    var G=0.001;
    speedY+=G*tickLength;
    clampSpeed();
    var nx = bpx+speedX;
    var ny = bpy+speedY;
    var rnx = Math.round(nx);
    var rny = Math.round(ny);
    var collisiondat = collision(rnx,rny);
    if (collisiondat.length===0){
      bpx=nx;
      bpy=ny;
      if (isNaN(bpx)||isNaN(bpy)){
        console.log("eek nan");
      }
      tickRecalcs=0;
      ballSpin*=(1-spinDamp*tickLength);
    } else {
      var avgx=0;
      var avgy=0;
      var bumperCount=0;
      for (var i=0;i<collisiondat.length;i++){
        var cx=collisiondat[i][1];
        var cy=collisiondat[i][2];
        avgx+=cx;
        avgy+=cy;

        if (collisiondat[i][0]===bumperCol){
          bumperCount++;
          bumperHit=regionCanvas[collisiondat[i][3]];
        }
      }

      avgx/=collisiondat.length;
      avgy/=collisiondat.length;

      if (avgx===0&&avgy===0){
        //try go backwards
        if (speedX!==0||speedY!==0){
          avgx=-speedY;
          avgy=speedX;
        } else {
          console.log(yep);                
          return;
        }  
      }

      var normal = normalized([avgx,avgy]);
      var nSpeed = [-speedX,-speedY];

      if (bumperCount>0){
        playSound(64236300);
        var speedMag=mag(nSpeed);
        speedMag+=bumperSpeed;
        if (speedMag>maxSpeed){
          speedMag=maxSpeed;
        }
        nSpeed = mulV(speedMag,normalized(nSpeed));
        speedX=nSpeed[0];
        speedY=nSpeed[1];
        clampSpeed();
      } else {
        playSound(67922907);
      }

      var direction = (nSpeed[0]*normal[1]-nSpeed[1]*normal[0]);
/*      if (direction<0){
        console.log("left");
      } else if (direction>0){
        console.log("right");
      } else {
        console.log("bang");
      }*/
      var refl = subV(mulV(2*dot(normal,nSpeed),normal),nSpeed);
      //add 50% of spin to the bounce
      speedX=bounceDamp*refl[0];
      speedY=bounceDamp*refl[1];
      
      leftV = [-normal[1],normal[0]];
      var ballSpinAmount=1.0;
      speedX+=ballSpinAmount*ballSpin*leftV[0]/2;
      speedY+=ballSpinAmount*ballSpin*leftV[1]/2;

      ballSpin/=2;      
      ballSpin+=direction*mag([speedX,speedY])*(1-bounceDamp)/2.0;
      
      clampSpeed();
      nx = bpx+speedX;
      ny = bpy+speedY;


      tickRecalcs++;

      var collisiondat = collision(Math.round(nx),Math.round(ny));
      if (collisiondat.length===0){
        bpx=nx;
        bpy=ny;
      if (isNaN(bpx)||isNaN(bpy)){
        console.log("eek nan");
      }
        tickRecalcs=0;
      } else {
        if (tickRecalcs<4){
          tick();
          return;
        } else {
          bpx=nx;
          bpy=ny;
        }


      }
    }
    var bpxr=Math.round(bpx);
    var bpyr=Math.round(bpy);
    if (exitTriggered ===false && bpxr<=exitPointX&&exitPointX<=bpxr+4 && bpyr<=exitPointY&&exitPointY<=bpyr+4 ){
      exitTriggered=true;
      playSound(81031108);
      alert(winText);
    }
    setVisuals();
  }

    function init() {
      setInterval(tick, tickLength);

      if (PLAYER===false){
        titleInput=document.getElementById("titleInput");
        titleInput.value=gameTitle;

        linkInput=document.getElementById("linkInput");
        linkInput.value=gameLink;

        winTextInput=document.getElementById("winText");
        winTextInput.value=winText;


        for (var i=0;i<16;i++){
          elem = document.getElementById("color_"+(i)); 
          if (elem!==null){       
            elem.style.backgroundColor=colorPalette[i];
            colorElem[i]=elem;
          }
        }

      }

      visibleCanvas = document.getElementById("mainCanvas");

      if (PLAYER===false){
        visibleCanvas.addEventListener('mousedown', mouseDown,false);
        visibleCanvas.addEventListener('mouseup', mouseUp,false);
        visibleCanvas.addEventListener('mousemove', mouseMove,false);
        visibleCanvas.addEventListener('mouseout', mouseOut,false);

        var fileUploader = document.getElementById("my_file");
        fileUploader.addEventListener('change', readFile, false);

        window.addEventListener('mouseup', mouseUp,false);
      }

      visibleContext = visibleCanvas.getContext("2d");
      visibleContext.imageSmoothingEnabled= false;
      id = visibleContext.createImageData(1,1); // only do this once per page
      id_d=id.data;
      setVisuals();

      getData();
    }

  function readFile(evt) {
    //Retrieve the first (and only!) File from the FileList object
    var f = evt.target.files[0]; 

    if (f) {
      var r = new FileReader();
      r.onload = function(e) { 
        var contents = e.target.result;
        var fromToken="<!--__EmbedBegin__-->";
        var endToken="<!--__EmbedEnd__-->";
        var fromIndex=contents.indexOf(fromToken);
        var endIndex=contents.indexOf(endToken);
        var ss1 = contents.substr(fromIndex+fromToken.length,endIndex-fromIndex-fromToken.length);
        var ss2=ss1.substr(ss1.indexOf("=")+2);
        var decoded = decodeURI(ss2);
        var decoded2 = decoded.substring(0, decoded.length - 3);
        stringToState(decoded2);
        setVisuals();
      }
      r.readAsText(f);
    } else { 
      alert("Failed to load file");
    }
  }



  function getParameterByName(name) {
      name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
      var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
          results = regex.exec(location.search);
      return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
  }


  function strip_http(url) {
     url = url.replace(/^https?:\/\//,'');
     return url;
  }

  function getData(){ 

    if (embeddedDat[0]!=='_'){
      embeddedDat=decodeURI(embeddedDat);
      
      stringToState(embeddedDat);
      setVisuals();

      var homepage=gameState.gameLink;
      var homepageLink = document.getElementById("homeLink");
      homepageLink.innerHTML=strip_http(homepage);
      if (!homepage.match(/^https?:\/\//)) {
        homepage = "http://" + homepage;
      }
      homepageLink.href = homepage;

      renderImages();
      return;
    }

    var id = getParameterByName("p").replace(/[\\\/]/,"");
    if (id===null||id.length===0) {
      
      return;
    }

    var githubURL = 'https://api.github.com/gists/'+id;

    var githubHTTPClient = new XMLHttpRequest();
    githubHTTPClient.open('GET', githubURL);
    githubHTTPClient.onreadystatechange = function() {
      if(githubHTTPClient.readyState!=4) {
        return;
      }   
      var result = JSON.parse(githubHTTPClient.responseText);
      if (githubHTTPClient.status===403) {
        alert(result.message);
      } else if (githubHTTPClient.status!==200&&githubHTTPClient.status!==201) {
        alert("HTTP Error "+ githubHTTPClient.status + ' - ' + githubHTTPClient.statusText);
      }
      var result = JSON.parse(githubHTTPClient.responseText);
      var code=result["files"]["game.txt"]["content"];
      
      stringToState(code);
      setVisuals();
    }
    githubHTTPClient.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    githubHTTPClient.send();
  }


  var lastbpx;
  var lastbpy;
  var lastBallFrame=ballFrame;

    function setVisuals(){
      //visibleContext.drawImage(canvasses[canvasIndex], 0, 0); 
      //visibleContext.drawImage(canvasses[canvasIndex], 0, 0,width*zoomFactor,height*zoomFactor); 
      var canvas=canvasses[canvasIndex];
      var zoom = zoomFactor;
      if (tilting){
        zoom-=Math.random()*0.1;
        speedX+=(Math.random()*2-1.0)*0.2;
        speedY+=(Math.random()*2-1.0)*0.2;
        clampSpeed();
      }
      for (var i=0;i<width;i++){
        for (var j=0;j<height;j++){
          var pixelIndex = canvas[i+width*j];
          visibleContext.fillStyle=colorPalette[pixelIndex];
          if (pixelIndex===bumperCol && bumperHit>=0){
            if (regionCanvas[i+width*j]===bumperHit){
              visibleContext.fillStyle=colorPalette[18];              
            }
          } 
          visibleContext.fillRect(i*zoom,j*zoom,zoom,zoom);        
        }
      }


      if (mag([speedX,speedY])>2) {
        var ballPoints=ballPointFrames[Math.floor(lastBallFrame)];
        visibleContext.fillStyle="#888888";
        for (var i=0;i<ballPoints.length;i++){
          var bp = ballPoints[i];
          var pi=Math.round(lastbpx+bp[0]);
          var pj=Math.round(lastbpy+bp[1]);
          visibleContext.fillRect(pi*zoom,pj*zoom,zoom,zoom);
        }
      }
      var ballPoints=ballPointFrames[Math.floor(ballFrame)];
      visibleContext.fillStyle="#ffffff";
      for (var i=0;i<ballPoints.length;i++){
        var bp = ballPoints[i];
        var pi=Math.round(bpx+bp[0]);
        var pj=Math.round(bpy+bp[1]);
        visibleContext.fillRect(pi*zoom,pj*zoom,zoom,zoom);
      }
      lastbpy=bpy;
      lastbpx=bpx;
      if (PLAYER===false){
        titleInput.value=gameTitle;
        linkInput.value=gameLink;
        winTextInput.value=winText;
      }
      lastBallFrame=Math.floor(ballFrame);
    }


  var drawing=0;


  function getCoords(e) {
    var x,y; 
    if(typeof e.offsetX !== "undefined") {
        x = e.offsetX;
        y = e.offsetY;
    }
    else {      
      var target = e.target || e.srcElement;
      var rect = target.getBoundingClientRect();
      x = e.clientX - rect.left,
      y = e.clientY - rect.top;
    } 
    return [x,y];
  }



  function uint8ar_copy(src)  {
      var dst = new Uint8Array(width*height);
      for (var i=0;i<src.length;i++){
        dst[i]=src[i];
      }
      return dst;
  }

  var undoList=new Array();
  function preserveUndoState() {

    dirty=true;
    bpx=-1000;
    bpy=-1000;
    console.log("preserving undo state");
    var undoItem = new Object();
    undoItem.canvasDat=uint8ar_copy(masterCanvas);
    undoList.push(undoItem);
    if (undoList.length>30){
      undoList.shift();
    }
  }

  function mouseDown(e){
    e = e || window.event;

    drawing=1;
    var coords = getCoords(e);
    startTargetX=coords[0];
    startTargetY=coords[1];
    lastX=Math.floor(-1+startTargetX/zoomFactor);
    lastY=Math.floor(-1+startTargetY/zoomFactor);
    
    preserveUndoState();
    mouseMove(e,e.type==="mousedown");
    if(radius===0){
      drawing=0;
    }
  }

  function mouseUp(e){
    e = e || window.event;
    calcHalo();
    setVisuals();
    drawing=0;
    lastX=-1;
    lastY=-1;
  }

  function mouseOut(e){
    e = e || window.event;

    mouseMove(e);
    lastX=-1;
    lastY=-1;
  }

  var activeTool="wall";
  function selectTool(toolName,col){
    activeTool=toolName;
    for (var i=0;i<16;i++){
      var elem = colorElem[i];
      if (elem!=null){
        elem.setAttribute("class","unselected");
      }
    }
    colorElem[col].setAttribute("class","selected");
  }

  function line (x1, y1,x2,y2) {
    var coordinatesArray = new Array();
    // Translate coordinates
    // Define differences and error check
    var dx = Math.abs(x2 - x1);
    var dy = Math.abs(y2 - y1);
    var sx = (x1 < x2) ? 1 : -1;
    var sy = (y1 < y2) ? 1 : -1;
    var err = dx - dy;
    // Set first coordinates
    coordinatesArray.push([x1,y1]);
    // Main loop
    while (!((x1 == x2) && (y1 == y2))) {
      var e2 = err << 1;
      if (e2 > -dy) {
        err -= dy;
        x1 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y1 += sy;
      }
      // Set coordinates
      coordinatesArray.push([x1,y1]);
    }
    // Return the result
    return coordinatesArray;
  }


function eraserDraw(x,y){
  //var points = [[x,y],[x-1,y],[x,y+1],[x+1,y],[x,y-1]];

  var points = [
              [x-1,y+2],[x,y+2],[x+1,y+2],
    [x-2,y+1],[x-1,y+1],[x,y+1],[x+1,y+1],[x+2,y+1],
    [x-2,y  ],[x-1,y  ],[x,y  ],[x+1,y  ],[x+2,y  ],
    [x-2,y-1],[x-1,y-1],[x,y-1],[x+1,y-1],[x+2,y-1],
              [x-1,y-2],[x,y-2],[x+1,y-2]
    ];
  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      masterCanvas[px+width*py]=eraserCol;
    }
  }   
}

function wallDraw(x,y){
  var points = [[x,y],[x-1,y],[x,y+1],[x+1,y],[x,y-1]];

  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      masterCanvas[px+width*py]=wallCol;
    }
  }   
}

function bumperDraw(x,y){
  var points = [[x,y],[x-1,y],[x,y+1],[x+1,y],[x,y-1]];

  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      masterCanvas[px+width*py]=bumperCol;
    }
  }   
}

function flipperDraw(x,y){
  var points = [[x,y],[x-1,y],[x,y+1],[x+1,y],[x,y-1]];

  var foundflipper=false;
  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      val = masterCanvas[px+width*py];
      if (val!==leftFlipperPivotCol&&val!==rightFlipperPivotCol){
        masterCanvas[px+width*py]=flipperCol;
        }
    }
  }   


  neighbours=[[x+1,y],[x,y+1],[x-1,y],[x,y-1]];
  fillCanvas[x+width*y]=1;
  if (masterCanvas[x+width*y]===leftFlipperPivotCol||masterCanvas[x+width*y]===rightFlipperPivotCol){
    foundflipper=true;
  }
  for(var i=0;i<neighbours.length;i++){
    var n = neighbours[i];
    var nx=n[0];
    var ny=n[1];
    if (nx>=0&&nx<width&&ny>=0&&ny<height&&fillCanvas[nx+width*ny]===0){
      var val = masterCanvas[nx+width*ny];
      if (  val===leftFlipperPivotCol   ||
            val===rightFlipperPivotCol  ||
            val===flipperCol 
          ) {
        if (foundflipper){
          masterCanvas[nx+width*ny]=flipperCol;
        } else if (val===leftFlipperPivotCol||val===rightFlipperPivotCol){
          foundflipper=true;
        }
        fillCanvas[nx+width*ny]=1;
        neighbours.push([nx+1,ny]);
        neighbours.push([nx-1,ny]);
        neighbours.push([nx,ny+1]);
        neighbours.push([nx,ny-1]);
      }
    }
  }
  if (foundflipper===false){
    if (x<=width/2){
      masterCanvas[x+width*y]=leftFlipperPivotCol;
    } else {
      masterCanvas[x+width*y]=rightFlipperPivotCol;
    }
  }

  for (var i=0;i<width*height;i++){
    fillCanvas[i]=0;
  }

}

var fillCanvas = new Uint8Array(width*height);
function leftFlipperPivotDraw(x,y){
  var px=x;
  var py=y;

  if (px>=0&&px<width&&py>=0&&py<height){
    masterCanvas[px+width*py]=leftFlipperPivotCol;
  }
  neighbours=[[px+1,py],[px,py+1],[px-1,py],[px,py-1]];
  fillCanvas[px+width*py]=1;
  for(var i=0;i<neighbours.length;i++){
    var n = neighbours[i];
    var nx=n[0];
    var ny=n[1];
    if (nx>=0&&nx<width&&ny>=0&&ny<height&&fillCanvas[nx+width*ny]===0){
      var val = masterCanvas[nx+width*ny];
      if (  val===leftFlipperPivotCol   ||
            val===rightFlipperPivotCol  ||
            val===flipperCol 
          ) {
        masterCanvas[nx+width*ny]=flipperCol;
        fillCanvas[nx+width*ny]=1;
        neighbours.push([nx+1,ny]);
        neighbours.push([nx-1,ny]);
        neighbours.push([nx,ny+1]);
        neighbours.push([nx,ny-1]);
      }
    }

  }

  for (var i=0;i<width*height;i++){
    fillCanvas[i]=0;
  }
}


function rightFlipperPivotDraw(x,y){
  var px=x;
  var py=y;

  if (px>=0&&px<width&&py>=0&&py<height){
    masterCanvas[px+width*py]=rightFlipperPivotCol;
  }
  neighbours=[[px+1,py],[px,py+1],[px-1,py],[px,py-1]];
  fillCanvas[px+width*py]=1;
  for(var i=0;i<neighbours.length;i++){
    var n = neighbours[i];
    var nx=n[0];
    var ny=n[1];
    if (nx>=0&&nx<width&&ny>=0&&ny<height&&fillCanvas[nx+width*ny]===0){
      var val = masterCanvas[nx+width*ny];
      if (  val===leftFlipperPivotCol   ||
            val===rightFlipperPivotCol  ||
            val===flipperCol 
          ) {
        masterCanvas[nx+width*ny]=flipperCol;
        fillCanvas[nx+width*ny]=1;
        neighbours.push([nx+1,ny]);
        neighbours.push([nx-1,ny]);
        neighbours.push([nx,ny+1]);
        neighbours.push([nx,ny-1]);
      }
    }

  }

  for (var i=0;i<width*height;i++){
    fillCanvas[i]=0;
  }
}

function ballSpawnDraw(x,y){
  var px=x;
  var py=y;
  for(var i=0;i<width*height;i++){
    if (masterCanvas[i]===ballSpawnCol){
      masterCanvas[i]=0;
    }
  }
  if (px<3){
    px=3;
  } else if (px>width-3){
    px=width-3;
  }
  if (py<3){
    py=3;
  } else if (py>height-3){
    py=height-3;
  }

  var points = [
                [px-3,py-0],
                [px-3,py-1],
                [px-2,py-2],
                [px-1,py-3],
                [px+0,py-3],
                [px+1,py-2],
                [px+2,py-1],
                [px+2,py-0],
                [px+1,py+1],
                [px+0,py+2],
                [px-1,py+2],
                [px-2,py+1]
                ];
  for (var i=0;i<points.length;i++){
    var p = points[i];
    masterCanvas[p[0]+width*p[1]]=ballSpawnCol;
  }
}


function connectionDraw(x,y){
  var points = [[x,y],[x-1,y],[x,y-1],[x-1,y-1]];

  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      masterCanvas[px+width*py]=connectionCol;
    }
  }   
}

function targetDraw(x,y){
  var points = [[x,y],[x-1,y],[x,y+1],[x+1,y],[x,y-1]];

  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      masterCanvas[px+width*py]=targetCol;
    }
  }   

}

function togglableWallDraw(x,y){
  var points = [[x,y],[x-1,y],[x,y+1],[x+1,y],[x,y-1]];

  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      masterCanvas[px+width*py]=togglableWallCol;
    }
  }   
}

function springDraw(x,y){
  var points = [[x,y],[x-1,y],[x,y+1],[x+1,y],[x,y-1]];

  for (var i=0;i<points.length;i++){
    var px=points[i][0];
    var py=points[i][1];
    if (px>=0&&px<width&&py>=0&&py<height){
      masterCanvas[px+width*py]=springCol;
    }
  }   
}

function exitPointDraw(x,y){
  var px=x;
  var py=y;
  for(var i=0;i<width*height;i++){
    if (masterCanvas[i]===exitCol){
      masterCanvas[i]=0;
    }
  }
  if (px<2){
    px=2;
  } else if (px>width-3){
    px=width-3;
  }
  if (py<2){
    py=2;
  } else if (py>height-3){
    py=height-3;
  }

  var points = [
                [px,py],
                [px-1,py-1],[px-2,py-2],
                [px+1,py-1],[px+2,py-2],
                [px-1,py+1],[px-2,py+2],
                [px+1,py+1],[px+2,py+2]
                ];
  for (var i=0;i<points.length;i++){
    var p = points[i];
    masterCanvas[p[0]+width*p[1]]=exitCol;
  }
}


  var interpolateBrush = {
    eraser: true,
    wall: true,
    bumper: true,
    flipper: true,
    leftFlipperPivot: false,
    rightFlipperPivot: false,
    ballSpawn: false,
    connection: true,
    target: true,
    togglableWall: true,
    spring: true,
    exitPoint: false
  }

  var drawFuncs = {
    eraser: eraserDraw,
    wall: wallDraw,
    bumper: bumperDraw,
    flipper: flipperDraw,
    leftFlipperPivot: leftFlipperPivotDraw,
    rightFlipperPivot: rightFlipperPivotDraw,
    ballSpawn: ballSpawnDraw,
    connection: connectionDraw,
    target: targetDraw,
    togglableWall: togglableWallDraw,
    spring: springDraw,
    exitPoint: exitPointDraw
  }

  function mouseMove(e,mousedown){
    e = e || window.event;

    if (drawing===0)
      return;

    var coords = getCoords(e);

    var x = Math.floor(-1+coords[0]/zoomFactor);
    var y = Math.floor(-1+coords[1]/zoomFactor);



    var points;
    if (interpolateBrush[activeTool]===false||lastX<0||lastY<0) {
      points=[[x,y]];
    } else {
      points=line(lastX,lastY,x,y);
    }

    var brushFn=drawFuncs[activeTool];
    for (var i=0;i<points.length;i++){
     var p=points[i];
     brushFn(p[0],p[1]);
    }
  

    var basicCanvas = canvasses[0];
    for (var i=0;i<basicCanvas.length;i++){
      basicCanvas[i]=masterCanvas[i];
    }
    /*context.beginPath();
    context.arc(x, y, radius, 0, 2 * Math.PI, false);
    context.lineWidth = 0;
    context.fillStyle = 'green';
    context.fill();*/
    setVisuals();

    var coords = getCoords(e);
    lastX=Math.floor(-1+coords[0]/zoomFactor);
    lastY=Math.floor(-1+coords[1]/zoomFactor);
    
  }

  function compile(){
    boundingBoxes = {};
    pivotPoints = {};

    for (var i=0;i<width*height;i++){
      regionCanvas[i]=0;
    }

    regionTypes=[];

    var ballSpawnPointCount=0;
    ballSpawnPointX=0;
    ballSpawnPointY=0;

    var exitPointCount=0;
    exitPointX=0;
    exitPointY=0;

    regionCanvasCount = 2;
    for (var x=0;x<width;x++){
      for (var y=0;y<height;y++) {
        if (regionCanvas[x+width*y]===0){
          var val =masterCanvas[x+width*y];
          if (val===eraserCol||val===bumperAuraCol){
            regionCanvas[x+width*y]=eraserCol;
          } else if (val===wallCol) {
            regionCanvas[x+width*y]=wallCol;
          } else {
            fillRegion(x,y,regionCanvasCount+1);
            regionCanvasCount++;
          }
        }
        if (masterCanvas[x+width*y]===ballSpawnCol){
          ballSpawnPointX+=x;
          ballSpawnPointY+=y;
          ballSpawnPointCount++;
        }
        if (masterCanvas[x+width*y]===exitCol){
          exitPointX+=x;
          exitPointY+=y;
          exitPointCount++;
        }
      }
    }

    if (ballSpawnPointCount>0){
      ballSpawnPointX/=ballSpawnPointCount;
      ballSpawnPointY/=ballSpawnPointCount;
      ballSpawnPointX-=2;
      ballSpawnPointY-=2;
    } else {
      ballSpawnPointX=width/2;
      ballSpawnPointY=height/2;
    }

    if (exitPointCount===0){
      exitPointX=-10000;
      exitPointY=-10000; 
    } else {
      exitPointX/=exitPointCount;
      exitPointY/=exitPointCount;
    }

    drawBB();
    scrunchSprings();
    generateSweepOffsets();
    makeConnections();
    setVisuals();
  }

  function spawnBall(){
    bpx=ballSpawnPointX;
    bpy=ballSpawnPointY;
    ballSpin=0;
    speedX=0;
    speedY=0;
    playSound(43637308);
  }

  function fillRegion(x,y,regionNumber){
    var originCol=masterCanvas[x+width*y];
    var originFlipper = 
      originCol===leftFlipperPivotCol ||
      originCol===rightFlipperPivotCol ||
      originCol===flipperCol;

    if (originCol===leftFlipperPivotCol){
     pivotPoints[regionNumber]=[x,y,1];
    } else if (originCol===rightFlipperPivotCol){
     pivotPoints[regionNumber]=[x,y,2];
    } 

    regionCoordIndex=x+width*y;
    regionCanvas[regionCoordIndex]=regionNumber;
    regionTypes[regionNumber]=masterCanvas[regionCoordIndex];

    if ((regionNumber) in boundingBoxes){
      bbox = boundingBoxes[regionNumber];
      bbox[0]=Math.min(bbox[0],nx);
      bbox[1]=Math.min(bbox[1],ny);
      bbox[2]=Math.max(bbox[2],nx);
      bbox[3]=Math.max(bbox[3],ny);
    } else {
      boundingBoxes[regionNumber]=[x,y,x,y];
    }

    var neighbours = [[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
    for(var i=0;i<neighbours.length;i++){
      var n = neighbours[i];
      var nx=  n[0];
      var ny = n[1];
      if (nx>=0&&nx<width&&ny>=0&&ny<height&&masterCanvas[nx+width*ny]>wallCol &&regionCanvas[nx+width*ny]===0) {
        var val = masterCanvas[nx+width*ny];
        if (val==originCol ||
              (originFlipper && (
                val === leftFlipperPivotCol ||
                val === rightFlipperPivotCol ||
                val === flipperCol ) ) ) {
          regionCanvas[nx+width*ny]=regionNumber;
          neighbours.push([nx+1,ny]);
          neighbours.push([nx-1,ny]);
          neighbours.push([nx,ny+1]);
          neighbours.push([nx,ny-1]);

          if (regionNumber in boundingBoxes){
            bbox = boundingBoxes[regionNumber];
            bbox[0]=Math.min(bbox[0],nx);
            bbox[1]=Math.min(bbox[1],ny);
            bbox[2]=Math.max(bbox[2],nx);
            bbox[3]=Math.max(bbox[3],ny);
          } else {
            boundingBoxes[regionNumber]=[nx,ny,nx,ny];
          }

          if (originFlipper){
            if (val===leftFlipperPivotCol) {
              pivotPoints[regionNumber]=[nx,ny,1];
            } else if (val === rightFlipperPivotCol){
              pivotPoints[regionNumber]=[nx,ny,2];
            }
          }
        }
      }
    }
  }

  function scrunchSprings(){
    var downNoneCanvas=uint8ar_copy(canvasses[0]);
    var downLeftCanvas=uint8ar_copy(canvasses[1]);
    var downRightCanvas=uint8ar_copy(canvasses[2]);
    var downBothCanvas=uint8ar_copy(canvasses[3]);
    canvasses[4]=downNoneCanvas;
    canvasses[5]=downLeftCanvas;
    canvasses[6]=downRightCanvas;
    canvasses[7]=downBothCanvas;


    //remove springs
    for (var i=0;i<regionCanvas.length;i++){
      var regionNumber = regionCanvas[i];
      if (regionTypes[regionNumber]===springCol){
        downNoneCanvas[i]=0;
        downLeftCanvas[i]=0;
        downRightCanvas[i]=0;
        downBothCanvas[i]=0;
      }
    }

    //redraw them at half height

    for (var regionNumberStr in boundingBoxes){
      var regionNumber=Number(regionNumberStr);
      if (regionTypes[regionNumber] !== springCol){
        continue;
      }
      var bbox = boundingBoxes[regionNumber];
      var bottomy=bbox[3];
      for (var x=bbox[0];x<=bbox[2];x++){      
        for (var y=bbox[1];y<=bbox[3];y++){
          var i = x+width*y;
          if (regionCanvas[i]===regionNumber){
            var newy = (y-bottomy)/2+bottomy;
            newy=Math.round(newy);
            downNoneCanvas[x+width*newy]=springCol;
            downLeftCanvas[x+width*newy]=springCol;
            downRightCanvas[x+width*newy]=springCol;
            downBothCanvas[x+width*newy]=springCol;
          }
        }
      }
    }
  }
  
  function generateSweepSprings(
    sourceCanvasIndex,
    targetCanvasIndex
    ) {

    var sourceCanvas=canvasses[sourceCanvasIndex];
    var targetCanvas= canvasses[targetCanvasIndex];
    var targetSweepArea = sweepAreas[sourceCanvasIndex][targetCanvasIndex];
    var targetSweepAreaInverse = sweepAreas[targetCanvasIndex][sourceCanvasIndex];

    for (var regionNumberStr in boundingBoxes){
      var regionNumber=Number(regionNumberStr);
      if (regionTypes[regionNumber] !== springCol){
        continue;
      }
      var bbox = boundingBoxes[regionNumber];
      var bottomy=bbox[3];
      var topy=bbox[1];
      var bheight=bottomy-topy;

      for (var x=bbox[0];x<=bbox[2];x++){      
        for (var y=bbox[1];y<=bbox[3];y++){          
          var i = x+width*y;
          if (regionCanvas[i]===regionNumber){
            var altitude = bottomy-y;
            var targetaltitutde=Math.round(altitude/2);
            var targetx=x;
            var targety=bottomy-targetaltitutde;

            //forward sweep
            var targetindex = targetx+width*targety;
            while (targetindex>0&&targetindex<width*height){
              var targetVal = targetCanvas[targetindex];
              if (targetVal<=eraserCol||targetVal===bumperAuraCol){
                break;
              }
              targetindex-=width;
            }

            var sourcex=x;
            var sourcey=y;
            var sourceindex = sourcex+width*sourcey;
            while (sourceindex>0&&sourceindex<width*height){
              var sourceVal = sourceCanvas[sourceindex];
              if (sourceVal<=eraserCol||sourceVal===bumperAuraCol){
                break;
              }
              sourceindex-=width;
            }


            var linePoints = line(x,y,Math.round(targetx),Math.round(targety));
            for (var j=0;j<linePoints.length;j++){
              var lp=linePoints[j];
              var lpx=lp[0];
              var lpy=lp[1];              
              var index3 = lpx+width*lpy;
              targetSweepArea[index3]=targetindex;
              targetSweepAreaInverse[index3]=sourceindex;
            }

          }
        }
      }
    }
  }

  function clickPlay(){
    compile();
    spawnBall();
    setVisuals();
  }

  function generateSweepCanvasPair(
                    sourceIndex,targetLeftIndex, targetRightIndex){
    var sourceCanvas = canvasses[sourceIndex];
    var leftTargetCanvas =                  targetLeftIndex>=0  ? canvasses[targetLeftIndex]                  : null;
    var rightTargetCanvas =                 targetRightIndex>=0 ? canvasses[targetRightIndex]                 : null;
    var leftTargetSweepCanvas =             targetLeftIndex>=0  ? sweepAreas[sourceIndex][targetLeftIndex]    : null; 
    var rightTargetSweepCanvas =            targetRightIndex>=0 ? sweepAreas[sourceIndex][targetRightIndex]   : null;
    var leftTargetInverseSweepCanvas =      targetLeftIndex>=0  ? sweepAreas[targetLeftIndex][sourceIndex]    : null; 
    var rightTargetInverseSweepCanvas =     targetRightIndex>=0 ? sweepAreas[targetRightIndex][sourceIndex]   : null;

  //step 1 - generate for just going to flip left/right from resting

      for (var regionNumberStr in pivotPoints){
        var regionNumber=Number(regionNumberStr);
        var ppoint = pivotPoints[regionNumber];
        var bbox = boundingBoxes[regionNumber];
        var orientation=ppoint[2];
        var targetCanvas;
        var targetAngle=30.0;
        var targetPivotCol;
        var targetCanvas;
        var targetSweepArea;
        var targetSweepAreaInverse;
        if (orientation===1){
          targetAngle=-targetAngle;
          targetCanvas=leftTargetCanvas;
          targetSweepArea=leftTargetSweepCanvas;
          targetSweepAreaInverse=leftTargetInverseSweepCanvas;
        } else if (orientation===2){
          targetAngle=targetAngle;
          targetCanvas=rightTargetCanvas;
          targetSweepArea=rightTargetSweepCanvas;
          targetSweepAreaInverse=rightTargetInverseSweepCanvas;
        }
        if (targetCanvas===null){
          continue;
        }

        var px=ppoint[0];
        var py=ppoint[1];
        theta=Math.PI*targetAngle/180.0;
        for (var x=bbox[0];x<=bbox[2];x++){      
          for (var y=bbox[1];y<=bbox[3];y++){
            var i = x+width*y;
            if (regionCanvas[i]===regionNumber){
              var dx=x-px;
              var dy=y-py;
              var targetxExact=px+Math.cos(theta)*dx-Math.sin(theta)*dy
              var targetyExact=py+Math.sin(theta)*dx+Math.cos(theta)*dy;
              var targetx=Math.round(targetxExact);
              var targety=Math.round(targetyExact);

              var diff=-1;
              
              if (orientation===1){
                if (targetxExact<px){
                  diff=+1;
                }
              } else {
                if (targetxExact>=px){
                  diff=+1;
                }
              }

              //forward sweep
              var targetindex = targetx+width*targety;
              while (targetindex>0&&targetindex<width*height){
                var targetVal = targetCanvas[targetindex];
                if (targetVal<=eraserCol||targetVal===bumperAuraCol){
                  break;
                }
                targetindex+=diff*width;
              }

              var sourcex=x;
              var sourcey=y;
              var sourceindex = sourcex+width*sourcey;
              while (sourceindex>0&&sourceindex<width*height){
                var sourceVal = sourceCanvas[sourceindex];
                if (sourceVal<=eraserCol||sourceVal===bumperAuraCol){
                  break;
                }
                sourceindex-=diff*width;
              }


              var linePoints = line(x,y,Math.round(targetx),Math.round(targety));
              for (var j=0;j<linePoints.length;j++){
                var lp=linePoints[j];
                var lpx=lp[0];
                var lpy=lp[1];              
                var index3 = lpx+width*lpy;
                targetSweepArea[index3]=targetindex;
                //canvasses[0][index3]=8;
                targetSweepAreaInverse[index3]=sourceindex;
              }

            }
          }
        }
      }

  }

  var NONE = 0;
  var DOWN = 4;
  var LEFT = 1;
  var RIGHT = 2;
  var sweepAreas = [];

  function generateSweepOffsets() {
    for (var i=0;i<8;i++){
      sweepAreas[i]=[];
    }

    sweepAreas[NONE][LEFT] = new Uint32Array(width*height);
    sweepAreas[NONE][RIGHT] = new Uint32Array(width*height);
    sweepAreas[LEFT][NONE] = new Uint32Array(width*height);
    sweepAreas[RIGHT][NONE] = new Uint32Array(width*height);
    generateSweepCanvasPair(NONE,LEFT,RIGHT);

    sweepAreas[LEFT][LEFT+RIGHT] = new Uint32Array(width*height);
    sweepAreas[LEFT+RIGHT][LEFT] = new Uint32Array(width*height);
    generateSweepCanvasPair(LEFT,-1,LEFT+RIGHT);

    sweepAreas[RIGHT][LEFT+RIGHT] = new Uint32Array(width*height);
    sweepAreas[LEFT+RIGHT][RIGHT] = new Uint32Array(width*height);
    generateSweepCanvasPair(RIGHT,LEFT+RIGHT,-1);

    sweepAreas[DOWN+LEFT][DOWN+LEFT+RIGHT] = new Uint32Array(width*height);
    sweepAreas[DOWN+LEFT+RIGHT][DOWN+LEFT] = new Uint32Array(width*height);
    generateSweepCanvasPair(DOWN+LEFT,-1,DOWN+LEFT+RIGHT);

    sweepAreas[DOWN+RIGHT][DOWN+LEFT+RIGHT] = new Uint32Array(width*height);
    sweepAreas[DOWN+LEFT+RIGHT][DOWN+RIGHT] = new Uint32Array(width*height);
    generateSweepCanvasPair(DOWN+RIGHT,DOWN+LEFT+RIGHT,-1);

    sweepAreas[DOWN][DOWN+LEFT] = new Uint32Array(width*height);
    sweepAreas[DOWN][DOWN+RIGHT] = new Uint32Array(width*height);
    sweepAreas[DOWN+LEFT][DOWN] = new Uint32Array(width*height);
    sweepAreas[DOWN+RIGHT][DOWN] = new Uint32Array(width*height);
    generateSweepCanvasPair(DOWN,DOWN+LEFT,DOWN+RIGHT);

    sweepAreas[DOWN][NONE] = new Uint32Array(width*height);
    sweepAreas[NONE][DOWN] = new Uint32Array(width*height);
    generateSweepSprings(NONE,DOWN);


    sweepAreas[LEFT][DOWN+LEFT] = new Uint32Array(width*height);
    sweepAreas[DOWN+LEFT][LEFT] = new Uint32Array(width*height);
    generateSweepSprings(LEFT,LEFT+DOWN);

    sweepAreas[RIGHT][DOWN+RIGHT] = new Uint32Array(width*height);
    sweepAreas[DOWN+RIGHT][RIGHT] = new Uint32Array(width*height);
    generateSweepSprings(RIGHT,RIGHT+DOWN);


    sweepAreas[LEFT+RIGHT][DOWN+LEFT+RIGHT] = new Uint32Array(width*height);
    sweepAreas[DOWN+LEFT+RIGHT][LEFT+RIGHT] = new Uint32Array(width*height);
    generateSweepSprings(LEFT+RIGHT,LEFT+RIGHT+DOWN);


  }

  function drawBB(){
    var frontCanvas=uint8ar_copy(masterCanvas);
    var leftCanvas=uint8ar_copy(masterCanvas);
    var rightCanvas=uint8ar_copy(masterCanvas);
    var bothCanvas=uint8ar_copy(masterCanvas);
    canvasses[0]=frontCanvas;
    canvasses[1]=leftCanvas;
    canvasses[2]=rightCanvas;
    canvasses[3]=bothCanvas;

    for (var i=0;i<regionCanvas.length;i++){
      var regionNumber = regionCanvas[i];
      if (regionNumber in pivotPoints){
        if(pivotPoints[regionNumber][2]===1){
          leftCanvas[i]=0;
          bothCanvas[i]=0;
        } else {
          rightCanvas[i]=0;
          bothCanvas[i]=0;
        }
      }
    }

    for (var regionNumberStr in pivotPoints){
      var regionNumber=Number(regionNumberStr);
      var ppoint = pivotPoints[regionNumber];
      var bbox = boundingBoxes[regionNumber];
      var orientation=ppoint[2];
      var targetCanvas;
      var targetAngle=30.0;
      var targetPivotCol;
      if (orientation===1){
        targetAngle=-targetAngle;
        targetCanvas=leftCanvas;
        targetPivotCol=leftFlipperPivotCol;
      } else {
        targetCanvas=rightCanvas;
        targetPivotCol=rightFlipperPivotCol;
      }

      var px=ppoint[0];
      var py=ppoint[1];
      theta=Math.PI*targetAngle/180.0;
      for (var x=bbox[0];x<=bbox[2];x++){      
        for (var y=bbox[1];y<=bbox[3];y++){
          var i = x+width*y;
          if (regionCanvas[i]===regionNumber){
            var dx=x-px;
            var dy=y-py;
            var px2=px+Math.cos(theta)*dx-Math.sin(theta)*dy;
            var py2=py+Math.sin(theta)*dx+Math.cos(theta)*dy;
            var points = [
                            [Math.floor(px2),Math.floor(py2)],
                            [Math.floor(px2),Math.ceil(py2)],
                            [Math.ceil(px2),Math.ceil(py2)],
                            [Math.ceil(px2),Math.floor(py2)]
                            ];
            for (var j=0;j<points.length;j++){
              var point2=points[j];
              var px3=point2[0];
              var py3=point2[1];
              if (px3>=0&&py3>=0&&px3<width&&py3<height){
                var index3=px3+width*py3;
                targetCanvas[index3]=flipperCol;
                bothCanvas[index3]=flipperCol;
              }
            }
           /* var linePoints = line(x,y,Math.round(px2),Math.round(py2));
            for (var j=0;j<linePoints.length;j++){
              var lp=linePoints[j];
              var lpx=lp[0];
              var lpy=lp[1];
              var index3 = lpx+width*lpy;
              if (canvas[index3]===0||canvas[index3]===magnetAuraCol){
                canvas[index3]=exitCol;
              }
            }*/
          }
        }
      }

      bothCanvas[px+width*py]=targetPivotCol;
      targetCanvas[px+width*py]=targetPivotCol;

    }
    canvasIndex=3;
  }

  function calcHalo(){
    for (var x=1;x<width-1;x++){
      for (var y=1;y<height-1;y++){
        var val = masterCanvas[x+width*y];
        if (val===0 || val===bumperAuraCol) {
          var neighbours = [
            [x-1,y-1],[x,y-1],[x+1,y-1],
            [x-1,y],      [x+1,y],
            [x-1,y+1],[x,y+1],[x+1,y+1]];
          masterCanvas[x+width*y]=0;
          for (var i=0;i<neighbours.length;i++){
            var n = neighbours[i];
            var nx = n[0];
            var ny = n[1];
            var v = masterCanvas[nx+width*ny];
            if (v===bumperCol){
              masterCanvas[x+width*y]=bumperAuraCol;
              break;
            } 
          }
        }
      }
    }
    var c = canvasses[0];
    for (var i=0;i<masterCanvas.length;i++){
      c[i]=masterCanvas[i];
    }
  }


  function floodFill(canvas,x,y,colorIndex){
    var points = [[x,y]];
    originColor = canvas[x+width*y];
    if (originColor===colorIndex){
      return;
    }

    for (var i=0;i<points.length;i++){
      var p = points[i];
      var pIndex = p[0]+width*p[1];
      if (canvas[pIndex]===colorIndex) {
        continue;
      } else {
        canvas[pIndex]=colorIndex;
        borderPoints = [[p[0]+1,p[1]],[p[0]-1,p[1]],[p[0],p[1]+1],[p[0],p[1]-1]];
        for (var j=0;j<borderPoints.length;j++){
          var borderPoint=borderPoints[j]; 
          var borderpx=borderPoint[0];
          var borderpy=borderPoint[1];
          var bpi=bpx+width*bpy;
          if (
            borderpx>=0 &&
            borderpx<width &&
            borderpy>=0 &&
            borderpy<height &&
            canvas[bpi]===originColor){
            points.push([borderpx,borderpy]);
          }
        }
      }
    }
  }