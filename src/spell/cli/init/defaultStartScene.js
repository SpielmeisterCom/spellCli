define(
	'spell/cli/init/defaultStartScene',
	function() {
		'use strict'


		return {
			JSON : {
				"version": 1,
				"type": "scene",
				"systems": {
					"update": [
						{
							"id": "spell.system.processKeyInput",
							"config": {
								"active": true
							}
						},
						{
							"id": "spell.system.cameraMover",
							"config": {
								"active": true
							}
						},
						{
							"id": "spell.system.clearKeyInput",
							"config": {
								"active": true
							}
						}
					],
					"render": [
						{
							"id": "spell.system.visibility",
							"config": {
								"active": true
							}
						},
						{
							"id": "spell.system.keyFrameAnimation",
							"config": {
								"active": true
							}
						},
						{
							"id": "spell.system.render",
							"config": {
								"active": true,
								"debug": false
							}
						},
						{
							"id": "spell.system.audio",
							"config": {
								"active": true
							}
						}
					]
				},
				"libraryIds": [
					"spell.OpenSans14px",
					"spell.component.2d.graphics.animatedAppearance",
					"spell.component.2d.graphics.appearance",
					"spell.component.2d.graphics.camera",
					"spell.component.2d.graphics.cameraMovement",
					"spell.component.2d.graphics.debug.box",
					"spell.component.2d.graphics.debug.circle",
					"spell.component.2d.graphics.geometry.quad",
					"spell.component.2d.graphics.shape.rectangle",
					"spell.component.2d.graphics.spriteSheetAppearance",
					"spell.component.2d.graphics.textAppearance",
					"spell.component.2d.graphics.textureMatrix",
					"spell.component.2d.graphics.tilemap",
					"spell.component.2d.transform",
					"spell.component.animation.keyFrameAnimation",
					"spell.component.audio.soundEmitter",
					"spell.component.entityMetaData",
					"spell.component.eventHandlers",
					"spell.component.visualObject",
					"spell.defaultAppearance",
					"spell.entity.2d.graphics.camera",
					"spell.system.audio",
					"spell.system.cameraMover",
					"spell.system.clearKeyInput",
					"spell.system.keyFrameAnimation",
					"spell.system.render",
					"spell.system.visibility"
				],
				"entities": [
					{
						"name": "camera",
						"entityTemplateId": "spell.entity.2d.graphics.camera",
						"config": {
							"spell.component.2d.graphics.camera": {
								"active": true
							}
						}
					}
				]
			},
			JS : [
				"define(",
				"	'%1$s',",
				"	[",
				"		'spell/functions'",
				"	],",
				"	function(",
				"		_",
				"	) {",
				"		'use strict'",
				"",
				"",
				"		return {",
				"			/**",
				"			 * This function is executed after the entites contained in the scene configuration have been created. All initialization functionality specific to",
				"			 * the scene should be placed here.",
				"			 *",
				"			 * @param spell",
				"			 * @param sceneConfig",
				"			 */",
				"			init : function( spell, sceneConfig ) {},",
				"",
				"			/**",
				"			 * This function is executed before all entities are destroyed. Scene specific clean up should be performed here.",
				"			 *",
				"			 * @param spell",
				"			 * @param sceneConfig",
				"			 */",
				"			destroy : function( spell, sceneConfig ) {}",
				"		}",
				"	}",
				")",
				""
			].join( '\n' )
		}
	}
)
