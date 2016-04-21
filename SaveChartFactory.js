define(["dojo/_base/declare",
        "dijit/_WidgetBase",
        "dojo/dom-construct",
        "cedar",
        "ct/ui/desktop/util",
	 "ct/_Connect",
	 "dijit/form/Button",
	 "dojo/query",
	 "dojo/on"
         ],
		function(declare,_WidgetBase,domConstruct,Cedar,ct_util,_Connect,Button, dojoQuery,on) {
			return declare([_WidgetBase], {
				openWindow : function(chart) {
				    if(chart != undefined){
				    
				    var that = this.openWindow
					
				    var self = this
				    
				    if (that.count == undefined || that.count == null){
					that.count = 0
				    }  
				    else{
					that.count = that.count + 1
				    }
				    windowContent = domConstruct.create("div", {id:"Chart"+that.count})
				    			    
				    var w = that.w = this.windowManager.createWindow({
					  title: "Saved Chart",
					  marginBox: {l: 30, t: 30, w: 900, h: 600},
					  minimizeOnClose: true,
					  closable: true,
					  content: windowContent,
					  showOnStartup : true,
					  windowClass: "myWindowClass"
					});
				   w.get("window")
				  
				    
				   var window2 = w._getWindow()
				    
				 window2.onResize = function(){
					self.resize()	
				  }
				 window2.onHide = function (){
					 self.onWindowClose()
					 }
				   
		   
				 function savedChart(chart, id){
				     this.chart = chart
				     this.id = id
				 }
				 
				 var presentChart = new savedChart(chart, that.count)
				 
				 if (!that.savedChartArray){
				     that.savedChartArray = []
				     that.savedChartArray.push(presentChart)
				 }
				 else {
				     that.savedChartArray.push(presentChart)
				 }
				 
				 
				 that.savedChartArray[that.count]["chart"].on('dblclick', function(event,item){
				     that.savedChartArray[that.count]["chart"]._definition.dataset.query.where = "1=1"
					 that.savedChartArray[that.count]["chart"].show({
					 elementId: "div#Chart" + that.count
				 })
				 })   
				that.savedChartArray[that.count]["chart"].show({
				     elementId: "div#Chart" + that.count
				 })
				 
				 domConstruct.create("div",{id:"Chart"+that.count+"Button"},"Chart"+that.count,"after")
				 
				 var button = new Button({
				       label:"Download Chart",
				       onClick: function(){self.downloadChart(that.count)},
				   },"Chart"+that.count+"Button").startup()
				 }},
				onWindowClose: function (){
				},
				downloadChart: function(count){
				    var that = this.openWindow
				     var svg = {}
				            dojoQuery(".marks").forEach(function(node, index, arr) {
				                svg = node
				            })
				            var xml = new XMLSerializer().serializeToString(svg)

				            var data = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(xml)));
					     
					   var canvas = domConstruct.create("canvas", {
				                    width: 2000,
				                    height: 2500,
				                    id: "newChart2"
				                }, "Chart"+count , "chart"),
				                context = canvas.getContext("2d")
				                
				            var img = new Image()
				            img.src = data
				                    
				            var drawImage = function() {
				                context.drawImage(img, 0, 0)
				                var canvasData = canvas.toDataURL("image/jpeg", 1, 0);
				                var chartLink2 = domConstruct.create("a", null,"Chart"+count);
				                chartLink2.href = canvasData
				                chartLink2.download = "MyChart"
				                chartLink2.click()
				                domConstruct.destroy("newChart2")
				            };
				            
				            var onload = on(img, "load", drawImage());
				 },
				resize: function(){
				    	    var that = this.openWindow
					    var enclosingWindow = that.w.window
					    var heightAfterResize = (enclosingWindow._contentBox.h)
					    var widthAfterResize = (enclosingWindow._contentBox.w)
					    that.savedChartArray[that.count]["chart"].show({
		        		   	elementId: "div#Chart" + that.count,
		        		 	renderer: "svg",
		        		 	height: heightAfterResize,
		        		 	width:widthAfterResize,
		        		    		});

			}
			})
		})