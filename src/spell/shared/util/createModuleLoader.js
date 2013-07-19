define(
	'spell/shared/util/createModuleLoader',
	[
		'spell/shared/util/hashModuleId',
		'spell/shared/util/platform/PlatformKit'
	],
	function(
		hashModuleId,
		PlatformKit
	) {
		'use strict'


		var instance

		return function( libraryManager, isModeDevelopment, libraryUrl ) {
			if( !instance ) {
				instance = {
					require : function( moduleId ) {
						var config = {
							libraryManager : isModeDevelopment ? libraryManager : undefined,
							hashModuleId   : hashModuleId,
							loadingAllowed : isModeDevelopment,
							libraryUrl     : libraryUrl
						}

						return PlatformKit.ModuleLoader.require( moduleId, null, config )
					}
				}
			}

			return instance
		}
	}
)
