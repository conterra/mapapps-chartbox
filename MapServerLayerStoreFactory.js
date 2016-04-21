define([ "dojo/_base/declare", "ct/mapping/store/MapServerLayerStore" ],
		function(declare, MapServerLayerStore) {
			return declare([], {
				createStore : function(url) {
					return new MapServerLayerStore({
						target : url
					});
				}
			})
		})