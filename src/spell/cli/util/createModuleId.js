define(
	'spell/cli/util/createModuleId',
	function() {
		'use strict'


		return function( scriptId ) {
			return scriptId.replace( /\./g, '/' )
		}
	}
)
