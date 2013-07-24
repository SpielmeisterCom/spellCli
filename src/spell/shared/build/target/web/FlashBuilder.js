define(
	'spell/shared/build/target/web/FlashBuilder',
	[
		'spell/shared/build/ast/createAST',
		'spell/shared/build/createBuilderType',
		'spell/shared/build/ast/createComponentTypeDefinition',
		'spell/shared/build/ast/createSource',
		'spell/shared/build/ast/isAmdHeader',
		'spell/shared/build/createDebugPath',
		'spell/shared/build/copyFile',
		'spell/shared/build/isFile',
		'spell/shared/build/loadAssociatedScriptModules',
		'spell/shared/build/processSource',
		'spell/shared/build/writeFile',
		'spell/shared/build/spawnChildProcess',

		'child_process',
		'ff',
		'fs',
		'mkdirp',
		'path',
		'xmlbuilder',
		'os',
		'rimraf',
		'uglify-js',

		'underscore.string',
		'spell/functions'
	],
	function(
		createAST,
		createBuilderType,
		createComponentTypeDefinition,
		createSource,
		isAmdHeader,
		createDebugPath,
		copyFile,
		isFile,
		loadAssociatedScriptModules,
		processSource,
		writeFile,
		spawnChildProcess,

		child_process,
		ff,
		fs,
		mkdirp,
		path,
		xmlbuilder,
		os,
		rmdir,
		uglify,

		_s,
		_
	) {
		'use strict'


		var moduleDefinitionFileTemplate = [
			'package Spielmeister {',
			'%3$s',
			'	public class %1$s implements ModuleDefinition {',
			'		public function %1$s() {}',
			'',
			'		public function load( define : Function, require : Function ) : void {',
			'			%2$s',
			'		}',
			'	}',
			'}',
			''
		].join( '\n' )

		var applicationDataFileTemplate = [
			'package Spielmeister {',
			'	public class ApplicationData {',
			'		private var cacheContent : Object = %1$s',
			'		private var applicationModule : Object = %2$s',
			'',
			'		function getCacheContent() : Object {',
			'			return this.cacheContent',
			'		}',
			'',
			'		function getApplicationModule() : Object {',
			'			return this.applicationModule',
			'		}',
			'	}',
			'}',
			''
		].join( '\n' )

		var componentTypeClassFileTemplate = [
			'package %1$s {',
			'',
			'	public class %2$s {',
			'		%3$s',
			'',
			'		public function %2$s( spell : Object ) {',
			'			%4$s',
			'		}',
			'',
			'		%5$s',
			'	}',
			'}',
			''
		].join( '\n' )

		var classPropertyTemplate = [
			'public function %1$s %2$s(%3$s)%4$s {',
			'	%5$s',
			'}'
		].join( '\n' )

		var attributeTypeToAS3ClassName = {
			number : 'Number',
			integer : 'Number',
			'enum' : 'String',
			boolean : 'Boolean',
			vec2 : 'Array',
			vec3 : 'Array'
		}

		var getAS3ClassNameFromAttributeType = function( x ) {
			return attributeTypeToAS3ClassName[ _.isObject( x ) ? x.name : x ]
		}

		var createModuleDefinitionFileTemplate = function( className, indentedSource, debug ) {
			return _s.sprintf(
				moduleDefinitionFileTemplate,
				className,
				indentedSource,
				debug ? '	import flash.debugger.enterDebugger' : ''
			)
		}

		var createModuleDefinitionWrapperClass = function( className, moduleDefinitionSource, debug ) {
			debug = !!debug

			var indentation = '			' // amount of tabs each line gets indented with

			var indentedSource = _.reduce(
				moduleDefinitionSource.split( '\n' ),
				function( memo, line ) {
					return memo + ( memo === '' ? '' : indentation ) + line + '\n'
				},
				''
			)

			return createModuleDefinitionFileTemplate( className, indentedSource, debug )
		}

		var writeCompilerConfigFile = function( srcPath, spellFlashPath, flexSdkPath, componentTypeClasses, compilerConfigFilePath, outputFilePath, anonymizeModuleIds, debug ) {
			var root = xmlbuilder.create().begin( 'flex-config' )

			root.ele( 'compiler' )
				.ele( 'source-path' )
					.ele( 'path-element' )
						.txt( spellFlashPath + '/src' )
					.up()
					.ele( 'path-element' )
						.txt( spellFlashPath + '/lib/AS3WebSocket/src' )
					.up()
					.ele( 'path-element' )
						.txt( spellFlashPath + '/lib/Coral/src' )
					.up()
					.ele( 'path-element' )
						.txt( spellFlashPath + '/lib/Box2D/Source' )
					.up()
					.ele( 'path-element' )
						.txt( srcPath )
					.up()
				.up()
				.ele( 'library-path' )
					.ele( 'path-element' )
						.txt( spellFlashPath + '/lib/AS3WebSocket/lib/as3corelib.swc' )
					.up()
				.up()
				.ele( 'library-path' )
					.ele( 'path-element' )
						.txt( flexSdkPath + '/frameworks/libs/core.swc' )
					.up()
				.up()
				.ele( 'external-library-path' )
					.ele( 'path-element' )
						.txt( flexSdkPath + '/frameworks/libs/player/11.1/playerglobal.swc' )
					.up()
				.up()
				.ele( 'debug' )
					.txt( debug.toString() )
				.up()
				.ele( 'define' )
					.ele( 'name' )
						.txt( 'CONFIG::anonymizeModuleIds' )
					.up()
					.ele( 'value' )
						.txt( anonymizeModuleIds.toString() )
					.up()
				.up()
			.up()
			.ele( 'file-specs' )
				.ele( 'path-element' )
					.txt( spellFlashPath + '/src/Spielmeister/SpellMain.as' )
				.up()
			.up()

			var includes = root.ele( 'includes' )

			_.each(
				componentTypeClasses,
				function( componentTypeClass ) {
					includes.ele( 'symbol' )
						.txt( componentTypeClass )
				}
			)

			root.ele( 'warnings' )
				.txt( 'false' )
			.up()
			.ele( 'static-link-runtime-shared-libraries' )
				.txt( true )
			.up()
			.ele( 'output' )
				.txt( outputFilePath )

			fs.writeFileSync( compilerConfigFilePath, root.toString( { pretty : true } ), 'utf-8' )
		}

		var compile = function( compilerExecutablePath, configFilePath, next ) {
			spawnChildProcess(
				compilerExecutablePath,
				[ '-load-config', configFilePath ],
				{},
				true,
				function( error, code ) {
					if( error ) {
						next( error )

					} else if( code !== 0 ) {
						next( 'Error: Compilation aborted.' )

					} else {
						next()
					}
				}
			)
		}

		var createComponentTypeClassName = function( libraryPath ) {
			var componentId = libraryPath.replace( /\//g, '.' ),
				result      = 'Spielmeister.ComponentType.'

			// transforming ASCII numbers because mxmcl does not like them in namespaces
			for( var i = 0, n = componentId.length, charCode; i < n; i++ ) {
				charCode = componentId.charCodeAt( i )

				result += String.fromCharCode( charCode > 47 && charCode < 58 ? charCode + 17 : charCode )
			}

			return result
		}

		var createAS3ClassProperty = function( attributeDefinition, property ) {
			var propertyClassName = getAS3ClassNameFromAttributeType( attributeDefinition.type ),
				isGetter          = property.type === 'get'

			return _s.sprintf(
				classPropertyTemplate,
				property.type,
				property.name,
				isGetter ? '' : ' ' + property.valueName + ' : ' + propertyClassName + ' ',
				isGetter ? ' : ' + propertyClassName : '',
				property.source.replace( /\n/g, '\n\t' )
			).replace( /\n/g, '\n\t\t' )
		}

		var createAS3ClassGetterSetters = function( componentDefinition, properties ) {
			return _.map(
				properties,
				function( property ) {
					var attributeDefinition = _.find(
						componentDefinition.attributes,
						function( attribute ) {
							return attribute.name === property.name
						}
					)

					if( !attributeDefinition ) {
						throw 'Could not find attribute definition.'
					}

					return createAS3ClassProperty( attributeDefinition, property )
				}
			).join( '\n\n\t\t' )
		}

		var createAS3ClassProperties = function( componentDefinition, properties ) {
			return _.reduce(
				properties,
				function( memo, property ) {
					if( property.type === 'set' ) {
						return memo
					}

					var attributeDefinition = _.find(
						componentDefinition.attributes,
						function( attribute ) {
							return attribute.name === property.name
						}
					)

					if( !attributeDefinition ) {
						throw 'Could not find attribute definition.'
					}

					return memo.concat(
						'private var _' + attributeDefinition.name + ' : ' + getAS3ClassNameFromAttributeType( attributeDefinition.type )
					)
				},
				[]
			).join( '\n\t\t' )
		}

		var createComponentTypeAS3Class = function( componentDefinition, componentTypeDefinition ) {
			return _s.sprintf(
				componentTypeClassFileTemplate,
				componentTypeDefinition.className.substring( 0, componentTypeDefinition.className.lastIndexOf( '.' ) ),
				componentTypeDefinition.typeName,
				createAS3ClassProperties( componentDefinition, componentTypeDefinition.properties ),
				componentTypeDefinition.constructorSource.replace( /\n/g, '\n\t\t\t' ),
				createAS3ClassGetterSetters( componentDefinition, componentTypeDefinition.properties )
			)
		}

		var createComponentTypeDefinitions = function( componentScripts ) {
			return _.reduce(
				componentScripts,
				function( memo, componentScript, libraryPath ) {
					var componentTypeClassName  = createComponentTypeClassName( libraryPath),
						componentTypeDefinition = createComponentTypeDefinition( componentScript.source, componentTypeClassName, libraryPath )

					if( componentTypeDefinition.properties.length > 0 ) {
						memo[ componentTypeClassName ] = componentTypeDefinition
					}

					return memo
				},
				{}
			)
		}

		var createComponentTypeClassFiles = function( tmpSourcePath, components, componentTypeDefinitions ) {
			_.each(
				componentTypeDefinitions,
				function( componentTypeDefinition, componentTypeClassName ) {
					var component = _.find(
						components,
						function( component ) {
							return component.filePath === componentTypeDefinition.libraryPath + '.json'
						}
					)

					if( !component ) {
						throw 'Could not find component definition for component script "' + componentTypeDefinition.libraryPath + '".'
					}

					var source = createComponentTypeAS3Class( component.content, componentTypeDefinition )

					var filePath   = path.join( tmpSourcePath, componentTypeClassName.replace( /\./g, '/' ) + '.as' ),
						outputPath = path.dirname( filePath )

					if( !fs.existsSync( outputPath ) ) {
						mkdirp.sync( outputPath )
					}

					writeFile( filePath, source )
				}
			)
		}


		var build = function( spellCorePath, spellFlashPath, projectPath, projectLibraryPath, outputPath, projectConfig, library, cacheContent, scriptSource, minify, anonymizeModuleIds, debug, next ) {
			var errors                   = [],
				projectBuildPath         = path.join( projectPath, 'build' ),
				tmpPath                  = path.join( projectBuildPath, 'tmp', 'web', 'flash' ),
				srcPath                  = path.join( tmpPath, 'src' ),
				spielmeisterPackagePath  = path.join( srcPath, 'Spielmeister' ),
				outputFlashPath          = path.join( outputPath, 'web', 'flash' ),
				compilerConfigFilePath   = path.join( tmpPath, 'compile-config.xml' ),
				flexSdkPath              = path.join( spellFlashPath, 'vendor/flex_sdk' ),
				compilerExecutablePath   = path.join( flexSdkPath, 'bin', os.platform() == 'win32' ? 'mxmlc.bat' : 'mxmlc' )

			if( !fs.existsSync( compilerExecutablePath ) ) {
				next( 'Error: Could not find compiler executable "' + compilerExecutablePath + '".' )

				return
			}

			// remove build files from previous run
			rmdir.sync( spielmeisterPackagePath )
			mkdirp.sync( spielmeisterPackagePath )

			if( fs.existsSync( compilerConfigFilePath ) ) {
				fs.unlinkSync( compilerConfigFilePath )
			}

			// copy splash screen image
			copyFile(
				path.join( projectPath, "library", "spell", "splash.png" ),
				path.join( srcPath, "splash.png" )
			)

			// reading engine source file
			var spellEngineSourceFilePath = createDebugPath( debug, 'spell.common.js', 'spell.common.min.js', path.join( spellCorePath, 'lib' ) )

			if( !fs.existsSync( spellEngineSourceFilePath ) ) {
				errors.push( 'Error: Could not locate engine include file \'' + spellEngineSourceFilePath + '\'.' )
				next( errors )
			}

			// write engine source wrapper class file
			var engineSourceFilePath = path.join( spielmeisterPackagePath, 'SpellEngine.as' ),
				engineSource         = fs.readFileSync( spellEngineSourceFilePath ).toString( 'utf-8' )

			writeFile(
				engineSourceFilePath,
				createModuleDefinitionWrapperClass(
					'SpellEngine',
					processSource( engineSource, minify, anonymizeModuleIds ),
					debug
				)
			)

			// write script modules source wrapper class file
			writeFile(
				path.join( spielmeisterPackagePath, 'ScriptModules.as' ),
				createModuleDefinitionWrapperClass(
					'ScriptModules',
					scriptSource,
					debug
				)
			)

			// write application data class file
			writeFile(
				path.join( spielmeisterPackagePath, 'ApplicationData.as' ),
				_s.sprintf(
					applicationDataFileTemplate,
					JSON.stringify( cacheContent ),
					JSON.stringify( projectConfig )
				)
			)

			var componentScripts = loadAssociatedScriptModules( projectLibraryPath, library.component )

			console.log( 'generating AS3 classes...' )

			var componentTypeDefinitions = createComponentTypeDefinitions( componentScripts )

			createComponentTypeClassFiles( srcPath, library.component, componentTypeDefinitions )


			// create config and compile
			var outputFilePath = path.join( outputFlashPath, 'spell.swf' )

			console.log( 'compiling...' )

			writeCompilerConfigFile(
				srcPath,
				spellFlashPath,
				flexSdkPath,
				_.keys( componentTypeDefinitions ),
				compilerConfigFilePath,
				outputFilePath,
				anonymizeModuleIds,
				debug
			)

			compile( compilerExecutablePath, compilerConfigFilePath, next )
		}

		var hasJava = function( next ) {
			var child = spawnChildProcess(
				'java',
				[ '-version' ],
				{},
				false,
				function( error, status ) {
					if( error ) {
						next( 'Error: Missing a Java Runtime Environment. Please install one.' )
					}

					next()
				}
			)
		}

		var TARGET_NAME  = 'flash',
			FlashBuilder = createBuilderType()

		FlashBuilder.prototype = {
			init : function() {},
			getName : function() {
				return TARGET_NAME
			},
			handlesTarget : function( x ) {
				return x === 'all' ||
					x === 'web' ||
					x === TARGET_NAME
			},
			build : function( next ) {
				console.log( 'building for sub-target "' + TARGET_NAME + '"...' )

				var f = ff(
					this,
					function() {
						hasJava( f.wait() )
					},
					function() {
						build(
							this.environmentConfig.spellCorePath,
							this.environmentConfig.spellFlashPath,
							this.projectPath,
							this.projectLibraryPath,
							this.outputPath,
							this.projectConfig,
							this.library,
							this.cacheContent,
							this.scriptSource,
							this.minify,
							this.anonymizeModuleIds,
							this.debug,
							f.wait()
						)
					}

				).onComplete( next )
			}
		}

		return FlashBuilder
	}
)
