define(
	'spell/cli/util/createIdFromLibraryFilePath',
	function() {
		'use strict'


		return function( libraryFilePath, asArray ) {
			// strip the '.json' extension
			var tmp = libraryFilePath.substr( 0, libraryFilePath.length - 5 )

			return asArray ?
				tmp.split( '/' ) :
				tmp.replace( /\//g, '.' )
		}
	}
)
