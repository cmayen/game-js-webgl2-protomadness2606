

g.testdebug1={
    load(){
        g.rAF.updateHandlers.push(g.testdebug1.update);
    },
    update(delta){
        g.debug.pre.push(`testdebfffffug1 update: ${delta.toFixed(2)}ms`);
    },
};
g.loadHandlers.push(g.testdebug1.load);




g.debug.control.details.config = {
            serverUrl: {
                type:"text", value:"ws://192.168.42.42:8080",
                load: function(){ return "ws://192.168.42.42:8080"; },
                change: function(element){ 
                    console.log("serverUrl changed to", element.value);
                },
            }
        };






g.debug.control.details.world = {
            seed: {
                type: "number", value: 100, 
                load: function(){ return 100; },
                change: function(element){ 
                    //g.world.seed = parseInt(element.value); 
                    console.log("seed changed to", element.value); 
                },
            },
            slider: {
                type: "range", value: 100, 
                min: 0, max: 100,
                load: function(){ return 42; },
                change: function(element){ 
                    //g.camera.fov = parseInt(element.value); 
                    console.log("slider changed to", element.value);
                },
            },
            coord: {
                type: "text", value: "100,100",
                load: function(){ return "100,100"; },
                change: function(element){ 
                    //g.player.coord = element.value; 
                    console.log("coord changed to", element.value);
                },
            },
        };

