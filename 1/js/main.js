 var app = app || {};

app.config = {
  numBoxes: 100,
  boxDistribution: 200,
  spotlightMovement: 100,
  boxScale: 1,
  boxSizeRange: 20,
  boxRotationScale: 1,
  xScale: 1,
  yScale: 1,
  zScale: 1,
  boxOpacity: 1.0,
  ambientColour: '#333333',
  spotColour: '#FFFFFF',
  colourCycle: 1000,
  tour: false,
  isPaused: false,
  showStats: false
};

app.step = 0;
app.cameraAngle = 0;

app.init = function () {

  document.addEventListener('keydown', function(e) {
    if( e.keyCode === 32){
      // spacebar to pause
      app.config.isPaused = !app.config.isPaused;
      !app.config.isPaused && app.animate(); // restart animation
    } else if( e.key === 'f' ){
      // 'f' to show/hide stats
      app.config.showStats = !app.config.showStats;
      app.stats.showPanel( app.config.showStats ? 0 : false );
    } else if( e.key === 't' ){
      // 't' to toggle tour mode (camera movement)
      app.config.tour = !app.config.tour;
    }
  });

  app.scene = new THREE.Scene();
  app.width = window.innerWidth;
  app.height = window.innerHeight;

  app.camera = new THREE.PerspectiveCamera(60, app.width/app.height, 0.1, 5000 );
  app.camera.position.set(-200, 20, 12);
  app.camera.lookAt( app.scene.position );

  app.renderer = new THREE.WebGLRenderer();
  app.renderer.setSize( app.width, app.height );
  app.renderer.setClearColor( 0x000000 ); //background
  // app.scene.add( new THREE.AxisHelper(40) );

  app.ambientLight = new THREE.AmbientLight(); //soft white ambientLight from everywhere
  app.ambientLight.color.set( 0x444444 );
  app.scene.add( app.ambientLight );

  app.spotlight = new THREE.PointLight( 0xFFFFFF );
  // app.spotlight = new THREE.DirectionalLight( 0xFF0022 , 1 );
  app.spotlight.position.set( -10, 60, 10 );
  app.scene.add( app.spotlight );


  app.controls = new THREE.OrbitControls( app.camera, app.renderer.domElement );

  app.initControlPanel();

  // app.renderer.domElement.addEventListener('mousemove', function () {
  //   app.lastMouseTime = Date.now();
  // });

  app.boxFleet = app.initBoxes(
    parseInt(app.config.numBoxes),
    app.config.boxDistribution,
    app.config.boxSizeRange
   );

  app.stats = app.addStats();
  app.stats.showPanel( false );

  document.getElementById("output").appendChild( app.renderer.domElement );
  app.animate();
}; // init


app.initControlPanel= function(){
  app.gui = new dat.GUI();
  app.gui.add( app.config, 'numBoxes', 1, 1000 ).name('Box Count').onChange( app.resetBoxes );
  app.gui.add( app.config, 'boxDistribution', 1, 1000 ).name('Box Spread').onChange( app.resetBoxes );
  app.gui.add( app.config, 'spotlightMovement', 1, 100 ).name('Light Movement');
  app.gui.add( app.config, 'colourCycle', 1, 1000 );
  app.gui.add( app.config, 'boxOpacity', 0.0, 1.0 ).name('Box Opacity').onChange(function(){
    app.boxFleet.forEach( box => {
      box.material.transparent = app.config.boxOpacity < 1.0 ? true : false;
      box.material.opacity = app.config.boxOpacity;
    });
  });
  app.gui.add( app.config, 'boxRotationScale', 0, 10  ).name('Box Rotation');
  app.gui.add( app.config, 'boxScale', 1, 20 ).name('Box Scale');
  app.gui.add( app.config, 'xScale', 1, 20 ).name('Box X Scale');
  app.gui.add( app.config, 'yScale', 1, 20 ).name('Box Y Scale');
  app.gui.add( app.config, 'zScale', 1, 20 ).name('Box Z Scale');

  app.gui.addColor( app.config, 'ambientColour').onChange(function(){
    app.ambientLight.color.set( app.config.ambientColour );
  });
  app.gui.addColor( app.config, 'spotColour').onChange(function(){
    app.spotlight.color.set( app.config.spotColour );
  });

  app.gui.add( app.config, 'tour' ).name('Tour Mode').listen();
};


app.animate = function () {

  if(app.config.isPaused){
    return;
  }

  app.stats.begin();

  if( app.config.tour ){
    var radius = 50;
    app.camera.position.x = radius * Math.cos( app.cameraAngle );
    app.camera.position.z = radius * Math.sin( app.cameraAngle );
    // app.camera.position.y = radius * Math.cos( app.cameraAngle );
    app.camera.lookAt( app.scene.position );
    app.cameraAngle += 0.004;
  }

  app.spotlight.position.set(
    -10,
    100 * Math.sin( app.step ),
    100 * Math.cos( app.step )
  );
  app.step += 1/app.config.spotlightMovement;

  app.animateBoxes( app.boxFleet );

  app.renderer.render( app.scene, app.camera );

  app.stats.end();

  requestAnimationFrame( app.animate );
};

app.addStats = function () {
  var stats = new Stats();
  stats.setMode(0);
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.left = '0px';
  stats.domElement.style.top = '0px';
  document.getElementById("stats").appendChild( stats.domElement );
  return stats;
};

app.onResize = function () {
  app.width = window.innerWidth;
  app.height = window.innerHeight;
  app.camera.aspect = app.width / app.height;
  app.camera.updateProjectionMatrix();
  app.renderer.setSize(app.width, app.height);
};
window.addEventListener("resize", app.onResize, false);

app.resetBoxes = function(){
  app.boxFleet.forEach( box => app.scene.remove(box) );
  app.boxFleet = app.initBoxes(
    parseInt(app.config.numBoxes),
    app.config.boxDistribution,
    app.config.boxSizeRange
 );
};

app.initBoxes = function( count, dist, sizeRange ){
  var fleet = app.createBoxes( count, dist, sizeRange );
  fleet.forEach( box => app.scene.add(box) );
  return fleet;
};

app.createBoxes = function( boxCount, placementRange, sizeRange){

  var boxes = new Array( boxCount );

  for( var i = 0; i < boxes.length; i++) {

    var boxSize =  THREE.Math.randFloat(2, sizeRange);
    var boxGeometry = new THREE.BoxGeometry(  boxSize, boxSize, boxSize );
    var boxMaterial =  new THREE.MeshStandardMaterial({   // THREE.MeshLambertMaterial
      wireframe: false,
      transparent: app.config.boxOpacity < 1.0 ? true : false,
      opacity: app.config.boxOpacity
    });

    boxes[i] = new THREE.Mesh( boxGeometry, boxMaterial );
    boxes[i].position.set(
      THREE.Math.randFloatSpread( placementRange ),
      THREE.Math.randFloatSpread( placementRange ),
      THREE.Math.randFloatSpread( placementRange )
    );
    // boxes[i].material.color.setRGB( Math.random(), Math.random(), Math.random() );
    boxes[i].material.color.setHSL( Math.random(),  1.0, 0.5);
    boxes[i].rotate_step = THREE.Math.randFloat( -0.01, 0.01 );

    // boxes[i].wave_step = THREE.Math.randFloat( 0.0, 1.0 );
    // boxes[i].ystep = 0;
    boxes[i].castShadow = false;
  }
  return boxes;
};

app.animateBoxes = function( fleet ){
  fleet.forEach( (box, index) => {

    if( app.config.colourCycle ){
      var hsl  = box.material.color.getHSL();
      box.material.color.setHSL( (hsl.h + 1/app.config.colourCycle)%1.0, 1.0, 0.5);
    }

    // box.rotation.y += box.rotate_step;
    if( index%2 ){
      box.rotation.x += box.rotate_step * app.config.boxRotationScale;
    } else {
      box.rotation.z += box.rotate_step * app.config.boxRotationScale;
    }

    box.scale.set(
      app.config.xScale * app.config.boxScale,
      app.config.yScale * app.config.boxScale,
      app.config.zScale * app.config.boxScale
    );

    // YESS
    // box.position.x =  Math.sin( app.step ) * box.rotate_step * 10000;
    //
    // weird wave layers
    // box.position.y =  Math.cos( (app.step + box.rotate_step*200) ) * box.rotate_step * 10000;
    //
    // variable
    // box.position.x = 10 + Math.sin( box.wave_step+=0.05 ) * box.rotate_step * 10000;  //Math.sqrt(box.position.y);
  });
};

window.onload = app.init;
