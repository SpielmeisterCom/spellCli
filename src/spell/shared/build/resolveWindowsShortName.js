define(
	'spell/shared/build/resolveWindowsShortName',
	[
		'child_process'
	],
	function(
		child_process
		) {
		'use strict'


		return function( directoryName, callback ) {
			child_process.exec(
				process.env.COMSPEC + ' /c for %x in (.) do @echo %~sx',
				{
					cwd: directoryName
				},
				function( error, stdout, stderr ) {

					if( error !== null ) {
						callback( directoryName )
						return
					}

					var result = stdout.toString()
					result = result.replace(/(\r\n|\n|\r)/gm,"")

					callback( result )
				}
			)
		}
	}
)



