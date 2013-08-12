define(
	'spell/shared/build/target/web/WebBuilder',
	[
		'spell/shared/build/target/web/FlashBuilder',
		'spell/shared/build/target/web/HTML5Builder',
		'spell/shared/build/copyFiles',
		'spell/shared/build/createBuilderType',
		'spell/shared/build/createDebugPath',
		'spell/shared/build/createProjectLibraryFilePaths',
		'spell/shared/build/writeFile',

		'ff',
		'fs',
		'path'
	],
	function(
		FlashBuilder,
		HTML5Builder,
		copyFiles,
		createBuilderType,
		createDebugPath,
		createProjectLibraryFilePaths,
		writeFile,

		ff,
		fs,
		path
	) {
		'use strict'


		var build = function( projectLibraryPath, spellCorePath, outputWebPath, debug, includedSubTargets ) {
			// copy common files

			// the library files
			var outputFilePaths = createProjectLibraryFilePaths( projectLibraryPath )

			// public template files go to "build/release/*"
			outputFilePaths.push( [
				path.join( spellCorePath, 'htmlTemplate', 'index.html' ),
				path.join( outputWebPath, 'index.html' )
			] )

			outputFilePaths.push( [
				path.join( spellCorePath, 'htmlTemplate', 'main.css' ),
				path.join( outputWebPath, 'main.css' )
			] )

			// copy new library content to destination
			var outputWebLibraryPath = path.join( outputWebPath, 'library' )

			copyFiles( projectLibraryPath, outputWebLibraryPath, outputFilePaths )

			// stage zero loader goes to "build/release/spell.loader.js"
			var configData = 'var INCLUDED_SUB_TARGETS = [' +
				_.map(
					includedSubTargets,
					function( subTarget ) {
						return '"' + subTarget + '"'
					}
				).join( ',' ) + '];\n'

			var loaderData = fs.readFileSync(
				createDebugPath( debug, 'spell.loader.js', 'spell.loader.min.js', path.join( spellCorePath, 'lib' ) ),
				'utf8'
			)

			writeFile(
				path.join( outputWebPath, 'spell.loader.js' ),
				configData + loaderData
			)
		}

		var createIncludedSubTargets = function( builders, target ) {
			return _.reduce(
				builders,
				function( memo, builder ) {
					if( builder.handlesTarget( target ) ) {
						memo.push( builder.getName() )
					}

					return memo
				},
				[]
			)
		}

		var TARGET_NAME = 'web',
			WebBuilder  = createBuilderType()

		WebBuilder.prototype = {
			init : function() {
				this.builders = [
					new FlashBuilder(
						this.environmentConfig,
						this.projectPath,
						this.projectLibraryPath,
						this.outputPath,
						this.target,
						this.projectConfig,
						this.library,
						this.cacheContent,
						this.scriptSource,
						this.minify,
						this.anonymizeModuleIds,
						this.debug
					),
					new HTML5Builder(
						this.environmentConfig,
						this.projectPath,
						this.projectLibraryPath,
						this.outputPath,
						this.target,
						this.projectConfig,
						this.library,
						this.cacheContent,
						this.scriptSource,
						this.minify,
						this.anonymizeModuleIds,
						this.debug
					)
				]

				_.invoke( this.builders, 'init' )
			},
			getName : function() {
				return TARGET_NAME
			},
			handlesTarget : function( x ) {
				return x === 'all' ||
					x === TARGET_NAME ||
					_.any(
						this.builders,
						function( builder ) {
							return builder.handlesTarget( x )
						}
					)
			},
			build : function( next ) {
				console.log( 'building for target "' + TARGET_NAME + '"...' )

				var target             = this.target,
					builders           = this.builders,
					outputWebPath      = path.join( this.outputPath, 'web' )

				var f = ff( this )

				f.next( function() {
					build(
						this.projectLibraryPath,
						this.environmentConfig.spellCorePath,
						outputWebPath,
						this.debug,
						createIncludedSubTargets( this.builders, target )
					)
				} )

				_.each(
					builders,
					function( builder ) {
						if( builder.handlesTarget( target ) ) {
							f.next( function() {
								builder.build( f.wait() )
							} )
						}
					}
				)

				f.onComplete( next )
			}
		}

		return WebBuilder
	}
)
