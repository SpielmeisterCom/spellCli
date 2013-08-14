define(
	'spell/shared/build/writeFile',
	[
		'fs',
		'fsUtil'
	],
	function(
		fs,
		fsUtil
	) {
		'use strict'


		return function( filePath, data ) {
			// delete file if it already exists
			if( fsUtil.isFile( filePath ) ) {
				fs.unlinkSync( filePath )
			}

			fs.writeFileSync( filePath, data )
		}
	}
)
