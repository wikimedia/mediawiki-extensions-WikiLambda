<template>
	<!--
		WikiLambda Vue component for ZImplementation objects.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<div class="ext-wikilambda-zimplementation">
		<div>
			<label id="ext-wikilambda-zimplementation_function-label">{{ functionLabel }}:</label>
			<z-object-selector
				v-if="!viewmode && implMode && isFunctionLabelReady"
				class="ext-wikilambda-zimplementation__function-selector"
				aria-labelledby="ext-wikilambda-zimplementation_function-label"
				:type="Constants.Z_FUNCTION"
				:placeholder="$i18n( 'wikilambda-function-typeselector-label' ).text()"
				:selected-id="zFunction.value"
				:initial-selection-label="selectedFunctionLabel"
				:zobject-id="zFunction.id"
				@input="updateZFunctionType"
			></z-object-selector>
			<template v-else>
				<z-reference
					v-if="zFunction.value"
					:zobject-key="zFunction.value"
					:readonly="true"
				></z-reference>
				<span v-else>{{ $i18n( 'wikilambda-invalidzobject' ).text() }}</span>
				<span class="ext-wikilambda-zimplementation__-is-impl-associated">
					<cdx-icon :icon="associatedIcon()"></cdx-icon>
					({{ isImplementationAttached ?
						$i18n( 'wikilambda-function-is-approved' ).text() :
						$i18n( 'wikilambda-function-is-not-approved' ).text()
					}})
				</span>
			</template>
		</div>
		<div v-if="!viewmode && implMode">
			<!-- eslint-disable vue/no-v-model-argument -->
			<!-- eslint-disable vue/no-unsupported-features -->
			<cdx-select
				v-model:selected="implMode"
				class="ext-wikilambda-zimplementation__mode-selector"
				:menu-items="implementationModeItems"
				@update:selected="changeImplMode"
			>
			</cdx-select>
		</div>
		<div v-if="implMode === null">
			<span>{{ $i18n( 'wikilambda-implementation-selector-none' ).text() }}</span>
		</div>
		<z-code
			v-if="implMode === Constants.implementationModes.CODE"
			:zobject-id="zCodeId"
			@select-language="selectLanguage"
			@update-code="updateCode"
		></z-code>
		<z-object
			v-if="implMode === Constants.implementationModes.COMPOSITION"
			:zobject-id="zCompositionId"
			:persistent="false"
		></z-object>
		<z-function-tester-report
			:z-function-id="zFunction.value || ''"
			:z-implementation-id="zImplementationId"
		></z-function-tester-report>
	</div>
</template>

<script>
var Constants = require( '../../Constants.js' ),
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	CdxSelect = require( '@wikimedia/codex' ).CdxSelect,
	CdxIcon = require( '@wikimedia/codex' ).CdxIcon,
	icons = require( '../../../lib/icons.json' ),
	typeUtils = require( '../../mixins/typeUtils.js' ),
	ZCode = require( './ZCode.vue' ),
	ZObjectSelector = require( '../ZObjectSelector.vue' ),
	ZReference = require( './ZReference.vue' ),
	ZFunctionTesterReport = require( '../function/ZFunctionTesterReport.vue' );

// @vue/component
module.exports = exports = {
	components: {
		'z-code': ZCode,
		'z-object-selector': ZObjectSelector,
		'z-reference': ZReference,
		'z-function-tester-report': ZFunctionTesterReport,
		'cdx-select': CdxSelect,
		'cdx-icon': CdxIcon
	},
	mixins: [ typeUtils ],
	provide: {
		allowArgRefMode: true
	},
	inject: {
		viewmode: { default: false }
	},
	props: {
		zobjectId: {
			type: Number,
			required: true
		}
	},
	data: function () {
		return {
			implMode: null
		};
	},
	computed: $.extend( {},
		mapGetters( [
			'getZObjectById',
			'getZObjectChildrenById',
			'getZkeyLabels',
			'getZkeys',
			'getNestedZObjectById',
			'getZarguments',
			'isNewZObject'
		] ),
		{
			Constants: function () {
				return Constants;
			},
			zobject: function () {
				return this.getZObjectChildrenById( this.zobjectId );
			},
			zImplementationId: function () {
				return this.getNestedZObjectById( this.getZObjectById( this.zobjectId ).parent, [
					Constants.Z_PERSISTENTOBJECT_ID,
					Constants.Z_STRING_VALUE
				] ).value;
			},
			zFunction: function () {
				return this.findKeyInArray(
					[ Constants.Z_REFERENCE_ID, Constants.Z_STRING_VALUE ],
					this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_IMPLEMENTATION_FUNCTION, this.zobject ).id
					)
				);
			},
			zCodeId: function () {
				return this.findKeyInArray( Constants.Z_IMPLEMENTATION_CODE, this.zobject ).id;
			},
			zCompositionId: function () {
				return this.findKeyInArray( Constants.Z_IMPLEMENTATION_COMPOSITION, this.zobject ).id;
			},
			zCodeLanguage: function () {
				return this.getNestedZObjectById( this.zCodeId, [
					Constants.Z_CODE_LANGUAGE,
					Constants.Z_PROGRAMMING_LANGUAGE_CODE,
					Constants.Z_STRING_VALUE
				] ).value;
			},
			zCodeString: function () {
				this.findKeyInArray(
					Constants.Z_STRING_VALUE,
					this.getZObjectChildrenById(
						this.findKeyInArray( Constants.Z_CODE_CODE, this.zCodeId ).id
					)
				);
			},
			functionLabel: function () {
				return this.getZkeyLabels[ Constants.Z_IMPLEMENTATION_FUNCTION ];
			},
			selectedFunctionLabel: function () {
				return this.getZkeyLabels[ this.zFunction.value ];
			},
			isFunctionLabelReady: function () {
				// this will be false if re-routed from an existing function
				if ( this.isNewZObject ) {
					return true;
				}
				return !!this.selectedFunctionLabel;
			},
			selectedFunctionJson: function () {
				return this.getZkeys[ this.zFunction.value ];
			},
			selectedFunctionReturnType: function () {
				if ( this.selectedFunctionJson ) {
					return this.getZkeyLabels[ this.selectedFunctionJson[
						Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_FUNCTION_RETURN_TYPE ] ];
				}
				return;
			},
			selectedFunctionArguments: function () {
				return Object.keys( this.getZarguments ).map( function ( arg ) {
					return this.getZarguments[ arg ];
				}.bind( this ) );
			},
			isImplementationAttached: function () {
				return this.selectedFunctionJson && this.selectedFunctionJson.Z2K2.Z8K4.filter( function ( zid ) {
					return zid === this.zImplementationId;
				}.bind( this ) ).length > 0;
			},
			implementationModeItems: function () {
				return [
					{
						value: Constants.implementationModes.COMPOSITION,
						label: this.$i18n( 'wikilambda-implementation-selector-composition' ).text()
					},
					{
						value: Constants.implementationModes.CODE,
						label: this.$i18n( 'wikilambda-implementation-selector-code' ).text()
					}
				];
			}
		}
	),
	methods: $.extend( {},
		mapActions( [
			'fetchZKeys',
			'setZObjectValue',
			'initializeZCodeFunction',
			'setZImplementationType',
			'setAvailableZArguments',
			'setZCodeLanguage',
			'injectZObject',
			'setIsZObjectDirty'
		] ),
		{
			updateZFunctionType: function ( val ) {
				this.setZObjectValue( {
					id: this.zFunction.id,
					value: val
				} );
				this.setIsZObjectDirty( true );
			},
			selectLanguage: function ( payload ) {
				this.setZCodeLanguage( payload );
				this.initializeZCodeFunction( {
					zCodeId: this.zCodeId,
					language: this.zCodeLanguage,
					functionId: this.zFunction.value,
					argumentList: this.selectedFunctionArguments
				} );
			},
			updateCode: function ( payload ) {
				this.injectZObject( payload );
				this.setIsZObjectDirty( true );
			},
			changeImplMode: function ( mode ) {
				this.setZImplementationType( {
					zobjectId: this.zobjectId,
					mode: mode
				} );
			},
			associatedIcon: function () {
				return ( this.isImplementationAttached ) ? icons.cdxIconLink : icons.cdxIconUnLink;
			}
		}
	),
	watch: {
		zFunction: {
			immediate: true,
			handler: function ( val, prevVal ) {
				if ( val.value && ( !prevVal || val.value !== prevVal.value ) ) {
					this.fetchZKeys( { zids: [ this.zFunction.value ] } );
				}
			}
		},
		selectedFunctionJson: {
			immediate: true,
			handler: function ( val, prevVal ) {
				if ( JSON.stringify( val ) === JSON.stringify( prevVal ) ) {
					return;
				}
				if ( this.selectedFunctionJson ) {
					var zKeys = [];

					zKeys.push(
						...this.selectedFunctionJson[
							Constants.Z_PERSISTENTOBJECT_VALUE
						][
							Constants.Z_FUNCTION_ARGUMENTS
						].map(
							( argument ) => argument[ Constants.Z_ARGUMENT_TYPE ]
						)
					);

					zKeys.push( this.selectedFunctionJson[
						Constants.Z_PERSISTENTOBJECT_VALUE ][
						Constants.Z_FUNCTION_RETURN_TYPE ] );

					this.fetchZKeys( { zids: zKeys } ).then( function () {
						this.setAvailableZArguments( this.zFunction.value );
					}.bind( this ) );
				}
			}
		}
	},
	beforeCreate: function () {
		this.$options.components[ 'z-object' ] = require( '../ZObject.vue' );
	},
	mounted: function () {
		if ( this.zCodeId ) {
			this.implMode = Constants.implementationModes.CODE;
		} else if ( this.zCompositionId ) {
			this.implMode = Constants.implementationModes.COMPOSITION;
		}
	}
};
</script>

<style lang="less">
.ext-wikilambda-zimplementation {
	&__is-impl-associated {
		font-size: 0.8em;
		font-style: italic;
		margin-left: 0.2em;
	}
}

</style>
