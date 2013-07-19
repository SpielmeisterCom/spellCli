/**
 * The EntityManager contains functions for creating, updating and destroying entities and for
 * querying and updating components.
 *
 * You can use the EntityManager for example in your system's init, activate, deactivate, destroy and process functions
 * to create or destroy entities, or to add or remove components from entities and update components.
 *
 * @class spell.entityManager
 * @singleton
 */
define(
	'spell/EntityManager',
	[
		'spell/data/entity/createAmbiguousSiblingName',
		'spell/data/entity/recursiveFind',
		'spell/data/spatial/QuadTree',
		'spell/Defines',
		'spell/shared/util/arrayRemove',
		'spell/shared/util/create',
		'spell/shared/util/createId',
		'spell/shared/util/createModuleId',
		'spell/shared/util/deepClone',
		'spell/Events',
		'spell/data/entity/applyEntityConfig',
		'spell/stringUtil',
		'spell/shared/util/platform/PlatformKit',
		'spell/data/component/init',

		'spell/math/util',
		'spell/math/mat3',
		'spell/math/vec2',

		'spell/functions'
	],
	function(
		createAmbiguousSiblingName,
		recursiveFind,
		QuadTree,
		Defines,
		arrayRemove,
		create,
		createId,
		createModuleId,
		deepClone,
		Events,
		applyEntityConfig,
		stringUtil,
		PlatformKit,
		initComponent,

		mathUtil,
		mat3,
		vec2,

		_
	) {
		'use strict'


		/*
		 * private
		 */

		var nextEntityId                     = 1,
			createComponentType              = PlatformKit.createComponentType,
			ROOT_COMPONENT_ID                = Defines.ROOT_COMPONENT_ID,
			CHILDREN_COMPONENT_ID            = Defines.CHILDREN_COMPONENT_ID,
			PARENT_COMPONENT_ID              = Defines.PARENT_COMPONENT_ID,
			METADATA_COMPONENT_ID            = Defines.METADATA_COMPONENT_ID,
			TRANSFORM_COMPONENT_ID           = Defines.TRANSFORM_COMPONENT_ID,
			TEXTURE_MATRIX_COMPONENT_ID      = Defines.TEXTURE_MATRIX_COMPONENT_ID,
			EVENT_HANDLERS_COMPONENT_ID      = Defines.EVENT_HANDLERS_COMPONENT_ID,
			STATIC_APPEARANCE_COMPONENT_ID   = Defines.STATIC_APPEARANCE_COMPONENT_ID,
			ANIMATED_APPEARANCE_COMPONENT_ID = Defines.ANIMATED_APPEARANCE_COMPONENT_ID,
			QUAD_GEOMETRY_COMPONENT_ID       = Defines.QUAD_GEOMETRY_COMPONENT_ID,
			TILEMAP_COMPONENT_ID             = Defines.TILEMAP_COMPONENT_ID,
			VISUAL_OBJECT_COMPONENT_ID       = Defines.VISUAL_OBJECT_COMPONENT_ID

		var isValidComponentDefinition = function( template ) {
			// check for ambiguous attribute names
			var attributeNameCounts = _.reduce(
				template.attributes,
				function( memo, attributeConfig ) {
					var attributeName = attributeConfig.name

					memo[ attributeName ] = memo[ attributeName ] ?
						memo[ attributeName ] + 1 :
						1

					return memo
				},
				{}
			)

			return !_.any(
				attributeNameCounts,
				function( iter ) { return iter > 1 }
			)
		}

		/**
		 * Returns an entity id. If no entity id is provided a new one is generated.
		 *
		 * @private
		 * @param {Object} id
		 * @return {*}
		 */
		var getEntityId = function( id ) {
			if( !id ) {
				return '' + nextEntityId++
			}

			var number = parseInt( id )

			if( _.isNaN( number ) ) return id

			nextEntityId = Math.max( number + 1, nextEntityId )

			return '' + number
		}

		/**
		 * Updates the world transformation from a local transformation
		 *
		 * @param componentMaps
		 * @param entityId
		 * @return {*}
		 */
		var updateWorldTransform = function( componentMaps, eventManager, spatialIndex, syncSpatialIndex, entityId ) {
			var transformComponents = componentMaps[ TRANSFORM_COMPONENT_ID ],
				transform           = transformComponents[ entityId ]

			if( !transform ) return

			var parentComponents    = componentMaps[ PARENT_COMPONENT_ID ],
				childrenComponents  = componentMaps[ CHILDREN_COMPONENT_ID ],
				children            = childrenComponents[ entityId ],
				parentEntityId      = entityId, // we will search for the real parent later
				localMatrix         = transform.localMatrix,
				worldMatrix         = transform.worldMatrix,
				parent,
				parentMatrix

			// set new localToWorldMatrix
			mat3.identity( localMatrix )
			mat3.translate( localMatrix, localMatrix, transform.translation )
			mat3.rotate( localMatrix, localMatrix, transform.rotation )
			mat3.scale( localMatrix, localMatrix, transform.scale )

			// search for next parent with a transform component
			while( parent = parentComponents[ parentEntityId ] ) {
				parentEntityId = parent.id

				var parentTransform = transformComponents[ parentEntityId ]

				if( parentTransform ) {
					parentMatrix = parentTransform.worldMatrix
					break
				}
			}

			if( parentMatrix ) {
				// multiply parent's localToWorldMatrix with ours
				mat3.multiply( worldMatrix, parentMatrix, localMatrix )

			} else {
				// if this entity has no parent, the localToWorld Matrix equals the localMatrix
				mat3.copy( worldMatrix, localMatrix )
			}

            transform.worldTranslation[ 0 ] = worldMatrix[ 6 ]
            transform.worldTranslation[ 1 ] = worldMatrix[ 7 ]

			if( syncSpatialIndex ) {
				updateSpatialIndex( spatialIndex, componentMaps, entityId )
			}

			// update the children
			if( children ) {
				var childrenIds = children.ids

				for( var i = 0, n = childrenIds.length; i < n; i++ ) {
					updateWorldTransform( componentMaps, eventManager, spatialIndex, syncSpatialIndex, childrenIds[ i ] )
				}
			}
		}

		var updateTextureMatrix = function( textureMatrix ) {
			var matrix      = textureMatrix.matrix,
				translation = textureMatrix.translation,
				scale       = textureMatrix.scale

			mat3.identity( matrix )
			mat3.translate( matrix, matrix, translation )
			mat3.scale( matrix, matrix, scale )

			textureMatrix.isIdentity = (
				translation[ 0 ] === 0 &&
				translation[ 1 ] === 0 &&
				scale[ 0 ] === 1 &&
				scale[ 1 ] === 1
			)
		}

		var updateVisualObjectR = function( childrenComponents, visualObjectComponents, parentWorldOpacity, entityId ) {
			var visualObjectComponent = visualObjectComponents[ entityId ],
				worldOpacity          = 1.0

			if( visualObjectComponent ) {
				worldOpacity = visualObjectComponent.opacity * parentWorldOpacity
				visualObjectComponent.worldOpacity = worldOpacity
			}

			var childrenComponent = childrenComponents[ entityId ]

			if( childrenComponent ) {
				var childrenIds = childrenComponent.ids

				for( var i = 0, n = childrenIds.length; i < n; i++ ) {
					updateVisualObjectR( childrenComponents, visualObjectComponents, worldOpacity, childrenIds[ i ] )
				}
			}
		}

		var updateVisualObject = function( componentMaps, entityId ) {
			// getting the parent's "world opacity"
			var parentComponent        = componentMaps[ PARENT_COMPONENT_ID ][ entityId ],
				visualObjectComponents = componentMaps[ VISUAL_OBJECT_COMPONENT_ID ],
				parentWorldOpacity     = 1.0

			if( parentComponent ) {
				var parentVisualObject = visualObjectComponents[ parentComponent.id ]

				if( parentVisualObject ) {
					parentWorldOpacity = parentVisualObject.worldOpacity
				}
			}

			// propagate the change towards the leafs
			updateVisualObjectR(
				componentMaps[ CHILDREN_COMPONENT_ID ],
				visualObjectComponents,
				parentWorldOpacity,
				entityId
			)
		}

		var addComponents = function( componentMaps, eventManager, entityId, entityComponents ) {
			var component

			// creating the components
			for( var componentId in entityComponents ) {
				component = entityComponents[ componentId ]

				if( componentMaps[ componentId ][ entityId ] ) {
					throw 'Error: Adding a component to the entity with id \'' + entityId + '\' failed because the entity already has a component named \'' + componentId + '\'. Check with hasComponent first if this entity already has this component.'
				}

				componentMaps[ componentId ][ entityId ] = component
			}

			// triggering "component created" events
			for( var componentId in entityComponents ) {
				component = entityComponents[ componentId ]

				eventManager.publish( [ Events.COMPONENT_CREATED, componentId ], [ component, entityId ] )
			}
		}

		var entityExists = function( componentMaps, entityId ) {
			for( var componentId in componentMaps ) {
				var componentMap = componentMaps[ componentId ]

				if( componentMap[ entityId ] ) return true
			}

			return false
		}

		var removeComponents = function( eventManager, componentMaps, spatialIndex, entityId, entityComponentId ) {
			var childrenComponent = componentMaps[ CHILDREN_COMPONENT_ID ][ entityId ],
				parentComponent   = componentMaps[ PARENT_COMPONENT_ID ][ entityId ],
				removedEntity     = true

			if( parentComponent ) {
				var parentChildrenComponent = componentMaps[ CHILDREN_COMPONENT_ID ][ parentComponent.id ]

				if( parentChildrenComponent ) {
					var parentChildrenIds = parentChildrenComponent.ids

					parentChildrenIds.splice( parentChildrenIds.indexOf( entityId ), 1 )
				}
			}

			if( entityComponentId ) {
				// remove a single component from the entity
				delete componentMaps[ entityComponentId ][ entityId ]

				if( entityExists( componentMaps, entityId ) ) {
					removedEntity = false
				}

				if( entityComponentId === VISUAL_OBJECT_COMPONENT_ID ) {
					spatialIndex.remove( entityId )
				}

			} else {
				// remove all componentMaps, that is "remove the entity"
				var hasVisualObject = !!componentMaps[ VISUAL_OBJECT_COMPONENT_ID ][ entityId ]

				for( var componentId in componentMaps ) {
					var componentMap = componentMaps[ componentId ]

					if( componentMap[ entityId ] ) {
						delete componentMap[ entityId ]
					}
				}

				if( hasVisualObject ) {
					spatialIndex.remove( entityId )
				}
			}

			if( removedEntity ) {
				eventManager.publish( Events.ENTITY_DESTROYED, entityId )

				if( childrenComponent ) {
					var childrenIds = childrenComponent.ids

					for( var i = 0, n = childrenIds.length; i < n; i++ ) {
						removeComponents( eventManager, componentMaps, spatialIndex, childrenIds[ i ] )
					}
				}
			}
		}

		/**
		 * Applies the overloaded children config to the children config defined in a template.
		 *
		 * @private
		 * @param entityTemplateChildrenConfig
		 * @param overloadedChildrenConfig
		 * @return {*}
		 */
		var applyOverloadedChildrenConfig = function( entityTemplateChildrenConfig, overloadedChildrenConfig ) {
			return _.reduce(
				overloadedChildrenConfig,
				function( memo, overloadedChildConfig ) {
					var entityTemplateChildConfig = _.find(
						memo,
						function( entityTemplateChildConfig ) {
							return overloadedChildConfig.name === entityTemplateChildConfig.name
						}
					)

					if( entityTemplateChildConfig ) {
						entityTemplateChildConfig.children = mergeOverloadedChildren( entityTemplateChildConfig.children, overloadedChildConfig.children )
						entityTemplateChildConfig.id       = overloadedChildConfig.id

						applyEntityConfig( entityTemplateChildConfig.config, overloadedChildConfig.config )

					} else {
						memo.push( overloadedChildConfig )
					}

					return memo
				},
				deepClone( entityTemplateChildrenConfig )
			)
		}

		var mergeOverloadedChildren = function( entityTemplateChildren, overloadedChildren ) {
			if( !overloadedChildren || overloadedChildren.length === 0 ) {
				return overloadedChildren
			}

			if( !entityTemplateChildren || entityTemplateChildren.length === 0 ) {
				return overloadedChildren
			}

			var result = deepClone( entityTemplateChildren )

			for( var i = 0; i < result.length; i++ ) {
				var entityTemplateChild = result[ i ]

				var overloadedChild = _.find(
					overloadedChildren,
					function( tmp ) {
						return tmp.name === entityTemplateChild.name
					}
				)

				if( !overloadedChild ) {
					continue
				}

				applyEntityConfig( entityTemplateChild.config, overloadedChild.config )

				if( overloadedChild.id ) {
					entityTemplateChild.id = overloadedChild.id
				}
			}

			return result
		}

		var attachEntityToParent = function( componentMaps, entityId, parentEntityId ) {
			var parentComponents    = componentMaps[ PARENT_COMPONENT_ID ],
				childrenComponents  = componentMaps[ CHILDREN_COMPONENT_ID ],
				children            = childrenComponents[ parentEntityId ]

			if( children ) {
				children.ids.push( entityId )
			}

			parentComponents[ entityId ] = { id : parentEntityId }
		}

		var detachEntityFromParent = function( childrenComponents, entityId, parentEntityId ) {
			for( var id in childrenComponents ) {
				var children = childrenComponents[ id ],
					index    = _.indexOf( children.ids, entityId )

				if( index !== -1 ) {
					arrayRemove( children.ids, index )

					break
				}
			}
		}

		var reassignEntity = function( componentMaps, entityId, parentEntityId ) {
			if( entityId === parentEntityId ) return

			var rootComponents     = componentMaps[ ROOT_COMPONENT_ID ],
				childrenComponents = componentMaps[ CHILDREN_COMPONENT_ID ],
				isRoot             = !!rootComponents[ entityId ]

			if( isRoot && !parentEntityId ) return

			if( parentEntityId ) {
				detachEntityFromParent( childrenComponents, entityId, parentEntityId )
				attachEntityToParent( componentMaps, entityId, parentEntityId )

				if( isRoot ) {
					// remove root component from entity
					delete rootComponents[ entityId ]
				}
			}

			if( !isRoot && !parentEntityId ) {
				// just got promoted to root
				rootComponents[ entityId ] = {}

				detachEntityFromParent( childrenComponents, entityId, parentEntityId )
			}
		}

		var addToSpatialIndex = function( spatialIndex, componentMaps, dimensions, entityId ) {
			var visualObject = componentMaps[ VISUAL_OBJECT_COMPONENT_ID ][ entityId ]

			if( !visualObject ||
				visualObject.pass === 'ui' ||
				visualObject.pass === 'background' ) {

				return
			}

			var childrenComponent = componentMaps[ CHILDREN_COMPONENT_ID ][ entityId ],
				parentComponent   = componentMaps[ PARENT_COMPONENT_ID ][ entityId ],
				transform         = componentMaps[ TRANSFORM_COMPONENT_ID ][ entityId ]

			spatialIndex.insert(
				transform.worldTranslation,
				dimensions,
				{
					id : entityId,
					parent : parentComponent ? parentComponent.id : 0,
					children : childrenComponent ? childrenComponent.ids : undefined,
					layer : visualObject ? visualObject.layer : 0
				},
				entityId
			)
		}

		var updateSpatialIndex = function( spatialIndex, componentMaps, entityId ) {
			spatialIndex.remove( entityId )

			addToSpatialIndex(
				spatialIndex,
				componentMaps,
				getEntityDimensions( componentMaps, entityId ),
				entityId
			)
		}

		/**
		 * Normalizes the provided entity config
		 *
		 * @param libraryManager
		 * @param arg1 can be either an entity template id or a entity config
		 * @private
		 * @return {*}
		 */
		var normalizeEntityConfig = function( libraryManager, arg1 ) {
			if( !arg1 ) return

			var entityTemplateId = _.isString( arg1 ) ? arg1 : arg1.entityTemplateId

			var entityConfig = {
				children         : arg1.children || [],
				config           : arg1.config || {},
				id               : arg1.id ? arg1.id : undefined,
				parentId         : arg1.parentId,
				name             : arg1.name || '',
				entityTemplateId : entityTemplateId
			}

			// check for ambiguous sibling names
			var ambiguousName = recursiveFind( entityConfig, createAmbiguousSiblingName )

			if( ambiguousName ) {
				throw 'Error: The entity configuration contains the ambiguous sibling name "' + ambiguousName + '". Entity siblings must have unique names.'
			}

			if( entityTemplateId ) {
				var entityTemplate = libraryManager.getByLibraryId( entityTemplateId )

				if( !entityTemplate ) {
					throw 'Error: Unknown entity template \'' + entityTemplateId + '\'. Could not create entity.'
				}

				entityConfig.children = applyOverloadedChildrenConfig( entityTemplate.children, entityConfig.children )
			}

			return entityConfig
		}

		var addAdditionalEntityConfig = function( result, isRoot, parentId, name, entityTemplateId ) {
			if( isRoot && !parentId ) {
				result[ ROOT_COMPONENT_ID ] = {}
			}

			if( parentId ) {
				result[ PARENT_COMPONENT_ID ] = {
					id : parentId
				}
			}

			result[ METADATA_COMPONENT_ID ] = {
				name : name,
				entityTemplateId : entityTemplateId
			}

			return result
		}

		var isAmbiguousSiblingName = function( componentMaps, ids, entityId, name ) {
			var metaDataComponents = componentMaps[ METADATA_COMPONENT_ID ]

			for( var i = 0, id, n = ids.length; i < n; i++ ) {
				id = ids[ i ]

				if( entityId != id &&
					metaDataComponents[ id ].name === name ) {

					return true
				}
			}

			return false
		}

		var createComponent = function( spell, moduleLoader, componentDefinition, componentId ) {
			// try component type first
			var component = createComponentType( moduleLoader, spell, componentId )

			// fall back to regular object component when no component type is available
			return initComponent( component || {}, componentDefinition )
		}

		var updateComponent = function( component, attributeConfig ) {
			if( attributeConfig === undefined ) {
				return component

			} else {
				return _.extend( component, attributeConfig )
			}
		}

		var hasAssetIdAttribute = function( attributeConfig ) {
			return !!_.find(
				attributeConfig,
				function( attribute ) {
					var type = attribute.type

					if( !_.isString( type ) ) return false

					return attribute.type.indexOf( 'assetId:' ) === 0
				}
			)
		}

		/**
		 * This function dereferences asset ids. If a component with an asset id attribute is found the reference is resolved and a additional asset attribute
		 * is added to the component instance.
		 *
		 * @param assetManager
		 * @param component
		 * @return {*}
		 */
		var injectAsset = function( assetManager, moduleLoader, component ) {
			var assetId = component.assetId
			if( !assetId ) return

			var asset = assetManager.get( assetId )

			if( !asset &&
				stringUtil.startsWith( assetId, 'script:' ) ) {

				var libraryId = assetId.substr( 7 )

				asset = moduleLoader.require( createModuleId( libraryId ) )
			}

			if( !asset ) {
				throw 'Error: Could not resolve asset id \'' + assetId + '\' to asset instance. Please make sure that the asset id is valid.'
			}

			component.asset = asset

			return component
		}

		var createComponentsTM = function( spell, assetManager, libraryManager, moduleLoader, componentConfig, entityTemplateId, entityTemplate, injectAssets ) {
			if( injectAssets === undefined ) injectAssets = true

			var entity = applyEntityConfig(
				entityTemplate ? deepClone( entityTemplate.config ) : {},
				componentConfig
			)

			_.each(
				entity,
				function( attributeConfig, componentId ) {
					var componentDefinition = libraryManager.getByLibraryId( componentId )

					if( !componentDefinition ) {
						throw 'Error: Could not find component definition "' + componentId +
							entityTemplateId ?
								'" referenced in entity template "' + entityTemplateId + '".' :
								'".'
					}

					var updatedComponent = updateComponent(
						createComponent( spell, moduleLoader, componentDefinition, componentId ),
						attributeConfig
					)

					entity[ componentId ] = hasAssetIdAttribute( componentDefinition.attributes ) && injectAssets ?
						injectAsset( assetManager, moduleLoader, updatedComponent ) :
						updatedComponent
				}
			)

			return entity
		}

		var createComponents = function( spell, assetManager, libraryManager, moduleLoader, entityTemplateId, config ) {
			var entityTemplate = entityTemplateId ?
				libraryManager.getByLibraryId( entityTemplateId ) :
				undefined

			return createComponentsTM( spell, assetManager, libraryManager, moduleLoader, config, entityTemplateId, entityTemplate )
		}

		var createEntity = function( spell, assetManager, eventManager, libraryManager, moduleLoader, componentMaps, spatialIndex, entityConfig, isRoot ) {
			entityConfig = normalizeEntityConfig( libraryManager, entityConfig )

			if( !entityConfig ) throw 'Error: Supplied invalid arguments.'

			var entityTemplateId   = entityConfig.entityTemplateId,
				config             = entityConfig.config || {},
				parentId           = entityConfig.parentId

			if( !entityTemplateId && !config ) {
				throw 'Error: Supplied invalid arguments.'
			}

			isRoot = isRoot === true ||
				( isRoot === undefined && !parentId )

			var entityId = getEntityId( entityConfig.id )

			// add additional components which the engine requires
			addAdditionalEntityConfig( config, isRoot, parentId, entityConfig.name, entityTemplateId )

			// creating the entity
			var entityComponents = createComponents( spell, assetManager, libraryManager, moduleLoader, entityTemplateId, config || {} )

			addComponents( componentMaps, eventManager, entityId, entityComponents )
			updateWorldTransform( componentMaps, eventManager, spatialIndex, false, entityId )

			var textureMatrix = componentMaps[ TEXTURE_MATRIX_COMPONENT_ID ][ entityId ]

			if( textureMatrix ) {
				updateTextureMatrix( textureMatrix )
			}

			// creating child entities
			var childEntityIds = _.map(
				entityConfig.children,
				function( entityConfig ) {
					entityConfig.parentId = entityId
					return createEntity( spell, assetManager, eventManager, libraryManager, moduleLoader, componentMaps, spatialIndex, entityConfig, false )
				}
			)

			// adding the descendant entity ids to this entity
			var childrenComponentConfig = {}

			childrenComponentConfig[ CHILDREN_COMPONENT_ID ] = {
				ids : childEntityIds
			}

			addComponents( componentMaps, eventManager, entityId, childrenComponentConfig )

			// check for validity: is the name unique?
			if( entityConfig.name ) {
				var siblingIds

				if( isRoot ) {
					siblingIds = _.keys( componentMaps[ ROOT_COMPONENT_ID ] )

				} else {
					var parentChildrenComponent = componentMaps[ CHILDREN_COMPONENT_ID ][ parentId ]

					if( parentChildrenComponent ) {
						siblingIds = parentChildrenComponent.ids
					}
				}

				if( siblingIds &&
					isAmbiguousSiblingName( componentMaps, siblingIds, entityId, entityConfig.name ) ) {

					throw 'Error: The name "' + entityConfig.name + '" of entity ' + entityId + ' collides with one if its siblings. Entity siblings must have unique names.'
				}
			}

			// updating spatial index
			addToSpatialIndex(
				spatialIndex,
				componentMaps,
				getEntityDimensions( componentMaps, entityId ),
				entityId
			)


			_.extend( entityComponents, childrenComponentConfig )
			eventManager.publish( Events.ENTITY_CREATED, [ entityId, entityComponents ] )

			return entityId
		}

		var assembleEntityInstance = function( componentMaps, id ) {
			return _.reduce(
				componentMaps,
				function( memo, componentMap, componentId ) {
					var component = componentMap[ id ]

					if( component ) {
						memo[ componentId ] = component
					}

					return memo
				},
				{}
			)
		}

		var getEntityCompositeIds = function( childrenComponents, entityId, resultIds ) {
			var children    = childrenComponents[ entityId ],
				childrenIds = children ? children.ids : []

			for( var i = 0, numChildrenIds = childrenIds.length; i < numChildrenIds; i++ ) {
				getEntityCompositeIds( childrenComponents, childrenIds[ i ], resultIds )
			}

			resultIds.push( entityId )

			return resultIds
		}

		var getEntityDimensions = function( componentMaps, entityId ) {
			var staticAppearances   = componentMaps[ STATIC_APPEARANCE_COMPONENT_ID ],
				animatedAppearances = componentMaps[ ANIMATED_APPEARANCE_COMPONENT_ID ],
				transforms          = componentMaps[ TRANSFORM_COMPONENT_ID ],
				quadGeometries      = componentMaps[ QUAD_GEOMETRY_COMPONENT_ID ],
				tilemaps            = componentMaps[ TILEMAP_COMPONENT_ID ],
				dimensions          = vec2.create()

			if( quadGeometries &&
				quadGeometries[ entityId ] &&
				quadGeometries[ entityId ].dimensions ) {

				// if a quadGeometry is specified, always take this
				vec2.copy( dimensions, quadGeometries[ entityId ].dimensions )

			} else if( staticAppearances && staticAppearances[ entityId ] &&
				staticAppearances[ entityId ].asset &&
				staticAppearances[ entityId ].asset.resource &&
				staticAppearances[ entityId ].asset.resource.dimensions ) {

				// entity has a static appearance
				vec2.copy( dimensions, staticAppearances[ entityId ].asset.resource.dimensions )

			} else if( animatedAppearances &&
				animatedAppearances[ entityId ] &&
				animatedAppearances[ entityId ].asset &&
				animatedAppearances[ entityId ].asset.frameDimensions ) {

				// entity has an animated appearance
				vec2.copy( dimensions, animatedAppearances[ entityId ].asset.frameDimensions )

			} else if( tilemaps &&
				tilemaps[ entityId ] &&
				tilemaps[ entityId ].asset ) {

				// entity is a tilemap
				vec2.copy( dimensions, tilemaps[ entityId ].asset.tilemapDimensions )
				vec2.multiply( dimensions, dimensions, tilemaps[ entityId ].asset.spriteSheet.frameDimensions )

			} else {
				return
			}

			// apply scale factor
			if( transforms && transforms[ entityId ] ) {

                //TODO: using the worldScale would be more correct here, but as we don't want to calculate it
                //only for this test, use the local scale
				//vec2.multiply( dimensions, dimensions, transforms[ entityId ].scale )
			}

			return dimensions
		}

		/**
		 * Sets the attribute of a component to the specified value.
		 *
		 * @param component
		 * @param attributeId
		 * @param value
		 */
		var setAttribute = function( component, attributeId, value ) {
			// TODO: Unfortunately there is no generic copy operator in javascript.
			if( _.isObject( value ) ||
				_.isArray( value ) ) {
				_.extend( component[ attributeId ], value )

			} else {
				component[ attributeId ] = value
			}
		}

		var updateComponentAttributeTM = function( assetManager, moduleLoader, componentsWithAssets, componentId, attributeId, component, value ) {
			setAttribute( component, attributeId, value )

			if( componentsWithAssets[ componentId ] ) {
				var assetIdChanged = attributeId === 'assetId'

				if( assetIdChanged ) {
					injectAsset( assetManager, moduleLoader, component )
				}
			}
		}

		var updateComponentTM = function( assetManager, moduleLoader, componentsWithAssets, componentId, component, attributeConfig ) {
			for( var attributeId in attributeConfig ) {
				setAttribute( component, attributeId, attributeConfig[ attributeId ] )
			}

			if( componentsWithAssets[ componentId ] ) {
				var assetIdChanged = !!attributeConfig[ 'assetId' ]

				if( assetIdChanged ) {
					injectAsset( assetManager, moduleLoader, component )
				}
			}
		}

		/*
		 * public
		 */

		var EntityManager = function( spell, configurationManager, assetManager, eventManager, libraryManager, moduleLoader ) {
			this.configurationManager = configurationManager
			this.componentMaps        = {}
			this.assetManager         = assetManager
			this.eventManager         = eventManager
			this.libraryManager       = libraryManager
			this.moduleLoader         = moduleLoader
			this.spell                = spell
			this.spatialIndex         = undefined
			this.componentsWithAssets = {}
		}

		EntityManager.prototype = {
			/**
			 * Creates an entity using the given configuration object.
			 *
			 * Available configuration options are:
			 *
			 * * **entityTemplateId** [String] - if the entity should be constructed using an entity template you can specify the library path to the entity template here
			 * * **config** [Object] - component configuration for this entity. It can also be used to partially override an entity template config
			 * * **children** [Array] - if this entity has children, an array of nested config objects can be specified here
			 * * **id** [String] - if specified the entity will be created using this id. Please note: you should not use this function unless you know what you're doing. Normally the engine assigns entityIds automatically.
			 * * **name** [String] - a name for this entity. If specified, you can use the {@link #getEntityIdsByName} function to lookup named entities to their entityIds
			 *
			 * Example usage:
			 *
			 *     //create a new entity with the given components
			 *     var entityId = spell.entityManager.createEntity({
			 *         config: {
			 *             "spell.component.2d.transform": {
			 *                 "translation": [ 100, 200 ]
			 *             },
			 *             "spell.component.visualObject": {
			 *               //if no configuration is specified the default values of this component will be used
			 *             },
			 *             "spell.component.2d.graphics.appearance": {
			 *                 "assetId": "appearance:library.identifier.of.my.static.appearance"
			 *             }
			 *         }
			 *     })
			 *
			 *     //create a new entity with child entities
			 *     var entityId = spell.entityManager.createEntity({
			 *         config: {
			 *             "spell.component.2d.transform": {
			 *                 "translation": [ 100, 200 ]
			 *             },
			 *             "spell.component.visualObject": {
			 *               //if no configuration is specified the default values of this component will be used
			 *             },
			 *             "spell.component.2d.graphics.appearance": {
			 *                 "assetId": "appearance:library.identifier.of.my.static.appearance"
			 *             }
			 *         },
			 *         children: [
			 *             {
			 *                 config: {
			 *                     "spell.component.2d.transform": {
			 *                         "translation": [ -15, 20 ] //translation is relative to the parent
			 *                     },
			 *                     "spell.component.visualObject": {
			 *                       //if no configuration is specified the default values of this component will be used
			 *                     },
			 *                     "spell.component.2d.graphics.appearance": {
			 *                         "assetId": "appearance:library.identifier.of.my.other.static.appearance"
			 *                     }
			 *                 }
			 *             }
			 *         ]
			 *     })
			 *
			 *     //create a new entity from an entity template
			 *     var entityId = spell.entityManager.createEntity({
			 *         entityTemplateId: 'library.identifier.of.my.template'
			 *     })
			 *
			 *     //create a new entity from an entity template and override values from the template
			 *     var entityId = spell.entityManager.createEntity({
			 *         entityTemplateId: 'library.identifier.of.my.template',
			 *         config: {
			 *             "spell.component.box2d.simpleBox": {
			 *                 "dimensions": [ 100, 100 ]
			 *              },
			 *              "spell.component.2d.transform": {
			 *                  "translation": [ 150, 50 ]
			 *               }
			 *         }
			 *     })
			 *
			 * @param {Object} entityConfig an entity configuration object
			 * @return {String} the entity id of the newly created entity
			 */
			createEntity : function( entityConfig ) {
				var entityId = createEntity( this.spell, this.assetManager, this.eventManager, this.libraryManager, this.moduleLoader, this.componentMaps, this.spatialIndex, entityConfig )

				// HACK: updateVisualObject requires the complete ECS to be completely instantiated, because it propagates information towards the leafs.
				updateVisualObject( this.componentMaps, entityId )

				// adding the entity id to its parent's children component
				var parentComponent = this.componentMaps[ PARENT_COMPONENT_ID ][ entityId ]

				if( parentComponent ) {
					var parentId                = parentComponent.id,
						childrenComponents      = this.componentMaps[ CHILDREN_COMPONENT_ID ],
						parentChildrenComponent = childrenComponents[ parentId ]

					if( parentChildrenComponent ) {
						parentChildrenComponent.ids.push( entityId )

						this.eventManager.publish( [ Events.COMPONENT_UPDATED, CHILDREN_COMPONENT_ID ], [ parentChildrenComponent, entityId ] )

					} else {
						parentChildrenComponent = { ids : [ entityId ] }

						childrenComponents[ parentId ] = parentChildrenComponent

						this.eventManager.publish( [ Events.COMPONENT_CREATED, CHILDREN_COMPONENT_ID ], [ parentChildrenComponent, entityId ] )
					}
				}

				return entityId
			},

			/**
			 * Creates entities from a list of entity configs.
			 *
			 * See {@link #createEntity} function for a documentation of the entity config object.
			 *
			 * @param {Array} entityConfigs
			 */
			createEntities : function( entityConfigs ) {
				for( var i = 0, n = entityConfigs.length; i < n; i++ ) {
					this.createEntity( entityConfigs[ i ] )
				}
			},

			/**
			 * Removes an entity
			 *
			 * @param {String} entityId the id of the entity to remove
			 */
			removeEntity : function( entityId ) {
				if( !entityId ) {
					return false
				}

				removeComponents( this.eventManager, this.componentMaps, this.spatialIndex, entityId )

				return true
			},

			/**
			 * Returns an entity by its id.
			 *
			 * NOTE: Do not use this function to frequently query large amounts of entities. In order to process entities frequently with better performance
			 * define a system input that matches your requirements.
			 *
			 * @param {String} entityId the entity id
			 * @return {Object}
			 */
			getEntityById : function( entityId ) {
				return assembleEntityInstance( this.componentMaps, entityId )
			},

			/**
			 * Creates an exact copy of the given entityId
			 * @param entityId
			 */
			cloneEntity: function( entityId ) {
				var entityConfig = {
					config : assembleEntityInstance( this.componentMaps, entityId )
				}

				return createEntity( this.spell, this.assetManager, this.eventManager, this.libraryManager, this.moduleLoader, this.componentMaps, this.spatialIndex, entityConfig )
			},


			/**
			 * Returns the width and height for a given entity
			 * @param entityId
			 * @return vec2 2d-vector containing the dimension
			 */
			getEntityDimensions: function( entityId ) {
				return getEntityDimensions( this.componentMaps, entityId )
			},


			/**
			 * Returns an array of ids of entities which have the requested name.
			 *
			 * @param {String} name the name of the entity
			 * @param {String} scopeEntityId the scope of the search is limited to this entity and its descendants
			 * @return {Array}
			 */
			getEntityIdsByName : function( name, scopeEntityId ) {
				var metaDataComponents = this.componentMaps[ METADATA_COMPONENT_ID ],
					resultIds          = []

				var ids = scopeEntityId ?
					getEntityCompositeIds( this.componentMaps[ CHILDREN_COMPONENT_ID ], scopeEntityId, [] ) :
					_.keys( metaDataComponents )

				for( var i = 0, numIds = ids.length; i < numIds; i++ ) {
					var nameComponentId = ids[ i ]

					if( metaDataComponents[ nameComponentId ] && metaDataComponents[ nameComponentId ][ 'name' ] === name ) {
						resultIds.push( nameComponentId )
					}
				}

				return resultIds
			},

			/**
			 * Returns a collection of entities which have the requested name.
			 *
			 * @param {String} name the name of the entity
			 * @return {Object}
			 */
			getEntitiesByName : function( name ) {
				var ids = this.getEntityIdsByName( name, undefined )

				var entities = {}

				for( var i = 0, numIds = ids.length; i < numIds; i++ ) {
					var id = ids[ i ]

					entities[ id ] = this.getEntityById( id )
				}

				return entities
			},

			/**
			 * Returns all entities which intersect with the region defined by the position and dimension. The return
			 * value is an object with the entity ids as keys and additional entity metadata as value.
			 *
			 * @param position {Array} the position of the region in world coordinates
			 * @param dimensions {Array} the dimensions of the region in world coordinates
			 * @return {Object}
			 */
			getEntityIdsByRegion : function( position, dimensions ) {
				return this.spatialIndex.search( position, dimensions )
			},

			/**
			 * Resets the entity manager. Removes all entity instances in the process.
			 */
			init : function() {
				var componentMaps = this.componentMaps,
					eventManager  = this.eventManager,
					spatialIndex  = this.spatialIndex

				for( var componentId in componentMaps ) {
					var components = componentMaps[ componentId ]

					for( var entityId in components ) {
						removeComponents( eventManager, componentMaps, spatialIndex, entityId )
					}

					// explicitly resetting component map for good measure
					componentMaps[ componentId ] = {}
				}

                this.spatialIndex = new QuadTree( this.configurationManager.getValue( 'quadTreeSize' ) )
            },


			/**
			 * Reassigns an entity to become the child of a parent entity.
			 *
			 * Example usage:
			 *
			 *     //make entity A the child of entity B
			 *     spell.entityManager.reassign( aId, bId )
			 *
			 *     //make entity A a root entity, that is it has no parent
			 *     spell.entityManager.reassign( aId )
			 *
			 * @param entityId the id of the entity which gets reassigned
			 * @param parentEntityId the id of the entity which will be the parent entity
			 */
			reassignEntity : function( entityId, parentEntityId ) {
				if( !entityId ) throw 'Error: Missing entity id.'

				reassignEntity( this.componentMaps, entityId, parentEntityId )
			},

			/**
			 * Check if an entity already has a specific component
			 *
			 * @param {String} entityId of the entity that the component belongs to
			 * @param {String} componentId the library path of the component
			 * @return {Boolean}
			 */
			hasComponent : function( entityId, componentId ) {
				var componentMap = this.componentMaps[ componentId ]
				if( !componentMap ) return false

				return !!componentMap[ entityId ]
			},

			/**
			 * Adds a component to an entity.
			 *
			 * Example usage:
			 *
			 *     //add a component with it's default configuration to this entity
			 *     spell.entityManager.addComponent( entityId, "spell.component.2d.graphics.debug.box" )
			 *
			 *     //add a component to this entity and override a default value
			 *     spell.entityManager.addComponent(
			 *         entityId,
			 *         "spell.component.2d.graphics.textApperance",
			 *         {
			 *             "text": "Hello World"
			 *         }
			 *     )
			 *
			 * @param {String} entityId of the entity that the component belongs to
			 * @param {String} componentId the library path of the component to add
			 * @param {Object} attributeConfig the attribute configuration of the component
			 */
			addComponent : function( entityId, componentId, attributeConfig ) {
				if( !entityId ) throw 'Error: Missing entity id.'
				if( !componentId ) throw 'Error: Missing component id.'

				var componentConfigs = {}
				componentConfigs[ componentId ] = attributeConfig || {}

				addComponents(
					this.componentMaps,
					this.eventManager,
					entityId,
					createComponents( this.spell, this.assetManager, this.libraryManager, this.moduleLoader, null, componentConfigs )
				)
			},

			/**
			 * Removes a component from an entity.
			 *
			 * @param {String} entityId the id of the entity that the component belongs to
			 * @param {String} componentId the library path of the component to remove
			 */
			removeComponent : function( entityId, componentId ) {
				if( !entityId ) throw 'Error: Missing entity id.'

				removeComponents( this.eventManager, this.componentMaps, this.spatialIndex, entityId, componentId )
			},

			/**
			 * Returns a component from a specific entity.
			 *
			 * @param {String} entityId the id of the requested entity
			 * @param {String} componentId the requested component id
			 * @return {Object}
			 */
			getComponentById : function( entityId, componentId ) {
				var componentMap = this.componentMaps[ componentId ]

				return componentMap ? componentMap[ entityId ] : undefined
			},

			/**
			 * Returns a collection of components which have the requested component id and belong to entities which have the requested name.
			 *
			 * @param {String} componentId the requested component id
			 * @param {String} name the requested entity name
			 * @param {String} scopeEntityId the scope of the search is limited to this entity and its descendants
			 * @return {Object}
			 */
			getComponentsByName : function( componentId, name, scopeEntityId ) {
				var componentMap = this.getComponentMapById( componentId ),
					ids          = this.getEntityIdsByName( name, scopeEntityId )

				if( ids.length === 0 ||
					!componentMap ) {

					return []
				}

				return _.pick( componentMap, ids )
			},

			/**
			 * Updates the attributes of a component. Returns true when successful, false otherwise.
			 *
			 * Example usage:
			 *     // update a component of an entity
			 *     spell.entityManager.updateComponent(
			 *         entityId,
			 *         "spell.component.2d.graphics.appearance",
			 *         {
			 *             assetId : "appearance:library.identifier.of.my.static.appearance"
			 *         }
			 *     )
			 *
			 * @param {String} entityId the id of the entity which the component belongs to
			 * @param {String} componentId the library path of the component
			 * @param {Object} attributeConfig the attribute configuration change of the component
			 * @return {Boolean} true if the component could be found, false otherwise
			 */
			updateComponent : function( entityId, componentId, attributeConfig ) {
				var component = this.getComponentById( entityId, componentId )
				if( !component ) return false

				updateComponentTM( this.assetManager, this.moduleLoader, this.componentsWithAssets, componentId, component, attributeConfig )

				if( componentId === TRANSFORM_COMPONENT_ID ) {
					if( attributeConfig.translation ||
						attributeConfig.scale ||
						attributeConfig.rotation !== undefined ) {

						updateWorldTransform( this.componentMaps, this.eventManager, this.spatialIndex, true, entityId )
					}

				} else if( componentId === TEXTURE_MATRIX_COMPONENT_ID ) {
					if( attributeConfig.translation ||
						attributeConfig.scale ||
						attributeConfig.rotation ) {

						updateTextureMatrix( this.componentMaps[ TEXTURE_MATRIX_COMPONENT_ID ][ entityId ] )
					}

				} else if( componentId === VISUAL_OBJECT_COMPONENT_ID ) {
					updateSpatialIndex( this.spatialIndex, this.componentMaps, entityId )
					updateVisualObject( this.componentMaps, entityId )
				}

				this.eventManager.publish( [ Events.COMPONENT_UPDATED, componentId ], [ component, entityId ] )

				return true
			},

			/**
			 * Updates one attribute of a component. Returns true when successful, false otherwise.
			 *
			 * Example usage:
			 *     // update a specific attribute of a component of an entity
			 *     spell.entityManager.updateComponentAttribute(
			 *         entityId,
			 *         "spell.component.2d.transform",
			 *         "translation",
			 *         [ 10, 10 ]
			 *     )
			 *
			 * @param {String} entityId the id of the entity which the component belongs to
			 * @param {String} componentId the library path of the component
			 * @param {String} attributeId the id of the attribute
			 * @param {Object} value the value of the attribute
			 * @return {Boolean} true if the component could be found, false otherwise
			 */
			updateComponentAttribute : function( entityId, componentId, attributeId, value ) {
				var component = this.getComponentById( entityId, componentId )
				if( !component ) return false

				var attribute = component[ attributeId ]
				if( attribute === undefined ) return false

				updateComponentAttributeTM( this.assetManager, this.moduleLoader, this.componentsWithAssets, componentId, attributeId, component, value )

				if( componentId === TRANSFORM_COMPONENT_ID ) {
					if( attributeId === 'translation' ||
						attributeId === 'scale' ||
						attributeId === 'rotation' ) {

						updateWorldTransform( this.componentMaps, this.eventManager, this.spatialIndex, true, entityId )
					}

				} else if( componentId === TEXTURE_MATRIX_COMPONENT_ID ) {
					if( attributeId === 'translation' ||
						attributeId === 'scale' ||
						attributeId === 'rotation' ) {

						updateTextureMatrix( this.componentMaps[ TEXTURE_MATRIX_COMPONENT_ID ][ entityId ] )
					}

				} else if( componentId === VISUAL_OBJECT_COMPONENT_ID ) {
					updateSpatialIndex( this.spatialIndex, this.componentMaps, entityId )
					updateVisualObject( this.componentMaps, entityId )
				}

				this.eventManager.publish( [ Events.COMPONENT_UPDATED, componentId ], [ component, entityId ] )

				return true
			},

			/**
			 * Returns a component map of a specific type.
			 *
			 * @param {String} componentId the requested component type / id
			 * @return {*}
			 */
			getComponentMapById : function( componentId ) {
				return this.componentMaps[ componentId ]
			},

			updateWorldTransform : function( entityId ) {
				updateWorldTransform( this.componentMaps, this.eventManager, this.spatialIndex, true, entityId )
			},

			updateTextureMatrix : function( entityId ) {
				updateTextureMatrix( this.componentMaps[ TEXTURE_MATRIX_COMPONENT_ID ][ entityId ] )
			},

			/**
			 * Updates all components which reference the asset with the updated asset instance.
			 *
			 * @param assetId
			 * @param asset
			 * @private
			 */
			updateAssetReferences : function( assetId, asset ) {
				var componentMaps = this.componentMaps

				for( var componentId in this.componentsWithAssets ) {
					var componentMap = componentMaps[ componentId ]

					for( var id in componentMap ) {
						var component = componentMap[ id ]

						if( component.assetId === assetId ) {
							component.asset = asset
						}
					}
				}
			},

			/**
			 * Refreshes all references to assets that components hold
			 *
			 * @param assetManager
			 */
			refreshAssetReferences : function( assetManager ) {
				var componentMaps = this.componentMaps

				for( var componentId in this.componentsWithAssets ) {
					var componentMap = componentMaps[ componentId ]

					for( var id in componentMap ) {
						var component = componentMap[ id ]

						if( component.assetId.slice( 0, component.assetId.indexOf( ':' ) ) === 'script' ) {
							continue
						}

						component.asset = assetManager.get( component.assetId )
					}
				}
			},

			/**
			 * Triggers an event on the specified entity.
			 *
			 * @param entityId
			 * @param eventId
			 * @param eventArguments
			 */
			triggerEvent : function( entityId, eventId, eventArguments ) {
				var component = this.componentMaps[ EVENT_HANDLERS_COMPONENT_ID ][ entityId ]

				if( !component ) return

				var eventHandler = component.asset[ eventId ]

				if( !eventHandler ) return

				eventHandler.apply( null, [ this.spell, entityId ].concat( eventArguments ) )
			},

			updateEntityTemplate : function( entityDefinition ) {
				var entityTemplateId = createId( entityDefinition.namespace, entityDefinition.name )

				// get ids of entities which are based on this entity template
				var ids = _.reduce(
					this.componentMaps[ METADATA_COMPONENT_ID ],
					function( memo, component, entityId ) {
						if( component.entityTemplateId === entityTemplateId ) {
							memo.push( entityId )
						}

						return memo
					},
					[]
				)

				for( var i = 0, id, n = ids.length; i < n; i++ ) {
					id = ids[ i ]

					// remove entities
					this.removeEntity( id )
					this.spatialIndex.remove( id )

					// recreate entities while using old ids
					this.createEntity( {
						entityTemplateId : entityTemplateId,
						id : id
					} )
				}
			},

			registerComponent : function( componentDefinition ) {
				var componentId = createId( componentDefinition.namespace, componentDefinition.name )

				if( !isValidComponentDefinition( componentDefinition ) ) {
					throw 'Error: The format of the supplied component definition "' + componentId + '" is invalid.'
				}

				if( !this.componentMaps[ componentId ] ) {
					this.componentMaps[ componentId ] = {}
				}

				if( hasAssetIdAttribute( componentDefinition.attributes ) ) {
					this.componentsWithAssets[ componentId ] = true

				} else {
					delete this.componentsWithAssets[ componentId ]
				}
			}
		}

		return EntityManager
	}
)
