(function($){
  var COLOR = {
    root  : "red",
    branch: "#a2a19d",
  };

  var oneTimeWordNum = 4;

  var sys    = arbor.ParticleSystem();
  var socket = io();

  var wordlists = {};

  var yClickableDistance = 13;

  var byteLengthRate = 4;

  socket.on('first search error', function (data) {
    $('#Search-Word')[0].setCustomValidity("連想語が見つかりませんでした"); 
    $('.w-button').click();
  });

  // first seach
  socket.on('first search result', function (data) {
    $('.first.page').fadeOut();
    $('#main').height = '100%';
    sys.parameters({stiffness:900, repulsion:2000, gravity:true, dt:0.015})
    sys.renderer = Renderer("#main")
    var rootNode = sys.addNode(data.word, {
      color: COLOR.root,
      shape: "square",
      alpha: 1
    });
    wordlists[rootNode.name] = data.result.wordlist;
    addNodeByWordList(rootNode, data.result.wordlist);
  });

  // search
  socket.on('search result', function (data) {
    wordlists[data.node.name] = data.result.wordlist;
    addNodeByWordList(data.node, data.result.wordlist);
  });

  // add node
  function addNodeByWordList(node, wordlist) {
    var count = 0;
    for (var i = 0; i < wordlist.length; i++) {
      if(count >= oneTimeWordNum) {
        break;
      }
      
      var val       = wordlist[i];
      var checkNode = sys.getNode(val.word);
      if (checkNode == null) {
        count++;
        var newNode = sys.addNode(val.word, {
          color: COLOR.branch,
          shape: "square",
          alpha: 0,
          x    : node._p.x,
          y    : node._p.y
        });
        
        var newEdge = sys.addEdge(newNode, node, {
          length: .8,
          alpha : 0
        });
        sys.tweenNode(newNode, .5, {alpha:1});
        sys.tweenEdge(newNode, .5, {alpha:1});
      }
    }
  }

  function bytes2(str) {
    return(encodeURIComponent(str).replace(/%../g,"x").length);
  }

  function isClickable(_mouseP) {
    return isClickableNode(sys.nearest(_mouseP), _mouseP);
  }

  function isClickableNode(nearest, _mouseP) {
    var byteLength = bytes2(nearest.node.name) * byteLengthRate;
    var toPoint    = sys.toScreen(nearest.node._p);
    var xDistance  = Math.abs(_mouseP.x - toPoint.x);
    var yDistance  = Math.abs(_mouseP.y - toPoint.y);

    return (xDistance < byteLength && yDistance < yClickableDistance);
  }
  
  var Renderer = function(elt) {
    var dom    = $(elt);
    var canvas = dom.get(0);
    var gfx    = arbor.Graphics(canvas);
    var sys    = null;

    var that = {
      init:function(pSystem) {
        sys = pSystem
        sys.screen({
          size:{
            width:dom.width(),
            height:dom.height()
          },
          padding:[36,60,36,60]
        });

        $(window).resize(that.resize);
        that.resize();
        that._initMouseHandling();
      },
      resize:function() {
        canvas.width  = $(window).width();
        canvas.height = .9 * $(window).height();
        sys.screen({
          size:{
            width:canvas.width,
            height:canvas.height
          }
        });
        that.redraw();
      },
      redraw:function() {
        gfx.clear();
        sys.eachEdge(function(edge, p1, p2) {
          if (edge.source.data.alpha * edge.target.data.alpha == 0) {
            return;
          }
          gfx.line(p1, p2, {stroke:"#b2b19d", width:2, alpha:edge.target.data.alpha});
        });
        sys.eachNode(function(node, pt) {
          var w = Math.max(20, 20+gfx.textWidth(node.name) )
          if (node.data.alpha===0) {
            return;
          }
          gfx.rect(pt.x-w/2, pt.y-8, w, 20, 4, {fill:node.data.color, alpha:node.data.alpha});
          gfx.text(node.name, pt.x, pt.y+9, {color:"white", align:"center", font:"Arial", size:12});
          gfx.text(node.name, pt.x, pt.y+9, {color:"white", align:"center", font:"Arial", size:12});
        });
      },
      
      _initMouseHandling:function() {
        var handler = {
          moved:function(e) {
            var pos = $(canvas).offset();
            var _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
            
            if (isClickable(_mouseP)) {
              $('#main').addClass('linkable');
            } else {
              $('#main').removeClass('linkable');
            }
            return false;
          },
          clicked:function(e) {
            var pos = $(canvas).offset();
            var _mouseP = arbor.Point(e.pageX-pos.left, e.pageY-pos.top);
            
            var nearest = sys.nearest(_mouseP);
            if (isClickableNode(nearest, _mouseP)) {
              if(wordlists[nearest.node.name] != null) {
                addNodeByWordList(nearest.node, wordlists[nearest.node.name]);
              } else {
		socket.emit('search', nearest.node);
              }
            }
            return false;
          }
        }

        $(canvas).mousemove(handler.moved);
        $(canvas).mousedown(handler.clicked);
      }
    }
    
    return that;
  }
  
  $(document).ready(function(){
    
  })

  $('#Search-Word-Input').submit(function(){
    word = $('#Search-Word').val();
    socket.emit('first search', word);
    return false;
  });

})(this.jQuery);
