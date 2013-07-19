define(
	'spell/AssetManager',
	function() {
		'use strict'


		var AssetManager = function( libraryManager ) {
			this.assets         = {},
			this.libraryManager = libraryManager
		}

		AssetManager.prototype = {
			add : function( id, asset ) {
				this.assets[ id ] = asset
			},
			get : function( id ) {
				return this.assets[ id ]
			},
			getLibraryIdByResourceId : function( resourceId ) {
				var assets = this.assets,
					ids = []

				for( var id in assets ) {
					var asset = assets[ id ]

					if( asset.resourceId &&
						asset.resourceId === resourceId ) {

						ids.push( id.slice( id.indexOf( ':' ) + 1 ) )
					}
				}

				return ids
			},
			has : function( id ) {
				return !!this.assets[ id ]
			},
			injectResources : function( resources ) {
				var assets         = this.assets,
					libraryManager = this.libraryManager

				for( var id in assets ) {
					var asset      = assets[ id ],
						resourceId = asset.resourceId

					if( !resourceId ) continue
					if( !resources[ resourceId ] ) continue

					var resource = libraryManager.get( resourceId )
					if( !resource ) return

					asset.resource = resource
				}
			},
			free : function() {
				this.assets = {}
			}
		}

		return AssetManager
	}
)
