$(document).ready(()=>{
  $("#menu").on("click",function () {
      location.href = "/draw/menu/";
  });

  // INITIALIZATION
  var canvas = document.getElementById('myCanvas');
  //Save SVG from paper.js as a file.
  
  paper.setup(canvas);
  var tool = new paper.Tool();
  
  //show formation images function
  function formationPics(){
    $.get("/draw/formation_data").done(function(formation_json) {
      $(".image-container").empty();
      $(".image-container").append("Saved Formations <br>");
      $.each(formation_json, function(form_name, data ) {
      $(".image-container").append("<img id='"+ form_name + "'" +"src=" + data.image + "><br> <b>" + form_name +"</b><hr>");
    }); 
  });
  }
  // load formation images from db
  formationPics();
  
 
  var dancers = null;
  var circArray = [0]; 
  //Each entry in here is a Paper JS Group containing the Path (Circle) and Text (TextPosition). To get the position, just do circArray[i].position
  // [Group, Group, Group, ...]
  var circToDancer = {};
  //Each entry in here is a key value pair. The key is the group from circArray, and the value is the index of that dancer in the data. 
  // {{Group: 1}, {Group: 2}, ...}
  
  function loadRoster() {
    $.get("/draw/roster_data").done(function(data) {
      dancers = data;
      createDancerList(data);
    })
  }
  
  function loadFormation(preset) {
    $.get("/draw/formation_data").done(function(data) {
      dancers = {};
      var tempList = data[preset].positions;
      $("#notes").val(data[preset].notes);
      for (var i = 0; i < tempList.length; i ++) {
        var temp = tempList[i];
        var dancer = {};
        dancer.name = temp[2];
        dancer.color = temp[3];
        dancer.position = {};
        dancer.position.x = temp[0];
        dancer.position.y = temp[1];
        dancers[i + 1] = dancer;
      }
      paper.project.activeLayer.removeChildren();
      createDancerList(dancers);
    })
  }
  
  
  
  loadRoster();
  //loadFormation("Preset 1");
  paper.view.draw();
  
  var selectedCirc = null;
  
  var selectedCircs = new Set();
  var selectedStart = null;
  var selectionComplete = false;
  var selectionBox = null;
  var selectionGroup = null;
  
  var layerNumber = 0;
  
  // MOUSE EVENTS
  
  tool.onMouseDown = function(event) {
    if (!document.getElementById("switchCheckBox").selected && !document.getElementById("groupCheckBox").selected) {
      normalMouseDown(event);
    }
    if (document.getElementById("groupCheckBox").selected) {
      selectionMouseDown(event);
    }
  }
  
  tool.onMouseUp = function(event) {
    if (document.getElementById("switchCheckBox").selected) {
      switchMouseUp(event);
    } else if (document.getElementById("groupCheckBox").selected) {
      selectionMouseUp(event);
    }  else if (selectedCirc) {
      deselect();
    }
  }
  
  tool.onMouseDrag = function(event) {
    if (!document.getElementById("switchCheckBox").selected && !document.getElementById("groupCheckBox").selected && selectedCirc) {
      selectedCirc.position = new paper.Point(gridPoint(event.point));
    } else if (document.getElementById("groupCheckBox").selected) {
      selectionMouseDrag(event);
    }
  }
  
  tool.onMouseMove = function(event) {
    normalMouseMove(event);
  }
  
  $('.preset').hide();
  document.getElementById("presetCheckBox").addEventListener('change', function() {
    $('.preset').toggle();
  });
  
  document.getElementById("layerOptions").addEventListener('change', function() {
    if (document.getElementById("newLayer").selected) {
      layerNumber += 1;
      this.size += 1;
      var newLayerOption = document.createElement("option");
      newLayerOption.id = "layer" + layerNumber;
      newLayerOption.text = "Layer " + layerNumber;
      document.getElementById("layersOptgroup").append(newLayerOption);
      document.getElementById("newLayer").selected = false;
      newLayerOption.selected = true;
      
      var newLayer = new paper.Layer();
      paper.project.layers.push(newLayer);
      newLayer.activate();
      loadRoster();
    }
    checkLayers();
  });
  
  document.getElementById("selectionOptions").addEventListener('change', function() {
    deselect();
  });
  
  
  // FUNCTIONS
  function createDancerList(dancerList) {
    for (var i in dancerList) {
      var dancer = dancerList[i];
     var x = 40;
      var y = -40 + 80*i;
      if (y + 50 > canvas.height) {
        x = 40 + 40*2*(Math.floor((y+50)/canvas.height));
        y = 15 + (80*i) - canvas.height;
      }
      if (dancer.position) {
        x = parseInt(dancer.position.x);
        y = parseInt(dancer.position.y);
      }
      var circ = new paper.Path.Circle(new paper.Point(x, y), 30);
      
      var color = 'white'
      if (dancer.color) {
        color = dancer.color;
      }
      circ.strokeColor = "black";
      circ.fillColor = color;
      circText = new paper.PointText(new paper.Point(x, y + 15));
      circText.content = i;
      circText.fontSize = 40;
      circText.justification = 'center';
      
      var group = new paper.Group([circ, circText]);
      circToDancer[group] = i;
      circArray.push(group);
    }
  }
    
  function loadDancerList(dancers) {
    for (var i = 0; i < dancers.length; i ++) {
      var dancer = dancers[i];
      var x = 40;
      var y = 40 + 80*i;
    }
  }
  
  function checkLayers() {
    var activated = 0;
    for (var i=0; i < layerNumber + 1; i++) {
      var layer = document.getElementById("layer" + i);
      if (layer.selected) {
        activated += 1;
        paper.project.layers[i].activate();
        paper.project.layers[i].visible = true;
        paper.project.layers[i].opacity = 1/activated;
      } else {
        paper.project.layers[i].visible = false;
        paper.project.layers[i].locked = true;
      }
    }
  }

  
  function findCirc(event) {
    for (var i = 1; i < circArray.length + 1; i ++) {
      var circ = circArray[i];
      /*if (!(paper.project.activeLayer.children.includes(circ))) {
        continue;
      }*/
      if (!circ) {
        continue;
      }
      var hit = circ.hitTest(event.point, { tolerance: 0, fill: true });
      if (hit) {
        return i;
      }
    }
    return -1;
  }
  
  function normalMouseDown(event) {
    var circIndex = findCirc(event);
    if (circIndex != -1) {
      select(circIndex);
      circArray[circIndex].children[1].selected = false;
    }
  }
  
  function selectionMouseDown(event) {
    selectionStart = event.point;
    selectionBox = new paper.Path.Rectangle(event.point, event.point);
  }
  
  function selectionMouseDrag(event) {
    if (selectionComplete) {
      var hit = selectionGroup.hitTest(event.point, { tolerance: 100, fill: true });
      if (hit) {
        selectionGroup.position = event.point;
      }
    } else {
      selectionBox.remove();
      selectionBox = new paper.Path.Rectangle(selectionStart, event.point);
      selectionBox.strokeColor = "black";
      selectionBox.dashArray = [4,10];
      dynamicSelection(event);
    }
  }
  
  function selectionMouseUp(event) {
    if (selectionComplete) {
      deselect();
      selectedCircs = new Set();
      selectionComplete = false;
    } else {
      selectionComplete = true;
      selectionGroup = new paper.Group(Array.from(selectedCircs));
      selectionBox.remove();
    }
  }
  
  function switchMouseUp(event) {
    var circIndex = findCirc(event);
    if (selectedCirc) {
      if (circIndex != -1) {
        var tempPos = selectedCirc.position;
        var circ = circArray[circIndex];
        selectedCirc.position = circ.position;
        circ.position = tempPos;
      }
      deselect();
    } else {
      if (circIndex != -1) {
        select(circIndex);
      }
    }
  }
  
  var namePopup = new paper.PointText(0,0);
  var popupRect = new paper.Path.Rectangle(namePopup.bounds)
  
  function normalMouseMove(event) {
    var circIndex = findCirc(event);
    namePopup.remove();
    popupRect.remove();
    if (circIndex != -1) {
      var dancer = dancers[circIndex];
      namePopup = new paper.PointText(event.point);
      namePopup.point.x += 5;
      namePopup.point.y -= 5;
      namePopup.content = " " + dancer.name + " ";
      namePopup.fillColor = "white";
      namePopup.fontSize = 20;
      popupRect = new paper.Path.Rectangle(namePopup.bounds);
      popupRect.fillColor = 'black';
      popupRect.strokeColor = 'black';
      namePopup.insertAbove(popupRect);
    }
  }
  
  function select(circIndex) {
    selectedCirc = circArray[circIndex];
    selectedCirc.selected = true;
    selectedCirc.children[1].selected = false;
    selectedCircs.add(selectedCirc);
  }
  
  function deselect() {
    for (var i = 1; i < circArray.length; i++) {
      circArray[i].selected = false;
    }
    selectedCirc = null;
    selectedCircs = new Set();
//     document.getElementById("Name").innerHTML = "Name: ";
//     document.getElementById("Number").innerHTML = "Number: ";
  }
  
  function gridPoint(point) {
    var gridStep = document.getElementById("gridStep").value;
    var x = Math.floor(point.x/gridStep)*gridStep;
    var y = Math.floor(point.y/gridStep)*gridStep;
    return new paper.Point(x, y)
  }
  
  function dynamicSelection(event) {
    deselect();
    for (var i = 1; i < circArray.length; i++) {
      var circ = circArray[i];
      var box = new paper.Rectangle(selectionStart, event.point);
      if (circ.position.isInside(box) /*&& paper.project.activeLayer.children.includes(circ)*/) {
        select(i);
      }
    }
  }
  
  
  
  // save formation button functionality/ adding data in django db
  $("#save").on("click", function(){ 
    var dataURL = canvas.toDataURL();
    var formation_data = {fname: $("#finput").val(), csrfmiddlewaretoken: csrf_thing, action: 'save', image: dataURL ,'notes': $("#notes").val()};
    var length_circArray = circArray.length;
    var positions = [];
    for (var i = 1; i < length_circArray; i++){
      positions.push([circArray[i].children[0].position.x, circArray[i].children[0].position.y]);
    }
    formation_data.positions = JSON.stringify(positions);
    console.log(formation_data);
    $.post("/draw/formation_data/", 
           formation_data, (callback_data) => {
           formationPics();
    });
    return false;
  });
  
  // delete formation
  $("#delete").on("click", ()=>{
    var dataURL = canvas.toDataURL();
    var formation_data = {fname: $("#finput").val(), csrfmiddlewaretoken: csrf_thing, action: 'delete', image: dataURL ,'notes': $("#notes").val()};
    $.post("/draw/formation_data/", 
           formation_data, (callback_data) => {
           formationPics();
    });
    return false;
  });
  
  // load formations from images
  $("body").on("click", "img", function(){
    loadFormation(this.id); 
    console.log("Image selected with id:" + this.id);
  });
    //Fill Color: circArray[i].children[0].fillColor.toCanvasStyle()
    //Position: circArray[i].children[0].position
    //Dancer Index: circToDancer[circArray[i]]   circToDancer = {group:1, ..}
    //Dancer Name: data[Dancer Index]
    //Dancer Number: Dancer Index
      
});
//https://cors-anywhere.herokuapp.com/